import json
import logging
import os
import tempfile
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import TypeAdapter, ValidationError
from starlette.concurrency import run_in_threadpool

from app.asr import WhisperRecitationTranscriber
from app.config import settings
from app.quran_repository import QuranRepository, QuranRepositoryError
from app.schemas import (
    AyahEvaluationDto,
    AyahReferenceDto,
    EvaluateResponseDto,
    HealthResponseDto,
    RecitationEvaluationResultDto,
    WordEvaluationDto,
)
from app.scoring import aggregate_result, score_session

logger = logging.getLogger(__name__)
AYAH_LIST_ADAPTER = TypeAdapter(list[AyahReferenceDto])
SUPPORTED_AUDIO_TYPES = {
    "audio/m4a",
    "audio/mp4",
    "audio/x-m4a",
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/3gpp",
    "application/octet-stream",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    repository = QuranRepository(settings.quran_db_path)
    app.state.quran_repository = repository

    # Tests may inject a fake transcriber before startup. Production loads the
    # configured model once and reuses it for every request.
    if getattr(app.state, "transcriber", None) is None and repository.is_ready():
        logger.info("Loading recitation model %s on %s", settings.asr_model_id, settings.asr_device)
        app.state.transcriber = WhisperRecitationTranscriber(
            model_id=settings.asr_model_id,
            device=settings.asr_device,
        )
    yield


app = FastAPI(
    title="Mutqin Backend",
    version="1.0.0",
    description="Minimal backend for Quran recitation evaluation.",
    lifespan=lifespan,
)


def parse_expected_ayahs(raw_value: str) -> list[AyahReferenceDto]:
    try:
        references = AYAH_LIST_ADAPTER.validate_python(json.loads(raw_value))
    except (json.JSONDecodeError, ValidationError) as error:
        raise HTTPException(status_code=400, detail="expectedAyahs is invalid.") from error

    if not references:
        raise HTTPException(status_code=400, detail="Select at least one ayah.")
    if len(references) > settings.max_ayahs_per_evaluation:
        raise HTTPException(
            status_code=400,
            detail=f"A session may contain at most {settings.max_ayahs_per_evaluation} ayahs.",
        )

    first_surah = references[0].surahId
    for index, reference in enumerate(references):
        if reference.surahId != first_surah:
            raise HTTPException(status_code=400, detail="A session must stay within one surah.")
        if index > 0 and reference.ayahNumber != references[index - 1].ayahNumber + 1:
            raise HTTPException(status_code=400, detail="Ayahs must be consecutive and in reading order.")
    return references


async def save_upload(audio: UploadFile) -> str:
    if audio.content_type not in SUPPORTED_AUDIO_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported audio format.")

    suffix = os.path.splitext(audio.filename or "recitation.m4a")[1].lower() or ".m4a"
    total_bytes = 0
    temporary = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    try:
        while chunk := await audio.read(1024 * 1024):
            total_bytes += len(chunk)
            if total_bytes > settings.max_upload_bytes:
                raise HTTPException(status_code=413, detail="Audio recording is too large.")
            temporary.write(chunk)
        if total_bytes == 0:
            raise HTTPException(status_code=400, detail="Audio recording is empty.")
        return temporary.name
    except Exception:
        temporary.close()
        os.unlink(temporary.name)
        raise
    finally:
        temporary.close()


@app.get("/health/live", response_model=HealthResponseDto)
async def health_live():
    return HealthResponseDto(status="ok")


@app.get("/health/ready", response_model=HealthResponseDto)
async def health_ready():
    repository = app.state.quran_repository
    database_ready = repository.is_ready()
    model_ready = getattr(app.state, "transcriber", None) is not None
    if not database_ready or not model_ready:
        raise HTTPException(status_code=503, detail="Evaluation service is not ready.")
    return HealthResponseDto(status="ready", databaseReady=True, modelReady=True)


@app.post(f"{settings.api_prefix}/hifz/evaluate", response_model=EvaluateResponseDto)
async def evaluate_recitation(
    audio: UploadFile = File(...),
    expectedAyahs: str = Form(...),
):
    repository: QuranRepository = app.state.quran_repository
    transcriber = getattr(app.state, "transcriber", None)
    if not repository.is_ready() or transcriber is None:
        raise HTTPException(status_code=503, detail="Evaluation service is not ready.")

    references = parse_expected_ayahs(expectedAyahs)
    try:
        canonical_ayahs = repository.fetch_canonical_ayahs(references)
    except QuranRepositoryError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    temporary_path = await save_upload(audio)
    try:
        recognized_words = await run_in_threadpool(transcriber.transcribe, temporary_path)
        ayah_evaluations = score_session(canonical_ayahs, recognized_words)
        result = aggregate_result(ayah_evaluations)
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("Recitation evaluation failed")
        raise HTTPException(status_code=503, detail="Recitation evaluation failed.") from error
    finally:
        os.unlink(temporary_path)

    return EvaluateResponseDto(
        evaluationId=str(uuid4()),
        modelVersion=transcriber.model_version,
        result=RecitationEvaluationResultDto(
            ayahs=[
                AyahEvaluationDto(
                    ayah=AyahReferenceDto(surahId=ayah.surah_id, ayahNumber=ayah.ayah_number),
                    words=[
                        WordEvaluationDto(wordIndex=word.word_index, text=word.text, status=word.status)
                        for word in ayah.words
                    ],
                    isFullyRecited=ayah.is_fully_recited,
                )
                for ayah in ayah_evaluations
            ],
            overallAccuracy=result.overall_accuracy,
            correctWordCount=result.correct_word_count,
            missedWordCount=result.missed_word_count,
            incorrectWordCount=result.incorrect_word_count,
            suggestedRevisionAyahs=[
                AyahReferenceDto(surahId=surah_id, ayahNumber=ayah_number)
                for surah_id, ayah_number in result.suggested_revision_ayahs
            ],
        ),
    )
