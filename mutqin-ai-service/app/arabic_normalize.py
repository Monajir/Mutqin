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
_TASHKEEL_PATTERN = re.compile(r'[\u064B-\u0652\u0670\u06D6-\u06ED]')

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


def normalize_arabic_word(word: str) -> str:
    """
    Normalize a single Arabic word for comparison purposes only.
    NEVER use this output for display — it deliberately discards
    information (diacritics, some letter distinctions) that matters for
    correct reading but defeats robust ASR-transcript matching.
    """
    text = unicodedata.normalize('NFC', word)
    text = _TASHKEEL_PATTERN.sub('', text)
    text = _TATWEEL_PATTERN.sub('', text)
    for src, dst in _CHAR_NORMALIZE_MAP.items():
        text = text.replace(src, dst)
    return text.strip()


def tokenize_ayah(text: str) -> list[str]:
    """Splits ayah text into words, preserving original (non-normalized) surface forms."""
    return [w for w in text.split() if w.strip()]
