import React from 'react';
import { VStack, HStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { ArabicText } from '@/components';
import { Card } from '@/design-system/components';
import { IconButton } from '@/design-system/primitives/IconButton';

export interface DailyVerseCardProps {
  arabic: string;
  translation: string;
  reference: string;
  onBookmark: () => void;
}

export function DailyVerseCard({ arabic, translation, reference, onBookmark }: DailyVerseCardProps) {
  return (
    <Card>
      <VStack gap={3}>
        <HStack justify="space-between">
          <Text variant="bodySm" color="secondary" weight="600">
            Daily Verse
          </Text>
          <IconButton name="Bookmark" size={16} accessibilityLabel="Bookmark verse" onPress={onBookmark} />
        </HStack>
        <ArabicText variant="quran">{arabic}</ArabicText>
        <Text variant="bodySm" color="secondary">
          {translation}
        </Text>
        <Text variant="caption" color="muted">
          {reference}
        </Text>
      </VStack>
    </Card>
  );
}
