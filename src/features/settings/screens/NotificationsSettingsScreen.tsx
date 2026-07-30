import React from 'react';
import { ScreenWrapper } from '@/components';
import { VStack, HStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Switch } from 'react-native';
import { useAppTheme } from '@/design-system/theme';
import { useNotificationSettingsStore, type NotificationSettings } from '@/stores';

const items: { key: keyof NotificationSettings; label: string }[] = [
  { key: 'prayerReminders', label: 'Prayer reminders' },
  { key: 'morningAdhkar', label: 'Morning Adhkar' },
  { key: 'eveningAdhkar', label: 'Evening Adhkar' },
  { key: 'dailyVerse', label: 'Daily Quran Verse' },
  { key: 'dailyHadith', label: 'Daily Hadith' },
  { key: 'hifzRevisionReminder', label: 'Hifz revision reminder' },
  { key: 'missedRevisionReminder', label: 'Missed revision reminder' },
  { key: 'fridayReminder', label: 'Friday reminder' },
];

/** Wireframe §9 — every notification category individually configurable. */
export function NotificationsSettingsScreen() {
  const { tokens } = useAppTheme();
  const settings = useNotificationSettingsStore((s) => s.settings);
  const setSetting = useNotificationSettingsStore((s) => s.setSetting);

  return (
    <ScreenWrapper scroll>
      <VStack gap={4} style={{ paddingTop: 16 }}>
        <Text variant="headingLg">Notifications</Text>
        <VStack gap={1}>
          {items.map((item) => (
            <HStack key={item.key} justify="space-between" style={{ paddingVertical: 12 }}>
              <Text variant="bodyLg">{item.label}</Text>
              <Switch
                value={settings[item.key]}
                onValueChange={(value) => setSetting(item.key, value)}
                trackColor={{ true: tokens.brand.primary, false: tokens.border.strong }}
              />
            </HStack>
          ))}
        </VStack>
      </VStack>
    </ScreenWrapper>
  );
}
