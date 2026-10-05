import React from 'react';
import { Box, type BoxProps } from './Box';
import { radii } from '../tokens/radii';
import { elevationStyle, type ElevationKey } from '../tokens/elevation';
import { useAppTheme } from '../theme';
import { SurfaceSheen } from './SurfaceSheen';

interface SurfaceProps extends BoxProps {
  elevationLevel?: ElevationKey;
  polished?: boolean;
}

/** Elevated container — the base building block for Card and similar surfaces. */
export function Surface({ elevationLevel = 'low', rounded = 'lg', bg = 'elevated', polished = false, children, style, ...rest }: SurfaceProps) {
  const { tokens, themeName } = useAppTheme();

  return (
    <Box
      bg={bg}
      rounded={rounded}
      style={[
        {
          borderRadius: radii[rounded],
          borderWidth: 1,
          borderColor: polished ? (themeName === 'dark' ? 'rgba(255,255,255,0.16)' : tokens.border.strong) : tokens.border.subtle,
        },
        elevationStyle(elevationLevel),
        style,
      ]}
      {...rest}
    >
      {polished ? <SurfaceSheen radius={radii[rounded]} /> : null}
      {children}
    </Box>
  );
}
