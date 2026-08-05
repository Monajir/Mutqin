"""
Word-level recitation scoring.

Core idea: this is a sequence-alignment problem, not a string-equality
problem. A reciter might skip a word, stumble and repeat one, or the ASR
might mishear one word in an otherwise-correct ayah — a naive
position-by-position comparison breaks completely the moment there's a
single insertion or deletion, cascading every subsequent word into a false
mismatch. We need edit-distance alignment (same family of algorithm as
`diff`/Levenshtein) between the canonical ayah words and the ASR's
recognized words, THEN classify based on the alignment operations.

Classification rules (matches WordEvaluationStatus in the frontend's
services/ai/types.ts):
  - correct              : canonical word aligned to a recognized word that
                            matches after normalization, with ASR confidence
                            at or above CONFIDENCE_THRESHOLD
  - pronunciation_warning : matches after normalization, but ASR confidence
                            is below threshold — i.e. the model heard the
                            right word but wasn't sure, which in practice
                            correlates with unclear/mumbled pronunciation.
                            This is a deliberate v1 proxy for pronunciation
                            quality (see note below) — not phoneme-level
                            tajweed analysis, which is explicitly out of
                            scope per the product spec.
  - incorrect             : canonical word aligned to a recognized word that
                            does NOT match after normalization (substitution)
  - skipped               : canonical word has no aligned recognized word
                            (deletion — reciter didn't say it, or said it too
                            quietly/unclearly for ASR to pick up at all)

NOTE on the pronunciation_warning proxy: ASR confidence is a real but
imperfect signal — low confidence can also mean background noise or a
recording-quality issue unrelated to the reciter's pronunciation. This is
an accepted, documented v1 limitation, not a hidden one. True pronunciation/
tajweed scoring needs phoneme-level forced alignment, which is future work
(see the roadmap's "Hifz Assistant hardening" phase).
"""
from dataclasses import dataclass, field
from enum import Enum

from app.arabic_normalize import normalize_arabic_word


class WordStatus(str, Enum):
    CORRECT = "correct"
    PRONUNCIATION_WARNING = "pronunciation_warning"
    INCORRECT = "incorrect"
    SKIPPED = "skipped"


CONFIDENCE_THRESHOLD = 0.55


@dataclass
class RecognizedWord:
    text: str
    confidence: float  # 0.0-1.0, from the ASR model


@dataclass
class WordEvaluation:
    word_index: int
    text: str  # original canonical surface form (with diacritics) — for display
    status: WordStatus


@dataclass
class AyahEvaluation:
    surah_id: int
    ayah_number: int
    words: list[WordEvaluation]
    is_fully_recited: bool


def _levenshtein_alignment(canonical: list[str], recognized: list[str]) -> list[tuple[int | None, int | None]]:
    """
    Standard Wagner-Fischer edit-distance alignment, returning a list of
    (canonical_index | None, recognized_index | None) pairs in canonical
    order. `None` on either side represents a deletion (word skipped) or
    insertion (extra word said, e.g. a false start or repetition) respectively.
    Comparison uses normalized forms; the returned indices let the caller
    look back up original surface forms.
    """
    n, m = len(canonical), len(recognized)
    norm_canon = [normalize_arabic_word(w) for w in canonical]
    norm_recog = [normalize_arabic_word(w) for w in recognized]

    # dp[i][j] = edit distance between canonical[:i] and recognized[:j]
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if norm_canon[i - 1] == norm_recog[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,       # deletion (skipped canonical word)
                dp[i][j - 1] + 1,       # insertion (extra recognized word)
                dp[i - 1][j - 1] + cost # match or substitution
            )

    # Backtrack to recover the alignment path.
    aligned: list[tuple[int | None, int | None]] = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            cost = 0 if norm_canon[i - 1] == norm_recog[j - 1] else 1
            if dp[i][j] == dp[i - 1][j - 1] + cost:
                aligned.append((i - 1, j - 1))
                i, j = i - 1, j - 1
                continue
        if i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            aligned.append((i - 1, None))
            i -= 1
            continue
        if j > 0 and dp[i][j] == dp[i][j - 1] + 1:
            aligned.append((None, j - 1))
            j -= 1
            continue
        break  # safety net, shouldn't reach here

    aligned.reverse()
    # Drop pure insertions (extra words with no canonical counterpart) —
    # they don't map to any WordEvaluation on the canonical ayah.
    return [(c, r) for (c, r) in aligned if c is not None]


