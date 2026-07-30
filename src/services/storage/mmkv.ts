import { MMKV } from 'react-native-mmkv';

/**
 * Fast synchronous key-value storage for small, frequently-read data:
 * auth tokens, theme/notification preferences, last-read position, feature
 * flags cache. NOT for bulk offline content (Quran/Hadith/Dua text) — that
 * belongs in SQLite (see sqlite.ts) so it can be queried and indexed.
 */
export const kvStorage = new MMKV({ id: 'mutqin-kv' });

export const StorageKeys = {
  authTokens: 'auth.tokens',
  themePreference: 'settings.theme',
  languagePreference: 'settings.language',
  onboardingComplete: 'onboarding.complete',
  notificationSettings: 'settings.notifications',
  lastReadAyah: 'quran.lastRead',
  contentManifestVersion: (module: 'quran' | 'hadith' | 'dua' | 'namesOfAllah') => `content.${module}.version`,
} as const;

export function getJson<T>(key: string): T | null {
  const raw = kvStorage.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setJson<T>(key: string, value: T): void {
  kvStorage.set(key, JSON.stringify(value));
}
