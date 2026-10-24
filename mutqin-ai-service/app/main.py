import json
import logging
import os
import shutil
import tempfile
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import TypeAdapter, ValidationError
from starlette.concurrency import run_in_threadpool

from app.audio import AudioDecodeError
from app.asr import create_transcriber
from app.groq_asr import TranscriptionUnavailable
from app.benchmark_capture import BenchmarkCapture
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
from app.vad import NoSpeechDetected

logger = logging.getLogger("uvicorn.error")
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
        logger.info("Initializing recitation provider: %s", settings.asr_provider)
        app.state.transcriber = create_transcriber(settings)
        logger.info("Recitation model ready: %s", app.state.transcriber.model_version)
    try:
        yield
    finally:
        app.state.transcriber = None


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
    return HealthResponseDto(status="ready", databaseReady=True, modelReady=True,
                            asrProvider=getattr(app.state.transcriber, "provider", None),
                            modelVersion=app.state.transcriber.model_version)


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
    capture = None
    evaluation_id = str(uuid4())
    started = time.perf_counter()
    try:
        if settings.asr_debug_audio_path:
            debug_path = os.path.abspath(settings.asr_debug_audio_path)
            os.makedirs(os.path.dirname(debug_path), exist_ok=True)
            shutil.copyfile(temporary_path, debug_path)
            with open(debug_path + ".json", "w", encoding="utf-8") as metadata_file:
                json.dump({"expectedAyahs": [reference.model_dump() for reference in references]}, metadata_file, ensure_ascii=False, indent=2)
            logger.info("Saved the latest debug recording to %s", debug_path)
        if settings.asr_benchmark_dir:
            capture = BenchmarkCapture(
                settings.asr_benchmark_dir, temporary_path, references,
                canonical_ayahs, transcriber, evaluation_id,
            )
            logger.info("Benchmark recording saved: %s", capture.capture_id)
        inference_started = time.perf_counter()
        recognized_words = await run_in_threadpool(transcriber.transcribe, temporary_path)
        inference_seconds = time.perf_counter() - inference_started
        ayah_evaluations = score_session(canonical_ayahs, recognized_words)
        result = aggregate_result(ayah_evaluations)
        logger.info(
            "Recitation score: expected=%d recognized=%d correct=%d missed=%d incorrect=%d accuracy=%.1f%%",
            sum(len(words) for _, _, words in canonical_ayahs),
            len(recognized_words),
            result.correct_word_count,
            result.missed_word_count,
            result.incorrect_word_count,
            result.overall_accuracy * 100,
        )
        response = build_evaluation_response(evaluation_id, transcriber.model_version, ayah_evaluations, result)
        if capture:
            capture.complete(recognized_words, response, inference_seconds, time.perf_counter() - started)
            logger.info("Benchmark result saved: %s", capture.capture_id)
        return response
    except NoSpeechDetected:
        if capture:
            try:
                capture.reject("no_speech")
            except OSError:
                logger.exception("Could not save benchmark rejection status")
        return JSONResponse(status_code=422, content={
            "code": "no_speech",
            "detail": "No speech detected. Please record again.",
        })
    except TranscriptionUnavailable:
        if capture:
            record_capture_failure(capture, "transcription_unavailable")
        raise HTTPException(status_code=503, detail="Speech recognition is temporarily unavailable. Please try again later.") from None
    except AudioDecodeError as error:
        if capture:
            record_capture_failure(capture, "audio_decode_error")
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        if capture:
            record_capture_failure(capture, type(error).__name__)
        logger.exception("Recitation evaluation failed")
        raise HTTPException(status_code=503, detail="Recitation evaluation failed.") from error
    finally:
        os.unlink(temporary_path)


def record_capture_failure(capture, error_type):
    try:
        capture.fail(error_type)
    except OSError:
        logger.exception("Could not save benchmark failure status")


def build_evaluation_response(evaluation_id, model_version, ayah_evaluations, result):
    return EvaluateResponseDto(
        evaluationId=evaluation_id,
        modelVersion=model_version,
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