def score_ayah(
    surah_id: int,
    ayah_number: int,
    canonical_words: list[str],
    recognized_words: list[RecognizedWord],
) -> AyahEvaluation:
    alignment = _levenshtein_alignment(canonical_words, [w.text for w in recognized_words])

    evaluations: list[WordEvaluation] = []
    for canon_idx, recog_idx in alignment:
        canonical_text = canonical_words[canon_idx]

        if recog_idx is None:
            status = WordStatus.SKIPPED
        else:
            recognized = recognized_words[recog_idx]
            is_match = normalize_arabic_word(canonical_text) == normalize_arabic_word(recognized.text)
            if not is_match:
                status = WordStatus.INCORRECT
            elif recognized.confidence < CONFIDENCE_THRESHOLD:
                status = WordStatus.PRONUNCIATION_WARNING
            else:
                status = WordStatus.CORRECT

        evaluations.append(WordEvaluation(word_index=canon_idx, text=canonical_text, status=status))

    evaluations.sort(key=lambda e: e.word_index)
    is_fully_recited = all(e.status != WordStatus.SKIPPED for e in evaluations)

    return AyahEvaluation(
        surah_id=surah_id,
        ayah_number=ayah_number,
        words=evaluations,
        is_fully_recited=is_fully_recited,
    )


def score_session(
    expected_ayahs: list[tuple[int, int, list[str]]],  # (surah_id, ayah_number, canonical_words)
    recognized_words: list[RecognizedWord],
) -> list[AyahEvaluation]:
    """
    Aligns the ENTIRE recognized word stream against the ENTIRE expected
    ayah range in one pass, then splits results back per ayah.

    Why not align ayah-by-ayah independently: a Hifz session's expected
    range is several ayahs recited continuously with no audio-level
    boundary markers. If we split the recognized stream into per-ayah
    chunks *before* aligning (e.g. by guessing word counts), one skipped
    or extra word anywhere shifts every subsequent ayah's chunk boundary
    and corrupts all of them. Aligning the full concatenated sequence once
    is robust to that — the edit-distance algorithm naturally absorbs a
    skip/insertion without needing us to know where it happened in advance.
    """
    all_canonical_words: list[str] = []
    ayah_word_ranges: list[tuple[int, int, int, int]] = []  # (surah, ayah, start, end) exclusive end

    for surah_id, ayah_number, words in expected_ayahs:
        start = len(all_canonical_words)
        all_canonical_words.extend(words)
        ayah_word_ranges.append((surah_id, ayah_number, start, len(all_canonical_words)))

    combined = score_ayah(0, 0, all_canonical_words, recognized_words)  # surah/ayah placeholders, unused here

    results: list[AyahEvaluation] = []
    for surah_id, ayah_number, start, end in ayah_word_ranges:
        words_in_range = [
            WordEvaluation(word_index=w.word_index - start, text=w.text, status=w.status)
            for w in combined.words
            if start <= w.word_index < end
        ]
        is_fully_recited = all(w.status != WordStatus.SKIPPED for w in words_in_range)
        results.append(
            AyahEvaluation(
                surah_id=surah_id,
                ayah_number=ayah_number,
                words=words_in_range,
                is_fully_recited=is_fully_recited,
            )
        )
    return results


@dataclass
class RecitationResult:
    ayahs: list[AyahEvaluation]
    overall_accuracy: float
    correct_word_count: int
    missed_word_count: int
    incorrect_word_count: int
    pronunciation_warning_count: int
    suggested_revision_ayahs: list[tuple[int, int]] = field(default_factory=list)


def aggregate_result(ayah_evaluations: list[AyahEvaluation]) -> RecitationResult:
    """Rolls per-ayah word evaluations into the overall RecitationEvaluationResult shape."""
    correct = missed = incorrect = warnings = 0
    for ayah in ayah_evaluations:
        for w in ayah.words:
            if w.status == WordStatus.CORRECT:
                correct += 1
            elif w.status == WordStatus.SKIPPED:
                missed += 1
            elif w.status == WordStatus.INCORRECT:
                incorrect += 1
            elif w.status == WordStatus.PRONUNCIATION_WARNING:
                warnings += 1
                correct += 1  # counts toward accuracy — it WAS the right word

    total = correct + missed + incorrect
    accuracy = correct / total if total > 0 else 0.0

    # An ayah needs revision if its own accuracy is materially worse than
    # the session average — surfaces the weak spots rather than everything.
    revision_ayahs = []
    for ayah in ayah_evaluations:
        ayah_total = len(ayah.words)
        ayah_correct = sum(1 for w in ayah.words if w.status in (WordStatus.CORRECT, WordStatus.PRONUNCIATION_WARNING))
        ayah_accuracy = ayah_correct / ayah_total if ayah_total > 0 else 1.0
        if ayah_accuracy < 0.8:
            revision_ayahs.append((ayah.surah_id, ayah.ayah_number))

    return RecitationResult(
        ayahs=ayah_evaluations,
        overall_accuracy=round(accuracy, 4),
        correct_word_count=correct,
        missed_word_count=missed,
        incorrect_word_count=incorrect,
        pronunciation_warning_count=warnings,
        suggested_revision_ayahs=revision_ayahs,
    )
