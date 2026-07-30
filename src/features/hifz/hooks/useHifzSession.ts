import { useCallback } from 'react';
import { useHifzSessionStore } from '../store/useHifzSessionStore';
import { useRecitationRecorder } from './useRecitationRecorder';
import { useApplyEvaluationResult } from '../api/hifzMutations';
import { hifzRepository } from '../api/hifzRepository';
import { hifzEvaluationProvider } from '@/config/di';
import { RecitationEvaluationError } from '@/services/ai/types';
import type { AyahReference } from '@/services/ai/types';
import { useToast } from '@/design-system/components';

/**
 * Orchestrates one full Hifz Assistant recitation cycle: record -> submit to
 * the injected AI provider -> apply resulting status updates -> transition
 * to the summary phase. This is the primary hook `HifzSessionScreen` binds
 * to; it intentionally does not know which concrete AI vendor is behind
 * `hifzEvaluationProvider` (§9, §19 of the architecture doc).
 */
export function useHifzSession(expectedAyahs: AyahReference[]) {
  const { isRecording, setRecording, completeWithResult, surahId, startAyah } = useHifzSessionStore();
  const recorder = useRecitationRecorder();
  const applyEvaluation = useApplyEvaluationResult();
  const toast = useToast();

  const startHolding = useCallback(async () => {
    setRecording(true);
    await recorder.startRecording();
  }, [recorder, setRecording]);

  const releaseAndEvaluate = useCallback(async () => {
    setRecording(false);
    const audioUri = await recorder.stopRecording();
    if (!audioUri) return;

    try {
      const result = await hifzEvaluationProvider.evaluateRecitation({ audioUri, expectedAyahs });
      completeWithResult(result);
      await applyEvaluation.mutateAsync(result);

      if (surahId !== null && startAyah !== null) {
        hifzRepository.saveSession({
          id: `${surahId}-${startAyah}-${Date.now()}`,
          surahId,
          startAyah,
          endAyah: expectedAyahs.at(-1)?.ayahNumber ?? null,
          overallAccuracy: result.overallAccuracy,
        });
      }
    } catch (err) {
      const message =
        err instanceof RecitationEvaluationError
          ? err.message
          : 'Could not evaluate your recitation. Please try again.';
      toast.show(message, 'error');
    }
  }, [recorder, expectedAyahs, completeWithResult, applyEvaluation, surahId, startAyah, toast]);

  return {
    isRecording,
    recorderStatus: recorder.status,
    recorderErrorMessage: recorder.errorMessage,
    durationSec: recorder.durationSec,
    startHolding,
    releaseAndEvaluate,
    cancelRecording: recorder.cancelRecording,
    isEvaluating: applyEvaluation.isPending,
  };
}
