import React from 'react';
import { View, ViewProps } from 'react-native';
import { Box, type BoxProps } from './Box';
import { radii } from '../tokens/radii';
import { elevationStyle, type ElevationKey } from '../tokens/elevation';
import { useAppTheme } from '../theme';

interface SurfaceProps extends BoxProps {
  elevationLevel?: ElevationKey;
}

/** Elevated container — the base building block for Card and similar surfaces. */
export function Surface({ elevationLevel = 'low', rounded = 'lg', bg = 'elevated', style, ...rest }: SurfaceProps) {
  const { tokens } = useAppTheme();

  return (
    <Box
      bg={bg}
      rounded={rounded}
      style={[
        {
          borderRadius: radii[rounded],
          borderWidth: 1,
          borderColor: tokens.border.subtle,
        },
        elevationStyle(elevationLevel),
        style,
      ]}
      {...rest}
    />
  );
}
