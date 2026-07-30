import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { fontFamilies } from '@/design-system/tokens/typography';
import { useAppTheme } from '@/design-system/theme';

export interface ArabicTextProps extends RNTextProps {
  variant?: 'quran' | 'ui';
  size?: number;
  lineHeight?: number;
  color?: 'primary' | 'secondary' | 'muted' | 'inverse';
}

/**
 * Wraps Text with correct Arabic font, RTL alignment, and generous line
 * height for diacritics. No screen should hand-roll Arabic text styling —
 * `variant="quran"` uses the Uthmani font, `variant="ui"` uses the Arabic UI font.
 */
export function ArabicText({ variant = 'ui', size, lineHeight, color = 'primary', style, ...rest }: ArabicTextProps) {
  const { tokens } = useAppTheme();
  const fontFamily = variant === 'quran' ? fontFamilies.quran : fontFamilies.arabicUI;
  const defaultSize = variant === 'quran' ? 24 : 18;
  const defaultLineHeight = variant === 'quran' ? 44 : 32;

  return (
    <RNText
      style={[
        {
          fontFamily,
          fontSize: size ?? defaultSize,
          lineHeight: lineHeight ?? defaultLineHeight,
          color: tokens.text[color],
          writingDirection: 'rtl',
          textAlign: 'right',
        },
        style,
      ]}
      {...rest}
    />
  );
}
