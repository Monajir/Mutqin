import { useQuery } from '@tanstack/react-query';
import { quranKeys } from './quranKeys';
import { quranRepository } from './quranRepository';
import { getJson, StorageKeys } from '@/services/storage/mmkv';
import type { LastReadPosition } from '../types/quran.types';

export function useQuranSurahs() {
  return useQuery({
    queryKey: quranKeys.surahs(),
    queryFn: () => quranRepository.getAllSurahs(),
    staleTime: Infinity, // bundled reference content — never goes stale within a session
  });
}

export function useAyahRange(surahId: number | null, startAyah: number | null, count: number) {
  return useQuery({
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

export function useLastRead() {
  return useQuery({
    queryKey: quranKeys.lastRead(),
    queryFn: () => getJson<LastReadPosition>(StorageKeys.lastReadAyah),
  });
}
