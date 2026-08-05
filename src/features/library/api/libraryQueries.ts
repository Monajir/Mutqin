import { useQuery } from '@tanstack/react-query';
import { libraryRepository } from './libraryRepository';

const libraryKeys = {
  all: ['library'] as const,
  hadithCollections: () => [...libraryKeys.all, 'hadith-collections'] as const,
  hadiths: (collectionId: string, query: string, limit: number) =>
    [...libraryKeys.all, 'hadiths', collectionId, query, limit] as const,
  duaCategories: () => [...libraryKeys.all, 'dua-categories'] as const,
  duas: (categoryId: string | null, query: string) =>
    [...libraryKeys.all, 'duas', categoryId, query] as const,
  names: () => [...libraryKeys.all, 'names'] as const,
  dailyHadith: (dateKey: string) => [...libraryKeys.all, 'daily-hadith', dateKey] as const,
};

export function useDailyHadith(dateKey: string) {
  return useQuery({
    queryKey: libraryKeys.dailyHadith(dateKey),
    queryFn: () => libraryRepository.getDailyHadith(dateKey),
    // Bundled reference content is synchronous and immutable for the session.
    // Seed the query immediately so the Home screen never flashes a skeleton.
    initialData: () => libraryRepository.getDailyHadith(dateKey),
    staleTime: Infinity,
  });
}

export function useHadithCollections() {
  return useQuery({
    queryKey: libraryKeys.hadithCollections(),
    queryFn: () => libraryRepository.getHadithCollections(),
    staleTime: Infinity,
  });
}

export function useHadiths(collectionId: string, query: string, limit: number) {
  return useQuery({
    queryKey: libraryKeys.hadiths(collectionId, query, limit),
    queryFn: () => libraryRepository.getHadiths(collectionId, query, limit),
    enabled: Boolean(collectionId),
    staleTime: Infinity,
  });
}

export function useDuaCategories() {
  return useQuery({
    queryKey: libraryKeys.duaCategories(),
    queryFn: () => libraryRepository.getDuaCategories(),
    staleTime: Infinity,
  });
}

export function useDuas(categoryId: string | null, query: string) {
  return useQuery({
    queryKey: libraryKeys.duas(categoryId, query),
    queryFn: () => libraryRepository.getDuas(categoryId, query),
    staleTime: Infinity,
  });
}

export function useNamesOfAllah() {
  return useQuery({
    queryKey: libraryKeys.names(),
    queryFn: () => libraryRepository.getNamesOfAllah(),
    staleTime: Infinity,
  });
}
