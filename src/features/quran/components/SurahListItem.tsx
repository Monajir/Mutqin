import React from 'react';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { ArabicText } from '@/components';
import { Pressable } from '@/design-system/primitives/Pressable';
import { Icon } from '@/design-system/primitives/Icon';
import type { Surah } from '@/types';

export interface SurahListItemProps {
  surah: Surah;
  onPress: () => void;
}

export function SurahListItem({ surah, onPress }: SurahListItemProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ paddingVertical: 12 }}>
      <HStack justify="space-between">
        <HStack gap={3}>
          <Text variant="bodySm" color="muted" style={{ width: 24 }}>
            {surah.id}
          </Text>
          <VStack>
            <Text variant="bodyLg">{surah.nameTransliteration}</Text>
            <Text variant="bodySm" color="secondary">
              {`${surah.nameTranslation} · ${surah.ayahCount} ayahs`}
            </Text>
          </VStack>
        </HStack>
        <HStack gap={2}>
          <ArabicText variant="ui" size={18}>
            {surah.nameArabic}
          </ArabicText>
          <Icon name="ChevronRight" size={16} color="muted" />
        </HStack>
      </HStack>
    </Pressable>
  );
}
