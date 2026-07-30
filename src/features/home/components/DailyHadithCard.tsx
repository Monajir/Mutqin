import React from 'react';
import { VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Card } from '@/design-system/components';

export interface DailyHadithCardProps {
  excerpt: string;
  source: string;
}

export function DailyHadithCard({ excerpt, source }: DailyHadithCardProps) {
  return (
    <Card>
      <VStack gap={2}>
        <Text variant="bodySm" color="secondary" weight="600">
          Daily Hadith
        </Text>
        <Text variant="bodyLg">{excerpt}</Text>
        <Text variant="caption" color="muted">
          {source}
        </Text>
      </VStack>
    </Card>
  );
}
