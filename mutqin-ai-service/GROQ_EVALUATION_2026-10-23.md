# Groq evaluation — 23 October 2026

**Decision: promising optional provider for the presentation, not a complete
recitation-assessment repair.** Groq reduced reference-word flags on every
uploaded recording and preserved important deliberate deviations. Substantial
errors remain in some live recitations. No app provider has been switched.

## Method and integrity

The user authorized uploading the saved speech recordings. Local Silero VAD
accepted nine captures and rejected S01 plus both V01 attempts. Only the nine
speech recordings were sent to Groq's `whisper-large-v3` transcription endpoint.
Each request used the full original M4A, Arabic language, temperature zero, and
no expected-verse prompt. No normalization or scoring rules were changed to
improve the results. The existing scorer was applied to both raw transcripts.

Original capture audio, metadata, and baseline result hashes all remained
unchanged. Live servers and mobile provider configuration were not modified.
No keys were printed or added to tracked files. There were nine successful API
responses and no automatic retries. The JSON evidence is Git-ignored:
`data/groq-evaluation-20261023T085019842769Z.json`.

This compares complete pipelines: historical local recognition with quiet-point
chunking versus hosted recognition of the full recording. It does not isolate
model size. Labels are user-reported; neither audio correctness nor every
transcribed word has been independently verified. All source recordings had
running-fan room noise according to the user.

## Results

Flags are unmatched reference words, not independently verified recitation
mistakes. Match counts are not WER or pronunciation accuracy.

| Case | Condition | Local flags | Groq flags | Groq reference matches |
| --- | --- | --- | --- | --- |
| F01 | Reported correct Fatihah | 11 | 6 | 23/29 |
| F02 | Second reported correct Fatihah | 15 | 6 | 23/29 |
| F03 | Omit رب | 18 | 9 | 20/29 |
| F04 | Replace نستعين with نعبد | 12 | 8 | 21/29 |
| F05 | Repeat ayah 3; possible ص/س deviation | 16 | 4 | 25/29 |
| F06 | Al-Husary playback | 14 | 1 | 28/29 |
| Q01 | Reported correct Furqan | 6 | 5 | 31/36 |
| Q02 | Omit وإذا | 7 | 6 | 30/36 |
| V02 | Quiet Fatihah 1–3 | 3 | 0 | 10/10 |

On the three ordinary user-reported correct takes F01/F02/Q01, flags fell from
32 to 17. Qari playback and quiet recitation are separate controls and should
not be pooled with these to advertise a headline accuracy number.

The nine observed API request times ranged from 0.465 to 0.934 seconds. These
include the laptop-to-Groq request and response, but exclude phone upload, VAD,
and app rendering. Historical local timings measure different work, so the
numbers are not an end-to-end speed comparison or latency guarantee.

## Did the transcript preserve deliberate mistakes?

- **F03 omission:** رب remains absent, but Groq supplies أبو at that location.
  The scorer flags رب as incorrect, not skipped. This is not faithful clean
  omission classification, even though the target is flagged.
- **F04 substitution:** Groq transcribes `إياك نعبد وإياك نعبد`, preserving the
  requested replacement. The target نستعين is flagged incorrect. Unlike the
  original local baseline, Groq recognizes نستعين in both F01 and F02, so this
  pair provides useful evidence of discrimination rather than the same word
  simply being flagged in every take. Seven additional words are still flagged
  in F04; this is not general validation of substitution detection.
- **F05 repetition:** after الحمد لله رب العالمين, Groq produces
  `الرحمن الرحيم الرحمن الرحيم`. The repeated ayah is retained; the local
  transcript lost it. Our scorer still drops insertions, so the current app
  would not separately report this repeat. The ص/س uncertainty remains a
  user-reported caveat, not a confirmed pronunciation diagnosis.
- **Q02 omission:** وإذا is absent from Groq's transcript and present in Q01.
  But Groq renders هونا as هوناء. Alignment still marks هونا skipped and وإذا
  incorrect. This is the previously diagnosed neighboring-word ambiguity.

## Openings and remaining errors

All six Fatihah Groq transcripts start with Bismillah, including captures where
the local full-chunk transcript omitted it. F06 retains the opening two ayahs;
its only flagged reference word is المغضوب, transcribed as المغروب. V02 matches
all ten reference words. These are improvements in the model output, not an
independent listening-based determination of what the source audio contains.

F01 and F02 still have six flags apiece, largely in the final two ayahs. Both
pipelines confuse words including صراط. F03 also contains a badly distorted
ending. A larger hosted recognizer helps but does not remove the need to review
the audio and evaluate varied speakers/conditions.

## Recommendation under the presentation deadline

Proceed with a small, selectable Groq adapter if the user chooses to use these
improvements in the demo. Keep local VAD before every request, credentials only
in the backend, and the local model available as a deliberate fallback option.
Expose provider failures honestly; do not silently change providers and present
their outputs as equivalent. Preserve the current mobile result contract.

Before calling that integration ready, verify ordinary speech, deliberate F04
substitution, no-speech rejection, and a provider/network failure through the
app/backend flow. Do not promise repetition reporting or precise omission
classification until those separate scorer changes are made.

Then freeze AI changes for the presentation and polish the mobile experience.
Describe it as experimental word-level assistance. If a saved example is shown,
identify it as saved rather than pretending it is a live recognition result.

Suggested presentation statement:

> We evaluated two recognition pipelines using the same saved recordings. The
> hosted larger-model pipeline reduced word flags and preserved a deliberate
> substitution and repetition more faithfully. Some recognition and alignment
> errors remain, so we treat the feedback as experimental. The mobile workflow,
> local progress tracking, and no-speech handling are implemented independently.

Resume long-term work from
[`../RECITATION_RELIABILITY_CHECKPOINT.md`](../RECITATION_RELIABILITY_CHECKPOINT.md).
