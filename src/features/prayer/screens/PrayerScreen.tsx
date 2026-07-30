import React from 'react';
import { useRouter } from 'expo-router';
import { ScreenWrapper, EmptyState } from '@/components';
import { VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { ListRow, Skeleton } from '@/design-system/components';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { PrayerCountdown } from '../components/PrayerCountdown';
import { PrayerTimesList } from '../components/PrayerTimesList';
import { PRAYER_CALCULATION_METHODS } from '@/constants';
import { usePrayerSettingsStore } from '../store/usePrayerSettingsStore';

/** Wireframe screen 03 — current prayer, countdown, full-day times, and quick config. */
export function PrayerScreen() {
  const router = useRouter();
  const { data, isLoading, permissionDenied, usingFallbackLocation } = usePrayerTimes();
  const methodId = usePrayerSettingsStore((s) => s.settings.calculationMethodId);
  const methodLabel = PRAYER_CALCULATION_METHODS.find((m) => m.id === methodId)?.label ?? methodId;

  return (
    <ScreenWrapper scroll>
      <VStack gap={5} style={{ paddingTop: 16 }}>
        <VStack gap={1}>
          <Text variant="headingLg">Prayer</Text>
          <Text variant="bodySm" color="secondary">
            {usingFallbackLocation ? 'Using default location — enable location for accuracy' : 'Auto location'}
          </Text>
        </VStack>

        {permissionDenied ? (
          <EmptyState
            variant="error"
            title="Location access needed"
            description="Enable location access to get accurate prayer times for where you are."
          />
        ) : isLoading || !data ? (
          <Skeleton height={100} />
        ) : (
          <>
            <PrayerCountdown data={data} />
            <PrayerTimesList data={data} />
          </>
        )}

        <VStack gap={1}>
          <ListRow title="Qibla Compass" leadingIcon="Compass" showChevron onPress={() => router.push('/(modals)/qibla')} />
          <ListRow title="Forbidden Salah Times" leadingIcon="AlertCircle" showChevron onPress={() => {}} />
          <ListRow title="Calculation" subtitle={methodLabel} leadingIcon="Settings" showChevron onPress={() => {}} />
          <ListRow title="Notifications" leadingIcon="Bell" showChevron onPress={() => router.push('/settings/notifications')} />
        </VStack>
      </VStack>
    </ScreenWrapper>
  );
}
