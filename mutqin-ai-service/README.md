# Mutqin — Hifz Evaluation Service

The backend that fills the one missing piece in the app's AI provider graph: `POST /hifz/evaluate`, called by `src/services/ai/providers/openaiCompatibleProvider.ts` and defined by the `HifzEvaluationProvider` interface. **This service was built and tested against that exact contract — the frontend needs zero code changes to use it.**

## Architecture

```
audio + expected ayah range
        │
        ▼
1. Fetch canonical text for those ayahs from quran-content.db
   (the SAME db the ingestion script produces / the app bundles —
   scoring against a different text than what's on-screen would be
   silently wrong)
        │
        ▼
2. ASR: tarteel-ai/whisper-base-ar-quran
   (Whisper fine-tuned specifically on Quranic recitation + tajweed
   patterns — not generic Arabic speech)
        │
        ▼
3. Normalize Arabic (strip tashkeel, unify alef/hamza/ya forms)
   on BOTH canonical text and transcript before comparing
        │
        ▼
4. Word-level edit-distance alignment across the WHOLE session
   (not per-ayah — see "Why session-level alignment" below)
        │
        ▼
5. Classify each canonical word: correct / pronunciation_warning /
   incorrect / skipped, aggregate into RecitationEvaluationResult
```

### Why session-level alignment, not per-ayah

A Hifz session is several ayahs recited continuously with no audio boundary markers between them. If you split the recognized word stream into per-ayah chunks *before* aligning — e.g. by guessing word counts — a single skipped or repeated word anywhere shifts every subsequent ayah's chunk boundary and corrupts all of them, not just the one ayah with the actual mistake.

`score_session()` (`app/scoring.py`) instead concatenates the *entire* expected ayah range into one canonical word sequence, aligns the *entire* recognized transcript against it in one edit-distance pass, then splits the result back into per-ayah evaluations using the known word-index ranges. I tested this specifically (`tests/test_session.py`): a skipped word in ayah 3 does not corrupt the following ayah's evaluation.

### Why `pronunciation_warning` is a confidence proxy, not real tajweed scoring

The frontend distinguishes "wrong word" (`incorrect`) from "right word, said unclearly" (`pronunciation_warning`). This service approximates the latter using Whisper's own per-word confidence (derived from token logprobs — see `app/asr.py`): a word that matches the canonical text but the model wasn't confident about gets flagged as a pronunciation warning.

**This is a real but imperfect signal, documented as such in the code.** Low ASR confidence can also mean background noise or a recording-quality issue unrelated to actual pronunciation quality. True tajweed-level analysis needs phoneme-level forced alignment — that's future work, not v1 scope (matches the product spec §6, which explicitly scopes v1 to "word-level correctness," not tajweed).

## Setup

```bash
pip install -r requirements.txt
```

You need `data/quran-content.db` — this is the SQLite file produced by the ingestion script from our earlier conversation (`mutqin-content-ingestion/`). Copy it in:
```bash
cp /path/to/quran-content.db ./data/quran-content.db
```

## Run locally

```bash
QURAN_DB_PATH=./data/quran-content.db ASR_DEVICE=cpu uvicorn app.main:app --reload
```

`ASR_DEVICE=cpu` is fine for local testing — `whisper-base-ar-quran` is a small (74M param) model and runs at usable speed on CPU for short clips. Use `cuda` in production for latency headroom.

## Test

```bash
pip install pytest httpx
pytest tests/ -v
```

Six tests, all passing as of this build:
- `test_scoring.py` / `test_session.py` — the alignment/classification engine in isolation, including the ayah-boundary-shift scenario above
- `test_api.py` — full HTTP request/response contract, using a fake ASR (no GPU/model download needed), verifying the JSON shape field-for-field against what the frontend expects, plus error-path handling (malformed input, unknown ayah)

## Deploying

This is a GPU-friendlier-but-not-required workload — `whisper-base` runs acceptably on CPU for short (<1 min) clips, which matters because it means you're not locked into GPU hosting from day one.

**Options, cheapest/simplest first:**
1. **CPU-only container** on a small VM (Fly.io, Railway, a $5–10/mo droplet) — fine for early testing/low volume, `ASR_DEVICE=cpu`
2. **Serverless GPU** (Modal, RunPod serverless, Replicate) — pay per invocation, no idle GPU cost, good fit since Hifz sessions are bursty not constant load
3. **Dedicated GPU instance** — once volume justifies it, lower per-request latency

```bash
docker build -t mutqin-hifz-eval .
docker run -p 8000:8000 \
  -v $(pwd)/data:/data \
  -e QURAN_DB_PATH=/data/quran-content.db \
  -e ASR_DEVICE=cuda \
  mutqin-hifz-eval
```

## Connecting this to the app

**This is the entire integration step** — the app-side contract was already built to expect exactly this:

1. Deploy this service, get its public URL (e.g. `https://hifz-eval.yourdomain.com`)
2. In the app, set:
   ```bash
   EXPO_PUBLIC_API_BASE_URL=https://hifz-eval.yourdomain.com
   ```
3. Rebuild the app (`eas build` or `expo run:android`/`run:ios`) so the env var bakes in.

No frontend code changes. `config/di.ts`, `hifzEvaluationProvider.ts`, and `OpenAICompatibleHifzEvaluationProvider` are already wired to call `POST {API_BASE_URL}/hifz/evaluate` with exactly the multipart shape this service accepts.

**One naming note, worth a small cleanup on the frontend side when you get to it:** the class is called `OpenAICompatibleHifzEvaluationProvider`, implying it speaks OpenAI's API format — it doesn't; it was always a generic multipart contract to *your own* backend. This service confirms that generic contract is what actually got built. Renaming that class to something like `MutqinHifzEvaluationProvider` would just be a cleanup for accuracy, not a functional change — happy to do that edit if you want.

## Known limitations (v1, by design)

- **No persistent audio storage.** The uploaded recording is written to a temp file, transcribed, then deleted (`os.unlink` in a `finally` block in `main.py`) — never stored. This matches the product spec's privacy requirement ("avoid storing user audio unless explicitly requested").
- **`pronunciation_warning` is a confidence proxy**, not phoneme-level tajweed analysis (see above).
- **Single audio format assumption** (m4a, matching what the app's recorder produces) — other formats will likely still decode fine via librosa/ffmpeg but aren't explicitly tested here.
- **No rate limiting / auth** on this service as shipped — add these before any public deployment; they're infra concerns intentionally left out of this reference implementation.
