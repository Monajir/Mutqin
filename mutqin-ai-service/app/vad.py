"""Local speech-presence gate. Never trims or rewrites the recording."""

import hashlib
from importlib.metadata import version
from importlib.resources import files
from threading import Lock


class NoSpeechDetected(Exception):
    """A valid recording had no speech region meeting the VAD criteria."""


class SileroSpeechDetector:
    def __init__(self):
        import torch

        # Silero's import changes the process-wide CPU thread count. Preserve
        # the application's existing setting, including CPU Whisper users.
        previous_threads = torch.get_num_threads()
        try:
            from silero_vad import get_speech_timestamps, load_silero_vad
        finally:
            torch.set_num_threads(previous_threads)
        self._model = load_silero_vad().eval()  # bundled JIT weights, CPU, no download
        self._timestamps = get_speech_timestamps
        self._lock = Lock()  # Silero has recurrent state shared across frames.
        self.metadata = {
            "model": "silero-vad",
            "packageVersion": version("silero-vad"),
            "modelSha256": hashlib.sha256(
                files("silero_vad.data").joinpath("silero_vad.jit").read_bytes()
            ).hexdigest(),
            "samplingRate": 16000,
            "threshold": 0.5,
            "minSpeechDurationMs": 250,
            "minSilenceDurationMs": 100,
        }

    def has_speech(self, audio) -> bool:
        import torch

        # No amplitude normalization, speech-only concatenation, or trimming.
        samples = torch.as_tensor(audio, dtype=torch.float32, device="cpu")
        with self._lock, torch.inference_mode():
            try:
                regions = self._timestamps(
                    samples, self._model, sampling_rate=16000,
                    threshold=0.5, min_speech_duration_ms=250,
                    min_silence_duration_ms=100, speech_pad_ms=0,
                )
                return bool(regions)
            finally:
                # Also clear state after errors; never carry one user's state
                # into another request. Inference errors propagate, not reject.
                self._model.reset_states()
