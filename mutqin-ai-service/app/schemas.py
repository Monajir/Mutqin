from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class AyahReferenceDto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    surahId: int = Field(ge=1, le=114)
    ayahNumber: int = Field(ge=1)


class WordStatus(str, Enum):
    CORRECT = "correct"
    INCORRECT = "incorrect"
    SKIPPED = "skipped"


class WordEvaluationDto(BaseModel):
    wordIndex: int
    text: str
    status: WordStatus


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
    suggestedRevisionAyahs: list[AyahReferenceDto]


class EvaluateResponseDto(BaseModel):
    evaluationId: str
    modelVersion: str
    result: RecitationEvaluationResultDto


class HealthResponseDto(BaseModel):
    status: str
    databaseReady: bool | None = None
    modelReady: bool | None = None
