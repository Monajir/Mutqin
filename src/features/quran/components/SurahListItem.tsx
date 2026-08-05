import React from 'react';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { ArabicText } from '@/components';
import { Pressable } from '@/design-system/primitives/Pressable';
import { Icon } from '@/design-system/primitives/Icon';
import { useAppTheme } from '@/design-system/theme';
import type { Surah } from '@/types';

export interface SurahListItemProps {
  surah: Surah;
  onPress: () => void;
}

export function SurahListItem({ surah, onPress }: SurahListItemProps) {
  const { tokens } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        padding: 14,
        marginBottom: 10,
        borderRadius: 16,
        backgroundColor: tokens.background.elevated,
        borderWidth: 1,
        borderColor: tokens.border.subtle,
      }}
    >
      <HStack justify="space-between">
        <HStack gap={3}>
          <HStack
            align="center"
            justify="center"
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: tokens.background.secondary,
              borderWidth: 1,
              borderColor: tokens.border.strong,
            }}
          >
            <Text variant="bodySm" color="brand" weight="700">{surah.id}</Text>
          </HStack>
          <VStack gap={1}>
            <Text variant="bodyLg" weight="600">{surah.nameTransliteration}</Text>
            <Text variant="caption" color="secondary">
              {`${surah.nameTranslation} · ${surah.ayahCount} ayahs`}
            </Text>
          </VStack>
        </HStack>
        <HStack gap={2}>
          <ArabicText variant="ui" size={20}>{surah.nameArabic}</ArabicText>
          <Icon name="ChevronRight" size={15} color="muted" />
        </HStack>
      </HStack>
    </Pressable>
  );
}
