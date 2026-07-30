import { usePrayerTimes } from '@/features/prayer';
import { useHifzOverallStats, useHifzRevisionQueue } from '@/features/hifz';
import { useQuery } from '@tanstack/react-query';
import { formatHijriDate } from '@/lib/dateTime';

interface DailyContent {
  verseArabic: string;
  verseTranslation: string;
  verseReference: string;
  hadithExcerpt: string;
  hadithSource: string;
}

/**
 * v1 daily content is a small local rotation rather than a live
 * recommendation-engine call, since Home must render meaningfully with zero
 * network (spec §10). Swapping this for `services/api` + the
 * recommendations endpoints is a drop-in replacement — see roadmap Phase 4.
 */
const DAILY_CONTENT_POOL: DailyContent[] = [
  {
    verseArabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    verseTranslation: 'Indeed, with hardship comes ease.',
    verseReference: 'Ash-Sharh 94:6',
    hadithExcerpt: 'Actions are judged by intentions, and every person will be rewarded according to their intention.',
    hadithSource: 'Sahih al-Bukhari 1',
  },
  {
    verseArabic: 'وَبَشِّرِ الصَّابِرِينَ',
    verseTranslation: 'And give good tidings to the patient.',
    verseReference: 'Al-Baqarah 2:155',
    hadithExcerpt: 'The strong believer is better and more beloved to Allah than the weak believer.',
    hadithSource: 'Sahih Muslim 2664',
  },
];

function useDailyContent() {
  return useQuery({
    queryKey: ['home', 'dailyContent', new Date().toDateString()],
    queryFn: () => {
      const dayIndex = new Date().getDate() % DAILY_CONTENT_POOL.length;
      return DAILY_CONTENT_POOL[dayIndex];
    },
  });
}

export function useHomeData() {
  const prayerTimes = usePrayerTimes();
  const hifzStats = useHifzOverallStats();
  const revisionQueue = useHifzRevisionQueue();
  const dailyContent = useDailyContent();

  return {
    prayerTimes: prayerTimes.data,
    hifzStats: hifzStats.data,
    revisionDueCount: revisionQueue.data?.length ?? 0,
    dailyContent: dailyContent.data,
    hijriDate: formatHijriDate(new Date()),
    isLoading: prayerTimes.isLoading || hifzStats.isLoading || dailyContent.isLoading,
  };
}
