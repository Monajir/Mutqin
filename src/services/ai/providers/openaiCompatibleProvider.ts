import type { HifzEvaluationProvider } from '../hifzEvaluationProvider';
import type { EvaluateRecitationInput, PartialEvaluationUpdate, RecitationEvaluationResult } from '../types';
import { RecitationEvaluationError } from '../types';
import { apiRequest } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiError } from '@/services/api/errors';

interface EvaluateResponseDto {
  result: RecitationEvaluationResult;
}

/**
 * Concrete implementation calling Mutqin's backend recitation-evaluation
 * endpoint (which itself proxies an OpenAI-compatible speech model). This is
 * the ONLY file in the codebase allowed to know about the specific vendor
 * contract — everything else depends on `HifzEvaluationProvider`.
 *
 * v1 scope: uploads the full audio segment and awaits one response (per
 * spec §6, "reliable verse progression and word-level correctness" is the
 * initial bar — true low-latency streaming partials are a future
 * enhancement). `onPartialUpdate` is accepted for interface-compatibility
 * with a future streaming provider and is intentionally unused here.
 */
export class OpenAICompatibleHifzEvaluationProvider implements HifzEvaluationProvider {
  async evaluateRecitation(
    input: EvaluateRecitationInput,
    _onPartialUpdate?: (update: PartialEvaluationUpdate) => void
  ): Promise<RecitationEvaluationResult> {
    const formData = new FormData();
    formData.append('audio', {
      uri: input.audioUri,
      name: 'recitation.m4a',
      type: 'audio/m4a',
    } as unknown as Blob);
    formData.append('expectedAyahs', JSON.stringify(input.expectedAyahs));
    if (input.qariIdForReference) formData.append('qariId', input.qariIdForReference);

    try {
      const response = await apiRequest<EvaluateResponseDto>(endpoints.hifz.evaluate, {
        method: 'POST',
        body: formData,
        timeoutMs: 45000,
      });
      return response.result;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'timeout') throw new RecitationEvaluationError('timeout', 'Evaluation timed out. Please try again.');
        if (err.code === 'network_error') {
          throw new RecitationEvaluationError('network_error', 'No connection — the Hifz Assistant requires internet to evaluate recitation.');
        }
      }
      throw new RecitationEvaluationError('unknown', 'Could not evaluate recitation. Please try again.');
    }
  }
}
