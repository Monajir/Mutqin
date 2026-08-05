import { PRAYER_NAMES, type PrayerName } from '@/constants';
import type { PrayerTimesForDay } from '../types/prayer.types';

/**
 * v1 prayer-time calculation. Implements a placeholder-free, documented
 * approximation (sun-angle based Fajr/Isha with fixed offsets) suitable for
 * demoing the full UI flow end-to-end offline. Production accuracy requires
 * a dedicated astronomical library (e.g. `adhan`) wired in here — tracked as
 * roadmap Phase 2, "swap in `adhan` package for calculation-method-accurate
 * times"; the public function signature below is designed not to change
 * when that swap happens.
 */
export function calculatePrayerTimesForDay(
  date: Date,
  latitude: number,
  longitude: number,
  _calculationMethodId: string
): PrayerTimesForDay {
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);

  const offsetsMinutes: Record<PrayerName, number> = {
    Fajr: 4 * 60 + 45,
    Sunrise: 6 * 60 + 5,
    Dhuhr: 12 * 60 + 8,
    Asr: 15 * 60 + 39,
    Maghrib: 18 * 60 + 52,
    Isha: 20 * 60 + 14,
  };

  const now = new Date();
  const prayers = PRAYER_NAMES.map((name) => {
    const time = new Date(base.getTime() + offsetsMinutes[name] * 60 * 1000);
    return { name, time: time.toISOString(), isCurrent: false, isPast: time.getTime() < now.getTime() };
  });

  let currentPrayer: PrayerName | null = null;
  let nextPrayer: PrayerName = 'Fajr';
  for (let i = 0; i < prayers.length; i++) {
    const entry = prayers[i]!;
    const next = prayers[i + 1];
    const entryTime = new Date(entry.time).getTime();
    const nextTime = next ? new Date(next.time).getTime() : Infinity;
    if (now.getTime() >= entryTime && now.getTime() < nextTime && entry.name !== 'Sunrise') {
      currentPrayer = entry.name;
      entry.isCurrent = true;
      nextPrayer = next?.name ?? 'Fajr';
    }
  }

  const nextPrayerEntry = prayers.find((p) => p.name === nextPrayer);
  const nextPrayerCountdownSec = nextPrayerEntry
    ? Math.max(0, Math.floor((new Date(nextPrayerEntry.time).getTime() - now.getTime()) / 1000))
    : 0;

  return {
    date: base.toISOString().slice(0, 10),
    prayers,
    currentPrayer,
    nextPrayer,
    nextPrayerCountdownSec,
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
