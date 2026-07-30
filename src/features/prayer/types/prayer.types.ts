import type { PrayerName } from '@/constants';

export interface PrayerTimeEntry {
  name: PrayerName;
  time: string; // ISO string
  isCurrent: boolean;
  isPast: boolean;
}

export interface PrayerTimesForDay {
  date: string; // yyyy-MM-dd
  prayers: PrayerTimeEntry[];
  currentPrayer: PrayerName | null;
  nextPrayer: PrayerName;
  nextPrayerCountdownSec: number;
}

export interface QiblaDirection {
  bearingDegrees: number;
}

export interface PrayerSettings {
  calculationMethodId: string;
  locationMode: 'auto' | 'manual';
  manualCity?: string;
  notificationsEnabled: boolean;
}
