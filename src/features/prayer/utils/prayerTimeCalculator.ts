import { PRAYER_NAMES, type PrayerName } from '@/constants';
import { CalculationMethod, Coordinates, PrayerTimes } from 'adhan';
import type { PrayerTimesForDay } from '../types/prayer.types';

function getCalculationParameters(methodId: string) {
  switch (methodId) {
    case 'egyptian':
      return CalculationMethod.Egyptian();
    case 'karachi':
      return CalculationMethod.Karachi();
    case 'isna':
      return CalculationMethod.NorthAmerica();
    case 'umm_al_qura':
      return CalculationMethod.UmmAlQura();
    default:
      return CalculationMethod.MuslimWorldLeague();
  }
}

/** Accurate on-device fallback used when AlAdhan is unavailable. */
export function calculatePrayerTimesForDay(
  date: Date,
  latitude: number,
  longitude: number,
  calculationMethodId: string
): PrayerTimesForDay {
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);
  const calculated = new PrayerTimes(
    new Coordinates(latitude, longitude),
    base,
    getCalculationParameters(calculationMethodId)
  );
  const times: Record<PrayerName, Date> = {
    Fajr: calculated.fajr,
    Sunrise: calculated.sunrise,
    Dhuhr: calculated.dhuhr,
    Asr: calculated.asr,
    Maghrib: calculated.maghrib,
    Isha: calculated.isha,
  };
  const prayers = PRAYER_NAMES.map((name) => ({
    name,
    time: times[name].toISOString(),
    isCurrent: false,
    isPast: false,
  }));

  return {
    date: base.toISOString().slice(0, 10),
    prayers,
    currentPrayer: null,
    nextPrayer: 'Fajr',
    nextPrayerCountdownSec: 0,
    source: 'offline-calculation',
  };
}

/**
 * Recomputes the time-sensitive fields from the prayer timestamps. This is
 * intentionally separate from the daily calculation so the UI can update
 * every second without rerunning the astronomical calculation or refetching.
 */
export function getLivePrayerTiming(
  data: PrayerTimesForDay,
  nowMs = Date.now()
): PrayerTimesForDay {
  const salahEntries = data.prayers.filter((prayer) => prayer.name !== 'Sunrise');
  const currentEntry = [...salahEntries]
    .reverse()
    .find((prayer) => new Date(prayer.time).getTime() <= nowMs);
  const upcomingEntry = salahEntries.find(
    (prayer) => new Date(prayer.time).getTime() > nowMs
  );

  const nextPrayer = upcomingEntry?.name ?? 'Fajr';
  const nextPrayerTimeMs = upcomingEntry
    ? new Date(upcomingEntry.time).getTime()
    : new Date(salahEntries[0]!.time).getTime() + 24 * 60 * 60 * 1000;

  return {
    ...data,
    currentPrayer: currentEntry?.name ?? null,
    nextPrayer,
    nextPrayerCountdownSec: Math.max(0, Math.floor((nextPrayerTimeMs - nowMs) / 1000)),
    prayers: data.prayers.map((prayer) => ({
      ...prayer,
      isPast: new Date(prayer.time).getTime() < nowMs,
      isCurrent: prayer.name === currentEntry?.name,
    })),
  };
}

export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
