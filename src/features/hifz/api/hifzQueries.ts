import { useQuery } from '@tanstack/react-query';
import { hifzKeys } from './hifzKeys';
import { hifzRepository } from './hifzRepository';
import { getJuzAyahCounts } from '@/features/quran';

/**
 * Local-first queries: since hifz_progress is SQLite-backed and always
 * available offline, these use `queryFn` purely to give screens the
 * familiar loading/error/data shape and cache invalidation — there is no
 * network round trip here (§10, §16).
 */
export function useHifzOverallStats() {
  return useQuery({
    queryKey: hifzKeys.overallStats(),
    queryFn: () => hifzRepository.getOverallStats(),
  });
}

export function useHifzJuzSummary() {
  return useQuery({
    queryKey: hifzKeys.juzSummary(),
    queryFn: () => hifzRepository.getJuzSummary(getJuzAyahCounts()),
  });
}

export function useHifzRevisionQueue() {
  return useQuery({
    queryKey: hifzKeys.revisionQueue(),
    queryFn: () => hifzRepository.getRevisionQueue(),
  });
}
