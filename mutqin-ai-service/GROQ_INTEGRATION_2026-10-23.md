# Groq default integration — 23 October 2026

Groq is now the default provider for the production FastAPI application.
The previous comparison runner is no longer the only route to Groq.

Pipeline: phone M4A → backend decode → local Silero speech-presence gate →
Groq `whisper-large-v3` → existing Arabic normalization and word alignment →
the unchanged mobile evaluation response. The full original M4A is uploaded,
with Arabic, temperature 0, and no expected-verse prompt. Other decodable
containers unsupported by Groq are converted to 16 kHz WAV. API behavior follows
[Groq's speech documentation](https://console.groq.com/docs/speech-to-text).

`ASR_PROVIDER=local` selects the preserved Quran-trained Whisper implementation,
including its existing chunking and VAD. Groq mode does not load that model or
use CUDA. `start-gpu.ps1` explicitly selects local mode for the historical
Windows GPU workflow.

## Configuration and failure behavior

- `GROQ_API_KEY` is read only on the backend, from the environment or the service
  `.env`. Only that key is loaded from the file. An environment value takes
  precedence, including an explicitly empty value. The key is excluded from
  settings representation and is never sent to the mobile application.
- Missing credentials and invalid provider names fail startup clearly.
- Local VAD rejection remains HTTP 422 with `code: no_speech`; there is no Groq
  request, score, or word feedback.
- Upstream authentication, rate limits, server failures, network errors,
  timeouts, and unusable/empty transcripts return HTTP 503 without a score.
  The existing mobile provider maps this to service unavailable. No retry,
  redirect following, or automatic provider fallback is enabled.
- `/health/ready` reports `asrProvider` and `modelVersion`. It confirms local
  initialization, not live Groq availability, credential validity, or quota.
- New benchmark metadata identifies the provider, model, HTTP client version,
  and a pipeline hash including the Groq adapter. Historical captures remain intact.

## Verification completed

48 backend tests passed, covering the unchanged local adapter/scorer, real VAD,
Groq upload contract and silence gate, provider selection, failure handling,
temporary-file cleanup, and API response contracts. `npm test` passed all four
test files, including mobile result/error mappings; `npm run typecheck` passed.

A temporary Uvicorn server on port 8001 started with the default provider and
the real canonical database. No provider override was supplied. Requests went
through HTTP to `/v1/hifz/evaluate`, using saved recordings:

| Case | Outcome | Request time |
| --- | --- | --- |
| V02: quiet correct Fatihah 1–3 | HTTP 200, 10/10 matched, Groq model identity | 1.184 s |
| F04: deliberate substitution in ayah 5 | HTTP 200, target نستعين flagged incorrect, Groq model identity | 1.423 s |
| V01: silence with fan | HTTP 422 `no_speech`, no evaluation result | 0.067 s |

Evidence: `data/groq-integration-20261023T091138Z.json` (private, Git-ignored).
Hashes confirmed the original audio, metadata, and baseline results were
unchanged. Debug/benchmark capture was disabled for the smoke test. API failures
were simulated in automated tests; no live provider outage was induced.
The temporary server was stopped after verification.

**Phone check is pending at the user's request.** These results prove the
backend HTTP integration, not a new physical-phone recording or screen check.
No persistent development server was left running by this task.

## Later phone check

From the project root, in two visible terminals:

```bash
npm run dev:backend
```

```bash
npm run dev:usb
```

Connect/unlock the phone with USB debugging enabled before the USB launcher.
Open Hifz → Recitation checker and record Fatihah 1–3, including Bismillah.
Confirm word results appear. Then submit a silent recording and confirm the
no-speech message, with no results. For a fresh intentional-error check, select
Fatihah 1–7 and replace نستعين with نعبد in ayah 5; inspect that target word.
Stop each terminal with Ctrl+C. No app rebuild is needed.

Use `ASR_PROVIDER=local npm run dev:backend` after stopping the backend to resume
local-model work; plain `npm run dev:backend` selects Groq again unless the shell
has an exported provider override. Phase R2 remains documented in
[`../RECITATION_RELIABILITY_CHECKPOINT.md`](../RECITATION_RELIABILITY_CHECKPOINT.md).

This is a presentation integration checkpoint, not a claim that AI accuracy is
solved. False flags, omission alignment, ignored repetitions, and the absence of
phonetic/Tajweed assessment remain as documented in the evaluation report.
