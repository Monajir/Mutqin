import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { create } from 'zustand';
import { useNotificationSettingsStore } from '@/stores';
import { calculatePrayerTimesForDay, usePrayerSettingsStore } from '@/features/prayer';
import { quranRepository } from '@/features/quran';
import { libraryRepository } from '@/features/library';
import { fetchPrayerTimesFromAlAdhan } from '@/services/prayer/aladhanClient';
import { queryClient } from '@/lib/queryClient';
import { buildReminderPlan, CHANNEL_ID, dateKey, REMINDER_PREFIX, SCHEDULE_DAYS, TEST_ID } from './notificationPlan';

interface NotificationStatus {
  permission: 'unknown' | 'granted' | 'blocked' | 'unsupported';
  busy: boolean;
  count: number;
  through: string | null;
  locationAvailable: boolean;
  error: string | null;
}

export const useNotificationStatus = create<NotificationStatus>(() => ({
  permission: 'unknown', busy: false, count: 0, through: null, locationAvailable: false, error: null,
}));

export async function prepareNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Mutqin reminders', importance: Notifications.AndroidImportance.HIGH,
      sound: 'default', vibrationPattern: [0, 200],
    });
  }
}

export async function checkNotificationPermission() {
  if (Platform.OS === 'web') {
    useNotificationStatus.setState({ permission: 'unsupported' });
    return false;
  }
  const permission = await Notifications.getPermissionsAsync();
  let allowed = permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (Platform.OS === 'android') {
    const channel = await Notifications.getNotificationChannelAsync(CHANNEL_ID);
    if (channel?.importance === Notifications.AndroidImportance.NONE) allowed = false;
  }
  useNotificationStatus.setState({ permission: allowed ? 'granted' : 'blocked' });
  return allowed;
}

let generation = 0;
let tail: Promise<void> = Promise.resolve();

/** Serializes native mutations; rapid changes cannot restore an obsolete schedule. */
export function refreshNotifications(): Promise<void> {
  const version = ++generation;
  useNotificationStatus.setState({ busy: true, error: null });
  tail = tail.then(async () => {
    if (version !== generation) return;
    try {
      if (Platform.OS === 'web') {
        useNotificationStatus.setState({ permission: 'unsupported' });
        return;
      }
      await prepareNotificationChannel();
      const permitted = await checkNotificationPermission();
      const settings = useNotificationSettingsStore.getState().settings;
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      if (!settings.enabled || !permitted) {
        for (const item of existing) {
          if (item.identifier.startsWith(REMINDER_PREFIX) || item.identifier === TEST_ID) {
            await Notifications.cancelScheduledNotificationAsync(item.identifier);
          }
        }
        useNotificationStatus.setState({ count: 0, through: null });
        return;
      }

      const needsLocation = settings.prayerReminders || settings.morningAdhkar || settings.eveningAdhkar;
      const prayerSettings = usePrayerSettingsStore.getState().settings;
      let coords: { latitude: number; longitude: number } | null = null;
      if (needsLocation && prayerSettings.locationMode === 'auto') {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.granted) {
          const last = await Location.getLastKnownPositionAsync({ maxAge: 24 * 60 * 60 * 1000 });
          if (last) coords = { latitude: Number(last.coords.latitude.toFixed(4)), longitude: Number(last.coords.longitude.toFixed(4)) };
        }
      }
      // Never send prayer reminders for the Prayer screen's Makkah fallback.
      useNotificationStatus.setState({ locationAvailable: !!coords });
      const now = new Date();
      const days = await Promise.all(Array.from({ length: SCHEDULE_DAYS }, async (_, offset) => {
        const date = new Date(now);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + offset);
        const key = dateKey(date);
        let prayers: { name: string; time: string }[] = [];
        if (coords) {
          const { latitude, longitude } = coords;
          const method = prayerSettings.calculationMethodId;
          const times = await queryClient.fetchQuery({
            queryKey: ['prayer', 'times', 'v2', latitude, longitude, method, date.toDateString()],
            queryFn: async () => {
              try { return await fetchPrayerTimesFromAlAdhan(date, latitude, longitude, method); }
              catch { return calculatePrayerTimesForDay(date, latitude, longitude, method); }
            },
            staleTime: 30 * 60 * 1000, networkMode: 'always', retry: false,
          });
          prayers = times.prayers;
        }
        return {
          date, prayers,
          verse: settings.dailyVerse ? quranRepository.getDailyVerse(key) : null,
          hadith: settings.dailyHadith ? libraryRepository.getDailyHadith(key) : null,
        };
      }));
      if (version !== generation) return;
      const plan = buildReminderPlan(settings, days, Date.now());
      const desired = new Map(plan.map((item) => [item.id, item]));
      for (const old of existing) {
        if (old.identifier.startsWith(REMINDER_PREFIX) && !desired.has(old.identifier)) {
          await Notifications.cancelScheduledNotificationAsync(old.identifier);
        }
      }
      for (const item of plan) {
        if (version !== generation) return;
        const signature = JSON.stringify(item);
        if (existing.find((old) => old.identifier === item.id)?.content.data?.signature === signature) continue;
        await Notifications.scheduleNotificationAsync({
          identifier: item.id,
          content: { title: item.title, body: item.body, sound: 'default', data: { route: item.route, signature } },
          trigger: { date: new Date(item.at), channelId: CHANNEL_ID },
        });
      }
      useNotificationStatus.setState({ count: plan.length, through: dateKey(days[days.length - 1]!.date) });
    } catch {
      useNotificationStatus.setState({ error: 'Could not refresh reminders. Check permissions and try again.' });
    } finally {
      if (version === generation) useNotificationStatus.setState({ busy: false });
    }
  });
  return tail;
}

export async function setNotificationsEnabled(enabled: boolean): Promise<boolean> {
  if (!enabled) {
    useNotificationSettingsStore.getState().setSetting('enabled', false);
    await refreshNotifications();
    return true;
  }
  if (Platform.OS === 'web') return false;
  await prepareNotificationChannel();
  if (!await checkNotificationPermission()) {
    const permission = await Notifications.getPermissionsAsync();
    if (permission.canAskAgain) await Notifications.requestPermissionsAsync();
    if (!await checkNotificationPermission()) {
      useNotificationSettingsStore.getState().setSetting('enabled', false);
      await refreshNotifications();
      return false;
    }
  }
  useNotificationSettingsStore.getState().setSetting('enabled', true);
  await refreshNotifications();
  return true;
}

export function openNotificationSettings() {
  return Linking.openSettings();
}

export async function updateScheduledCount() {
  try {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    useNotificationStatus.setState({ count: pending.filter((item) => item.identifier.startsWith(REMINDER_PREFIX)).length });
  } catch { /* A normal refresh exposes permission/scheduling errors. */ }
}

export async function sendTestNotification() {
  if (!useNotificationSettingsStore.getState().settings.enabled || !await checkNotificationPermission()) {
    throw new Error('Enable notifications and allow permission first.');
  }
  await Notifications.scheduleNotificationAsync({
    identifier: TEST_ID,
    content: { title: 'Mutqin notifications are working', body: 'Tap to return to notification settings.', sound: 'default', data: { route: '/settings/notifications' } },
    trigger: { seconds: 5, channelId: CHANNEL_ID },
  });
}

export async function updateReminderLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error('Allow location in your phone settings to schedule prayer reminders.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Location timed out. Try again with location services enabled.')), 15000); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
  await refreshNotifications();
}
