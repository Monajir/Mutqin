# Backend diagnosis — 22 October 2026

The baseline failures reproduce offline. Recognition changes substantially
with chunk context, the model generates speech on digital silence, and the
word aligner cannot reliably distinguish adjacent substitution/omission errors.
No application ASR, scoring, dependency, or running-server settings were changed
during this investigation.

## Evidence and limits

All nine original transcripts reproduced exactly using the cached model on
CUDA, original decoding and chunking, and three-beam generation. Each capture's
pipeline fingerprint and model revision matched. Hash checks confirmed that
the original audio, metadata, and results stayed unchanged in both replay runs.
The investigation did not send audio to an external service or call the live
evaluation API.

These are user-reported labels. I inspected decoded audio statistics and
machine transcripts, but did not independently listen to or manually transcribe
the recordings. Model-produced prefix transcripts are diagnostic evidence,
not ground truth. The exact Quran.com source recording for the qari control
has not been identified or directly compared.

Model: `basharalrfooh/whisper-small-quran`, revision
`a3b54a9432bcf67549cb42c9eb1fe1870db92627`.

## Missing openings are sensitive to recognition context

The original splitter supplies contiguous audio starting at sample zero; the
FFmpeg decode command does not trim the start. Missing opening words are
already absent from the first chunk's ASR output, before scoring or display.

Using the same decoded audio and generation settings:

- F01/F02: the first 12 seconds produce Bismillah, while their original first
  chunks (21.575/20.325 seconds) omit it.
- F05: an eight-second prefix produces Bismillah and most of ayah 2, while
  the original 23.075-second first chunk begins at ayah 3. A 12-second prefix
  also loses the opening, showing that shorter is not consistently better.
- F06: a 12-second prefix produces Bismillah and ayah 2; the original
  21.575-second first chunk begins at ayah 3.

This supports context-sensitive ASR loss as a contributor. It does not establish
the exact audible content independently or rule out phone startup/playback
issues in every recording. Nothing in this evidence justifies blaming the
user's pronunciation for the missing openings.

## Shorter chunks are an experiment, not a validated repair

One controlled comparison changed the quiet-point search bounds from 15–25
seconds to 8–15 seconds, in a separate process only. Same audio, model, decoder,
and scorer; no expected Quran text was supplied as an ASR prompt.

| Case | Original reference matches | Shorter-chunk reference matches |
| --- | --- | --- |
| F01 | 18/29 | 20/29 |
| F02 | 14/29 | 18/29 |
| F03 | 11/29 | 15/29 |
| F04 | 17/29 | 12/29 |
| F05 | 13/29 | 21/29 |
| F06 | 15/29 | 25/29 |
| Q01 | 30/36 | 30/36 |
| Q02 | 29/36 | 31/36 |
| S01 | 0/10 | 0/10 |

F06 improves markedly, but F04 loses opening material and regresses. F05's
repetition is still absent. Q02's omission becomes correctly classified as
skipped, while other transcription errors remain. Higher reference matches
alone cannot show whether deliberate mistakes were faithfully transcribed.
This corpus was used to explore the setting, so it is not independent validation.
The shorter setting was not adopted.

## Silence is not rejected

S01 lasts 6.386 seconds. The reported quiet-room recording has RMS -31.60 dBFS
and peak -17.23 dBFS: it is not digital zero. Its transcript reproducibly says
`وَاللَّهُ يَوْمَ الْقِيَامَةِ` twice.

An additional all-zero waveform of the same length also produces repeated
Arabic text and reaches 448 output tokens, the configured sequence limit.
This establishes that acoustic speech is not required for this model to emit
words under the current decoding settings.

The application has no speech-presence gate and scores every nonempty upload.
Even an empty ASR transcript would currently become a normal all-skipped result,
rather than a distinct no-speech response. Zero matched words on S01 is therefore
not a successful silence rejection.

An arbitrary volume threshold is not a validated solution: S01's noise level
overlaps quieter frames in the recitations, and quiet speech has not been tested.
Speech-presence detection needs its own validation with quiet recitation,
background noise, and silence, followed by an explicit retry/no-speech outcome.

## Alignment explains Q02's incorrect omission label

The relevant reference is `هونا وإذا خاطبهم`; the ASR output is
`هولا خاطبهم`. Two paths have the same word edit cost of two:

1. Skip `هونا`, substitute `وإذا` with `هولا`, match `خاطبهم`.
2. Substitute `هونا` with `هولا`, skip `وإذا`, match `خاطبهم`.

The current diagonal-first backtracking chooses the first. This is a real
ambiguity in the scorer's objective, not evidence that the reciter skipped
`هونا`. A character-similarity tie-break could prefer the second, but would need
tests on competing substitutions and repeated words. It must not turn similar
but different words into correct matches.

Six synthetic transcript controls isolate scoring from recognition. Correct
Fatihah and Furqan match all reference words; ideal F03/Q02 omissions produce
one skipped target; ideal F04 produces one incorrect target. Ideal F05 still
matches every reference word because insertions are deliberately dropped.
Repetition detection consequently needs both faithful ASR and an output that
retains insertion information.

## Repair order

1. Add and validate speech-presence handling with a distinct no-speech/retry
   outcome. Test quiet speech so it is not incorrectly rejected.
2. Verify opening audio manually and identify the qari source. Compare direct
   source audio with its phone playback recording to separate recording effects
   from ASR behavior.
3. Evaluate segmentation and recognition alternatives on preserved recordings,
   including deliberate errors; validate chosen settings on new recordings.
   Do not force expected verses into the transcript or select outputs merely
   because they match the reference better.
4. Improve ambiguous alignment handling and expose insertions separately;
   preserve strict word matching and avoid pronunciation claims.

## Reproduce and inspect

`diagnose-recordings.py` loads the cached model offline and requires CUDA. It
writes a unique directory below `data/benchmarks/diagnostics/`; it never calls
the running backend or labels new captures. Keep the phone idle while running
GPU comparisons to avoid contention.

```bash
.venv/bin/python diagnose-recordings.py
.venv/bin/python diagnose-recordings.py --min-chunk-seconds 8 --max-chunk-seconds 15 --prefix-seconds
```

The first run's evidence is in
`data/benchmarks/diagnostics/20261022T155025954779Z/` (including
`scorer-controls.json`). The shorter-chunk run and digital-zero probe are in
`data/benchmarks/diagnostics/20261022T155155699130Z/` (including
`comparison.json`). Each per-case JSON contains chunk boundaries, transcripts,
audio statistics, hashes, and model revision. `samePipeline` means source-file
fingerprints match; the experiment still overrides chunk bounds in its own
process, recorded in `chunkBoundsSeconds`.

Raw recordings and diagnostic JSON are Git-ignored and need separate backup.
This diagnosis document and the session summary Markdown are not Git-ignored.

Validation: all 23 existing backend tests passed (one dependency deprecation
warning); the diagnostic CLI compiled and its help command ran successfully.
Both GPU experiment processes completed and released their models. The user's
servers were not restarted or stopped.
