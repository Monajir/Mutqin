/**
 * Static v1 feature flags. Non-goals from spec §12 are hard-disabled here
 * rather than left half-built, so accidentally reachable UI can't ship them.
 */
export const featureFlags = {
  interactiveSeerah: false,
  tajweedLessons: false,
  arabicLearning: false,
  socialFeatures: false,
  familyGroups: false,
  gamification: false,
  aiHifzAssistant: true,
  offlineFirst: true,
} as const;
