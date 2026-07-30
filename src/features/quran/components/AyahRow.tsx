import React from 'react';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { ArabicText } from '@/components';
import { IconButton } from '@/design-system/primitives/IconButton';
import type { Ayah } from '@/types';

export interface AyahRowProps {
  ayah: Ayah;
  showTranslation: boolean;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onPlayAudio: () => void;
}

export function AyahRow({ ayah, showTranslation, isBookmarked, onToggleBookmark, onPlayAudio }: AyahRowProps) {
  return (
    <VStack gap={2} style={{ paddingVertical: 12 }}>
      <HStack justify="space-between">
        <Text variant="caption" color="muted">{`Ayah ${ayah.ayahNumber}`}</Text>
        <HStack gap={1}>
          <IconButton name="Play" size={16} accessibilityLabel="Play recitation" onPress={onPlayAudio} />
          <IconButton
            name={isBookmarked ? 'BookmarkCheck' : 'Bookmark'}
            size={16}
            color={isBookmarked ? 'brand' : 'muted'}
            accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            onPress={onToggleBookmark}
          />
        </HStack>
      </HStack>
      <ArabicText variant="quran">{ayah.textArabic}</ArabicText>
      {showTranslation ? (
        <Text variant="bodySm" color="secondary">
          {ayah.textTranslation}
        </Text>
      ) : null}
    </VStack>
  );
}
