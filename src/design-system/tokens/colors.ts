/**
 * Semantic color tokens. Screens/components must never reference raw hex
 * values directly — always go through this token set (or its NativeWind
 * class equivalents) so theme switching requires zero component changes.
 */
export const colors = {
  light: {
    background: { primary: '#F4F7F7', secondary: '#EAF0F0', elevated: '#FFFFFF' },
    text: { primary: '#10232A', secondary: '#52656B', inverse: '#FFFFFF', muted: '#829197' },
    brand: { primary: '#087A6C', secondary: '#C79A43' },
    semantic: { success: '#2E7D32', warning: '#B8860B', error: '#C0392B', info: '#2C6E8E' },
    border: { subtle: '#DDE7E7', strong: '#BFCFCF' },
    overlay: 'rgba(0,0,0,0.4)',
    hifz: { correct: '#2E7D32', incorrect: '#C0392B', hidden: '#CFC9BF' },
  },
  dark: {
    background: { primary: '#09131F', secondary: '#111F2D', elevated: '#182838' },
    text: { primary: '#F4F7F8', secondary: '#B4C1C7', inverse: '#07131D', muted: '#7E909A' },
    brand: { primary: '#43C1A7', secondary: '#E0B763' },
    semantic: { success: '#54C784', warning: '#E0B763', error: '#F07575', info: '#62B5D8' },
    border: { subtle: '#223545', strong: '#385064' },
    overlay: 'rgba(0,0,0,0.6)',
    hifz: { correct: '#54C784', incorrect: '#F07575', hidden: '#385064' },
  },
} as const;

export type ThemeName = keyof typeof colors;
export type ColorTokens = (typeof colors)[ThemeName];
