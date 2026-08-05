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
    <HStack gap={2} justify="space-between">
      {actions.map((action) => (
        <Pressable
          key={action.label}
          onPress={() => router.push(action.route as never)}
          accessibilityRole="button"
          style={{
            width: 76,
            alignItems: 'center',
          }}
        >
          <VStack gap={2} align="center">
            <HStack
              align="center"
              justify="center"
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: tokens.background.elevated,
                borderWidth: 1,
                borderColor: tokens.border.strong,
              }}
            >
              <Icon name={action.icon} color="brand" size={21} />
            </HStack>
            <Text variant="caption" weight="600" align="center" numberOfLines={1}>
              {action.label}
            </Text>
          </VStack>
        </Pressable>
      ))}
    </HStack>
  );
}
