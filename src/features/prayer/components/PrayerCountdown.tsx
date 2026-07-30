import React from 'react';
import { VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Card } from '@/design-system/components';
import { formatCountdown } from '../utils/prayerTimeCalculator';
import type { PrayerTimesForDay } from '../types/prayer.types';

export function PrayerCountdown({ data }: { data: PrayerTimesForDay }) {
  const currentEntry = data.prayers.find((p) => p.name === data.currentPrayer);

  return (
    <Card>
      <VStack gap={1} align="center">
        <Text variant="bodySm" color="secondary">
          {data.currentPrayer ? `Current — ${data.currentPrayer}` : 'Upcoming'}
        </Text>
        <Text variant="displaySm" weight="700">
          {formatCountdown(data.nextPrayerCountdownSec)}
        </Text>
        <Text variant="bodySm" color="secondary">
          {`until ${data.nextPrayer}`}
        </Text>
      </VStack>
    </Card>
  );
}
