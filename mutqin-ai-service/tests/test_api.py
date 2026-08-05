"""
End-to-end API contract test. Verifies the actual HTTP request/response
shape matches what the frontend's OpenAICompatibleHifzEvaluationProvider
sends and expects — this is the test that would catch a field-name typo
or shape drift between this service and src/services/ai/types.ts.

Uses a fake ASR (no GPU/model download needed) so this runs fast in CI.
"""
import json
import os
import sqlite3
import tempfile

import pytest
from fastapi.testclient import TestClient

from app import main as main_module
from app.asr import TranscribedWord


class FakeASR:
    """Simulates: ayah 1 recited perfectly, ayah 2 missing one word ('لِلَّهِ')."""

    def transcribe(self, audio_path: str) -> list[TranscribedWord]:
        return [
            TranscribedWord("بِسْمِ", 0.95), TranscribedWord("اللَّهِ", 0.95),
            TranscribedWord("الرَّحْمَٰنِ", 0.95), TranscribedWord("الرَّحِيمِ", 0.95),
            TranscribedWord("الْحَمْدُ", 0.95), TranscribedWord("رَبِّ", 0.95),
            TranscribedWord("الْعَالَمِينَ", 0.95),
        ]


@pytest.fixture
def client(tmp_path, monkeypatch):
    db_path = tmp_path / "quran-content.db"
    conn = sqlite3.connect(db_path)
    conn.execute(
        "CREATE TABLE ayahs (surah_id INTEGER, ayah_number INTEGER, text_arabic TEXT, "
        "text_translation TEXT, juz INTEGER)"
    )
    conn.execute(
        "INSERT INTO ayahs VALUES (1, 1, ?, 'In the name of Allah', 1)",
        ("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",),
    )
    conn.execute(
        "INSERT INTO ayahs VALUES (1, 2, ?, 'Praise be to Allah', 1)",
        ("الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",),
    )
    conn.commit()
    conn.close()

    monkeypatch.setenv("QURAN_DB_PATH", str(db_path))
    main_module.QURAN_DB_PATH = str(db_path)
    main_module._asr = FakeASR()  # skip real model loading entirely

    with TestClient(main_module.app) as test_client:
        yield test_client


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_evaluate_returns_contract_matching_shape(client):
    fake_audio = tempfile.NamedTemporaryFile(suffix=".m4a", delete=False)
    fake_audio.write(b"fake audio bytes")
    fake_audio.close()

    with open(fake_audio.name, "rb") as f:
        response = client.post(
            "/hifz/evaluate",
            files={"audio": ("recitation.m4a", f, "audio/m4a")},
            data={"expectedAyahs": json.dumps([{"surahId": 1, "ayahNumber": 1}, {"surahId": 1, "ayahNumber": 2}])},
        )
    os.unlink(fake_audio.name)

    assert response.status_code == 200
    body = response.json()

    # Top-level contract shape — must match RecitationEvaluationResult exactly.
    result = body["result"]
    for key in [
        "ayahs", "overallAccuracy", "correctWordCount", "missedWordCount",
        "incorrectWordCount", "pronunciationWarningCount", "suggestedRevisionAyahs",
    ]:
        assert key in result, f"missing expected field: {key}"

    # Content correctness — the deliberately-missing word should show as skipped.
    ayah2 = next(a for a in result["ayahs"] if a["ayah"]["ayahNumber"] == 2)
    assert ayah2["isFullyRecited"] is False
    skipped_words = [w for w in ayah2["words"] if w["status"] == "skipped"]
    assert len(skipped_words) == 1
    assert skipped_words[0]["text"] == "لِلَّهِ"

    assert result["missedWordCount"] == 1
    assert result["correctWordCount"] == 7
    assert result["overallAccuracy"] == pytest.approx(0.875)
    assert {"surahId": 1, "ayahNumber": 2} in result["suggestedRevisionAyahs"]


def test_evaluate_rejects_malformed_expected_ayahs(client):
    with open(__file__, "rb") as f:  # any file works, we're testing the JSON validation
        response = client.post(
            "/hifz/evaluate",
            files={"audio": ("recitation.m4a", f, "audio/m4a")},
            data={"expectedAyahs": "not valid json"},
        )
    assert response.status_code == 400


def test_evaluate_rejects_unknown_ayah(client):
    with open(__file__, "rb") as f:
        response = client.post(
            "/hifz/evaluate",
            files={"audio": ("recitation.m4a", f, "audio/m4a")},
            data={"expectedAyahs": json.dumps([{"surahId": 999, "ayahNumber": 1}])},
        )
    assert response.status_code == 400
