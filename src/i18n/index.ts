import { I18n } from 'i18n-js';
import en from './en.json';
import ar from './ar.json';
import { kvStorage, StorageKeys } from '@/services/storage/mmkv';

/**
 * Minimal i18n setup covering the strings introduced in this scaffold.
 * Full translation coverage (Bengali included, per spec §"Notes for the
 * Development Team") is tracked as a roadmap task — see IMPLEMENTATION_ROADMAP.md
 * Phase 6. Structure (nested JSON keyed by feature) is meant to be followed
 * for every new string added by the team.
 */
export const i18n = new I18n({ en, ar });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';
i18n.locale = (kvStorage.getString(StorageKeys.languagePreference) as string) ?? 'en';

export function setAppLocale(locale: 'en' | 'ar' | 'bn') {
  kvStorage.set(StorageKeys.languagePreference, locale);
  i18n.locale = locale;
}
