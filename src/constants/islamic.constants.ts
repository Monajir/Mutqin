export const PRAYER_NAMES = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type PrayerName = (typeof PRAYER_NAMES)[number];

export const HIFZ_STATUSES = ['not_started', 'memorized', 'needs_revision', 'weak', 'strong'] as const;
export type HifzStatus = (typeof HIFZ_STATUSES)[number];

export const DUA_CATEGORIES = [
  'morning', 'evening', 'sleep', 'wake_up', 'travel', 'eating',
  'mosque', 'home', 'illness', 'anxiety', 'forgiveness', 'protection', 'hajj_umrah',
] as const;
export type DuaCategory = (typeof DUA_CATEGORIES)[number];

export const RECOMMENDATION_TOPICS = [
  'patience', 'hope', 'tawakkul', 'gratitude', 'family', 'knowledge', 'forgiveness', 'rizq',
] as const;
export type RecommendationTopic = (typeof RECOMMENDATION_TOPICS)[number];

export const PRAYER_CALCULATION_METHODS = [
  { id: 'muslim_world_league', label: 'Muslim World League' },
  { id: 'egyptian', label: 'Egyptian General Authority' },
  { id: 'karachi', label: 'University of Islamic Sciences, Karachi' },
  { id: 'isna', label: 'Islamic Society of North America' },
  { id: 'umm_al_qura', label: 'Umm al-Qura, Makkah' },
] as const;
