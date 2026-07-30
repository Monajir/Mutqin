import type { EvaluateRecitationInput, PartialEvaluationUpdate, RecitationEvaluationResult } from './types';

/**
 * The single interface the Hifz feature is allowed to depend on for
 * recitation evaluation. `features/hifz/**` must never import a concrete
 * provider or vendor SDK directly — only this interface, injected at the
 * composition root (see `src/config/di.ts`). Swapping AI vendors means
 * writing one new file in `services/ai/providers/`, with zero changes in
 * `features/hifz/` (architecture doc §9, §19).
 */
export interface HifzEvaluationProvider {
  /**
   * Evaluates a recorded recitation against the expected ayahs. Emits
   * partial word-level updates as they become available (for progressive
   * reveal), and resolves with the full result once evaluation completes.
   */
  evaluateRecitation(
    input: EvaluateRecitationInput,
    onPartialUpdate?: (update: PartialEvaluationUpdate) => void
  ): Promise<RecitationEvaluationResult>;
}
