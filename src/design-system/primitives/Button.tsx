import React from 'react';
import { ActivityIndicator, GestureResponderEvent, ViewStyle, StyleProp } from 'react-native';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { useAppTheme } from '../theme';
import { SurfaceSheen } from './SurfaceSheen';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const sizeMap: Record<ButtonSize, { paddingV: number; paddingH: number; fontVariant: 'bodySm' | 'bodyLg' }> = {
  sm: { paddingV: spacing[2], paddingH: spacing[3], fontVariant: 'bodySm' },
  md: { paddingV: spacing[3], paddingH: spacing[4], fontVariant: 'bodyLg' },
  lg: { paddingV: spacing[4], paddingH: spacing[5], fontVariant: 'bodyLg' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  testID,
  style: customStyle,
}: ButtonProps) {
  const { tokens } = useAppTheme();
  const dims = sizeMap[size];

  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: tokens.brand.primary, fg: tokens.text.inverse },
    secondary: { bg: tokens.background.secondary, fg: tokens.text.primary, border: tokens.border.strong },
    ghost: { bg: 'transparent', fg: tokens.brand.primary },
    destructive: { bg: tokens.semantic.error, fg: tokens.text.inverse },
  };
  const { bg, fg, border } = palette[variant];

  const style: ViewStyle = {
    backgroundColor: bg,
    paddingVertical: dims.paddingV,
    paddingHorizontal: dims.paddingH,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    width: fullWidth ? '100%' : undefined,
    borderWidth: border ? 1 : 0,
    borderColor: border,
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      haptic
      onPress={onPress}
      style={[style, customStyle]}
    >
      {variant === 'secondary' ? <SurfaceSheen radius={radii.lg} /> : null}
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {leftIcon}
          <Text variant={dims.fontVariant} weight="600" style={{ color: fg }}>
            {label}
          </Text>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}
