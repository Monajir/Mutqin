import httpx

from evaluate_groq import ENDPOINT, transcribe


def test_upload_has_no_expected_verse_prompt_and_preserves_audio(tmp_path):
    path = tmp_path / "recording.m4a"
    path.write_bytes(b"original_audio")
    def handle(request):
        assert str(request.url) == ENDPOINT
        assert request.headers["authorization"] == "Bearer test-only"
        content = request.read()
        assert b"original_audio" in content
        assert b"whisper-large-v3" in content
        assert b'name="language"\r\n\r\nar' in content
        assert b"prompt" not in content and b"expectedAyahs" not in content
        return httpx.Response(200, json={"text": "بسم الله"})
    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        result = transcribe(client, "test-only", path)
    assert result["text"] == "بسم الله"
    assert path.read_bytes() == b"original_audio"


def test_http_failure_does_not_return_sensitive_body_or_retry(tmp_path):
    path = tmp_path / "recording.m4a"
    path.write_bytes(b"audio")
    calls = []
    def handle(request):
        calls.append(request)
        return httpx.Response(401, json={"detail": "potentially sensitive error"})
    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        assert transcribe(client, "test-only", path) == {"httpStatus": 401}
    assert len(calls) == 1


def test_malformed_success_is_not_scored_as_empty_speech(tmp_path):
    path = tmp_path / "recording.m4a"
    path.write_bytes(b"audio")
    with httpx.Client(transport=httpx.MockTransport(lambda request: httpx.Response(200, json=[]))) as client:
        assert transcribe(client, "test-only", path) == {"httpStatus": 200, "error": "missing_transcript"}
