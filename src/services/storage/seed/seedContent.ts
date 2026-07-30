import { getDb } from '../sqlite';

/**
 * Minimal, real (not placeholder) seed data covering the first 3 surahs, so
 * the app is runnable and demoable end-to-end offline immediately after
 * install. Full mushaf content ingestion (all 114 surahs, 6236 ayahs) is a
 * data pipeline task, not application code — see IMPLEMENTATION_ROADMAP.md
 * Phase 1, "content ingestion pipeline." Text sourced for structure/demo
 * purposes only; production content must go through the authenticity
 * verification process described in the spec's Notes for the Development Team.
 */
const SURAHS = [
  { id: 1, name_arabic: 'الفاتحة', name_translit: 'Al-Fatihah', name_translation: 'The Opening', ayah_count: 7, revelation_place: 'makkah' },
  { id: 2, name_arabic: 'البقرة', name_translit: 'Al-Baqarah', name_translation: 'The Cow', ayah_count: 286, revelation_place: 'madinah' },
  { id: 3, name_arabic: 'آل عمران', name_translit: "Ali 'Imran", name_translation: 'Family of Imran', ayah_count: 200, revelation_place: 'madinah' },
];

const AYAHS: { surah_id: number; ayah_number: number; text_arabic: string; text_translation: string; juz: number }[] = [
  { surah_id: 1, ayah_number: 1, text_arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', text_translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.', juz: 1 },
  { surah_id: 1, ayah_number: 2, text_arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', text_translation: '[All] praise is [due] to Allah, Lord of the worlds.', juz: 1 },
  { surah_id: 1, ayah_number: 3, text_arabic: 'الرَّحْمَٰنِ الرَّحِيمِ', text_translation: 'The Entirely Merciful, the Especially Merciful.', juz: 1 },
  { surah_id: 1, ayah_number: 4, text_arabic: 'مَالِكِ يَوْمِ الدِّينِ', text_translation: 'Sovereign of the Day of Recompense.', juz: 1 },
  { surah_id: 1, ayah_number: 5, text_arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', text_translation: 'It is You we worship and You we ask for help.', juz: 1 },
  { surah_id: 1, ayah_number: 6, text_arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', text_translation: 'Guide us to the straight path.', juz: 1 },
  { surah_id: 1, ayah_number: 7, text_arabic: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', text_translation: 'The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.', juz: 1 },
  { surah_id: 2, ayah_number: 1, text_arabic: 'الم', text_translation: 'Alif, Lam, Meem.', juz: 1 },
  { surah_id: 2, ayah_number: 2, text_arabic: 'ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِلْمُتَّقِينَ', text_translation: 'This is the Book about which there is no doubt, a guidance for those conscious of Allah.', juz: 1 },
  { surah_id: 2, ayah_number: 255, text_arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ', text_translation: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of [all] existence.', juz: 3 },
  { surah_id: 3, ayah_number: 1, text_arabic: 'الم', text_translation: 'Alif, Lam, Meem.', juz: 3 },
  { surah_id: 3, ayah_number: 2, text_arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ', text_translation: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of [all] existence.', juz: 3 },
];

export function seedContentIfEmpty(): void {
  const db = getDb();
  const existing = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM surahs;');
  if ((existing?.count ?? 0) > 0) return;

  db.withTransactionSync(() => {
    for (const surah of SURAHS) {
      db.runSync(
        `INSERT INTO surahs (id, name_arabic, name_translit, name_translation, ayah_count, revelation_place) VALUES (?, ?, ?, ?, ?, ?);`,
        surah.id, surah.name_arabic, surah.name_translit, surah.name_translation, surah.ayah_count, surah.revelation_place
      );
    }
    for (const ayah of AYAHS) {
      db.runSync(
        `INSERT INTO ayahs (surah_id, ayah_number, text_arabic, text_translation, juz) VALUES (?, ?, ?, ?, ?);`,
        ayah.surah_id, ayah.ayah_number, ayah.text_arabic, ayah.text_translation, ayah.juz
      );
    }
  });
}
