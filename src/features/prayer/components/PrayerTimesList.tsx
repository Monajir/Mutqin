import React from 'react';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Icon } from '@/design-system/primitives/Icon';
import { formatTime } from '@/lib/dateTime';
import type { PrayerTimesForDay } from '../types/prayer.types';

export function PrayerTimesList({ data }: { data: PrayerTimesForDay }) {
  return (
    <VStack gap={1}>
      {data.prayers.map((prayer) => (
        <HStack key={prayer.name} justify="space-between" style={{ paddingVertical: 10 }}>
          <Text variant="bodyLg" color={prayer.isCurrent ? 'brand' : 'primary'} weight={prayer.isCurrent ? '600' : '400'}>
            {prayer.name}
          </Text>
          <HStack gap={2}>
            <Text variant="bodyLg" color={prayer.isPast && !prayer.isCurrent ? 'muted' : 'primary'}>
              {formatTime(new Date(prayer.time))}
            </Text>
            {prayer.isPast && !prayer.isCurrent ? <Icon name="Check" size={16} color="muted" /> : null}
            {prayer.isCurrent ? <Icon name="Clock" size={16} color="brand" /> : null}
          </HStack>
        </HStack>
      ))}
    </VStack>
  );
}
