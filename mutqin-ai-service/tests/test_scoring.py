from app.scoring import score_ayah, aggregate_result, RecognizedWord, WordStatus


def test_scoring():

    # Al-Fatihah 1:7 — the long ayah, real canonical text from the app's seed data
    CANONICAL = "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ".split()

    def show(label, evaluation):
        print(f"\n--- {label} ---")
        for w in evaluation.words:
            print(f"  [{w.word_index}] {w.text:20s} -> {w.status.value}")
        print(f"  fully_recited: {evaluation.is_fully_recited}")

    # Scenario 1: perfect recitation, all high confidence
    perfect = [RecognizedWord(w, 0.95) for w in CANONICAL]
    eval1 = score_ayah(1, 7, CANONICAL, perfect)
    show("Scenario 1: perfect recitation", eval1)
    assert all(w.status == WordStatus.CORRECT for w in eval1.words), "expected all correct"
    assert eval1.is_fully_recited

    # Scenario 2: reciter skips "عَلَيْهِمْ" (the repeated word) entirely mid-ayah
    skipped_words = CANONICAL[:3] + CANONICAL[4:]  # drop index 3 ("أَنْعَمْتَ")... let's drop "أَنْعَمْتَ" specifically
    skipped_recognized = [RecognizedWord(w, 0.9) for w in CANONICAL if w != "أَنْعَمْتَ"]
    eval2 = score_ayah(1, 7, CANONICAL, skipped_recognized)
    show("Scenario 2: skipped 'أَنْعَمْتَ'", eval2)
    skipped_ones = [w for w in eval2.words if w.status == WordStatus.SKIPPED]
    assert len(skipped_ones) == 1 and skipped_ones[0].text == "أَنْعَمْتَ", f"expected exactly 'أَنْعَمْتَ' skipped, got {skipped_ones}"
    assert not eval2.is_fully_recited

    # Scenario 3: reciter says a wrong word (substitution) — replaces "غَيْرِ" with something else
    wrong_word_recognized = [RecognizedWord(w, 0.9) if w != "غَيْرِ" else RecognizedWord("غَيْرَ", 0.9) for w in CANONICAL]
    # Note: "غَيْرَ" vs "غَيْرِ" differs only by a diacritic (fatha vs kasra) — after
    # normalization (which strips tashkeel) these are considered the SAME word.
    # This is intentional: minor case-ending (i'rab) differences from ASR are not
    # real recitation errors at v1's word-level scope. Let's test a REAL substitution instead:
    real_wrong = list(CANONICAL)
    real_wrong[4] = "الْمَغْضُوبِ"  # reciter accidentally says a different word entirely at position of "غَيْرِ"
    recognized_with_error = [RecognizedWord(w, 0.9) for w in real_wrong]
    eval3 = score_ayah(1, 7, CANONICAL, recognized_with_error)
    show("Scenario 3: substituted word at index 4", eval3)
    assert eval3.words[4].status == WordStatus.INCORRECT, f"expected index 4 incorrect, got {eval3.words[4].status}"

    # Scenario 4: reciter says the right word but mumbles it (low ASR confidence)
    mumbled = [RecognizedWord(w, 0.95) if i != 2 else RecognizedWord(w, 0.3) for i, w in enumerate(CANONICAL)]
    eval4 = score_ayah(1, 7, CANONICAL, mumbled)
    show("Scenario 4: low-confidence word at index 2", eval4)
    assert eval4.words[2].status == WordStatus.PRONUNCIATION_WARNING, f"expected pronunciation_warning, got {eval4.words[2].status}"

    # Scenario 5: full session aggregation across multiple ayahs
    result = aggregate_result([eval1, eval2, eval3, eval4])
    print("\n--- Scenario 5: aggregated session result ---")
    print(f"  overall_accuracy: {result.overall_accuracy}")
    print(f"  correct: {result.correct_word_count}, missed: {result.missed_word_count}, "
          f"incorrect: {result.incorrect_word_count}, warnings: {result.pronunciation_warning_count}")
    print(f"  suggested_revision_ayahs: {result.suggested_revision_ayahs}")
    assert result.missed_word_count == 1
    assert result.incorrect_word_count == 1
    assert result.pronunciation_warning_count == 1

    print("\n✅ All scoring engine tests passed.")

