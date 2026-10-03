import React from 'react';
import { GestureResponderEvent } from 'react-native';
import { Pressable } from './Pressable';
import { Icon, type IconName } from './Icon';
import { radii } from '../tokens/radii';
import { spacing } from '../tokens/spacing';
import { useAppTheme } from '../theme';

export interface IconButtonProps {
  name: IconName;
  onPress?: (e: GestureResponderEvent) => void;
  size?: number;
  color?: 'primary' | 'secondary' | 'muted' | 'inverse' | 'brand';
  accessibilityLabel: string;
  disabled?: boolean;
  variant?: 'ghost' | 'soft';
  filled?: boolean;
}

export function IconButton({
  name,
  onPress,
  size = 20,
  color = 'primary',
  accessibilityLabel,
  disabled,
  variant = 'ghost',
  filled = false,
}: IconButtonProps) {
  const { tokens } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      accessibilityState={{ disabled, selected: filled }}
      haptic
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{
        padding: spacing[2],
        borderRadius: radii.pill,
        backgroundColor: variant === 'soft' ? tokens.background.secondary : 'transparent',
        borderWidth: variant === 'soft' ? 1 : 0,
        borderColor: tokens.border.subtle,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={name} size={size} color={color} filled={filled} />
    </Pressable>
  );
}
