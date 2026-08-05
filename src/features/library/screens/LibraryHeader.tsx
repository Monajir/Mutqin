import React from 'react';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { IconButton } from '@/design-system/primitives/IconButton';

interface LibraryHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
}

export function LibraryHeader({ title, subtitle, onBack }: LibraryHeaderProps) {
  return (
    <HStack gap={3} style={{ paddingTop: 8 }}>
      <IconButton name="ArrowLeft" accessibilityLabel="Go back" variant="soft" onPress={onBack} />
      <VStack gap={1} style={{ flex: 1 }}>
        <Text variant="headingSm" numberOfLines={1}>{title}</Text>
        {subtitle ? <Text variant="caption" color="secondary" numberOfLines={1}>{subtitle}</Text> : null}
      </VStack>
    </HStack>
  );
}
