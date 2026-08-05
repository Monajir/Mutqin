"""
ASR wrapper — isolates the app from the specific Whisper checkpoint used.

Model choice: tarteel-ai/whisper-base-ar-quran (fine-tuned specifically on
Quranic recitation + tajweed patterns, not generic Arabic speech — verified
this is a real, actively-maintained model as of writing). Swap to
`IJyad/whisper-large-v3-Tarteel` for higher accuracy at higher latency/cost,
or a LoRA fine-tune on top of the base model for a middle ground — that's a
one-line change to MODEL_ID below, nothing downstream needs to change.

Whisper's own output doesn't give clean per-WORD confidence out of the box —
only per-token logprobs. This wrapper computes an approximate per-word
confidence by averaging the logprobs of the tokens that make up each word,
which is standard practice for this kind of scoring.
"""
from dataclasses import dataclass

MODEL_ID = "tarteel-ai/whisper-base-ar-quran"


@dataclass
class TranscribedWord:
    text: str
    confidence: float  # 0.0-1.0, derived from token logprobs


class ArabicRecitationASR:
    """
    Thin wrapper around a transformers Whisper pipeline. Loaded once at
    process startup (model load is slow; never load per-request).
    """

    def __init__(self, model_id: str = MODEL_ID, device: str = "cuda"):
        # Imports deferred to keep this module importable (and unit-testable,
        # see test_scoring.py) without requiring torch/transformers installed —
        # only the actual service process needs the heavy ML dependencies.
        import torch
        from transformers import WhisperForConditionalGeneration, WhisperProcessor

        self.device = device if torch.cuda.is_available() else "cpu"
        self.processor = WhisperProcessor.from_pretrained(model_id)
        self.model = WhisperForConditionalGeneration.from_pretrained(model_id).to(self.device)
        self.model.eval()

    def transcribe(self, audio_path: str) -> list[TranscribedWord]:
        import librosa
        import torch

        audio, _ = librosa.load(audio_path, sr=16000, mono=True)
        inputs = self.processor(audio, sampling_rate=16000, return_tensors="pt").to(self.device)

        with torch.no_grad():
            generated = self.model.generate(
                inputs.input_features,
                language="ar",
                task="transcribe",
                output_scores=True,
                return_dict_in_generate=True,
            )

        token_ids = generated.sequences[0]
        text = self.processor.decode(token_ids, skip_special_tokens=True)

        # Approximate per-token confidence from generation scores, then
        # collapse to per-word by averaging the tokens each word decodes to.
        token_confidences = self._token_confidences(generated, token_ids)
        return self._words_with_confidence(token_ids, token_confidences)

    def _token_confidences(self, generated, token_ids) -> list[float]:
        import torch

        confidences = []
        for step_scores in generated.scores:
            probs = torch.softmax(step_scores[0], dim=-1)
            confidences.append(probs.max().item())
        return confidences

    def _words_with_confidence(self, token_ids, token_confidences: list[float]) -> list[TranscribedWord]:
        # Decode token-by-token to detect word boundaries (Whisper's BPE
        # tokenizer uses a leading-space marker for new words in most
        # languages including Arabic transliteration internals).
        words: list[TranscribedWord] = []
        current_word_tokens: list[int] = []
        current_confidences: list[float] = []

        special_ids = set(self.processor.tokenizer.all_special_ids)
        content_token_ids = [t for t in token_ids.tolist() if t not in special_ids]
        # Align confidences (one per generated step) to content tokens only.
        content_confidences = token_confidences[: len(content_token_ids)]

        for token_id, confidence in zip(content_token_ids, content_confidences):
            piece = self.processor.tokenizer.decode([token_id])
            if piece.startswith(" ") and current_word_tokens:
                words.append(self._flush_word(current_word_tokens, current_confidences))
                current_word_tokens, current_confidences = [], []
            current_word_tokens.append(token_id)
            current_confidences.append(confidence)

        if current_word_tokens:
            words.append(self._flush_word(current_word_tokens, current_confidences))

        return words

    def _flush_word(self, token_ids: list[int], confidences: list[float]) -> TranscribedWord:
        text = self.processor.tokenizer.decode(token_ids).strip()
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        return TranscribedWord(text=text, confidence=avg_confidence)
