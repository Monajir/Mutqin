import React from 'react';
import * as LucideIcons from 'lucide-react-native';
import { useAppTheme } from '../theme';

export type IconName = keyof typeof LucideIcons;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: 'primary' | 'secondary' | 'muted' | 'inverse' | 'brand';
  rawColor?: string;
  strokeWidth?: number;
  filled?: boolean;
}

/**
 * Single point of integration with the icon set. Swapping icon libraries
 * later touches only this file.
 */
export function Icon({ name, size = 20, color = 'primary', rawColor, strokeWidth = 2, filled = false }: IconProps) {
  const { tokens } = useAppTheme();
  const LucideIcon = LucideIcons[name] as React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
    fill?: string;
  }>;

  if (!LucideIcon) {
    if (__DEV__) console.warn(`Icon "${String(name)}" not found in lucide-react-native`);
    return null;
  }

  const resolvedColor = rawColor ?? (color === 'brand' ? tokens.brand.primary : tokens.text[color]);
  return <LucideIcon size={size} color={resolvedColor} strokeWidth={strokeWidth} fill={filled ? resolvedColor : 'none'} />;
}
