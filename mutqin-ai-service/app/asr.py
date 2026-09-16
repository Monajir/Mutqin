"""Quran-recitation speech recognition behind one replaceable interface."""

import logging
from typing import Protocol

from app.audio import decode_audio
from app.scoring import RecognizedWord

logger = logging.getLogger("uvicorn.error")
SAMPLE_RATE = 16_000
MAX_CHUNK_SECONDS = 25
MIN_CHUNK_SECONDS = 15
PAUSE_SEARCH_SECONDS = 10
MIN_PHRASE_SECONDS = 2
MIN_TRAILING_SECONDS = 1.5
SILENCE_WINDOW_SECONDS = 0.25
SILENCE_STEP_SECONDS = 0.05
QUIET_POINT_RATIO = 0.7


def split_audio_at_quiet_points(audio):
    """Split on sustained recitation pauses and stay below Whisper's limit."""
    import numpy as np

    max_samples = MAX_CHUNK_SECONDS * SAMPLE_RATE
    min_samples = MIN_CHUNK_SECONDS * SAMPLE_RATE
    pause_search_samples = PAUSE_SEARCH_SECONDS * SAMPLE_RATE
    min_phrase_samples = int(MIN_PHRASE_SECONDS * SAMPLE_RATE)
    min_trailing_samples = int(MIN_TRAILING_SECONDS * SAMPLE_RATE)
    window_samples = int(SILENCE_WINDOW_SECONDS * SAMPLE_RATE)
    step_samples = int(SILENCE_STEP_SECONDS * SAMPLE_RATE)
    chunks = []
    start = 0

    while start < len(audio):
        # Prefer the first sustained pause after at least two seconds. This
        # keeps ayahs in separate inference windows without cutting on the
        # much shorter low-energy gaps between ordinary words.
        search_start = start + min_phrase_samples
        search_end = min(start + pause_search_samples, len(audio) - min_trailing_samples)
        reference_end = min(start + pause_search_samples, len(audio))
        reference_energy = float(np.median(np.abs(audio[start:reference_end])))
        pause_at = None
        if search_start + window_samples <= search_end and reference_energy > 0:
            for offset in range(search_start, search_end - window_samples + 1, step_samples):
                energy = float(np.mean(np.abs(audio[offset:offset + window_samples])))
                if energy <= reference_energy * QUIET_POINT_RATIO:
                    pause_at = offset + window_samples // 2
                    break

        if pause_at is not None:
            chunks.append(audio[start:pause_at])
            start = pause_at
            continue

        if len(audio) - start <= max_samples:
            chunks.append(audio[start:])
            break

        # A very long ayah may contain no sustained pause. Keep the fallback
        # safely below 30 seconds and cut at the quietest available point.
        search_start = start + min_samples
        search_end = min(start + max_samples, len(audio))
        candidates = range(search_start, search_end - window_samples + 1, window_samples)
        split_at = min(
            candidates,
            key=lambda offset: float(np.mean(np.abs(audio[offset:offset + window_samples]))),
        ) + window_samples // 2
        chunks.append(audio[start:split_at])
        start = split_at
    return chunks


class RecitationTranscriber(Protocol):
    model_version: str

    def transcribe(self, audio_path: str) -> list[RecognizedWord]: ...


class WhisperRecitationTranscriber:
    """
    Minimal Whisper adapter.

    It intentionally returns recognized words only. Whisper token confidence is
    not a reliable pronunciation or Tajweed score, so v1 does not expose one.
    """

    def __init__(self, model_id: str, device: str = "cpu"):
        import torch
        from transformers import WhisperForConditionalGeneration, WhisperProcessor

        self.model_version = model_id
        self.device = device if device == "cuda" and torch.cuda.is_available() else "cpu"
        self.processor = WhisperProcessor.from_pretrained(
            model_id,
            clean_up_tokenization_spaces=False,
        )
        self.model = WhisperForConditionalGeneration.from_pretrained(model_id).to(self.device)
        self.model.eval()

    def transcribe(self, audio_path: str) -> list[RecognizedWord]:
        import torch

        audio = decode_audio(audio_path)
        transcripts: list[str] = []

        for chunk in split_audio_at_quiet_points(audio):
            inputs = self.processor(
                chunk,
                sampling_rate=SAMPLE_RATE,
                return_tensors="pt",
                return_attention_mask=True,
            )
            input_features = inputs.input_features.to(self.device)
            attention_mask = inputs.attention_mask.to(self.device)

            with torch.no_grad():
                token_ids = self.model.generate(
                    input_features,
                    attention_mask=attention_mask,
                    num_beams=3,
                )

            transcript = self.processor.batch_decode(
                token_ids,
                skip_special_tokens=True,
                clean_up_tokenization_spaces=False,
            )[0].strip()
            if transcript:
                transcripts.append(transcript)

        recognized_words = [
            RecognizedWord(text=word)
            for transcript in transcripts
            for word in transcript.split()
            if word.strip()
        ]
        logger.info(
            "ASR decoded %.1f seconds in %d chunk(s): %s",
            len(audio) / SAMPLE_RATE,
            len(transcripts),
            " ".join(word.text for word in recognized_words),
        )
        return recognized_words
