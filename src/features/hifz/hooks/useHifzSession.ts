import { useCallback, useRef, useState } from 'react';
import { useHifzSessionStore } from '../store/useHifzSessionStore';
import { useRecitationRecorder } from './useRecitationRecorder';
import { hifzEvaluationProvider } from '@/config/di';
import { RecitationEvaluationError } from '@/services/ai/types';
import type { AyahReference } from '@/services/ai/types';
import { useToast } from '@/design-system/components';

/**
 * Orchestrates record -> evaluate -> review. Evaluation results are not
 * written to progress here; the user explicitly accepts them on the summary.
 */
export function useHifzSession(expectedAyahs: AyahReference[]) {
  const { isRecording, setRecording, completeWithResult } = useHifzSessionStore();
  const recorder = useRecitationRecorder();
  const toast = useToast();
  const [isEvaluating, setIsEvaluating] = useState(false);
  const startPromiseRef = useRef<Promise<boolean> | null>(null);

  const startHolding = useCallback(async () => {
    const startPromise = recorder.startRecording();
    startPromiseRef.current = startPromise;
    const started = await startPromise;
    if (started) setRecording(true);
  }, [recorder, setRecording]);

  const releaseAndEvaluate = useCallback(async () => {
    const started = await startPromiseRef.current;
    startPromiseRef.current = null;
    setRecording(false);
    if (!started) return;
    const audioUri = await recorder.stopRecording();
    if (!audioUri) return;

    setIsEvaluating(true);
    try {
      const result = await hifzEvaluationProvider.evaluateRecitation({ audioUri, expectedAyahs });
      completeWithResult(result);
    } catch (err) {
      const message =
        err instanceof RecitationEvaluationError
          ? err.message
          : 'Could not evaluate your recitation. Please try again.';
      toast.show(message, 'error');
    } finally {
      setIsEvaluating(false);
    }
  }, [recorder, expectedAyahs, completeWithResult, setRecording, toast]);

  return {
    isRecording,
    recorderStatus: recorder.status,
    recorderErrorMessage: recorder.errorMessage,
    durationSec: recorder.durationSec,
    startHolding,
    releaseAndEvaluate,
    cancelRecording: recorder.cancelRecording,
    isEvaluating,
  };
}
