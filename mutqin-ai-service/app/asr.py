"""Quran-recitation speech recognition behind one replaceable interface."""

from typing import Protocol

from app.scoring import RecognizedWord


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
        self.processor = WhisperProcessor.from_pretrained(model_id)
        self.model = WhisperForConditionalGeneration.from_pretrained(model_id).to(self.device)
        self.model.eval()

    def transcribe(self, audio_path: str) -> list[RecognizedWord]:
        import librosa
        import torch

        audio, _ = librosa.load(audio_path, sr=16_000, mono=True)
        inputs = self.processor(audio, sampling_rate=16_000, return_tensors="pt")
        input_features = inputs.input_features.to(self.device)

        with torch.no_grad():
            token_ids = self.model.generate(input_features, language="ar", task="transcribe")

        transcript = self.processor.batch_decode(token_ids, skip_special_tokens=True)[0]
        return [RecognizedWord(text=word) for word in transcript.split() if word.strip()]
