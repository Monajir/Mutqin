/** Shared, cross-feature content model types. Feature-specific shapes live in features/*\/types. */

export interface Surah {
  id: number;
  nameArabic: string;
  nameTransliteration: string;
  nameTranslation: string;
  ayahCount: number;
  revelationPlace: 'makkah' | 'madinah';
}

export interface Ayah {
  surahId: number;
  ayahNumber: number;
  textArabic: string;
  textTranslation: string;
  juz: number;
}

export type BookmarkableContentType = 'quran' | 'hadith' | 'dua' | 'name';

export interface Bookmark {
  id: string;
  contentType: BookmarkableContentType;
  contentRef: string;
  collectionId?: string;
  note?: string;
  createdAt: string;
}

export interface Qari {
  id: string;
  name: string;
  audioBaseUrl: string;
}
