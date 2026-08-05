import React from 'react';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { Card } from '@/design-system/components';
import { Icon } from '@/design-system/primitives/Icon';

export interface DailyHadithCardProps {
  excerpt: string;
  source: string;
}

export function DailyHadithCard({ excerpt, source }: DailyHadithCardProps) {
  return (
    <Card>
      <VStack gap={3}>
        <HStack gap={2}>
          <Icon name="Quote" size={17} color="brand" />
          <Text variant="caption" color="brand" weight="700">DAILY HADITH</Text>
        </HStack>
        <Text variant="bodyLg" style={{ lineHeight: 26 }}>{excerpt}</Text>
        <Text variant="caption" color="muted">{source}</Text>
      </VStack>
    </Card>
  );
}
