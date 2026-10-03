/** Centralized React Query key factory — avoids key drift/typos across the feature. */
export const hifzKeys = {
  all: ['hifz', 'manual-v2'] as const,
  progress: () => [...hifzKeys.all, 'progress'] as const,
  juzSummary: () => [...hifzKeys.all, 'juzSummary'] as const,
  overallStats: () => [...hifzKeys.all, 'overallStats'] as const,
  revisionQueue: () => [...hifzKeys.all, 'revisionQueue'] as const,
  session: (id: string) => [...hifzKeys.all, 'session', id] as const,
};
