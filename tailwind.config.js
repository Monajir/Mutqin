/**
 * NOTE: Tailwind's config loader runs under plain Node (no TS transform), so
 * token *values* are mirrored here in JS rather than imported from the
 * canonical TS source at `src/design-system/tokens/*.ts`. The TS files remain
 * the source of truth for app code; this file must be kept in sync with them.
 */
const spacing = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 };
const radii = { sm: 6, md: 10, lg: 16, xl: 24, pill: 999 };
const lightColors = {
  background: { primary: '#FFFFFF', secondary: '#F7F5F2', elevated: '#FFFFFF' },
  text: { primary: '#1A1A1A', secondary: '#5C5C5C', inverse: '#FFFFFF', muted: '#8A8A8A' },
  brand: { primary: '#0F6B5C', secondary: '#C9A24B' },
  semantic: { success: '#2E7D32', warning: '#B8860B', error: '#C0392B', info: '#2C6E8E' },
  border: { subtle: '#E7E3DD', strong: '#CFC9BF' },
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: lightColors.background,
        text: lightColors.text,
        brand: lightColors.brand,
        semantic: lightColors.semantic,
        border: lightColors.border,
      },
      spacing,
      borderRadius: radii,
    },
  },
  plugins: [],
};
