/**
 * Public API of the Hifz feature. `app/**` and other features must import
 * only from here — never reach into `hifz/screens`, `hifz/components`, etc.
 * directly (enforced by the ESLint boundaries rule in .eslintrc.js).
 */
export { HifzSetupScreen } from './screens/HifzSetupScreen';
export { HifzSessionScreen } from './screens/HifzSessionScreen';
export { HifzSummaryScreen } from './screens/HifzSummaryScreen';
export { HifzTrackerScreen } from './screens/HifzTrackerScreen';

export { useHifzOverallStats, useHifzJuzSummary, useHifzRevisionQueue } from './api/hifzQueries';
export { useUpdateHifzStatus } from './api/hifzMutations';

export type { HifzProgressEntry, HifzOverallStats, JuzProgressSummary, HifzSession } from './types/hifz.types';
