export const APP_NAME = 'Mutqin';

export const QUERY_STALE_TIME = {
  short: 60 * 1000,
  medium: 5 * 60 * 1000,
  long: 60 * 60 * 1000,
} as const;

export const HIFZ_SESSION_DEFAULTS = {
  dailyAyahGoal: 5,
  weeklyAyahGoal: 35,
} as const;
