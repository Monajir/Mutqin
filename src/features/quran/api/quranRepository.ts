import { getDb } from '@/services/storage/sqlite';
import type { Ayah, Surah } from '@/types';
import type { DailyQuranVerse } from '../types/quran.types';

interface SurahRow {
  id: number;
  name_arabic: string;
  name_translit: string;
  name_translation: string;
  ayah_count: number;
  revelation_place: 'makkah' | 'madinah';
}

interface AyahRow {
  surah_id: number;
  ayah_number: number;
  text_arabic: string;
  text_translation: string;
  juz: number;
}

interface DailyVerseRow extends AyahRow {
  name_translit: string;
}

const DAILY_VERSE_FILTER = `
  LENGTH(TRIM(a.text_arabic)) BETWEEN 20 AND 220
  AND LENGTH(TRIM(a.text_translation)) BETWEEN 20 AND 320
`;

function dayNumberFromDateKey(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(year!, month! - 1, day!) / (24 * 60 * 60 * 1000));
}

function surahFromRow(row: SurahRow): Surah {
  return {
    id: row.id,
    nameArabic: row.name_arabic,
    nameTransliteration: row.name_translit,
    nameTranslation: row.name_translation,
    ayahCount: row.ayah_count,
    revelationPlace: row.revelation_place,
  };
}

function ayahFromRow(row: AyahRow): Ayah {
  return {
    surahId: row.surah_id,
    ayahNumber: row.ayah_number,
    textArabic: row.text_arabic,
    textTranslation: row.text_translation,
    juz: row.juz,
  };
}

/**
 * Local-first Quran content access. The full mushaf ships bundled/downloaded
 * into SQLite (spec §10 offline strategy) — there is no network dependency
 * for reading, searching, or bookmarking Quran text.
 */
export const quranRepository = {
  getAllSurahs(): Surah[] {
    return getDb().getAllSync<SurahRow>('SELECT * FROM surahs ORDER BY id;').map(surahFromRow);
  },

  getAyahRange(surahId: number, startAyah: number, count: number): Ayah[] {
    return getDb()
      .getAllSync<AyahRow>(
        'SELECT * FROM ayahs WHERE surah_id = ? AND ayah_number >= ? ORDER BY ayah_number LIMIT ?;',
        surahId, startAyah, count
      )
      .map(ayahFromRow);
  },

  searchAyahs(query: string, limit = 50): Ayah[] {
    const like = `%${query}%`;
    return getDb()
      .getAllSync<AyahRow>(
        'SELECT * FROM ayahs WHERE text_translation LIKE ? OR text_arabic LIKE ? LIMIT ?;',
        like, like, limit
      )
      .map(ayahFromRow);
  },

  getDailyVerse(dateKey: string): DailyQuranVerse | null {
    const db = getDb();
    const count =
      db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) AS count
         FROM ayahs a
         WHERE ${DAILY_VERSE_FILTER};`
      )?.count ?? 0;

    if (count === 0) return null;

    const offset = ((dayNumberFromDateKey(dateKey) % count) + count) % count;
    const row = db.getFirstSync<DailyVerseRow>(
      `SELECT a.*, s.name_translit
       FROM ayahs a
       JOIN surahs s ON s.id = a.surah_id
       WHERE ${DAILY_VERSE_FILTER}
       ORDER BY a.surah_id, a.ayah_number
       LIMIT 1 OFFSET ?;`,
      offset
    );

    if (!row) return null;
    return {
      surahId: row.surah_id,
      ayahNumber: row.ayah_number,
      arabic: row.text_arabic,
      translation: row.text_translation,
      reference: `${row.name_translit} ${row.surah_id}:${row.ayah_number}`,
    };
  },
};

/** Cached in-memory once per app session — ayah counts per juz rarely need recomputation. */
let juzAyahCountsCache: Record<number, number> | null = null;

export function getJuzAyahCounts(): Record<number, number> {
  if (juzAyahCountsCache) return juzAyahCountsCache;
  const rows = getDb().getAllSync<{ juz: number; count: number }>('SELECT juz, COUNT(*) as count FROM ayahs GROUP BY juz;');
  juzAyahCountsCache = Object.fromEntries(rows.map((r) => [r.juz, r.count]));
  return juzAyahCountsCache;
}
