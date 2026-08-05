import { getDb } from '@/services/storage/sqlite';
import type { DailyHadith, Dua, DuaCategory, Hadith, HadithCollection, NameOfAllah } from '../types/library.types';

interface HadithCollectionRow {
  id: string;
  name_arabic: string;
  name_english: string;
  source: string;
  license: string;
  hadith_count: number;
  book_count: number;
}

interface HadithRow {
  id: string;
  collection_id: string;
  book_number: string | null;
  book_title: string | null;
  hadith_number: string;
  reference: string;
  text_arabic: string;
  text_translation: string;
  narrator: string | null;
  grade: string | null;
  grader: string | null;
}

interface DuaCategoryRow {
  id: string;
  name_english: string;
  name_arabic: string | null;
  dua_count: number;
}

interface DuaRow {
  id: string;
  category_id: string;
  category_name: string;
  title: string;
  text_arabic: string;
  transliteration: string | null;
  text_translation: string;
  reference: string;
  repetitions: number;
}

interface NameRow {
  id: number;
  name_arabic: string;
  name_translit: string;
  name_translation: string;
  explanation: string;
  evidence_json: string | null;
}

function dayNumberFromDateKey(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(year!, month! - 1, day!) / (24 * 60 * 60 * 1000));
}

export const libraryRepository = {
  getDailyHadith(dateKey: string): DailyHadith | null {
    const db = getDb();
    const filter = `LENGTH(TRIM(text_translation)) BETWEEN 60 AND 500`;
    const count = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM hadiths WHERE ${filter};`
    )?.count ?? 0;
    if (count === 0) return null;

    const offset = ((dayNumberFromDateKey(dateKey) % count) + count) % count;
    const row = db.getFirstSync<{ text_translation: string; reference: string }>(
      `SELECT text_translation, reference
       FROM hadiths
       WHERE ${filter}
       ORDER BY collection_id, CAST(hadith_number AS INTEGER), id
       LIMIT 1 OFFSET ?;`,
      offset
    );
    return row ? { excerpt: row.text_translation, source: row.reference } : null;
  },

  getHadithCollections(): HadithCollection[] {
    return getDb().getAllSync<HadithCollectionRow>(`
      SELECT c.*,
             (SELECT COUNT(*) FROM hadiths h WHERE h.collection_id = c.id) AS hadith_count,
             (SELECT COUNT(*) FROM hadith_books b WHERE b.collection_id = c.id) AS book_count
      FROM hadith_collections c
      ORDER BY c.name_english;
    `).map((row) => ({
      id: row.id,
      nameArabic: row.name_arabic,
      nameEnglish: row.name_english,
      source: row.source,
      license: row.license,
      hadithCount: row.hadith_count,
      bookCount: row.book_count,
    }));
  },

  getHadiths(collectionId: string, query: string, limit: number): Hadith[] {
    const normalizedQuery = query.trim();
    const searchClause = normalizedQuery
      ? `AND (h.reference LIKE ? OR h.hadith_number LIKE ? OR h.text_translation LIKE ? OR h.text_arabic LIKE ?)`
      : '';
    const params = normalizedQuery
      ? [collectionId, ...Array(4).fill(`%${normalizedQuery}%`), limit]
      : [collectionId, limit];

    return getDb().getAllSync<HadithRow>(`
      SELECT h.*, b.title AS book_title
      FROM hadiths h
      LEFT JOIN hadith_books b
        ON b.collection_id = h.collection_id AND b.book_number = h.book_number
      WHERE h.collection_id = ? ${searchClause}
      ORDER BY CAST(h.book_number AS INTEGER), CAST(h.hadith_number AS INTEGER), h.id
      LIMIT ?;
    `, params).map((row) => ({
      id: row.id,
      collectionId: row.collection_id,
      bookNumber: row.book_number,
      bookTitle: row.book_title,
      hadithNumber: row.hadith_number,
      reference: row.reference,
      textArabic: row.text_arabic,
      textTranslation: row.text_translation,
      narrator: row.narrator,
      grade: row.grade,
      grader: row.grader,
    }));
  },

  getDuaCategories(): DuaCategory[] {
    return getDb().getAllSync<DuaCategoryRow>(`
      SELECT c.*, COUNT(d.id) AS dua_count
      FROM dua_categories c
      LEFT JOIN duas d ON d.category_id = c.id
      GROUP BY c.id
      ORDER BY c.name_english;
    `).map((row) => ({
      id: row.id,
      nameEnglish: row.name_english,
      nameArabic: row.name_arabic,
      duaCount: row.dua_count,
    }));
  },

  getDuas(categoryId: string | null, query: string): Dua[] {
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    if (categoryId) {
      conditions.push('d.category_id = ?');
      params.push(categoryId);
    }
    if (query.trim()) {
      conditions.push('(d.title LIKE ? OR d.text_translation LIKE ? OR d.text_arabic LIKE ?)');
      params.push(...Array(3).fill(`%${query.trim()}%`));
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    return getDb().getAllSync<DuaRow>(`
      SELECT d.*, c.name_english AS category_name
      FROM duas d
      JOIN dua_categories c ON c.id = d.category_id
      ${where}
      ORDER BY c.name_english, d.title;
    `, params).map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      title: row.title,
      textArabic: row.text_arabic,
      transliteration: row.transliteration,
      textTranslation: row.text_translation,
      reference: row.reference,
      repetitions: row.repetitions,
    }));
  },

  getNamesOfAllah(): NameOfAllah[] {
    return getDb().getAllSync<NameRow>('SELECT * FROM names_of_allah ORDER BY id;').map((row) => ({
      id: row.id,
      nameArabic: row.name_arabic,
      nameTransliteration: row.name_translit,
      nameTranslation: row.name_translation,
      explanation: row.explanation,
      evidenceJson: row.evidence_json,
    }));
  },
};
