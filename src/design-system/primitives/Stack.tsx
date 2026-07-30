import React from 'react';
import { View, ViewProps } from 'react-native';
import { spacing, type SpacingKey } from '../tokens/spacing';

interface StackProps extends ViewProps {
  gap?: SpacingKey;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  wrap?: boolean;
}

export function VStack({ gap = 0, align, justify, wrap, style, ...rest }: StackProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'column',
          gap: spacing[gap],
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        style,
      ]}
      {...rest}
    />
  );
}

export function HStack({ gap = 0, align = 'center', justify, wrap, style, ...rest }: StackProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: spacing[gap],
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        style,
      ]}
      {...rest}
    />
  );
}
