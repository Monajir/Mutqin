# Mutqin Backend — Hifz Evaluation

This directory contains Mutqin's first backend capability: synchronous Quran-recitation evaluation. It is deliberately a single FastAPI service, not a collection of microservices.

## API

- `GET /health/live` — process liveness
- `GET /health/ready` — Quran database and ASR readiness
- `POST /v1/hifz/evaluate` — recitation evaluation
- `GET /docs` — interactive OpenAPI documentation

`POST /v1/hifz/evaluate` expects multipart fields:

- `audio`: M4A, MP4, WAV, MP3, or 3GP audio
- `expectedAyahs`: JSON array of consecutive ayah references

Example value:

```json
[
  { "surahId": 1, "ayahNumber": 1 },
  { "surahId": 1, "ayahNumber": 2 }
]
```

The response contains an evaluation ID, model version, per-word results, aggregate counts, and revision suggestions.

## Important scope

The service reports normalized word matches, substitutions, and omissions. It does **not** claim pronunciation or Tajweed assessment. Audio is written to a temporary file for decoding and deleted after the request.

## Setup

Create a virtual environment and install the dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

The Python dependencies include a platform-specific FFmpeg binary. This is
used to convert Android M4A/AAC recordings to mono 16 kHz WAV before ASR, so
Windows does not require a separate FFmpeg installation.

Long recordings are split at quiet pauses before transcription so no audio is
lost at Whisper's 30-second input boundary. The server logs the recognized
words and aggregate word counts for local accuracy diagnostics.

The default ASR checkpoint is `basharalrfooh/whisper-small-quran`, selected
for its broader normal-reciter training set. Override it with `ASR_MODEL_ID`
when benchmarking another compatible Whisper checkpoint.

For local ASR diagnosis only, set `ASR_DEBUG_AUDIO_PATH` to retain the latest
uploaded recording. The file is overwritten on each evaluation; leave the
variable unset outside local development.

Copy the same Quran database bundled by the app:

```powershell
Copy-Item ..\assets\db\quran-content.db .\data\quran-content.db
```

## Run locally

GPU mode is recommended on a Windows computer with a supported NVIDIA GPU. Install the matching CUDA-enabled PyTorch build once:

```powershell
.\.venv\python.exe -m pip install --force-reinstall torch==2.4.1 --index-url https://download.pytorch.org/whl/cu121
```

Then start the backend with the included launcher:

```powershell
.\start-gpu.ps1
```

The launcher selects CUDA, loads the previously downloaded model from the local Hugging Face cache, and starts Uvicorn on port 8000. The ASR adapter automatically falls back to CPU if CUDA is unavailable.

To explicitly use CPU instead:

```powershell
$env:QURAN_DB_PATH=".\data\quran-content.db"
$env:ASR_DEVICE="cpu"
.\.venv\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For an Android phone connected through ADB:

```powershell
adb reverse tcp:8000 tcp:8000
$env:EXPO_PUBLIC_API_BASE_URL="http://127.0.0.1:8000/v1"
```

Then restart the Expo development server.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `QURAN_DB_PATH` | `./data/quran-content.db` | Canonical Quran database |
| `ASR_MODEL_ID` | `basharalrfooh/whisper-small-quran` | Hugging Face model ID |
| `ASR_DEVICE` | `cpu` | `cpu` or `cuda` |
| `API_PREFIX` | `/v1` | Versioned API prefix |
| `MAX_UPLOAD_BYTES` | `15728640` | Maximum recording size |
| `MAX_AYAHS_PER_EVALUATION` | `15` | Maximum consecutive ayahs |

## Tests

The API and scorer tests use a fake transcriber, so they do not download or load the model:

```powershell
pytest tests -q
```

## Docker

```powershell
docker build -t mutqin-backend .
docker run --rm -p 8000:8000 `
  -v "${PWD}\data:/data" `
  -e QURAN_DB_PATH=/data/quran-content.db `
  -e ASR_DEVICE=cpu `
  mutqin-backend
```

See [`../BACKEND_AI_INTEGRATION_PLAN.md`](../BACKEND_AI_INTEGRATION_PLAN.md) for the architecture, validation plan, and production-beta path.
