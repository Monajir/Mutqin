import React from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { ScreenWrapper } from '@/components';
import { VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Button } from '@/design-system/primitives/Button';
import { Icon } from '@/design-system/primitives/Icon';
import { useAppStore } from '@/stores';

export function PermissionsScreen() {
  const router = useRouter();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const finish = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <ScreenWrapper>
      <VStack gap={6} style={{ flex: 1, paddingTop: 32 }}>
        <VStack gap={2}>
          <Text variant="headingLg">Enable a few permissions</Text>
          <Text variant="bodySm" color="secondary">
            These power accurate prayer times, the Qibla compass, and timely reminders. You can change these anytime in Settings.
          </Text>
        </VStack>

        <VStack gap={4}>
          <VStack gap={2}>
            <Icon name="MapPin" color="brand" />
            <Text variant="bodyLg" weight="600">
              Location
            </Text>
            <Text variant="bodySm" color="secondary">
              For accurate prayer times and Qibla direction.
            </Text>
            <Button
              label="Allow Location"
              variant="secondary"
              onPress={() => Location.requestForegroundPermissionsAsync()}
            />
          </VStack>

          <VStack gap={2}>
            <Icon name="Bell" color="brand" />
            <Text variant="bodyLg" weight="600">
              Notifications
            </Text>
            <Text variant="bodySm" color="secondary">
              For prayer, Adhkar, and revision reminders.
            </Text>
            <Button
              label="Allow Notifications"
              variant="secondary"
              onPress={() => Notifications.requestPermissionsAsync()}
            />
          </VStack>
        </VStack>

        <Button label="Continue" fullWidth onPress={finish} style={{ marginTop: 'auto' }} />
      </VStack>
    </ScreenWrapper>
  );
}
