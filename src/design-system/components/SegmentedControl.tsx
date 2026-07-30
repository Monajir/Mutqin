import React from 'react';
import { View } from 'react-native';
import { Pressable } from '../primitives/Pressable';
import { Text } from '../primitives/Text';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { useAppTheme } from '../theme';

export interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: tokens.background.secondary,
        borderRadius: radii.md,
        padding: spacing[1],
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              paddingVertical: spacing[2],
              borderRadius: radii.sm,
              backgroundColor: active ? tokens.background.elevated : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text variant="bodySm" weight="600" color={active ? 'primary' : 'secondary'}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
