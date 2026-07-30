import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';
import { spacing, type SpacingKey } from '../tokens/spacing';
import { radii, type RadiusKey } from '../tokens/radii';
import { useAppTheme } from '../theme';

export interface BoxProps extends ViewProps {
  p?: SpacingKey;
  px?: SpacingKey;
  py?: SpacingKey;
  pt?: SpacingKey;
  pb?: SpacingKey;
  m?: SpacingKey;
  mx?: SpacingKey;
  my?: SpacingKey;
  mt?: SpacingKey;
  mb?: SpacingKey;
  rounded?: RadiusKey;
  bg?: 'primary' | 'secondary' | 'elevated' | 'transparent';
  flex?: number;
}

/**
 * Lowest-level layout primitive. All spacing/radius/color values must come
 * from design tokens — no raw pixel numbers or hex strings in feature code.
 */
export function Box({
  p, px, py, pt, pb, m, mx, my, mt, mb, rounded, bg, flex, style, ...rest
}: BoxProps) {
  const { tokens } = useAppTheme();

  const backgroundColor =
    bg === 'transparent' || bg === undefined
      ? undefined
      : tokens.background[bg];

  const computedStyle: ViewStyle = {
    padding: p !== undefined ? spacing[p] : undefined,
    paddingHorizontal: px !== undefined ? spacing[px] : undefined,
    paddingVertical: py !== undefined ? spacing[py] : undefined,
    paddingTop: pt !== undefined ? spacing[pt] : undefined,
    paddingBottom: pb !== undefined ? spacing[pb] : undefined,
    margin: m !== undefined ? spacing[m] : undefined,
    marginHorizontal: mx !== undefined ? spacing[mx] : undefined,
    marginVertical: my !== undefined ? spacing[my] : undefined,
    marginTop: mt !== undefined ? spacing[mt] : undefined,
    marginBottom: mb !== undefined ? spacing[mb] : undefined,
    borderRadius: rounded !== undefined ? radii[rounded] : undefined,
    backgroundColor,
    flex,
  };

  return <View style={[computedStyle, style]} {...rest} />;
}
