import { create } from 'zustand';
import { getJson, setJson, StorageKeys } from '@/services/storage/mmkv';

export interface NotificationSettings {
  dailyVerseTime: string;
  dailyHadithTime: string;
  fridayTime: string;
  morningOffsetMinutes: number;
  eveningOffsetMinutes: number;
  enabled: boolean;
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
  dailyVerseTime: '09:00',
  dailyHadithTime: '18:00',
  fridayTime: '08:00',
  morningOffsetMinutes: 20,
  eveningOffsetMinutes: 20,
  enabled: false,
  prayerReminders: true,
  morningAdhkar: false,
  eveningAdhkar: false,
  dailyVerse: false,
  dailyHadith: false,
  hifzRevisionReminder: false,
  missedRevisionReminder: false,
  fridayReminder: false,
};

interface NotificationSettingsState {
  settings: NotificationSettings;
  setSetting: <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => void;
}

export const useNotificationSettingsStore = create<NotificationSettingsState>((set, get) => ({
  settings: { ...defaults, ...getJson<Partial<NotificationSettings>>(StorageKeys.notificationSettings) },
  setSetting: (key, value) => {
    const next = { ...get().settings, [key]: value };
    setJson(StorageKeys.notificationSettings, next);
    set({ settings: next });
  },
}));
