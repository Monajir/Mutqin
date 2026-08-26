import json
import sqlite3

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
