import type { HifzEvaluationProvider } from '../hifzEvaluationProvider';
import type { EvaluateRecitationInput, RecitationEvaluationResult } from '../types';
import { RecitationEvaluationError } from '../types';
import { apiRequest } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { ApiError } from '@/services/api/errors';

interface EvaluateResponseDto {
  evaluationId: string;
  modelVersion: string;
  result: RecitationEvaluationResult;
}

/** Uploads one complete recitation to Mutqin's versioned backend API. */
export class MutqinApiHifzEvaluationProvider implements HifzEvaluationProvider {
  async evaluateRecitation(input: EvaluateRecitationInput): Promise<RecitationEvaluationResult> {
    const formData = new FormData();
    formData.append('audio', {
      uri: input.audioUri,
      name: 'recitation.m4a',
      type: 'audio/m4a',
    } as unknown as Blob);
    formData.append('expectedAyahs', JSON.stringify(input.expectedAyahs));

    try {
      const response = await apiRequest<EvaluateResponseDto>(endpoints.hifz.evaluate, {
        method: 'POST',
        body: formData,
        timeoutMs: 90_000,
      });
      return response.result;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'timeout') {
          throw new RecitationEvaluationError('timeout', 'Evaluation timed out. Please try a shorter recording.');
        }
        if (error.code === 'network_error') {
          throw new RecitationEvaluationError('network_error', 'Connect to the internet to evaluate this recitation.');
        }
        if (error.code === 'validation_error') {
          throw new RecitationEvaluationError('validation_error', error.message);
        }
        if (error.code === 'server_error') {
          throw new RecitationEvaluationError('service_unavailable', 'The evaluation service is unavailable. Please try again later.');
        }
      }
      throw new RecitationEvaluationError('unknown', 'Could not evaluate the recitation. Please try again.');
    }
  }
}
