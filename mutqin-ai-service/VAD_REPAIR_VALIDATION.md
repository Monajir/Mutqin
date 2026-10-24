# Speech-presence repair — 23 October 2026 (Asia/Dhaka)

The backend now decodes an upload once, checks speech presence with local
Silero VAD, and only then runs the existing Whisper and word-scoring pipeline.
A rejected recording returns HTTP 422, code `no_speech`, and the message
“No speech detected. Please record again.” It produces no evaluation result.
The mobile provider recognizes this code and sends the retry message through
the session's existing error display, without entering the score-review state.

## Implementation

- `silero-vad==6.2.3` is pinned and installed in the project's environment.
  Bundled JIT weights run on CPU; existing PyTorch 2.4.1+cu121 was preserved.
- Threshold 0.5; minimum speech region 250 ms; minimum silence 100 ms; no
  speech padding. Any retained speech region accepts the complete recording.
  These are fixed settings, not tuned to maximize Quran reference matches.
- VAD does not normalize amplitude, trim audio, concatenate speech regions,
  change chunk boundaries, or provide expected words to Whisper.
- A lock protects the detector's recurrent state. State resets after each
  request, including failures. Detector errors remain service failures, not
  no-speech decisions. Loading the detector preserves PyTorch's CPU thread count.
- New captures record VAD version, bundled model SHA-256, and settings. Their
  pipeline fingerprint includes `vad.py`. No-speech captures have status
  `rejected`, reason `no_speech`, and no invented transcript or score.
- An older phone client can still display the string `detail`. The updated
  client also recognizes the stable machine code as failure reason `no_speech`.

## Validation completed

The standalone `validate-vad.py --with-asr` run tested actual bundled VAD and
the production transcriber, plus the real API handler in-process. It did not
send requests to the user's live server, create duplicate benchmark captures,
or modify original audio, metadata, or results. Hash checks passed.

| Check | Result |
| --- | --- |
| Eight original recitation recordings | All accepted |
| Sixteen copies attenuated by 20 or 40 dB | All accepted |
| S01 quiet-room recording | Rejected before Whisper |
| Digital silence, seeded white noise, 50 Hz hum, brief click | All rejected |
| Production ASR on the eight accepted originals | All transcripts exactly match the saved baseline |
| Actual API on F01 | HTTP 200; entire result matches baseline |
| Actual API on S01 | HTTP 422 `no_speech`; no result |
| Backend regression suite | 30 passed |
| Frontend regression suite and TypeScript check | Passed |
| ESLint on changed TypeScript files | Passed |
| Installed Python dependency compatibility | Passed |

The report contains 29 VAD checks, nine production-transcriber checks, and two
API checks. Results and model fingerprint are saved at
`data/benchmarks/vad-validation/20261022T231414348967Z/report.json` (UTC directory
timestamp). VAD checks took approximately 0.05–0.51 seconds in this run;
timing is machine- and recording-dependent, not an end-to-end latency claim.

## Limits and phone checks

Attenuated audio reduces both voice and recorded background noise. It does
not replace testing a person speaking quietly into the actual phone microphone.
Synthetic noise does not represent all real room sounds. The eight positive
recordings come from a small set of passages and voices. Speech shorter than
the minimum region duration can be rejected. Background conversation or a TV
can pass because VAD detects speech, not the intended reciter or Quran content.

Start the servers in user-owned terminals to load the code. At the final status
check, neither server was running and no phone was connected:

1. Connect and unlock the phone with USB debugging enabled. From the project
   root, run `npm run dev:benchmark` in one terminal and `npm run dev:usb` in
   another. If a backend is already running, stop it with Ctrl+C first.
2. Reload the development app to ensure it has the updated JavaScript.
3. V01: select Al-Fatihah 1–3 and record about five seconds without speaking.
   Expect “No speech detected. Please record again.” with no score or flags.
4. V02: keep Al-Fatihah 1–3 selected and recite the full passage quietly but
   audibly, including Bismillah. Expect normal evaluation, not a no-speech
   rejection. Existing transcription errors may still produce flags.
5. V03: with the same passage selected, record five seconds of ordinary
   non-speech room noise, such as a fan. No speech or audio playback. Expect
   the no-speech message. Report the noise source.

V01 phone check completed on 23 October: two captures at 05:58:47 and 05:59:15
UTC were both rejected with reason `no_speech`, with no transcript or result.
The user explicitly confirmed both attempts were silent and reported seeing
the no-speech message on the phone. Both captures are labelled V01 and retained.
This also confirms that the updated backend is running.

V02 completed on 23 October: the capture at 06:02:46 UTC, reported by the user
as the instructed quiet recitation, passed VAD and produced a normal evaluation
(7/10 reference words matched, three flagged incorrect). This establishes
speech acceptance for this attempt, not transcription or pronunciation accuracy.
The user has not explicitly confirmed that the phone displayed its result.
The user subsequently clarified that all session recordings had room noise
from a running fan. Both V01 attempts therefore already test no speech with
real fan noise, and V02 tests quiet recitation with that noise present. The
planned V03 fan-noise condition is covered by V01; no separate V03 recording
was made, and it must not be counted as an additional independent sample.
Environment annotations were added to the existing capture metadata after
validation; audio and baseline result files remain unchanged. Earlier hash
checks describe the metadata at the time of those validation runs.

The planned VAD recording checks are complete for this user's room/phone
conditions. This is not validation across other noise sources or speakers.
The implementation and offline checks are complete; it has not been validated
across diverse speakers or deployed beyond this local development environment.

## Reproduce

From `mutqin-ai-service`, with dependencies installed:

```bash
.venv/bin/python validate-vad.py
# Also compare the production CUDA transcriber and exercise the API:
.venv/bin/python validate-vad.py --with-asr
```

Each run writes a new Git-ignored validation directory. Keep the phone idle
during GPU replay. `diagnose-recordings.py` intentionally examines raw ASR
chunks without gating; use `validate-vad.py` to test the production speech gate.

Silero documentation: https://github.com/snakers4/silero-vad
