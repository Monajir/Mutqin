import React, { useState } from 'react';
import { Switch } from 'react-native';
import { ScreenWrapper } from '@/components';
import { VStack, HStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Button } from '@/design-system/primitives/Button';
import { Input } from '@/design-system/primitives/Input';
import { useToast } from '@/design-system/components';
import { useAppTheme } from '@/design-system/theme';
import { useNotificationSettingsStore } from '@/stores';
import { useNotificationStatus, setNotificationsEnabled, sendTestNotification, refreshNotifications, openNotificationSettings, updateReminderLocation, validTime } from '@/features/notifications';

const items = [
  { key: 'prayerReminders', label: 'Prayer reminders', description: 'Five daily prayers. Sunrise excluded.' },
  { key: 'morningAdhkar', label: 'Morning Adhkar', description: 'After Fajr. Opens morning Adhkar.' },
  { key: 'eveningAdhkar', label: 'Evening Adhkar', description: 'After Asr. Opens evening Adhkar.' },
  { key: 'dailyVerse', label: 'Daily Quran Verse', description: 'The same daily verse as Home.' },
  { key: 'dailyHadith', label: 'Daily Hadith', description: 'The same daily hadith as Home.' },
  { key: 'fridayReminder', label: 'Friday reminder', description: 'A reminder to read Surah Al-Kahf.' },
] as const;

function TimeField({ label, value, onSave }: { label: string; value: string; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string>();
  return <Input label={label} accessibilityLabel={label} value={draft} maxLength={5}
    placeholder="HH:MM" autoCorrect={false} onChangeText={setDraft} error={error}
    onEndEditing={() => {
      if (!validTime(draft)) { setError('Use 24-hour time, for example 09:00.'); return; }
      setError(undefined); onSave(draft);
    }} />;
}

function OffsetField({ label, value, onSave }: { label: string; value: number; onSave: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string>();
  return <Input label={label} accessibilityLabel={label} value={draft} keyboardType="number-pad" maxLength={3}
    onChangeText={setDraft} error={error} onEndEditing={() => {
      const minutes = Number(draft);
      if (!/^\d+$/.test(draft) || minutes < 0 || minutes > 120) { setError('Choose 0–120 minutes.'); return; }
      setError(undefined); onSave(minutes);
    }} />;
}

export function NotificationsSettingsScreen() {
  const { tokens } = useAppTheme();
  const { show } = useToast();
  const settings = useNotificationSettingsStore((s) => s.settings);
  const setSetting = useNotificationSettingsStore((s) => s.setSetting);
  const status = useNotificationStatus();
  const [working, setWorking] = useState(false);
  const active = settings.enabled && status.permission === 'granted';
  const run = async (action: () => Promise<unknown>) => {
    setWorking(true);
    try { await action(); }
    catch (error) { show(error instanceof Error ? error.message : 'Please try again.', 'error'); }
    finally { setWorking(false); }
  };
  const trackColor = { true: tokens.brand.primary, false: tokens.border.strong };

  return (
    <ScreenWrapper scroll>
      <VStack gap={4} style={{ paddingTop: 16 }}>
        <Text variant="headingLg">Notifications</Text>
        <Text variant="bodySm" color="secondary">
          {status.permission === 'unknown' ? 'Checking phone permission…' : status.permission === 'unsupported' ? 'Local reminders are available in the mobile app.' : status.permission === 'blocked' ? 'Notifications are blocked or have not been allowed on this phone.' : 'Phone permission is allowed. Individual channels, sound and Do Not Disturb are controlled in phone settings.'}
        </Text>
        <HStack justify="space-between" align="center">
          <Text variant="bodyLg">Enable notifications</Text>
          <Switch accessibilityLabel="Enable notifications" value={active}
            disabled={working || status.busy || status.permission === 'unknown' || status.permission === 'unsupported'}
            onValueChange={(enabled) => { void run(async () => {
              if (!await setNotificationsEnabled(enabled)) show('Allow notifications in phone settings first.', 'error');
            }); }} trackColor={trackColor} />
        </HStack>
        <Button label="Open phone settings" variant="secondary" onPress={() => { void run(openNotificationSettings); }} />
        <Button label="Send test notification (5 seconds)" disabled={!active || working || status.busy}
          onPress={() => { void run(async () => { await sendTestNotification(); show('Test scheduled. Lock the phone to check delivery.'); }); }} />
        <Text variant="caption" color="secondary">
          {status.busy ? 'Updating reminders…' : !active ? 'Reminders are off.' : `${status.count} reminders scheduled${status.through ? ` through ${status.through}` : ''}.`}
        </Text>
        {status.error ? <Text color="error">{status.error}</Text> : null}
        <Text variant="caption" color="secondary">
          Schedules cover today and the next two days. Open Mutqin daily to keep them refreshed. Android may delay alerts; exact prayer-time delivery is not enabled in this version.
        </Text>
        {active && (settings.prayerReminders || settings.morningAdhkar || settings.eveningAdhkar) ? <VStack gap={2}>
          <Text variant="caption" color="secondary">{status.locationAvailable ? 'Prayer and Adhkar times use your recent location. Refresh after travelling.' : 'Prayer and Adhkar reminders need a recent location. Other reminders still work.'}</Text>
          <Button label="Refresh location" variant="secondary" loading={working} disabled={status.busy}
            onPress={() => { void run(updateReminderLocation); }} />
        </VStack> : null}
        <Button label="Refresh reminders" variant="secondary" disabled={working || status.busy}
          onPress={() => { void run(refreshNotifications); }} />
        {items.map((item) => (
          <VStack key={item.key} gap={2} style={{ paddingVertical: 8 }}>
            <HStack justify="space-between" align="center">
              <VStack gap={1} style={{ flex: 1, marginRight: 12 }}>
                <Text variant="bodyLg">{item.label}</Text>
                <Text variant="caption" color="secondary">{item.description}</Text>
              </VStack>
              <Switch accessibilityLabel={item.label} disabled={!active} value={settings[item.key]}
                onValueChange={(value) => setSetting(item.key, value)} trackColor={trackColor} />
            </HStack>
            {active && settings[item.key] && item.key === 'dailyVerse' ? <TimeField label="Verse time (24-hour)" value={settings.dailyVerseTime} onSave={(v) => setSetting('dailyVerseTime', v)} /> : null}
            {active && settings[item.key] && item.key === 'dailyHadith' ? <TimeField label="Hadith time (24-hour)" value={settings.dailyHadithTime} onSave={(v) => setSetting('dailyHadithTime', v)} /> : null}
            {active && settings[item.key] && item.key === 'fridayReminder' ? <TimeField label="Friday time (24-hour)" value={settings.fridayTime} onSave={(v) => setSetting('fridayTime', v)} /> : null}
            {active && settings[item.key] && item.key === 'morningAdhkar' ? <OffsetField label="Minutes after Fajr" value={settings.morningOffsetMinutes} onSave={(v) => setSetting('morningOffsetMinutes', v)} /> : null}
            {active && settings[item.key] && item.key === 'eveningAdhkar' ? <OffsetField label="Minutes after Asr" value={settings.eveningOffsetMinutes} onSave={(v) => setSetting('eveningOffsetMinutes', v)} /> : null}
          </VStack>
        ))}
        <Text variant="bodyLg">Hifz revision reminders</Text>
        <Text variant="bodySm" color="secondary">Revision and missed-revision alerts are not available yet. They need a way to mark revisions completed; memorization marks alone cannot tell us whether you missed a revision.</Text>
      </VStack>
    </ScreenWrapper>
  );
}
