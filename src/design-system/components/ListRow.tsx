import React from 'react';
import { Pressable } from '../primitives/Pressable';
import { HStack, VStack } from '../primitives/Stack';
import { Text } from '../primitives/Text';
import { Icon, type IconName } from '../primitives/Icon';
import { spacing } from '../tokens/spacing';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leadingIcon?: IconName;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  destructive?: boolean;
}

/** Standard tappable row used across Settings, Bookmarks, and list screens. */
export function ListRow({ title, subtitle, leadingIcon, trailing, showChevron, onPress, destructive }: ListRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={{ paddingVertical: spacing[3] }}
    >
      <HStack gap={3} justify="space-between">
        <HStack gap={3} style={{ flex: 1 }}>
          {leadingIcon ? <Icon name={leadingIcon} color={destructive ? 'primary' : 'secondary'} /> : null}
          <VStack style={{ flex: 1 }}>
            <Text variant="bodyLg" color={destructive ? 'error' : 'primary'}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="bodySm" color="secondary">
                {subtitle}
              </Text>
            ) : null}
          </VStack>
        </HStack>
        {trailing}
        {showChevron ? <Icon name="ChevronRight" size={18} color="muted" /> : null}
      </HStack>
    </Pressable>
  );
}
