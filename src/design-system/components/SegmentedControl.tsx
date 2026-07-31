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
  compact?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  compact = false,
}: SegmentedControlProps<T>) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: tokens.background.secondary,
        borderRadius: radii.pill,
        padding: spacing[1],
        borderWidth: 1,
        borderColor: tokens.border.subtle,
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
              paddingVertical: compact ? 6 : spacing[2],
              paddingHorizontal: compact ? spacing[3] : spacing[2],
              borderRadius: radii.pill,
              backgroundColor: active ? tokens.brand.primary : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text variant={compact ? 'caption' : 'bodySm'} weight="600" color={active ? 'inverse' : 'secondary'}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
