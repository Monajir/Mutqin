"""Hosted ASR, gated by local VAD. No verse prompt, retries, or model fallback."""

import io
import logging
from pathlib import Path

import httpx

from app.audio import decode_audio
from app.scoring import RecognizedWord
from app.vad import NoSpeechDetected, SileroSpeechDetector

logger = logging.getLogger("uvicorn.error")
ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions"
MODEL = "whisper-large-v3"


class TranscriptionUnavailable(Exception):
    """Sanitized upstream failure: never expose credential or response body."""


class GroqRecitationTranscriber:
    provider = "groq"
    model_version = "groq/" + MODEL
    device = "remote"

    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("GROQ_API_KEY is missing. Set it in the backend .env or environment.")
        self._api_key = api_key
        self.speech_detector = SileroSpeechDetector()

    def transcribe(self, audio_path: str) -> list[RecognizedWord]:
        audio = decode_audio(audio_path)
        if not self.speech_detector.has_speech(audio):
            raise NoSpeechDetected("No speech detected. Please record again.")

        suffix = Path(audio_path).suffix.lower()
        if suffix in {".flac", ".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".ogg", ".wav", ".webm"}:
            upload = open(audio_path, "rb")
        else:
            # Preserve support for decodable 3GPP/unknown uploads accepted by
            # our API, even though Groq does not accept their containers.
            import soundfile as sf
            upload = io.BytesIO()
            sf.write(upload, audio, 16_000, format="WAV", subtype="PCM_16")
            upload.seek(0)
            suffix = ".wav"

        try:
            with upload, httpx.Client(timeout=httpx.Timeout(45, connect=10), follow_redirects=False) as client:
                response = client.post(
                    ENDPOINT,
                    headers={"Authorization": "Bearer " + self._api_key},
                    files={"file": ("recitation" + suffix, upload, "application/octet-stream")},
                    data={"model": MODEL, "language": "ar", "temperature": "0", "response_format": "json"},
                )
            if response.status_code != 200:
                logger.warning("Groq transcription unavailable (HTTP %d)", response.status_code)
                raise TranscriptionUnavailable("Speech recognition is temporarily unavailable.")
            body = response.json()
            if not isinstance(body, dict) or not isinstance(body.get("text"), str) or not body["text"].strip():
                raise TranscriptionUnavailable("Speech recognition returned no usable transcript.")
        except (httpx.HTTPError, ValueError):
            # Suppress upstream exception chains: request/response details may
            # contain credentials or provider diagnostic content.
            raise TranscriptionUnavailable("Speech recognition is temporarily unavailable.") from None

        words = [RecognizedWord(word) for word in body["text"].split()]
        logger.info("Groq ASR decoded %.1f seconds into %d words", len(audio) / 16_000, len(words))
        return words
