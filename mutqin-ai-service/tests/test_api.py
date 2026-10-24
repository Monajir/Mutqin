import json
import sqlite3
from dataclasses import replace
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import main as main_module
from app.config import Settings
from app.scoring import RecognizedWord


class FakeTranscriber:
    model_version = "fake-quran-asr"

    def transcribe(self, _audio_path: str) -> list[RecognizedWord]:
        return [
            RecognizedWord("بِسْمِ"),
            RecognizedWord("اللَّهِ"),
            RecognizedWord("الرَّحْمَٰنِ"),
            RecognizedWord("الرَّحِيمِ"),
            RecognizedWord("الْحَمْدُ"),
            RecognizedWord("رَبِّ"),
            RecognizedWord("الْعَالَمِينَ"),
        ]


@pytest.fixture
def client(tmp_path, monkeypatch):
    database_path = tmp_path / "quran-content.db"
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            "CREATE TABLE ayahs (surah_id INTEGER, ayah_number INTEGER, text_arabic TEXT, "
            "text_translation TEXT, juz INTEGER)"
        )
        connection.execute(
            "INSERT INTO ayahs VALUES (1, 1, ?, 'In the name of Allah', 1)",
            ("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",),
        )
        connection.execute(
            "INSERT INTO ayahs VALUES (1, 2, ?, 'Praise be to Allah', 1)",
            ("الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",),
        )
        # Readiness deliberately checks the production content count.
        connection.executemany(
            "INSERT INTO ayahs VALUES (2, ?, 'نَص', 'text', 1)",
            [(number,) for number in range(1, 6235)],
        )

    monkeypatch.setattr(
        main_module,
        "settings",
        Settings(quran_db_path=str(database_path), max_upload_bytes=1024),
    )
    main_module.app.state.transcriber = FakeTranscriber()
    with TestClient(main_module.app) as test_client:
        yield test_client


def post_evaluation(client: TestClient, references: object, audio: bytes = b"audio"):
    return client.post(
        "/v1/hifz/evaluate",
        files={"audio": ("recitation.m4a", audio, "audio/m4a")},
        data={"expectedAyahs": json.dumps(references)},
    )


def test_health_checks(client):
    assert client.get("/health/live").json() == {
        "status": "ok",
        "databaseReady": None,
        "modelReady": None,
        "asrProvider": None,
        "modelVersion": None,
    }
    ready = client.get("/health/ready")
    assert ready.status_code == 200
    assert ready.json()["status"] == "ready"


def test_evaluate_returns_mobile_contract(client):
    response = post_evaluation(
        client,
        [{"surahId": 1, "ayahNumber": 1}, {"surahId": 1, "ayahNumber": 2}],
    )
    assert response.status_code == 200
    body = response.json()
    assert body["modelVersion"] == "fake-quran-asr"
    assert body["evaluationId"]

    result = body["result"]
    ayah_two = next(ayah for ayah in result["ayahs"] if ayah["ayah"]["ayahNumber"] == 2)
    assert [word["text"] for word in ayah_two["words"] if word["status"] == "skipped"] == ["لِلَّهِ"]
    assert result["correctWordCount"] == 7
    assert result["missedWordCount"] == 1
    assert result["overallAccuracy"] == pytest.approx(0.875)


@pytest.mark.parametrize(
    "references",
    [
        "not-an-array",
        [],
        [{"surahId": 1, "ayahNumber": 1}, {"surahId": 1, "ayahNumber": 3}],
        [{"surahId": 1, "ayahNumber": 1}, {"surahId": 2, "ayahNumber": 2}],
        [{"surahId": 999, "ayahNumber": 1}],
    ],
)
def test_evaluate_rejects_invalid_ranges(client, references):
    assert post_evaluation(client, references).status_code == 400


def test_evaluate_rejects_unknown_ayah(client):
    response = post_evaluation(client, [{"surahId": 1, "ayahNumber": 99}])
    assert response.status_code == 400
    assert "does not exist" in response.json()["detail"]


def test_evaluate_rejects_oversized_audio(client):
    response = post_evaluation(client, [{"surahId": 1, "ayahNumber": 1}], b"x" * 1025)
    assert response.status_code == 413


def test_benchmark_capture_is_disabled_by_default(client, monkeypatch):
    def unexpected_capture(*args, **kwargs):
        raise AssertionError("Normal evaluations must not retain benchmark audio")
    monkeypatch.setattr(main_module, "BenchmarkCapture", unexpected_capture)
    response = post_evaluation(client, [{"surahId": 1, "ayahNumber": 1}])
    assert response.status_code == 200


