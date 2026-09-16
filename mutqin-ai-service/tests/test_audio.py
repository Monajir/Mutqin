import subprocess
import wave

import imageio_ffmpeg

from app.audio import AudioDecodeError, decode_audio


def test_android_style_m4a_is_decoded_to_whisper_format(tmp_path):
    wav_path = tmp_path / "source.wav"
    m4a_path = tmp_path / "recording.m4a"

    with wave.open(str(wav_path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16_000)
        wav.writeframes(b"\0\0" * 16_000)

    subprocess.run(
        [
            imageio_ffmpeg.get_ffmpeg_exe(),
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(wav_path),
            "-c:a",
            "aac",
            str(m4a_path),
        ],
        check=True,
    )

    audio = decode_audio(str(m4a_path))
    assert audio.ndim == 1
    assert 15_000 <= len(audio) <= 17_000


def test_invalid_audio_is_rejected(tmp_path):
    invalid_path = tmp_path / "invalid.m4a"
    invalid_path.write_bytes(b"not audio")

    try:
        decode_audio(str(invalid_path))
    except AudioDecodeError:
        return
    raise AssertionError("invalid audio should not decode")
