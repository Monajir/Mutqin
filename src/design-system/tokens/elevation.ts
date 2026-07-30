import { Platform } from 'react-native';

export const elevation = { none: 0, low: 1, medium: 3, high: 8 } as const;
export type ElevationKey = keyof typeof elevation;

/** Maps a semantic elevation level to platform-correct shadow/elevation style props. */
export function elevationStyle(level: ElevationKey) {
  const value = elevation[level];
  if (value === 0) return {};
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.08 + value * 0.02,
      shadowRadius: value * 2,
      shadowOffset: { width: 0, height: value },
    },
    android: { elevation: value },
    default: {},
  });
}
