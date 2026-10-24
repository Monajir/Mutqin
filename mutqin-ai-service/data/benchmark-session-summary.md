# Initial backend recording session — 22 October 2026

Nine captures are labelled and retained locally. Labels reflect user reports, not independent audio annotation. Counts measure reference-word transcript matches, not pronunciation accuracy or WER. The qari playback control is separate from live recitation.

| Case | Test | Matched | Flagged | Inference seconds |
| --- | --- | --- | --- | --- |
| F01 | Correct Fatihah | 18/29 | 11 | 2.811 |
| F02 | Correct Fatihah, second take | 14/29 | 15 | 2.731 |
| F03 | Omit رب | 11/29 | 18 | 2.927 |
| F04 | Replace نستعين with نعبد | 17/29 | 12 | 3.206 |
| F05 | Repeat ayah 3; possible ص/س deviation reported | 13/29 | 16 | 2.440 |
| F06 | Al-Husary Murattal playback via tablet | 15/29 | 14 | 3.252 |
| Q01 | Correct Furqan 61–63 | 30/36 | 6 | 3.613 |
| Q02 | Omit وإذا | 29/36 | 7 | 3.523 |
| S01 | Silence | 0/10 | 10 | 0.918 |

## Findings

- S01: reported silence produced والله يوم القيامة twice. Zero reference matches does not mean silence was correctly rejected: the backend returned invented words and normal word-error feedback.
- Correct live takes F01/F02/Q01 received 11/15/6 flags respectively. These are candidate false flags pending audio review. They are not evidence that the user made that many recitation errors.
- F06: Al-Husary Murattal on Quran.com, played on a Samsung S9 FE tablet, received 14 flags. Exact source URL is unknown; whether the opening two ayahs were captured has not been explicitly confirmed. The transcript omitted both. Playback does not isolate model quality from speaker, room, and microphone effects.
- F03: omission target رب was flagged incorrect, with الأرض in the transcript. This was not a clean skipped-word classification.
- F04: substitution target نستعين was flagged incorrect and the transcript approximately reflected the replacement. The target was already flagged in both correct Fatihah takes, limiting evidence for discrimination.
- F05: the transcript retained only one الرحمن الرحيم and omitted ayahs 1–2. The reported repetition was not preserved. The user also reported an uncertain ص/س deviation at the start of ayah 7; do not treat that word as verified correct or incorrect.
- Q02: وإذا was absent from the transcript and flagged incorrect, while the preceding هونا was marked skipped. Q01 had recognized وإذا correctly. The contrast supports target flagging in this pair, but omission classification was inaccurate.
- Openings were absent from several transcripts. The cause remains unresolved: inspect captured audio and chunk boundaries before attributing it to recording loss or model behavior.

## Next diagnostic work

Follow-up completed: offline replay, chunk-context probes, synthetic digital
silence, and isolated scorer checks. See
[`BENCHMARK_DIAGNOSIS_2026-10-22.md`](../BENCHMARK_DIAGNOSIS_2026-10-22.md) for
findings and the remaining audio-review work. Application behavior is unchanged.

1. Review saved audio against the actual spoken content, prioritizing missing openings and the silence capture; retain original baseline outputs.
2. Identify the exact qari source and compare direct-source audio with the phone playback capture, recording any replay separately.
3. Investigate speech-presence handling, ASR chunk outputs, and alignment of neighboring mismatches. Compare any changes against these saved cases before collecting broad accuracy metrics.

Raw audio and metadata: `benchmarks/`. Full transcripts, labels, and word flags: `benchmark-session-report.json`. Those audio/JSON files are ignored by Git and need separate backup; this Markdown summary is not ignored.
