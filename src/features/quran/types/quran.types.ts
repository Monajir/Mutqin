export interface SurahListItemVm {
  id: number;
  nameArabic: string;
  nameTransliteration: string;
  nameTranslation: string;
  ayahCount: number;
}

export interface LastReadPosition {
  surahId: number;
  ayahNumber: number;
  surahName: string;
  updatedAt: string;
}

export interface QuranSearchResult {
  surahId: number;
  ayahNumber: number;
  snippet: string;
  matchType: 'arabic' | 'translation';
}

export interface DailyQuranVerse {
  surahId: number;
  ayahNumber: number;
  arabic: string;
  translation: string;
  reference: string;
}
