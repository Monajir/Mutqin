import { create } from 'zustand';
import { getJson, setJson, StorageKeys } from '@/services/storage/mmkv';

export interface NotificationSettings {
  prayerReminders: boolean;
  morningAdhkar: boolean;
  eveningAdhkar: boolean;
  dailyVerse: boolean;
  dailyHadith: boolean;
  hifzRevisionReminder: boolean;
  missedRevisionReminder: boolean;
  fridayReminder: boolean;
}

const defaults: NotificationSettings = {
  prayerReminders: true,
  morningAdhkar: true,
  eveningAdhkar: true,
  dailyVerse: true,
  dailyHadith: true,
  hifzRevisionReminder: true,
  missedRevisionReminder: true,
  fridayReminder: true,
};

interface NotificationSettingsState {
  settings: NotificationSettings;
  setSetting: <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => void;
}

export const useNotificationSettingsStore = create<NotificationSettingsState>((set, get) => ({
  settings: getJson<NotificationSettings>(StorageKeys.notificationSettings) ?? defaults,
  setSetting: (key, value) => {
    const next = { ...get().settings, [key]: value };
    setJson(StorageKeys.notificationSettings, next);
    set({ settings: next });
  },
}));
