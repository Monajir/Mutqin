export const quranKeys = {
  all: ['quran'] as const,
  surahs: () => [...quranKeys.all, 'surahs'] as const,
  surah: (id: number) => [...quranKeys.all, 'surah', id] as const,
  ayahRange: (surahId: number | null, start: number | null, count: number) =>
    [...quranKeys.all, 'ayahRange', surahId, start, count] as const,
  lastRead: () => [...quranKeys.all, 'lastRead'] as const,
  search: (query: string) => [...quranKeys.all, 'search', query] as const,
  dailyVerse: (dateKey: string) => [...quranKeys.all, 'dailyVerse', dateKey] as const,
};
