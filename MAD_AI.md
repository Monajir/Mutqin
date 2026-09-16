## Conclusion

Yes, real AI evaluation requires a backend service—the mobile app cannot run this Python/PyTorch model directly. However, you do **not** need to build Mutqin’s entire backend first.

`mutqin-ai-service` is already the beginning of that backend:

App → authenticated API/gateway → Hifz AI service → Whisper model + Quran database

We can improve the app and test against the service locally in parallel. Before public release, the service needs deployment, authentication, rate limiting, and request validation.

## Current evaluation

What is already good:

- FastAPI endpoint at `POST /hifz/evaluate`.
- Request and response mostly match the app’s existing provider.
- Quran-specific Whisper model integration.
- Whole-session word alignment handles skipped words better than per-ayah splitting.
- Temporary recordings are deleted after processing.
- Docker configuration and automated scoring tests exist.
- The two standalone scoring tests passed locally.

The model is approximately 292 MB and intended for server-side inference. Its official model card reports a 5.75 WER, but provides limited detail about its evaluation dataset, so we should benchmark it ourselves before trusting that number for user-facing scoring. [Hugging Face model card](https://huggingface.co/tarteel-ai/whisper-base-ar-quran)

## Issues to fix before integration

1. The app always submits 15 expected ayahs, including nonexistent ayahs near the end of a surah. Most short surahs will fail with HTTP 400.

2. The database contains standalone Quranic pause marks such as `ۛ`. The service currently treats them as words, causing false “skipped” mistakes.

3. Fifteen ayahs can easily exceed 30 seconds. Whisper requires long-form timestamp handling for recordings longer than 30 seconds, which the service does not currently enable. [Whisper documentation](https://huggingface.co/docs/transformers/en/model_doc/whisper)

4. The service directory does not currently contain `data/quran-content.db`.

5. The FastAPI endpoint performs inference synchronously inside an async handler, which can block all other requests.

6. There are no limits on recording size, duration, ayah count, or concurrent evaluations.

7. There is no authentication or rate limiting.

8. The app’s 45-second timeout may be too short for CPU inference.

9. The app does not show an evaluating state during the actual upload/model processing period, allowing accidental repeated submissions.

10. Hifz progress is currently updated before the user accepts the evaluation. An inaccurate model result could immediately modify progress.

11. “Pronunciation warning” is only an ASR-confidence estimate, not genuine tajweed analysis. The UI should describe it as “unclear pronunciation or recording” rather than authoritative tajweed feedback.

12. The README’s “zero frontend changes” claim is inaccurate. The transport contract matches, but several client-side corrections are required.

## Recommended integration plan

### Phase 1: Define the initial experience

- Let users choose both starting and ending ayahs.
- Initially limit sessions to approximately 1–3 ayahs or under 30 seconds.
- Make it explicit that v1 checks word correctness, not tajweed.
- Only apply Hifz progress after the user accepts the result.

### Phase 2: Harden the AI service

- Mount the same updated `quran-content.db` used by the app.
- Remove pause symbols and non-spoken Quranic marks before alignment.
- Validate that ayahs are valid, continuous, and within a configured maximum.
- Validate audio type, size, and duration.
- Move inference into a worker thread or job queue.
- Add concurrency limits and structured error responses.
- Pin the Hugging Face model revision for reproducible deployments.
- Add a readiness check for both the model and Quran database.
- Add real-recording tests, not only synthetic recognized-word tests.
- Test the word-confidence mapping against actual model output.

### Phase 3: Correct the app integration

- Rename `OpenAICompatibleHifzEvaluationProvider` to `MutqinHifzEvaluationProvider`.
- Give the Hifz service its own configuration URL instead of replacing the global API URL.
- Submit only the ayahs actually selected and loaded.
- Add uploading, analysing, success, and retry states.
- Prevent multiple recordings/evaluations at once.
- Increase or configure the timeout.
- Add cancellation and better offline errors.
- Display word-level results before saving progress.
- Apply progress only after “Accept Result”.

### Phase 4: Local end-to-end testing

- Use Docker or a Python 3.11 environment.
- Mount the Quran database.
- Download and load the real model.
- Run the service on port 8000.
- Connect the USB phone with:
  ```powershell
  adb reverse tcp:8000 tcp:8000
  ```
- Point the development app to the local Hifz service.
- Test perfect, skipped-word, wrong-word, noisy, silent, and interrupted recordings.

The API tests did not run in the current Python 3.13 environment because FastAPI is not installed; the pure scoring tests passed. Docker/Python 3.11 is the intended runtime.

### Phase 5: Production backend

Recommended production arrangement:

- Main Mutqin API verifies the user.
- It rate-limits and proxies `/v1/hifz/evaluate` to the private AI service.
- The AI service is not exposed publicly.
- Audio is deleted immediately after evaluation.
- Logs contain metadata and latency, never recorded audio.
- Start with CPU hosting for internal testing, then assess GPU/serverless GPU based on measured latency.

Therefore, the best next step is to harden the service and correct the existing app flow together, test locally, and only then deploy the minimal backend gateway needed for production.