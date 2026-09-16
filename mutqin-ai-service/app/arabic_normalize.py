"""
Arabic text normalization for recitation matching.

Canonical Quran text ships fully diacritized (tashkeel); ASR transcripts —
even from a Quran-tuned Whisper model — are inconsistent about diacritics
and about which Unicode form of alef/hamza/ya got produced. Comparing raw
strings would produce false "incorrect" classifications purely from encoding
noise, not actual recitation errors. Everything here is normalized before
alignment (stage 4), never before final display to the user (the app always
shows properly diacritized canonical text).
"""
import re
import unicodedata

# Arabic diacritics (tashkeel) — fatha, damma, kasra, sukun, shadda, tanwin, etc.
_TASHKEEL_PATTERN = re.compile(r'[\u064B-\u0652\u06D6-\u06ED]')

# Tatweel/kashida (Arabic elongation character) — purely typographic, never
# meaningful for correctness comparison.
_TATWEEL_PATTERN = re.compile(r'\u0640')

# Character-level normalization map: different Unicode forms that render
# identically or near-identically in casual recitation transcription.
_CHAR_NORMALIZE_MAP = {
    '\u0622': '\u0627',  # Alef with madda above -> plain alef
    '\u0623': '\u0627',  # Alef with hamza above -> plain alef
    '\u0625': '\u0627',  # Alef with hamza below -> plain alef
    '\u0671': '\u0627',  # Alef wasla -> plain alef
    '\u0629': '\u0647',  # Ta marbuta -> ha (common ASR confusion at word end)
    '\u0649': '\u064A',  # Alef maksura -> ya
}


def normalize_arabic_word(word: str, *, preserve_dagger_alif: bool = False) -> str:
    """
    Normalize a single Arabic word for comparison purposes only.
    NEVER use this output for display — it deliberately discards
    information (diacritics, some letter distinctions) that matters for
    correct reading but defeats robust ASR-transcript matching.
    """
    text = unicodedata.normalize('NFC', word)
    # Uthmani text writes some pronounced alifs as dagger alifs. ASR may
    # return either the simple-Arabic spelling (ordinary alif) or omit that
    # orthographic alif in words such as الرحمن. Callers comparing words use
    # both representations through arabic_words_match().
    text = text.replace('\u0670', '\u0627' if preserve_dagger_alif else '')
    text = _TASHKEEL_PATTERN.sub('', text)
    text = _TATWEEL_PATTERN.sub('', text)
    for src, dst in _CHAR_NORMALIZE_MAP.items():
        text = text.replace(src, dst)
    # Whisper may append punctuation to the final word in a phrase.
    text = ''.join(character for character in text if not unicodedata.category(character).startswith('P'))
    return text.strip()


def arabic_words_match(expected: str, recognized: str) -> bool:
    """Compare Uthmani and ASR spellings without treating dagger alif as an error."""
    expected_forms = {
        normalize_arabic_word(expected),
        normalize_arabic_word(expected, preserve_dagger_alif=True),
    }
    recognized_forms = {
        normalize_arabic_word(recognized),
        normalize_arabic_word(recognized, preserve_dagger_alif=True),
    }
    if expected_forms & recognized_forms:
        return True

    # Quran ASR occasionally drops or substitutes one character at the edge
    # of a longer word. Tolerate one edit for words long enough that doing so
    # remains discriminating; short words such as رب stay exact.
    for expected_form in expected_forms:
        for recognized_form in recognized_forms:
            if max(len(expected_form), len(recognized_form)) >= 5:
                if _levenshtein_distance(expected_form, recognized_form) <= 1:
                    return True
    return False


def _levenshtein_distance(left: str, right: str) -> int:
    previous = list(range(len(right) + 1))
    for left_index, left_character in enumerate(left, start=1):
        current = [left_index]
        for right_index, right_character in enumerate(right, start=1):
            current.append(
                min(
                    current[-1] + 1,
                    previous[right_index] + 1,
                    previous[right_index - 1] + (left_character != right_character),
                )
            )
        previous = current
    return previous[-1]


def tokenize_ayah(text: str) -> list[str]:
    """Splits ayah text into words, preserving original (non-normalized) surface forms."""
    return [w for w in text.split() if w.strip()]
