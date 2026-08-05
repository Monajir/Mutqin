import React from 'react';
import { VStack, HStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { ArabicText } from '@/components';
import { Card } from '@/design-system/components';
import { IconButton } from '@/design-system/primitives/IconButton';
import { useAppTheme } from '@/design-system/theme';

export interface DailyVerseCardProps {
  arabic: string;
  translation: string;
  reference: string;
  isBookmarked: boolean;
  onBookmark: () => void;
}

export function DailyVerseCard({ arabic, translation, reference, isBookmarked, onBookmark }: DailyVerseCardProps) {
  const { tokens } = useAppTheme();

  return (
    <Card style={{ backgroundColor: tokens.background.elevated, borderColor: tokens.border.strong }}>
      <VStack gap={3}>
        <HStack justify="space-between">
          <Text variant="caption" color="warning" weight="700">
            VERSE OF THE DAY
          </Text>
          <IconButton
            name={isBookmarked ? 'BookmarkCheck' : 'Bookmark'}
            color={isBookmarked ? 'brand' : 'muted'}
            variant="soft"
            size={16}
            accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark verse'}
            onPress={onBookmark}
          />
        </HStack>
        <ArabicText variant="quran" size={27} lineHeight={48} style={{ textAlign: 'center' }}>
          {arabic}
        </ArabicText>
        <Text variant="bodySm" color="secondary" align="center">
          {translation}
        </Text>
        <Text variant="caption" color="brand" align="center" weight="600">
          {reference}
        </Text>
      </VStack>
    </Card>
  );
}
