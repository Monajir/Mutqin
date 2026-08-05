import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { quranKeys } from './quranKeys';
import { quranRepository } from './quranRepository';
import { getJson, StorageKeys } from '@/services/storage/mmkv';
import type { DailyQuranVerse, LastReadPosition } from '../types/quran.types';
import type { Ayah, Surah } from '@/types';

export function useQuranSurahs(): UseQueryResult<Surah[], Error> {
  return useQuery<Surah[], Error>({
    queryKey: quranKeys.surahs(),
    queryFn: () => quranRepository.getAllSurahs(),
    staleTime: Infinity, // bundled reference content — never goes stale within a session
  });
}

export function useAyahRange(
  surahId: number | null,
  startAyah: number | null,
  count: number
): UseQueryResult<Ayah[], Error> {
  return useQuery<Ayah[], Error>({
    queryKey: quranKeys.ayahRange(surahId, startAyah, count),
    queryFn: () => quranRepository.getAyahRange(surahId as number, startAyah as number, count),
    enabled: surahId !== null && startAyah !== null,
  });
}

export function useQuranSearch(query: string) {
  return useQuery({
    queryKey: quranKeys.search(query),
    queryFn: () => quranRepository.searchAyahs(query),
    enabled: query.trim().length >= 2,
  });
}

export function useDailyQuranVerse(dateKey: string): UseQueryResult<DailyQuranVerse | null, Error> {
  return useQuery<DailyQuranVerse | null, Error>({
    queryKey: quranKeys.dailyVerse(dateKey),
    queryFn: () => quranRepository.getDailyVerse(dateKey),
    // SQLite is already ready before the Home screen mounts. Supplying the
    // local value immediately prevents a loading-frame flash on timer renders.
    initialData: () => quranRepository.getDailyVerse(dateKey),
    staleTime: Infinity,
  });
}

export function useLastRead() {
  return useQuery({
    queryKey: quranKeys.lastRead(),
    queryFn: () => getJson<LastReadPosition>(StorageKeys.lastReadAyah),
  });
}
