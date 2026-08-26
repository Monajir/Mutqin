import type { EvaluateRecitationInput, RecitationEvaluationResult } from './types';

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
   * Evaluates one complete recorded recitation against a consecutive ayah
   * range. Streaming is deliberately out of scope for the first version.
   */
  evaluateRecitation(
    input: EvaluateRecitationInput
  ): Promise<RecitationEvaluationResult>;
}
