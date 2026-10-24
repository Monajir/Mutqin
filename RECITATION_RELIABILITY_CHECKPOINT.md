# Phase R2 — Reliable Recitation Feedback

Checkpoint: **23 October 2026, Asia/Dhaka**. Resume phrase:
**“Resume Phase R2 from the post-VAD checkpoint.”**

Status: foundational pipeline and speech-presence repair complete; recognition
reliability work is deliberately deferred for **Presentation Stabilization**.
The presentation is tomorrow, **24 October 2026**, based on the user's stated
deadline. This detour does not abandon the longer-term product.

## Objective when we resume

Build a trustworthy recitation-review feature that preserves what the learner
actually said and limits misleading feedback. The product should detect
word-level omissions, substitutions, and repetitions before expanding into
pronunciation or Tajweed assessment. Model choice is replaceable; model training
from scratch is not a prerequisite.

Our engineering contribution is Mutqin's mobile workflow, offline content and
manual progress, recording/API integration, domain-specific comparison,
evaluation corpus, error handling, and validated feedback behavior. Whisper,
Silero, and standard edit-distance alignment are existing third-party techniques;
we must not present them as models or algorithms we invented.

## What is implemented and verified

- Expo 51 / React Native 0.74 Android app; existing development client preserved.
- Ubuntu project: `/home/monazir/Mutqin/App/Mutqin`. Node 22, Python 3.11,
  PyTorch 2.4.1+cu121, Transformers 4.44.2, RTX 4050 Laptop GPU (6 GB).
- Pipeline: uploaded M4A + selected consecutive ayahs → FFmpeg mono 16 kHz
  decoding → **local Silero VAD** → Quran-trained Whisper → Arabic normalization
  and session-wide word alignment → mobile feedback. Reference words are not
  supplied to Whisper as a suggested transcript.
- ASR: `basharalrfooh/whisper-small-quran`, cached revision
  `a3b54a9432bcf67549cb42c9eb1fe1870db92627`; original quiet-point chunking
  searches between 15 and 25 seconds. Accepted audio is not VAD-trimmed.
- VAD: pinned `silero-vad==6.2.3`, CPU, threshold 0.5, minimum speech region
  250 ms. Stateful inference is serialized and reset; CPU thread setting is
  preserved. No runtime cloud request is needed for this gate.
- No-speech response: HTTP 422, `code: no_speech`, human-readable retry message,
  no transcript, score, or revision suggestions. Phone handling is implemented.
- V01: two real phone attempts with running-fan noise and no speech were
  rejected; user confirmed the displayed no-speech message.
- V02: quiet recitation with the same fan passed VAD and produced an evaluation.
  Its transcript matched 7/10 reference words; acceptance does not establish ASR
  correctness. The user did not separately confirm the result's screen display.
- V03 fan-noise condition is covered by V01. Do not request or count it as an
  independent sample merely to fill a test ID.
- Latest implementation checks: 30 backend tests passed; frontend tests,
  TypeScript check, changed-file lint, and Python dependency compatibility passed.
- AI feedback never automatically changes manual memorization progress.

## Evidence to preserve

See [initial diagnosis](mutqin-ai-service/BENCHMARK_DIAGNOSIS_2026-10-22.md),
[VAD validation](mutqin-ai-service/VAD_REPAIR_VALIDATION.md), and
[session summary](mutqin-ai-service/data/benchmark-session-summary.md).

`mutqin-ai-service/data/benchmarks/` contains the original nine baseline captures
(F01–F06, Q01–Q02, S01), two V01 attempts, and one V02 attempt: **12 captures,
not 12 independent accuracy cases**. Each retains audio, selected reference,
pipeline/model metadata, user-reported annotation, and result or rejection.
All recordings had running-fan room noise, per the user's later clarification.
Labels are not independent human transcriptions.

Important evidence folders:

- `data/benchmarks/diagnostics/20261022T155025954779Z/`: exact baseline replay,
  prefix probes, and synthetic scorer controls.
- `data/benchmarks/diagnostics/20261022T155155699130Z/`: shorter-chunk experiment
  and digital-silence probe.
- `data/benchmarks/vad-validation/20261022T231414348967Z/report.json`: 29 VAD
  checks, nine production-transcriber checks, and two actual API-handler checks.
- `data/benchmark-session-report.json`: consolidated labels and results.
- [Earlier Groq comparison](mutqin-ai-service/GROQ_BENCHMARK.md): a separate,
  older four-recording Furqan experiment, not a test of the current corpus.

The original transcripts reproduced exactly offline. VAD preserved all eight
recitation transcripts while rejecting S01; attenuated copies and synthetic
noise checks passed. Existing audio and result files remain intact. Metadata
has since been augmented with user-provided labels and fan-noise context, so
old metadata hashes describe the earlier snapshot rather than current notes.

