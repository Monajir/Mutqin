from concurrent.futures import ThreadPoolExecutor
from threading import Lock
from types import SimpleNamespace
import time

import numpy as np
import pytest

from app.vad import SileroSpeechDetector


def test_real_detector_rejects_digital_silence_without_changing_samples():
    import torch
    before_threads = torch.get_num_threads()
    detector = SileroSpeechDetector()
    assert torch.get_num_threads() == before_threads
    audio = np.zeros(16000, dtype=np.float32)
    assert not detector.has_speech(audio)
    assert not np.any(audio)
    assert detector.metadata["packageVersion"] == "6.2.3"
    assert len(detector.metadata["modelSha256"]) == 64


def test_detector_resets_state_after_failure_and_does_not_hide_it():
    detector = SileroSpeechDetector.__new__(SileroSpeechDetector)
    detector._lock = Lock()
    resets = []
    detector._model = SimpleNamespace(reset_states=lambda: resets.append(True))
    def fail(*args, **kwargs):
        raise RuntimeError("Inference failure")
    detector._timestamps = fail
    with pytest.raises(RuntimeError, match="Inference failure"):
        detector.has_speech(np.zeros(16000, dtype=np.float32))
    assert resets == [True]
    detector._timestamps = lambda *args, **kwargs: [{"start": 0, "end": 8000}]
    assert detector.has_speech(np.zeros(16000, dtype=np.float32))
    assert resets == [True, True]


def test_concurrent_requests_do_not_share_active_recurrent_state():
    detector = SileroSpeechDetector.__new__(SileroSpeechDetector)
    detector._lock = Lock()
    active = []
    def timestamps(samples, model, **kwargs):
        assert not active
        active.append(True)
        time.sleep(.02)
        return [{"start": 0, "end": 8000}]
    detector._timestamps = timestamps
    detector._model = SimpleNamespace(reset_states=lambda: active.clear())
    with ThreadPoolExecutor(max_workers=2) as executor:
        assert list(executor.map(detector.has_speech, [np.zeros(16000, dtype=np.float32)] * 4)) == [True] * 4
