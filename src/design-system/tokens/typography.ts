export const fontFamilies = {
  ui: 'Inter',
  uiMedium: 'Inter-Medium',
  uiSemiBold: 'Inter-SemiBold',
  uiBold: 'Inter-Bold',
  arabicUI: 'NotoNaskhArabic',
  quran: 'KFGQPCUthmanicScript',
} as const;

export const typeScale = {
  displayLg: { size: 32, lineHeight: 40, weight: '700' as const },
  displaySm: { size: 26, lineHeight: 34, weight: '700' as const },
  headingLg: { size: 22, lineHeight: 30, weight: '600' as const },
  headingSm: { size: 18, lineHeight: 26, weight: '600' as const },
  bodyLg: { size: 16, lineHeight: 24, weight: '400' as const },
  bodySm: { size: 14, lineHeight: 20, weight: '400' as const },
  caption: { size: 12, lineHeight: 16, weight: '400' as const },
  arabicAyah: { size: 24, lineHeight: 44, weight: '400' as const },
} as const;

export type TypeScaleKey = keyof typeof typeScale;

