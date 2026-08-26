from app.scoring import score_session, RecognizedWord, WordStatus


def test_session():

    # Two consecutive short ayahs, Al-Fatihah 1:3 and 1:4
    ayah3 = (1, 3, "الرَّحْمَٰنِ الرَّحِيمِ".split())
    ayah4 = (1, 4, "مَالِكِ يَوْمِ الدِّينِ".split())

    # Reciter skips the FIRST word of ayah 3 entirely, then recites everything
    # else correctly straight through into ayah 4. A naive per-ayah word-count
    # split would misalign every subsequent word.
    recognized = [
        RecognizedWord("الرَّحِيمِ"),   # only said the 2nd word of ayah 3
        RecognizedWord("مَالِكِ"),
        RecognizedWord("يَوْمِ"),
        RecognizedWord("الدِّينِ"),
    ]

    results = score_session([ayah3, ayah4], recognized)

    for ayah_eval in results:
        print(f"\nAyah {ayah_eval.surah_id}:{ayah_eval.ayah_number}")
        for w in ayah_eval.words:
            print(f"  [{w.word_index}] {w.text:15s} -> {w.status.value}")

    # Ayah 3 should show word 0 skipped, word 1 correct
    assert results[0].words[0].status == WordStatus.SKIPPED
    assert results[0].words[1].status == WordStatus.CORRECT
    # Ayah 4 should be ENTIRELY correct despite the earlier skip shifting everything
    assert all(w.status == WordStatus.CORRECT for w in results[1].words), \
        f"boundary shift bug: ayah 4 got corrupted by the skip in ayah 3: {results[1].words}"

    print("\n✅ Multi-ayah session alignment correctly isolated the skip to ayah 3 only.")
