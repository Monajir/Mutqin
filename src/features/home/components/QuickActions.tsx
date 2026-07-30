import React from 'react';
import { useRouter } from 'expo-router';
import { HStack } from '@/design-system/primitives/Stack';
import { Pressable } from '@/design-system/primitives/Pressable';
import { VStack } from '@/design-system/primitives/Stack';
import { Icon, type IconName } from '@/design-system/primitives/Icon';
import { Text } from '@/design-system/primitives/Text';
import { useAppTheme } from '@/design-system/theme';

interface QuickAction {
  label: string;
  icon: IconName;
  route: string;
}

const actions: QuickAction[] = [
  { label: 'Continue Reading', icon: 'BookOpen', route: '/(tabs)/quran' },
  { label: 'Revise Hifz', icon: 'RotateCcw', route: '/(tabs)/hifz/setup' },
  { label: 'Prayer Times', icon: 'Clock', route: '/(tabs)/prayer' },
  { label: 'More', icon: 'Menu', route: '/(tabs)/more' },
];

export function QuickActions() {
  const router = useRouter();
  const { tokens } = useAppTheme();

  return (
    <HStack gap={3} wrap>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          onPress={() => router.push(action.route as never)}
          accessibilityRole="button"
          style={{
            flexGrow: 1,
            minWidth: '45%',
            backgroundColor: tokens.background.secondary,
            borderRadius: 12,
            padding: 16,
          }}
        >
          <VStack gap={2} align="center">
            <Icon name={action.icon} color="brand" />
            <Text variant="bodySm" weight="600" align="center">
              {action.label}
            </Text>
          </VStack>
        </Pressable>
      ))}
    </HStack>
  );
}
