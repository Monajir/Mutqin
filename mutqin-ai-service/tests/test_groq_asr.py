from dataclasses import replace
from types import SimpleNamespace

import httpx
import numpy as np
import pytest

from app import asr, groq_asr
from app.config import Settings, read_groq_key
from app.vad import NoSpeechDetected


@pytest.fixture
def adapter(tmp_path, monkeypatch):
    path = tmp_path / "recording.m4a"
    path.write_bytes(b"original audio")
    audio = np.zeros(16000, dtype=np.float32)
    decoded = []
    monkeypatch.setattr(groq_asr, "decode_audio", lambda p: decoded.append(p) or audio)
    monkeypatch.setattr(groq_asr, "SileroSpeechDetector", lambda: SimpleNamespace(has_speech=lambda a: a is audio))
    return groq_asr.GroqRecitationTranscriber("secret-test-key"), path, decoded


def mock_http(monkeypatch, handler):
    original = httpx.Client
    def create(**kwargs):
        assert kwargs["follow_redirects"] is False
        assert kwargs["timeout"].read < 90  # Mobile evaluation timeout.
        return original(transport=httpx.MockTransport(handler), **kwargs)
    monkeypatch.setattr(groq_asr.httpx, "Client", create)


def test_whole_recording_arabic_without_verse_prompt(adapter, monkeypatch):
    transcriber, path, decoded = adapter
    calls = []
    def handle(request):
        calls.append(request)
        assert str(request.url) == groq_asr.ENDPOINT
        assert request.headers["authorization"] == "Bearer secret-test-key"
        content = request.read()
        assert b"original audio" in content and b"whisper-large-v3" in content
        assert b'name="language"\r\n\r\nar' in content
        assert b"prompt" not in content and b"expectedAyahs" not in content
        return httpx.Response(200, json={"text": " بسم الله "})
    mock_http(monkeypatch, handle)
    assert [w.text for w in transcriber.transcribe(str(path))] == ["بسم", "الله"]
    assert len(calls) == 1 and decoded == [str(path)]
    assert path.read_bytes() == b"original audio"
    assert transcriber.model_version == "groq/whisper-large-v3"


def test_silence_never_creates_http_client(adapter, monkeypatch):
    transcriber, path, _ = adapter
    transcriber.speech_detector.has_speech = lambda audio: False
    monkeypatch.setattr(groq_asr.httpx, "Client", lambda **kw: pytest.fail("Silent audio must stay local"))
    with pytest.raises(NoSpeechDetected):
        transcriber.transcribe(str(path))


@pytest.mark.parametrize("failure", [401, 429, 500, 302, "timeout", "connection", "json", "shape", "empty"])
def test_upstream_failure_is_sanitized_and_not_retried(adapter, monkeypatch, failure, caplog):
    transcriber, path, _ = adapter
    calls = []
    def handle(request):
        calls.append(request)
        if failure == "timeout":
            raise httpx.ReadTimeout("secret-test-key sensitive body")
        if failure == "connection":
            raise httpx.ConnectError("secret-test-key sensitive body")
        if failure == "json":
            return httpx.Response(200, text="sensitive body")
        if failure == "shape":
            return httpx.Response(200, json=[])
        if failure == "empty":
            return httpx.Response(200, json={"text": " "})
        return httpx.Response(failure, text="secret-test-key sensitive body")
    mock_http(monkeypatch, handle)
    with pytest.raises(groq_asr.TranscriptionUnavailable) as error:
        transcriber.transcribe(str(path))
    assert len(calls) == 1
    assert "secret-test-key" not in str(error.value) + caplog.text
    assert "sensitive body" not in str(error.value) + caplog.text


def test_unknown_container_is_converted_to_wav(adapter, monkeypatch):
    transcriber, path, _ = adapter
    path = path.rename(path.with_suffix(".3gp"))
    def handle(request):
        content = request.read()
        assert b"recitation.wav" in content and b"RIFF" in content
        return httpx.Response(200, json={"text": "بسم الله"})
    mock_http(monkeypatch, handle)
    assert len(transcriber.transcribe(str(path))) == 2


def test_provider_selection_and_configuration_failures(monkeypatch):
    settings = Settings(groq_api_key="secret-test-key")
    assert "secret-test-key" not in repr(settings)
    monkeypatch.setattr(groq_asr, "SileroSpeechDetector", lambda: object())
    monkeypatch.setattr(asr, "WhisperRecitationTranscriber", lambda *args: ("local", args))
    assert asr.create_transcriber(settings).provider == "groq"
    assert asr.create_transcriber(replace(settings, asr_provider="local")) == (
        "local", (settings.asr_model_id, settings.asr_device))
    with pytest.raises(ValueError, match="GROQ_API_KEY is missing"):
        asr.create_transcriber(replace(settings, groq_api_key=""))
    with pytest.raises(ValueError, match="ASR_PROVIDER"):
        asr.create_transcriber(replace(settings, asr_provider="typo"))


def test_environment_key_overrides_dotenv_and_can_disable_it(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", " test-key ")
    assert read_groq_key() == "test-key"
    monkeypatch.setenv("GROQ_API_KEY", "")
    assert read_groq_key() == ""
