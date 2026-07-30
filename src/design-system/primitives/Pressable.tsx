import React from 'react';
import {
  Pressable as RNPressable,
  PressableProps as RNPressableProps,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export interface PressableProps extends RNPressableProps {
  haptic?: boolean;
  pressedOpacity?: number;
}

/**
 * Standardizes press-state feedback (opacity dimming + optional haptic tick)
 * across the app so no component hand-rolls its own pressed styling.
 */
export function Pressable({
  haptic = false,
  pressedOpacity = 0.7,
  onPressIn,
  style,
  disabled,
  ...rest
}: PressableProps) {
  return (
    <RNPressable
      disabled={disabled}
      onPressIn={(e) => {
        if (haptic && Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPressIn?.(e);
      }}
      style={(state) => [
        { opacity: disabled ? 0.4 : state.pressed ? pressedOpacity : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    />
  );
}