Recordings and JSON evidence are Git-ignored and require separate backup.
The current checkout is `main`, based on `6c13d44`, with uncommitted restoration,
benchmark, VAD, and documentation work. **That commit alone is not this
checkpoint.** Do not reset/clean the checkout or assume a fresh clone restores
it. This file is a written handoff, not a Git tag or backup archive.

## Unresolved problems and what the evidence actually says

1. **ASR context sensitivity:** openings disappear in some full chunks but
   reappear when only a prefix is transcribed. This points to recognition
   behavior, but no independent listening/transcription was completed.
2. **Shorter chunks are not a general fix:** qari F06 improved from 15/29 to
   25/29 reference matches, while F04 regressed from 17/29 to 12/29. The
   experimental 8–15-second setting was not adopted.
3. **Omission classification:** Q02's transcript preserves the omission of
   وإذا, but an adjacent recognition error creates two equally cheap edit
   alignments. The scorer marks هونا skipped and وإذا incorrect. Changing
   the recognition model alone does not guarantee this problem disappears.
4. **Repetition:** F05's repeated ayah was not preserved by ASR. Even a perfect
   repeated transcript gets no separate insertion penalty under today's scorer.
5. **Scope:** reference-word match is not WER, general model accuracy, or
   pronunciation/Tajweed accuracy. We have not isolated model size as the cause.

## Resume plan, in order

1. Read this file and the two diagnosis/validation documents. Inspect current
   diffs and server/device state; preserve presentation changes and VAD.
2. Manually verify saved opening audio, ideally with the user or a competent
   reviewer. Record what was actually spoken, including errors/repetitions.
   Do not use the expected Quran text or a model transcript as ground truth.
3. Identify the exact Al-Husary Murattal source used on Quran.com, then compare
   direct-source audio with the Samsung S9 FE playback capture. Exact URL is
   still unknown; do not silently substitute a different recording.
4. Compare a bounded set of recognizers and segmentation approaches on identical
   saved audio. Include a larger hosted ASR baseline and a dedicated correction
   engine if accessible. Keep external-service tests separate and identify
   which recordings would leave the machine before introducing a new provider.
5. Measure false flags on verified correct takes; detection and classification
   of deliberate errors; opening-word retention; repetition preservation;
   silence behavior; latency/cost. Preserve raw outputs, not just scores.
6. Use fresh recordings as validation after choosing settings on this corpus.
   Include quiet speech, fan noise, other speakers, passages, and natural pauses.
7. Address alignment ambiguity and insertion reporting separately. A similarity
   tie-break must not relabel genuinely different words as correct.
8. Roll out only demonstrated improvements, with a selectable provider and
   preserved local fallback. Longer-term phonetic/Tajweed assessment is its own
   research stage, requiring suitable labels and expert review.

Resume commands from the project root: `npm run dev:benchmark` in the backend
terminal and `npm run dev:usb` in the phone-connected Metro terminal. From the
service directory: `.venv/bin/python benchmark.py list` and
`.venv/bin/python validate-vad.py --with-asr`. The raw chunk diagnostic bypasses
VAD intentionally; use the VAD validator to check the production gate.

## Presentation Stabilization detour

Read [the options review](PRESENTATION_AI_OPTIONS.md). After the initial research,
the user authorized a Groq evaluation and supplied a key locally. Nine saved
speech recordings were uploaded, while three no-speech recordings were rejected
locally. See [the completed comparison](mutqin-ai-service/GROQ_EVALUATION_2026-10-23.md).
Groq has now been integrated as the default backend provider. Local Whisper is
preserved under `ASR_PROVIDER=local`, including the original chunking and VAD.
See [integration verification](mutqin-ai-service/GROQ_INTEGRATION_2026-10-23.md).
This changes transcription, not the known ASR/scoring limitations or the Phase R2
research plan. The historical state described above remains the post-VAD local checkpoint.

Recommended time budget: at most one focused 60–90 minute trial of an accessible
provider, then decide. This is a proposed work limit, not a test already run.
If access/setup consumes that time or results do not clearly improve, stop AI
experimentation for the presentation and polish the mobile application.

Prioritize startup/navigation, Quran reading and bookmarks, manual Hifz progress,
prayer/offline behavior, recording/retry/error states, readable UI, and a rehearsed
demo. Present AI feedback as experimental; distinguish manual progress from AI
results. A prerecorded fallback demonstration may be used if clearly identified
as prerecorded. Do not fake successful recognition or describe Qari playback as
your own correct-recitation test.

Presentation explanation:

> Mutqin's mobile workflow is implemented end to end, including recording,
> backend integration, word-level review, and speech detection. The current
> Groq-hosted speech recognizer is an experimental component. Our
> tests identified transcription, chunk-context, and alignment limitations;
> we fixed silence handling, compared providers, and preserved a benchmark for the next stage.
> The course deliverable focuses on the mobile application, while improving
> recitation reliability remains a documented continuation of the project.
