import React from 'react';
import { GestureResponderEvent } from 'react-native';
import { Pressable } from './Pressable';
import { Icon, type IconName } from './Icon';
import { radii } from '../tokens/radii';
import { spacing } from '../tokens/spacing';

export interface IconButtonProps {
  name: IconName;
  onPress?: (e: GestureResponderEvent) => void;
  size?: number;
  color?: 'primary' | 'secondary' | 'muted' | 'inverse' | 'brand';
  accessibilityLabel: string;
  disabled?: boolean;
}

export function IconButton({ name, onPress, size = 20, color = 'primary', accessibilityLabel, disabled }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      haptic
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{
        padding: spacing[2],
        borderRadius: radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}
