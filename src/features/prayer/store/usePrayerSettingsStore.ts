import { create } from 'zustand';
import { getJson, setJson } from '@/services/storage/mmkv';
import type { PrayerSettings } from '../types/prayer.types';

const STORAGE_KEY = 'settings.prayer';

const defaults: PrayerSettings = {
  calculationMethodId: 'muslim_world_league',
  locationMode: 'auto',
  notificationsEnabled: true,
};

interface PrayerSettingsState {
  settings: PrayerSettings;
  updateSettings: (patch: Partial<PrayerSettings>) => void;
}

export const usePrayerSettingsStore = create<PrayerSettingsState>((set, get) => ({
  settings: getJson<PrayerSettings>(STORAGE_KEY) ?? defaults,
  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch };
    setJson(STORAGE_KEY, next);
    set({ settings: next });
  },
}));
