import { format } from 'date-fns';

/**
 * Gregorian -> Hijri conversion. Uses the platform Intl API where available
 * (accurate, locale-aware) with a documented limitation: Intl's
 * 'islamic-umalqura' calendar can drift ±1 day from local moon-sighting
 * announcements, which is acceptable for display purposes but must not be
 * used for fiqh-sensitive date calculations without a dedicated library.
 */
export function formatHijriDate(date: Date, locale = 'en'): string {
  try {
    const formatter = new Intl.DateTimeFormat(`${locale}-u-ca-islamic-umalqura`, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatter.format(date);
  } catch {
    return format(date, 'd MMMM yyyy');
  }
}

export function formatTime(date: Date): string {
  return format(date, 'h:mm a');
}

export function isFriday(date: Date): boolean {
  return date.getDay() === 5;
}
