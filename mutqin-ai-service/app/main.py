"""
Mutqin Hifz Assistant evaluation service.

Implements POST /hifz/evaluate matching the wire contract already defined
by the frontend (src/services/ai/providers/openaiCompatibleProvider.ts):

  Request  : multipart/form-data
             - audio: file (m4a)
             - expectedAyahs: JSON string, [{ "surahId": int, "ayahNumber": int }, ...]
             - qariId: optional string (unused by this implementation — reserved
               for a future per-Qari pronunciation reference comparison)

  Response : { "result": RecitationEvaluationResult }  — same camelCase
             shape as src/services/ai/types.ts, so the frontend needs ZERO
             changes to consume this. This service is the entire missing
             piece from the app's DI graph (services/ai/hifzEvaluationProvider.ts).

Run:
  uvicorn app.main:app --host 0.0.0.0 --port 8000

Requires the SAME quran-content.db the ingestion script produces (see
mutqin-content-ingestion/) — this service reads canonical ayah text from
it, and it MUST be the same content the app itself ships, or word-level
comparison will be scored against a different text than what the user
is looking at on screen.
"""
import json
import os
import sqlite3
import tempfile
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.scoring import RecognizedWord, aggregate_result, score_session

QURAN_DB_PATH = os.environ.get("QURAN_DB_PATH", "./data/quran-content.db")
DEVICE = os.environ.get("ASR_DEVICE", "cuda")

_asr = None  # loaded lazily in the lifespan handler below


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _asr
    if _asr is not None:
        # Already set (e.g. by a test injecting a fake ASR before startup) —
        # don't clobber it with a real model load.
        yield
        return

    from app.asr import ArabicRecitationASR

    print(f"Loading ASR model onto device={DEVICE}...")
    _asr = ArabicRecitationASR(device=DEVICE)
    print("ASR model loaded.")
    yield


app = FastAPI(title="Mutqin Hifz Evaluation Service", lifespan=lifespan)


# --- Pydantic response models, field-for-field matching the TS types ------

class AyahReferenceDto(BaseModel):
    surahId: int
    ayahNumber: int


class WordEvaluationDto(BaseModel):
    wordIndex: int
    text: str
    status: str


class AyahEvaluationDto(BaseModel):
    ayah: AyahReferenceDto
    words: list[WordEvaluationDto]
    isFullyRecited: bool


class RecitationEvaluationResultDto(BaseModel):
    ayahs: list[AyahEvaluationDto]
    overallAccuracy: float
    correctWordCount: int
    missedWordCount: int
    incorrectWordCount: int
    pronunciationWarningCount: int
    suggestedRevisionAyahs: list[AyahReferenceDto]


class EvaluateResponseDto(BaseModel):
    result: RecitationEvaluationResultDto


# --- Canonical text lookup -------------------------------------------------

def fetch_canonical_ayahs(expected: list[dict]) -> list[tuple[int, int, list[str]]]:
    """Reads canonical ayah text from the shared quran-content.db (same DB the app ships)."""
    if not os.path.exists(QURAN_DB_PATH):
        raise HTTPException(
            status_code=500,
            detail=f"Quran content database not found at {QURAN_DB_PATH}. "
            "Run the ingestion script and set QURAN_DB_PATH.",
        )

    conn = sqlite3.connect(QURAN_DB_PATH)
    result = []
    try:
        for ref in expected:
            row = conn.execute(
                "SELECT text_arabic FROM ayahs WHERE surah_id = ? AND ayah_number = ?",
                (ref["surahId"], ref["ayahNumber"]),
            ).fetchone()
            if row is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"Ayah {ref['surahId']}:{ref['ayahNumber']} not found in content database.",
                )
            result.append((ref["surahId"], ref["ayahNumber"], row[0].split()))
    finally:
        conn.close()
    return result


# --- Endpoint ---------------------------------------------------------------

@app.post("/hifz/evaluate", response_model=EvaluateResponseDto)
async def evaluate_recitation(
    audio: UploadFile = File(...),
    expectedAyahs: str = Form(...),
    qariId: str | None = Form(default=None),
):
    try:
        expected = json.loads(expectedAyahs)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="expectedAyahs must be valid JSON.")

    if not isinstance(expected, list) or len(expected) == 0:
        raise HTTPException(status_code=400, detail="expectedAyahs must be a non-empty array.")

    canonical_ayahs = fetch_canonical_ayahs(expected)

    # Persist the upload to a temp file — the ASR/audio-decoding libraries
    # need a real file path, not an in-memory stream.
    suffix = os.path.splitext(audio.filename or "recitation.m4a")[1] or ".m4a"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        transcribed = _asr.transcribe(tmp_path)
        recognized_words = [RecognizedWord(text=w.text, confidence=w.confidence) for w in transcribed]

        ayah_evaluations = score_session(canonical_ayahs, recognized_words)
        result = aggregate_result(ayah_evaluations)
    finally:
        os.unlink(tmp_path)

    return EvaluateResponseDto(
        result=RecitationEvaluationResultDto(
            ayahs=[
                AyahEvaluationDto(
                    ayah=AyahReferenceDto(surahId=a.surah_id, ayahNumber=a.ayah_number),
                    words=[
                        WordEvaluationDto(wordIndex=w.word_index, text=w.text, status=w.status.value)
                        for w in a.words
                    ],
                    isFullyRecited=a.is_fully_recited,
                )
                for a in ayah_evaluations
            ],
            overallAccuracy=result.overall_accuracy,
            correctWordCount=result.correct_word_count,
            missedWordCount=result.missed_word_count,
            incorrectWordCount=result.incorrect_word_count,
            pronunciationWarningCount=result.pronunciation_warning_count,
            suggestedRevisionAyahs=[
                AyahReferenceDto(surahId=s, ayahNumber=a) for s, a in result.suggested_revision_ayahs
            ],
        )
    )


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": _asr is not None}
