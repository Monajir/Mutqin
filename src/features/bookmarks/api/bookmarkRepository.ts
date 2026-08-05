import { getDb } from '@/services/storage/sqlite';
import type { BookmarkableContentType } from '@/types';
import type { BookmarkListItem, ToggleBookmarkInput, ToggleBookmarkResult } from '../types/bookmark.types';

interface BookmarkListRow {
  id: string;
  content_type: BookmarkableContentType;
  content_ref: string;
  collection_id: string | null;
  title: string | null;
  subtitle: string | null;
  arabic: string | null;
  translation: string | null;
  created_at: string;
}

function bookmarkId(contentType: BookmarkableContentType, contentRef: string): string {
  return `${contentType}:${contentRef}`;
}

export const bookmarkRepository = {
  getBookmarkRefs(contentType: BookmarkableContentType): string[] {
    return getDb()
      .getAllSync<{ content_ref: string }>(
        'SELECT content_ref FROM bookmarks WHERE content_type = ? ORDER BY created_at DESC;',
        contentType
      )
      .map((row) => row.content_ref);
  },

  getBookmarks(contentType: BookmarkableContentType | null = null): BookmarkListItem[] {
    const where = contentType ? 'WHERE b.content_type = ?' : '';
    const params = contentType ? [contentType] : [];

    return getDb().getAllSync<BookmarkListRow>(`
      SELECT
        b.id,
        b.content_type,
        b.content_ref,
        b.collection_id,
        b.created_at,
        CASE b.content_type
          WHEN 'quran' THEN COALESCE(s.name_translit || ' ' || a.surah_id || ':' || a.ayah_number, b.content_ref)
          WHEN 'hadith' THEN COALESCE(h.reference, b.content_ref)
          WHEN 'dua' THEN COALESCE(d.title, b.content_ref)
          WHEN 'name' THEN COALESCE(n.name_translit, b.content_ref)
        END AS title,
        CASE b.content_type
          WHEN 'quran' THEN COALESCE(s.name_translation, 'Quran verse')
          WHEN 'hadith' THEN COALESCE(hc.name_english, 'Hadith')
          WHEN 'dua' THEN COALESCE(dc.name_english, 'Dua & Adhkar')
          WHEN 'name' THEN COALESCE(n.name_translation, 'Beautiful Name of Allah')
        END AS subtitle,
        CASE b.content_type
          WHEN 'quran' THEN a.text_arabic
          WHEN 'hadith' THEN h.text_arabic
          WHEN 'dua' THEN d.text_arabic
          WHEN 'name' THEN n.name_arabic
        END AS arabic,
        CASE b.content_type
          WHEN 'quran' THEN a.text_translation
          WHEN 'hadith' THEN h.text_translation
          WHEN 'dua' THEN d.text_translation
          WHEN 'name' THEN n.explanation
        END AS translation
      FROM bookmarks b
      LEFT JOIN ayahs a
        ON b.content_type = 'quran'
       AND b.content_ref = CAST(a.surah_id AS TEXT) || ':' || CAST(a.ayah_number AS TEXT)
      LEFT JOIN surahs s ON s.id = a.surah_id
      LEFT JOIN hadiths h ON b.content_type = 'hadith' AND h.id = b.content_ref
      LEFT JOIN hadith_collections hc ON hc.id = h.collection_id
      LEFT JOIN duas d ON b.content_type = 'dua' AND d.id = b.content_ref
      LEFT JOIN dua_categories dc ON dc.id = d.category_id
      LEFT JOIN names_of_allah n ON b.content_type = 'name' AND CAST(n.id AS TEXT) = b.content_ref
      ${where}
      ORDER BY b.created_at DESC;
    `, params).map((row) => ({
      id: row.id,
      contentType: row.content_type,
      contentRef: row.content_ref,
      collectionId: row.collection_id,
      title: row.title ?? row.content_ref,
      subtitle: row.subtitle ?? row.content_type,
      arabic: row.arabic,
      translation: row.translation,
      createdAt: row.created_at,
    }));
  },

  toggleBookmark(input: ToggleBookmarkInput): ToggleBookmarkResult {
    const db = getDb();
    const existing = db.getFirstSync<{ id: string }>(
      'SELECT id FROM bookmarks WHERE content_type = ? AND content_ref = ? LIMIT 1;',
      input.contentType,
      input.contentRef
    );

    if (existing) {
      db.runSync('DELETE FROM bookmarks WHERE id = ?;', existing.id);
      return { added: false, contentType: input.contentType, contentRef: input.contentRef };
    }

    db.runSync(
      `INSERT INTO bookmarks
        (id, content_type, content_ref, collection_id, note, created_at, synced)
       VALUES (?, ?, ?, ?, NULL, ?, 0);`,
      bookmarkId(input.contentType, input.contentRef),
      input.contentType,
      input.contentRef,
      input.collectionId ?? null,
      new Date().toISOString()
    );
    return { added: true, contentType: input.contentType, contentRef: input.contentRef };
  },

  removeBookmark(id: string): void {
    getDb().runSync('DELETE FROM bookmarks WHERE id = ?;', id);
  },
};
