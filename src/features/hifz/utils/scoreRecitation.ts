import type { RecitationEvaluationResult } from '@/services/ai/types';
import type { HifzStatus } from '@/constants';
import { REVISION_INTERVAL_DAYS } from '../constants/hifz.constants';

/**
 * Maps a completed session's per-ayah word evaluations to the Hifz status
 * each recited ayah should transition to (§7 of the spec: "Automatic
 * updates from AI Hifz Assistant"). Pure function — no side effects, so
 * it's independently unit-testable from the recording/UI layer.
 */
export function deriveStatusUpdatesFromEvaluation(
  result: RecitationEvaluationResult
): { surahId: number; ayahNumber: number; status: HifzStatus }[] {
  return result.ayahs.map((ayahEval) => {
    const total = ayahEval.words.length;
    const correct = ayahEval.words.filter((w) => w.status === 'correct').length;
    const incorrect = ayahEval.words.filter((w) => w.status === 'incorrect' || w.status === 'skipped').length;
    const accuracy = total > 0 ? correct / total : 0;

    let status: HifzStatus;
    if (accuracy >= 0.95) status = 'strong';
    else if (accuracy >= 0.8) status = 'memorized';
    else if (incorrect > 0 && accuracy >= 0.5) status = 'needs_revision';
    else status = 'weak';

    return { surahId: ayahEval.ayah.surahId, ayahNumber: ayahEval.ayah.ayahNumber, status };
  });
}

/** Whether an ayah at a given status/last-review date is due for revision today. */
export function isDueForRevision(status: HifzStatus, lastReviewedAt: string | null): boolean {
  if (status === 'not_started') return false;
  if (!lastReviewedAt) return true;
  if (status === 'memorized') return true;

  const interval = REVISION_INTERVAL_DAYS[status as 'strong' | 'needs_revision' | 'weak'] ?? 3;
  const daysSince = (Date.now() - new Date(lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= interval;
}
