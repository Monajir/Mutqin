"""Opt-in local recordings for reproducible ASR evaluation; never enabled by default."""

import hashlib
import json
import shutil
from datetime import datetime, timezone
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path


def write_json(path: Path, value: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


class BenchmarkCapture:
    def __init__(self, directory, audio_path, references, canonical, transcriber, evaluation_id):
        directory = Path(directory)
        directory.mkdir(parents=True, exist_ok=True)
        now = datetime.now(timezone.utc)
        self.capture_id = f"rec-{now.strftime('%Y%m%dT%H%M%S%fZ')}-{evaluation_id}"
        self.audio_path = directory / (self.capture_id + Path(audio_path).suffix)
        self.report_path = directory / (self.capture_id + ".result.json")
        # Exclusive creation protects existing recordings even if IDs collide.
        with self.audio_path.open("xb") as destination, open(audio_path, "rb") as source:
            shutil.copyfileobj(source, destination)

        source_root = Path(__file__).parent
        digest = hashlib.sha256()
        for name in ("asr.py", "groq_asr.py", "audio.py", "arabic_normalize.py", "scoring.py", "vad.py"):
            digest.update(name.encode())
            digest.update((source_root / name).read_bytes())
        packages = {}
        for name in ("torch", "transformers", "numpy", "soundfile", "imageio-ffmpeg", "silero-vad", "httpx"):
            try:
                packages[name] = version(name)
            except PackageNotFoundError:
                packages[name] = None

        metadata = {
            "captureId": self.capture_id,
            "createdAt": now.isoformat(),
            "expectedAyahs": [ref.model_dump() for ref in references],
            "canonicalAyahs": [
                {"surahId": surah, "ayahNumber": ayah, "words": words}
                for surah, ayah, words in canonical
            ],
            "modelVersion": transcriber.model_version,
            "asrProvider": getattr(transcriber, "provider", None),
            "modelRevision": getattr(getattr(getattr(transcriber, "model", None), "config", None), "_commit_hash", None),
            "device": getattr(transcriber, "device", None),
            "vad": getattr(getattr(transcriber, "speech_detector", None), "metadata", None),
            "pipelineSha256": digest.hexdigest(),
            "packageVersions": packages,
            "annotation": None,
        }
        write_json(Path(str(self.audio_path) + ".json"), metadata)
        write_json(self.report_path, {"captureId": self.capture_id, "status": "captured"})

    def complete(self, recognized_words, response, inference_seconds, evaluation_seconds):
        write_json(self.report_path, {
            "captureId": self.capture_id,
            "status": "completed",
            "transcript": " ".join(word.text for word in recognized_words),
            "recognizedWords": [word.text for word in recognized_words],
            "inferenceSeconds": round(inference_seconds, 3),
            "evaluationSeconds": round(evaluation_seconds, 3),
            "response": response.model_dump(mode="json"),
        })

    def fail(self, error_type):
        write_json(self.report_path, {
            "captureId": self.capture_id,
            "status": "failed",
            "errorType": error_type,
        })

    def reject(self, reason):
        write_json(self.report_path, {
            "captureId": self.capture_id,
            "status": "rejected",
            "reason": reason,
        })
