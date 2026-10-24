# Recording the local baseline

Benchmark mode retains each submission locally in `data/benchmarks/` as:

- A uniquely named audio file, never the shared `last-recitation.m4a`.
- Matching `.m4a.json` metadata: selected ayahs, canonical words, model revision,
  pipeline hash, package versions, and an initially empty annotation.
- `.result.json`: raw recognized words, the exact app response, and timings.
  Failed evaluations retain a failure status for diagnosis.

This directory is ignored by Git. Copy it separately when backing up the
project. Audio is sent only to the local backend in this workflow. Normal
`dev:backend` sessions do not enable this retention. Keep this opt-in mode local.

## Start in your own terminals

From the project root, stop any existing backend with Ctrl+C in its terminal.
Only one backend may use port 8000.

Terminal 1:

```bash
npm run dev:benchmark
```

Terminal 2, with the unlocked phone connected and authorized:

```bash
npm run dev:usb
```

Open the installed Mutqin development client and select the local server. Check
`curl http://127.0.0.1:8000/health/ready` if needed. For a USB reconnect with
Metro still running, repeat both `adb -d reverse tcp:8081 tcp:8081` and
`adb -d reverse tcp:8000 tcp:8000`.

## Recording conditions

Use your normal voice, a quiet room, and a consistent phone distance of roughly
20-30 cm. Do not speak the case ID into the recording. Read from a trusted
reference if helpful: these tests assess the backend, not your memorization.
Include only the selected passage (no spoken introduction, and no Ameen).

Record one case at a time. Wait for the result, then report the case ID and any
unplanned stumble, pause, or extra attempt before proceeding. Do not discard an
otherwise valid recording because its score is low. Keep all attempts; labels
must describe what actually happened, not merely what was intended.

## Initial cases

| ID | Selected passage | What to do |
| --- | --- | --- |
| F01 | Al-Fatihah 1:1-7 | Correct recitation at normal pace. Bismillah is ayah 1. |
| F02 | Al-Fatihah 1:1-7 | Another independent correct take, same conditions. |
| F03 | Al-Fatihah 1:1-7 | Omit only رَبِّ in ayah 2; continue without correcting. |
| F04 | Al-Fatihah 1:1-7 | Replace نَسْتَعِينُ at the end of ayah 5 with نَعْبُدُ. |
| F05 | Al-Fatihah 1:1-7 | Repeat ayah 3 once, then continue normally. |
| F06 | Al-Fatihah 1:1-7 | Record a trusted qari recording played from another device; see playback conditions below. |
| Q01 | Al-Furqan 25:61-63 | Correct recitation, starting directly at ayah 61. |
| Q02 | Al-Furqan 25:61-63 | Omit only وَإِذَا in ayah 63. |
| S01 | Al-Fatihah 1:1-3 | Record 5 seconds of silence; do not speak. |

Stop after F01 and confirm capture before recording the remainder. The
canonical target positions are verified against the bundled Quran database.

## Qari playback control (F06)

Before moving to Al-Furqan, record a trusted Hafs recitation of Al-Fatihah from
another device. Select 1:1-7 in the app. Start recording about one second before
starting playback; include Bismillah and all seven ayahs, without istiadhah,
spoken introductions, Ameen, or the following surah. Stop after the final word.
Use a quiet room, moderate undistorted speaker volume, and roughly 20-30 cm
between speaker and phone. Do not recite along with the playback.

Report the reciter, source link or recording title, playback device, and any
interruptions. Preserve the source identity so the same passage can later be
tested directly from its audio file to help separate recognition errors from
speaker/room/microphone effects. No server restart is needed for this case.

F06 has kind `correct_playback` so it stays separate from the live-recitation
correct baselines and their `flagsOnUserReportedCorrect` metric. Inspect its
word flags separately; a trusted source is still a provisional correctness
label until the exact recorded passage is reviewed. A single qari recording
does not establish general accuracy or independently verify pronunciation.

## Inspect and label

From `mutqin-ai-service`:

```bash
.venv/bin/python benchmark.py list
.venv/bin/python benchmark.py cases
.venv/bin/python benchmark.py label FULL_CAPTURE_ID F01 --notes 'Normal pace; no unplanned mistakes reported'
.venv/bin/python benchmark.py report --output data/benchmark-session-report.json
```

Use the exact ID from `list`. The label command checks the selected passage and
refuses to replace an existing annotation. Leave accidental or uncertain takes
unlabelled until reviewed. Labels are explicitly user-reported, not independent
ground truth. Ask the assistant to inspect and label each capture after you
confirm what you recited; no manual file-copy step is required.

For replay, the saved audio and `expectedAyahs` metadata remain compatible with
`replay-benchmark.py FULL_CAPTURE_ID`. Stop benchmark mode and restart normal
mode before replaying, so replay requests do not become duplicate test captures.
The existing comparison runner can also read the flat `.m4a`/metadata pairs.

## What to measure

The initial nine-case investigation is recorded in
[`BENCHMARK_DIAGNOSIS_2026-10-22.md`](BENCHMARK_DIAGNOSIS_2026-10-22.md), including
replay commands and the limits of the shorter-chunk experiment.

- Flags on confirmed correct takes: candidates for ASR/alignment false positives.
- Whether the deliberately omitted/replaced target word is flagged, separately
  from whether it is correctly classified as skipped versus substituted.
- Other false flags surrounding the deliberate error.
- Raw transcript handling of repetition and silence. The current scorer drops
  insertions, so a high score does not prove repeated/extra words were detected.
- Inference time (audio decoding plus ASR) and server evaluation time. Neither
  timing includes phone upload or network latency.

This is an initial live-recitation baseline plus a separate playback control,
not a general accuracy estimate.
Reliable WER needs a checked transcript of what was actually spoken, including
intentional mistakes. These reports do not invent one from the expected Quran
passage and do not grade Tajweed or pronunciation.

## End the recording session

Stop Terminal 1 with Ctrl+C and run `npm run dev:backend` to return to normal
mode. The benchmark launcher's environment does not persist into your shell.
The saved benchmark files remain available for later analysis.
