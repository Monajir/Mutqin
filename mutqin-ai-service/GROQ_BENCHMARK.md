# Groq versus local Quran transcription — 3 October 2026

Four saved recordings of Al-Furqan 25:61–63 were submitted to Groq's
`whisper-large-v3`. Each request used the full original M4A, Arabic language,
temperature 0, and no expected-text prompt. No production provider was changed.

The comparison uses the saved `longer-context-arabic` transcripts from
`data/benchmark-comparison.json` for `basharalrfooh/whisper-small-quran`.
Both providers' transcripts were scored using the current production scorer.
The local model was not rerun; its timings below are historical GPU inference
times. Groq timings include upload and the API response. This compares the
two transcription pipelines, including their different audio segmentation,
not solely the models under identical preprocessing.

## Results

Each reference passage has 36 words. Correct recordings are labeled according
to the user's assessment, not independent human annotation.

| Recording | Local flagged words | Groq flagged words | Historical local seconds | Groq request seconds |
|---|---:|---:|---:|---:|
| Correct own voice 1 | 3 | 1 | 4.51 | 0.80 |
| Correct own voice 2 | 4 | 1 | 4.36 | 0.78 |
| Correct Qari | 1 | 0 | 4.44 | 0.70 |
| Deliberate omission of وَإِذَا | 8 | 5 | 4.27 | 0.68 |

For the three recordings labeled correct, false flags fell from 8 to 2 across
108 reference words. Reference-word match rose from 92.6% to 98.1%.
These are app word-match figures, not standard word error rate: the production
scorer does not penalize extra transcript words as separate errors.

Groq's remaining flag in each correct own-voice recording was `وقمر` in place
of `وَقَمَرًا`. The final written alif is missing. The benchmark did not relax
normalization to force a match.

## Deliberate omission

Groq did not insert the missing وَإِذَا into its transcript. However, it also
returned `أحمال`, `هونى`, `خاتبهم`, and `قولوا` around the latter part of the
passage. Current alignment marked وَإِذَا incorrect and هَوْنًا skipped.
Therefore it preserved the omission at the transcript level and flagged the
target word, but did not classify or locate the skipped-word feedback cleanly.
The local baseline also classified وَإِذَا as incorrect rather than skipped.

## Recommendation and limits

Groq is a promising candidate for an optional transcription provider, but these
four recordings of one passage do not establish general accuracy or reliability.
Before adopting it, test more surahs, speakers, deliberate substitutions,
omissions, repetitions, and background noise. Inspect transcripts separately
from app feedback to distinguish ASR errors from alignment errors. Do not supply
the correct passage as a prompt or automatically repair transcripts to Quran
text: doing so can conceal real recitation mistakes.

Raw transcripts, per-word flags, and timings are preserved locally in the ignored
`data/groq-benchmark-20261003T162348001191Z.json`.

## Repeat the comparison

`benchmark-groq.py` reads the local ignored `.env` or `GROQ_API_KEY` environment
variable, uploads only the four named benchmark recordings, and writes a new
timestamped JSON report. It requires the backend's existing Python dependencies.
Run from the service directory with the service Python environment active:

```text
python benchmark-groq.py
```

Use `GROQ_API_KEY=...` in `.env`. For this test, the script accepted the single
Groq-format key stored under an alternate variable name without displaying it.
