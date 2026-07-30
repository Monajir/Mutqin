import React from 'react';
import { FlashList } from '@shopify/flash-list';
import { HStack, VStack } from '@/design-system/primitives/Stack';
import { Text } from '@/design-system/primitives/Text';
import { ProgressBar } from '@/design-system/components';
import { Icon } from '@/design-system/primitives/Icon';
import { Pressable } from '@/design-system/primitives/Pressable';
import type { JuzProgressSummary } from '../types/hifz.types';

export interface ProgressJuzListProps {
  data: JuzProgressSummary[];
  onSelectJuz?: (juz: number) => void;
}

/** Juz drill-down list (wireframe screen 04): per-juz progress bars. */
export function ProgressJuzList({ data, onSelectJuz }: ProgressJuzListProps) {
  return (
    <FlashList
      data={data}
      keyExtractor={(item) => String(item.juz)}
      estimatedItemSize={56}
      renderItem={({ item }) => (
        <Pressable onPress={() => onSelectJuz?.(item.juz)} disabled={!onSelectJuz} style={{ paddingVertical: 10 }}>
          <VStack gap={2}>
            <HStack justify="space-between">
              <Text variant="bodyLg">{`Juz ${item.juz}`}</Text>
              <HStack gap={1}>
                <Text variant="bodySm" color="secondary">
                  {`${Math.round(item.percentComplete * 100)}%`}
                </Text>
                {onSelectJuz ? <Icon name="ChevronRight" size={16} color="muted" /> : null}
              </HStack>
            </HStack>
            <ProgressBar progress={item.percentComplete} accessibilityLabel={`Juz ${item.juz} progress`} />
          </VStack>
        </Pressable>
      )}
    />
  );
}
