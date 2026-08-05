import React from 'react';
import { View } from 'react-native';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/primitives/Icon';
import { Card } from '@/design-system/components';
import { useAppTheme } from '@/design-system/theme';
import { formatCountdown } from '../utils/prayerTimeCalculator';
import type { PrayerTimesForDay } from '../types/prayer.types';

export function PrayerCountdown({ data }: { data: PrayerTimesForDay }) {
  const { tokens } = useAppTheme();

  return (
    <Card
      style={{
        overflow: 'hidden',
        minHeight: 150,
        backgroundColor: tokens.background.elevated,
        borderColor: tokens.border.strong,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 210,
          height: 210,
          borderRadius: 105,
          right: -80,
          top: -120,
          backgroundColor: tokens.brand.primary,
          opacity: 0.2,
        }}
      />
      <HStack justify="space-between" align="center" style={{ flex: 1 }}>
        <VStack gap={2}>
          <Text variant="caption" color="brand" weight="700">UP NEXT</Text>
          <Text variant="displaySm">{data.nextPrayer}</Text>
          <Text variant="bodySm" color="secondary">
            {data.currentPrayer ? `Currently ${data.currentPrayer}` : 'First prayer of the day'}
          </Text>
        </VStack>
        <VStack gap={2} align="center">
          <HStack
            align="center"
            justify="center"
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: tokens.background.secondary,
            }}
          >
            <Icon name="MoonStar" color="brand" size={24} />
          </HStack>
          <Text variant="headingSm">{formatCountdown(data.nextPrayerCountdownSec)}</Text>
          <Text variant="caption" color="muted">remaining</Text>
        </VStack>
      </HStack>
    </Card>
  );
}