def test_benchmark_preserves_each_upload_transcript_and_response(client, monkeypatch, tmp_path):
    directory = tmp_path / "benchmarks"
    monkeypatch.setattr(main_module, "settings", replace(main_module.settings, asr_benchmark_dir=str(directory)))
    references = [{"surahId": 1, "ayahNumber": 1}, {"surahId": 1, "ayahNumber": 2}]
    responses = [post_evaluation(client, references, audio).json() for audio in (b"first", b"second")]
    audio_files = sorted(directory.glob("*.m4a"))
    assert [path.read_bytes() for path in audio_files] == [b"first", b"second"]
    for audio, response in zip(audio_files, responses):
        metadata = json.loads(Path(str(audio) + ".json").read_text())
        report = json.loads(audio.with_suffix(".result.json").read_text())
        assert metadata["expectedAyahs"] == references
        assert metadata["annotation"] is None
        assert len(metadata["pipelineSha256"]) == 64
        assert metadata["modelVersion"] == "fake-quran-asr"
        assert report["status"] == "completed"
        assert report["response"] == response
        assert report["transcript"] == " ".join(w.text for w in FakeTranscriber().transcribe(""))
        assert 0 <= report["inferenceSeconds"] <= report["evaluationSeconds"]


def test_failed_evaluation_retains_capture_but_deletes_temporary_upload(client, monkeypatch, tmp_path):
    from app.audio import AudioDecodeError
    directory = tmp_path / "benchmarks"
    monkeypatch.setattr(main_module, "settings", replace(main_module.settings, asr_benchmark_dir=str(directory)))
    temporary_paths = []
    def fail_transcription(path):
        temporary_paths.append(Path(path))
        raise AudioDecodeError("Invalid audio")
    monkeypatch.setattr(main_module.app.state.transcriber, "transcribe", fail_transcription)
    response = post_evaluation(client, [{"surahId": 1, "ayahNumber": 1}], b"invalid")
    assert response.status_code == 422
    assert temporary_paths and not temporary_paths[0].exists()
    assert next(directory.glob("*.m4a")).read_bytes() == b"invalid"
    report = json.loads(next(directory.glob("*.result.json")).read_text())
    assert report["status"] == "failed"
    assert report["errorType"] == "audio_decode_error"


def test_invalid_ranges_are_not_retained_as_benchmarks(client, monkeypatch, tmp_path):
    directory = tmp_path / "benchmarks"
    monkeypatch.setattr(main_module, "settings", replace(main_module.settings, asr_benchmark_dir=str(directory)))
    response = post_evaluation(client, [{"surahId": 1, "ayahNumber": 99}])
    assert response.status_code == 400
    assert not directory.exists()


def test_no_speech_has_distinct_response_without_scoring(client, monkeypatch, tmp_path):
    from app.vad import NoSpeechDetected
    directory = tmp_path / "benchmarks"
    monkeypatch.setattr(main_module, "settings", replace(main_module.settings, asr_benchmark_dir=str(directory)))
    paths = []
    def reject(path):
        paths.append(Path(path))
        raise NoSpeechDetected()
    def unexpected_score(*args, **kwargs):
        pytest.fail("No-speech rejection must not be scored")
    monkeypatch.setattr(main_module.app.state.transcriber, "transcribe", reject)
    monkeypatch.setattr(main_module, "score_session", unexpected_score)
    response = post_evaluation(client, [{"surahId": 1, "ayahNumber": 1}])
    assert response.status_code == 422
    assert response.json() == {"code": "no_speech", "detail": "No speech detected. Please record again."}
    assert paths and not paths[0].exists()
    report = json.loads(next(directory.glob("*.result.json")).read_text())
    assert report["status"] == "rejected"
    assert report["reason"] == "no_speech"
    assert "response" not in report and "transcript" not in report


def test_detector_runtime_error_is_service_failure_not_no_speech(client, monkeypatch):
    paths = []
    def fail(path):
        paths.append(Path(path))
        raise RuntimeError("Detector failed")
    monkeypatch.setattr(main_module.app.state.transcriber, "transcribe", fail)
    response = post_evaluation(client, [{"surahId": 1, "ayahNumber": 1}])
    assert response.status_code == 503
    assert response.json().get("code") != "no_speech"
    assert paths and not paths[0].exists()


def test_upstream_failure_returns_no_score_and_cleans_up(client, monkeypatch, tmp_path):
    from app.groq_asr import TranscriptionUnavailable
    directory = tmp_path / "benchmarks"
    monkeypatch.setattr(main_module, "settings", replace(main_module.settings, asr_benchmark_dir=str(directory)))
    paths = []
    def fail(path):
        paths.append(Path(path))
        raise TranscriptionUnavailable("Upstream unavailable")
    monkeypatch.setattr(main_module.app.state.transcriber, "transcribe", fail)
    monkeypatch.setattr(main_module, "score_session", lambda *args: pytest.fail("Failure must not be scored"))
    response = post_evaluation(client, [{"surahId": 1, "ayahNumber": 1}])
    assert response.status_code == 503
    assert "result" not in response.json()
    assert paths and not paths[0].exists()
    report = json.loads(next(directory.glob("*.result.json")).read_text())
    assert report["errorType"] == "transcription_unavailable"
