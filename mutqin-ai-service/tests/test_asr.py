from types import SimpleNamespace

import app.asr as asr_module
from app.asr import SAMPLE_RATE, WhisperRecitationTranscriber, split_audio_at_quiet_points


class FakeFeatures:
    def to(self, device):
        return self


class FakeProcessor:
    def __call__(self, audio, sampling_rate, return_tensors, return_attention_mask):
        assert sampling_rate == 16_000
        assert return_tensors == "pt"
        assert return_attention_mask is True
        return SimpleNamespace(input_features=FakeFeatures(), attention_mask=FakeFeatures())

    def batch_decode(self, token_ids, skip_special_tokens, clean_up_tokenization_spaces):
        assert skip_special_tokens is True
        assert clean_up_tokenization_spaces is False
        return ["بسم الله"]


class FakeModel:
    def __init__(self):
        self.generate_kwargs = None

    def generate(self, input_features, **kwargs):
        self.generate_kwargs = kwargs
        return [[1, 2]]


def test_transcribe_uses_compatible_arabic_decoder_prompt(monkeypatch):
    monkeypatch.setattr(asr_module, "decode_audio", lambda path: [0.0])

    transcriber = WhisperRecitationTranscriber.__new__(WhisperRecitationTranscriber)
    transcriber.device = "cpu"
    transcriber.processor = FakeProcessor()
    transcriber.model = FakeModel()
    words = transcriber.transcribe("recording.m4a")

    assert isinstance(transcriber.model.generate_kwargs["attention_mask"], FakeFeatures)
    assert transcriber.model.generate_kwargs["num_beams"] == 3
    assert [word.text for word in words] == ["بسم", "الله"]


def test_long_audio_is_split_near_a_quiet_point():
    import numpy as np

    audio = np.ones(40 * SAMPLE_RATE, dtype=np.float32)
    quiet_start = 20 * SAMPLE_RATE
    audio[quiet_start:quiet_start + SAMPLE_RATE] = 0

    chunks = split_audio_at_quiet_points(audio)

    assert len(chunks) == 2
    assert 20 * SAMPLE_RATE <= len(chunks[0]) <= 21 * SAMPLE_RATE
    assert sum(len(chunk) for chunk in chunks) == len(audio)


def test_short_opening_phrase_is_isolated_when_followed_by_a_pause():
    import numpy as np

    audio = np.ones(20 * SAMPLE_RATE, dtype=np.float32)
    pause_start = 6 * SAMPLE_RATE
    audio[pause_start:pause_start + SAMPLE_RATE] = 0

    chunks = split_audio_at_quiet_points(audio)

    assert len(chunks) == 2
    assert 5.8 * SAMPLE_RATE <= len(chunks[0]) <= 6.3 * SAMPLE_RATE
    assert sum(len(chunk) for chunk in chunks) == len(audio)
