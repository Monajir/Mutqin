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

Copy the same Quran database bundled by the app:

```powershell
Copy-Item ..\assets\db\quran-content.db .\data\quran-content.db
```

## Run locally

CPU mode is simplest for development:

```powershell
$env:QURAN_DB_PATH=".\data\quran-content.db"
$env:ASR_DEVICE="cpu"
uvicorn app.main:app --host 0.0.0.0 --port 8000
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
| `ASR_MODEL_ID` | `tarteel-ai/whisper-base-ar-quran` | Hugging Face model ID |
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
