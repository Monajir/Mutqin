import os
from dataclasses import dataclass, field
from pathlib import Path


def read_groq_key() -> str:
    """Read only the backend credential; never execute or export the .env file."""
    if "GROQ_API_KEY" in os.environ:
        return os.environ["GROQ_API_KEY"].strip()
    path = Path(__file__).resolve().parents[1] / ".env"
    if path.is_file():
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            name, separator, value = line.strip().partition("=")
            if separator and name.strip() == "GROQ_API_KEY":
                return value.strip().strip("\"'")
    return ""


@dataclass(frozen=True)
class Settings:
    api_prefix: str = "/v1"
    quran_db_path: str = "./data/quran-content.db"
    asr_provider: str = "groq"
    groq_api_key: str = field(default="", repr=False)
    asr_model_id: str = "basharalrfooh/whisper-small-quran"
    asr_device: str = "cpu"
    asr_debug_audio_path: str | None = None
    asr_benchmark_dir: str | None = None
    max_upload_bytes: int = 15 * 1024 * 1024
    max_ayahs_per_evaluation: int = 15

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            api_prefix=os.environ.get("API_PREFIX", "/v1").rstrip("/"),
            quran_db_path=os.environ.get("QURAN_DB_PATH", "./data/quran-content.db"),
            asr_provider=os.environ.get("ASR_PROVIDER", "groq").strip().lower(),
            groq_api_key=read_groq_key(),
            asr_model_id=os.environ.get("ASR_MODEL_ID", "basharalrfooh/whisper-small-quran"),
            asr_device=os.environ.get("ASR_DEVICE", "cpu"),
            asr_debug_audio_path=os.environ.get("ASR_DEBUG_AUDIO_PATH") or None,
            asr_benchmark_dir=os.environ.get("ASR_BENCHMARK_DIR") or None,
            max_upload_bytes=int(os.environ.get("MAX_UPLOAD_BYTES", str(15 * 1024 * 1024))),
            max_ayahs_per_evaluation=int(os.environ.get("MAX_AYAHS_PER_EVALUATION", "15")),
        )


settings = Settings.from_env()
