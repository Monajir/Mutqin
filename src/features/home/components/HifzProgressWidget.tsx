import React from 'react';
import { useRouter } from 'expo-router';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Card, ProgressBar } from '@/design-system/components';
import type { HifzOverallStats } from '@/features/hifz';

export interface HifzProgressWidgetProps {
  stats: HifzOverallStats;
}

export function HifzProgressWidget({ stats }: HifzProgressWidgetProps) {
  const router = useRouter();

  return (
    <Card onPress={() => router.push('/(tabs)/hifz')}>
      <VStack gap={2}>
        <HStack justify="space-between">
          <Text variant="bodySm" color="secondary" weight="600">
            Hifz
          </Text>
          <Text variant="bodySm" weight="600">{`${Math.round(stats.overallPercentComplete * 100)}%`}</Text>
        </HStack>
        <ProgressBar progress={stats.overallPercentComplete} accessibilityLabel="Hifz progress" />
        <Text variant="bodySm" color="secondary">
          {`${stats.totalMemorized} / 6236 ayahs memorized`}
        </Text>
      </VStack>
    </Card>
  );
}
