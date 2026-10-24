import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAppStore, useNotificationSettingsStore } from '@/stores';
import { usePrayerSettingsStore } from '@/features/prayer';
import { kvStorage } from '@/services/storage/mmkv';
import { refreshNotifications, updateScheduledCount } from './notificationRuntime';
import { safeReminderRoute } from './notificationPlan';

export function NotificationBootstrap() {
  const router = useRouter();
  const onboarded = useAppStore((s) => s.isOnboarded);
  useEffect(() => {
    if (!onboarded || Platform.OS === 'web') return;
    Notifications.setNotificationHandler({ handleNotification: async () => ({
      shouldShowAlert: useNotificationSettingsStore.getState().settings.enabled,
      shouldPlaySound: useNotificationSettingsStore.getState().settings.enabled,
      shouldSetBadge: false,
    }) });
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => { clearTimeout(timer); timer = setTimeout(() => { void refreshNotifications(); }, 150); };
    refresh();
    const settings = useNotificationSettingsStore.subscribe(refresh);
    const prayer = usePrayerSettingsStore.subscribe(refresh);
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    // Replenish while the app is left open; foregrounding also repairs timezone changes.
    const interval = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 30 * 60 * 1000);
    let active = true;
    const handleResponse = (response: Notifications.NotificationResponse | null) => {
      if (!active || !response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const route = safeReminderRoute(response.notification.request.content.data?.route);
      const key = `${response.notification.request.identifier}:${response.notification.date}`;
      if (!route || kvStorage.getString('notifications.lastResponse') === key) return;
      kvStorage.set('notifications.lastResponse', key);
      router.push(route as Href);
    };
    const response = Notifications.addNotificationResponseReceivedListener(handleResponse);
    const received = Notifications.addNotificationReceivedListener(() => { void updateScheduledCount(); });
    void Notifications.getLastNotificationResponseAsync().then(handleResponse).catch(() => {});
    return () => {
      active = false;
      clearTimeout(timer); clearInterval(interval);
      settings(); prayer(); appState.remove(); response.remove(); received.remove();
    };
  }, [onboarded, router]);
  return null;
}
