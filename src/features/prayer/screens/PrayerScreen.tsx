import React from 'react';
import { useRouter } from 'expo-router';
import { EmptyState, ScreenWrapper } from '@/components';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/primitives/Icon';
import { Card, ListRow, Skeleton } from '@/design-system/components';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { PrayerCountdown } from '../components/PrayerCountdown';
import { PrayerTimesList } from '../components/PrayerTimesList';
import { PRAYER_CALCULATION_METHODS } from '@/constants';
import { usePrayerSettingsStore } from '../store/usePrayerSettingsStore';

export function PrayerScreen() {
  const router = useRouter();
  const { data, isLoading, permissionDenied, usingFallbackLocation } = usePrayerTimes();
  const methodId = usePrayerSettingsStore((state) => state.settings.calculationMethodId);
  const methodLabel = PRAYER_CALCULATION_METHODS.find((method) => method.id === methodId)?.label ?? methodId;

  return (
    <ScreenWrapper scroll>
      <VStack gap={5} style={{ paddingTop: 12 }}>
        <HStack justify="space-between" align="center">
          <VStack gap={1}>
            <Text variant="headingLg">Prayer Times</Text>
            <Text variant="bodySm" color="secondary">
              {usingFallbackLocation ? 'Default location · Enable location for accuracy' : 'Based on your location'}
            </Text>
          </VStack>
          <Icon name="MapPin" color="brand" size={21} />
        </HStack>

        {permissionDenied ? (
          <EmptyState
            variant="error"
            title="Location access needed"
            description="Enable location access to get accurate prayer times for where you are."
          />
        ) : isLoading || !data ? (
          <Skeleton height={180} />
        ) : (
          <>
            <PrayerCountdown data={data} />
            <VStack gap={2}>
              <Text variant="headingSm">Today</Text>
              <Card>
                <PrayerTimesList data={data} />
              </Card>
            </VStack>
          </>
        )}

        <VStack gap={2}>
          <Text variant="headingSm">Prayer Tools</Text>
          <Card>
            <ListRow title="Qibla Compass" leadingIcon="Compass" showChevron onPress={() => router.push('/(modals)/qibla')} />
            <ListRow title="Forbidden Salah Times" leadingIcon="AlertCircle" showChevron onPress={() => {}} />
            <ListRow title="Calculation" subtitle={methodLabel} leadingIcon="Settings" showChevron onPress={() => {}} />
            <ListRow title="Notifications" leadingIcon="Bell" showChevron onPress={() => router.push('/settings/notifications')} />
          </Card>
        </VStack>
      </VStack>
    </ScreenWrapper>
  );
}
