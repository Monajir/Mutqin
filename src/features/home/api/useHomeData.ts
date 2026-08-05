import { format } from 'date-fns';
import { usePrayerTimes } from '@/features/prayer';
import { useHifzOverallStats, useHifzRevisionQueue } from '@/features/hifz';
import { useDailyQuranVerse } from '@/features/quran';
import { useDailyHadith } from '@/features/library';
import { formatHijriDate } from '@/lib/dateTime';

export function useHomeData() {
  const now = new Date();
  const dateKey = format(now, 'yyyy-MM-dd');
  const prayerTimes = usePrayerTimes();
  const hifzStats = useHifzOverallStats();
  const revisionQueue = useHifzRevisionQueue();
  const dailyVerse = useDailyQuranVerse(dateKey);
  const dailyHadith = useDailyHadith(dateKey);

  return {
    prayerTimes: prayerTimes.data,
    hifzStats: hifzStats.data,
    revisionDueCount: revisionQueue.data?.length ?? 0,
    dailyVerse: dailyVerse.data ?? undefined,
    dailyHadith: dailyHadith.data ?? undefined,
    hijriDate: formatHijriDate(now),
    isLoading:
      prayerTimes.isLoading ||
      hifzStats.isLoading ||
      dailyVerse.isLoading ||
      dailyHadith.isLoading,
  };
}
