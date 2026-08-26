# Mutqin Backend and AI Integration Plan

## Decision

Use one small FastAPI backend for the Hifz evaluation feature. Do not split authentication, content, AI, and synchronization into separate services at this stage.

The mobile app remains offline-first. Quran content, bookmarks, preferences, and Hifz progress stay on the device. The backend performs only the operation that requires server compute: evaluating an uploaded recitation.

## Current architecture

```text
Expo mobile app
  ├─ bundled Quran/library SQLite database
  ├─ local bookmarks and Hifz progress
  └─ POST /v1/hifz/evaluate
            │
            ▼
Single FastAPI backend
  ├─ upload and ayah-range validation
  ├─ canonical Quran lookup
  ├─ replaceable Quran ASR adapter
  └─ deterministic session-wide word alignment
```

## Evaluation contract

The mobile app uploads `multipart/form-data`:

- `audio`: one M4A/MP4/WAV recording
- `expectedAyahs`: a JSON array of consecutive `{surahId, ayahNumber}` objects

The backend returns:

- a unique evaluation ID
- the configured model version
- per-ayah canonical words classified as `correct`, `incorrect`, or `skipped`
- aggregate word counts and a word-match score
- ayahs suggested for revision

The backend does not accept Quran text from the phone. It reads canonical text from the same content database version used by the app.

## AI boundaries

- Speech recognition is replaceable behind `RecitationTranscriber`.
- Word comparison is deterministic and separately testable.
- The first version does not claim Tajweed or pronunciation assessment.
- ASR confidence is not treated as pronunciation evidence.
- The app saves results only after the user reviews and accepts them.

## Implemented safeguards

- Versioned `/v1` API route
- Liveness and readiness endpoints
- Maximum 15 consecutive ayahs per session
- Maximum 15 MB audio upload
- Supported-audio validation
- Server-side ayah existence checks
- Temporary audio deletion after every request, including failures
- Generic client-facing model errors with server-side logging
- Ninety-second mobile timeout for CPU evaluation

## Local development

Run the backend on the PC and reverse its port to the Android phone:

```powershell
adb reverse tcp:8000 tcp:8000
```

Configure the Expo app before starting Metro:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://127.0.0.1:8000/v1"
npx expo start --dev-client --localhost --clear
```

The backend uses `assets/db/quran-content.db` copied or mounted at the path specified by `QURAN_DB_PATH`.

## Path to a controlled beta

### 1. Model validation

- Build a consented test set covering different reciters, devices, noise levels, surahs, pauses, repetitions, and omissions.
- Record word error rate and false-correction rates.
- Compare at least two Quran-recitation ASR checkpoints using the same deterministic scorer.
- Choose a model only after measured results meet an agreed threshold.

### 2. Secure deployment

- Deploy the existing container behind HTTPS.
- Keep the model and Quran database in the same deployment initially.
- Put authentication and rate limiting at the API gateway or reverse proxy.
- Do not embed a permanent service secret in the mobile application.
- Add request metrics, latency monitoring, and error reporting without logging audio or Quran recitations.

### 3. Limited release

- Enable the feature for a small tester group.
- Clearly label the result as automated assistance, not authoritative Tajweed judgement.
- Provide a way to discard a result without changing progress.
- Review false positives before increasing access.

## Deferred until genuinely needed

- Streaming word-by-word evaluation
- Separate AI microservices or queues
- Persistent audio storage
- Cloud bookmark/progress synchronization
- Social features
- Tajweed or phoneme-level scoring

If accounts and cross-device sync become a product requirement, add them as a separate backend phase with explicit identity, ownership, conflict-resolution, and deletion rules. They are not prerequisites for validating the Hifz model.
