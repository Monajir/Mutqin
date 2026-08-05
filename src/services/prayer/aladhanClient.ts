import { fromZonedTime } from 'date-fns-tz';
import { PRAYER_NAMES } from '@/constants';
import type { PrayerTimesForDay } from '@/features/prayer/types/prayer.types';

const ALADHAN_API_BASE_URL = 'https://api.aladhan.com/v1';
const REQUEST_TIMEOUT_MS = 10_000;

const METHOD_IDS: Record<string, number> = {
  karachi: 1,
  isna: 2,
  muslim_world_league: 3,
  umm_al_qura: 4,
  egyptian: 5,
};

interface AlAdhanResponse {
  code: number;
  status: string;
  data: {
    timings: Record<string, string>;
    date: { gregorian: { date: string } };
    meta: { timezone: string };
  };
}

function formatApiDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
}

function parseTiming(date: string, timing: string, timezone: string): string {
  const match = timing.match(/^(\d{1,2}):(\d{2})/);
  if (!match) throw new Error(`Invalid AlAdhan timing: ${timing}`);

  const [day, month, year] = date.split('-');
  const hour = match[1]!.padStart(2, '0');
  const minute = match[2]!;
  return fromZonedTime(`${year}-${month}-${day}T${hour}:${minute}:00`, timezone).toISOString();
}

export async function fetchPrayerTimesFromAlAdhan(
  date: Date,
  latitude: number,
  longitude: number,
  calculationMethodId: string
): Promise<PrayerTimesForDay> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const apiDate = formatApiDate(date);
  const url = new URL(`${ALADHAN_API_BASE_URL}/timings/${apiDate}`);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('method', String(METHOD_IDS[calculationMethodId] ?? METHOD_IDS.muslim_world_league));
  url.searchParams.set('school', '0');

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) throw new Error(`AlAdhan request failed with status ${response.status}`);

    const payload = (await response.json()) as AlAdhanResponse;
    if (payload.code !== 200 || !payload.data?.timings || !payload.data.meta?.timezone) {
      throw new Error(payload.status || 'AlAdhan returned an invalid response');
    }

    const prayers = PRAYER_NAMES.map((name) => {
      const timing = payload.data.timings[name];
      if (!timing) throw new Error(`AlAdhan response is missing ${name}`);
      return {
        name,
        time: parseTiming(payload.data.date.gregorian.date, timing, payload.data.meta.timezone),
        isCurrent: false,
        isPast: false,
      };
    });

    return {
      date: `${apiDate.slice(6)}-${apiDate.slice(3, 5)}-${apiDate.slice(0, 2)}`,
      prayers,
      currentPrayer: null,
      nextPrayer: 'Fajr',
      nextPrayerCountdownSec: 0,
      source: 'aladhan',
      timezone: payload.data.meta.timezone,
    };
  } finally {
    clearTimeout(timeout);
  }
}
