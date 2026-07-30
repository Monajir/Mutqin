import React from 'react';
import { View, ViewProps } from 'react-native';
import { useAppTheme } from '../theme';

interface DividerProps extends ViewProps {
  orientation?: 'horizontal' | 'vertical';
  strong?: boolean;
}

export function Divider({ orientation = 'horizontal', strong = false, style, ...rest }: DividerProps) {
  const { tokens } = useAppTheme();
  const color = strong ? tokens.border.strong : tokens.border.subtle;

  return (
    <View
      style={[
        orientation === 'horizontal'
          ? { height: 1, width: '100%', backgroundColor: color }
          : { width: 1, height: '100%', backgroundColor: color },
        style,
      ]}
      {...rest}
    />
  );
}
