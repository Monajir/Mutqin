import React from 'react';
import { Text as RNText, TextProps as RNTextProps, PixelRatio } from 'react-native';
import { typeScale, fontFamilies, type TypeScaleKey } from '../tokens/typography';
import { useAppTheme } from '../theme';

export interface TextProps extends RNTextProps {
  variant?: TypeScaleKey;
  color?: 'primary' | 'secondary' | 'inverse' | 'muted' | 'brand' | 'error' | 'success' | 'warning';
  weight?: '400' | '500' | '600' | '700';
  align?: 'left' | 'center' | 'right';
}

/**
 * Themed text primitive. Applies the type scale, dynamic-type accessibility
 * scaling (capped to avoid runaway layouts), and semantic color tokens.
 * No screen should set fontSize/color inline — always go through `variant`/`color`.
 */
export function Text({
  variant = 'bodyLg',
  color = 'primary',
  weight,
  align,
  style,
  ...rest
}: TextProps) {
  const { tokens } = useAppTheme();
  const scale = typeScale[variant];

  const resolvedColor =
    color === 'brand'
      ? tokens.brand.primary
      : color === 'error'
      ? tokens.semantic.error
      : color === 'success'
      ? tokens.semantic.success
      : color === 'warning'
      ? tokens.semantic.warning
      : tokens.text[color];

  // Cap font scaling so very large OS accessibility settings don't break layout,
  // while still honoring the spec's dynamic text sizing requirement.
  const fontScale = Math.min(PixelRatio.getFontScale(), 1.6);

  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={1.6}
      style={[
        {
          fontFamily: fontFamilies.ui,
          fontSize: scale.size,
          lineHeight: scale.lineHeight * (fontScale > 1 ? 1.05 : 1),
          fontWeight: weight ?? scale.weight,
          color: resolvedColor,
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    />
  );
}
