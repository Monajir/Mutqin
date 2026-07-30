/**
 * Semantic color tokens. Screens/components must never reference raw hex
 * values directly — always go through this token set (or its NativeWind
 * class equivalents) so theme switching requires zero component changes.
 */
export const colors = {
  light: {
    background: { primary: '#FFFFFF', secondary: '#F7F5F2', elevated: '#FFFFFF' },
    text: { primary: '#1A1A1A', secondary: '#5C5C5C', inverse: '#FFFFFF', muted: '#8A8A8A' },
    brand: { primary: '#0F6B5C', secondary: '#C9A24B' },
    semantic: { success: '#2E7D32', warning: '#B8860B', error: '#C0392B', info: '#2C6E8E' },
    border: { subtle: '#E7E3DD', strong: '#CFC9BF' },
    overlay: 'rgba(0,0,0,0.4)',
    hifz: { correct: '#2E7D32', pronunciation: '#B8860B', incorrect: '#C0392B', hidden: '#CFC9BF' },
  },
  dark: {
    background: { primary: '#101312', secondary: '#171B19', elevated: '#1D2220' },
    text: { primary: '#F2F0EC', secondary: '#B9B5AD', inverse: '#101312', muted: '#7C7A74' },
    brand: { primary: '#3FA98A', secondary: '#D8BA6E' },
    semantic: { success: '#4CAF50', warning: '#D4A72C', error: '#E0574B', info: '#4C9BC0' },
    border: { subtle: '#262B28', strong: '#33403A' },
    overlay: 'rgba(0,0,0,0.6)',
    hifz: { correct: '#4CAF50', pronunciation: '#D4A72C', incorrect: '#E0574B', hidden: '#33403A' },
  },
} as const;

export type ThemeName = keyof typeof colors;
export type ColorTokens = typeof colors.light;

