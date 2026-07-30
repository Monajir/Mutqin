import type { AyahReference, RecitationEvaluationResult } from '@/services/ai/types';
import type { HifzStatus } from '@/constants';

export interface HifzProgressEntry {
  surahId: number;
  ayahNumber: number;
  status: HifzStatus;
  lastReviewedAt: string | null;
  updatedAt: string;
  source: 'manual' | 'ai_session';
}

export interface JuzProgressSummary {
  juz: number;
  totalAyahs: number;
  memorizedAyahs: number;
  percentComplete: number;
}

export interface HifzOverallStats {
  overallPercentComplete: number;
  strongAyahCount: number;
  weakAyahCount: number;
  totalMemorized: number;
  dueForRevisionCount: number;
}

export type HifzSessionPhase = 'setup' | 'reciting' | 'summary';

export interface HifzSession {
  id: string;
  surahId: number;
  startAyah: number;
  endAyah: number | null;
  createdAt: string;
  result: RecitationEvaluationResult | null;
}

export interface RevisionQueueItem {
  ayah: AyahReference;
  status: HifzStatus;
  daysSinceReview: number | null;
}
