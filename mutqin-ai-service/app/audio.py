"""Decode uploaded mobile audio into the exact PCM format Whisper expects."""

import os
import subprocess
import tempfile


class AudioDecodeError(Exception):
    pass


def decode_audio(audio_path: str):
    """Return mono, 16 kHz float32 audio using a bundled FFmpeg executable."""
    import imageio_ffmpeg
    import soundfile

    wav_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    wav_path = wav_file.name
    wav_file.close()

    try:
        process = subprocess.run(
            [
                imageio_ffmpeg.get_ffmpeg_exe(),
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                audio_path,
                "-vn",
                "-ac",
                "1",
                "-ar",
                "16000",
                "-c:a",
                "pcm_s16le",
                wav_path,
            ],
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )
        if process.returncode != 0:
            raise AudioDecodeError("The uploaded recording is not valid decodable audio.")

        audio, sample_rate = soundfile.read(wav_path, dtype="float32", always_2d=False)
        if sample_rate != 16_000 or audio.size == 0:
            raise AudioDecodeError("The uploaded recording contains no usable audio.")
        return audio
    except (OSError, subprocess.SubprocessError) as error:
        raise AudioDecodeError("The uploaded recording could not be decoded.") from error
    finally:
        if os.path.exists(wav_path):
            os.unlink(wav_path)
