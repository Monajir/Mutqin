import type { HifzEvaluationProvider } from '@/services/ai/hifzEvaluationProvider';
import { OpenAICompatibleHifzEvaluationProvider } from '@/services/ai/providers/openaiCompatibleProvider';

/**
 * Composition root. This is the ONLY file that should ever import a
 * concrete AI provider implementation — every consumer (features/hifz/**)
 * depends solely on the `HifzEvaluationProvider` interface and receives
 * this singleton. To add a second provider (e.g. an on-device fallback for
 * offline queuing), instantiate it here and pick between them here, not in
 * feature code.
 */
export const hifzEvaluationProvider: HifzEvaluationProvider = new OpenAICompatibleHifzEvaluationProvider();
