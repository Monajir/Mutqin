import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useHifzSessionStore } from '../store/useHifzSessionStore';
import { useRecitationRecorder } from './useRecitationRecorder';
import { hifzEvaluationProvider } from '@/config/di';
import { RecitationEvaluationError } from '@/services/ai/types';
import type { AyahReference } from '@/services/ai/types';
import { useToast } from '@/design-system/components';

/**
 * Orchestrates record -> evaluate -> review. Evaluation results are not
 * written to memorization progress; only manual checks update that progress.
 */
export function useHifzSession(expectedAyahs: AyahReference[]) {
  const { isRecording, setRecording, completeWithResult } = useHifzSessionStore();
  const recorder = useRecitationRecorder();
  const toast = useToast();
  const [isEvaluating, setIsEvaluating] = useState(false);
  const startPromiseRef = useRef<Promise<boolean> | null>(null);
  const generation = useRef(0);
  const cancelRecording = recorder.cancelRecording;
  useFocusEffect(useCallback(() => {
    setIsEvaluating(false);
    return () => {
      generation.current += 1;
      setRecording(false);
      void cancelRecording();
    };
  }, [cancelRecording, setRecording]));

  const startHolding = useCallback(async () => {
    const request = generation.current;
    const startPromise = recorder.startRecording();
    startPromiseRef.current = startPromise;
    const started = await startPromise;
    if (request !== generation.current) {
      await recorder.cancelRecording();
      return;
    }
    if (started) setRecording(true);
  }, [recorder, setRecording]);

  const releaseAndEvaluate = useCallback(async () => {
    const request = generation.current;
    const started = await startPromiseRef.current;
    startPromiseRef.current = null;
    setRecording(false);
    if (!started || request !== generation.current) return;
    const audioUri = await recorder.stopRecording();
    if (!audioUri || request !== generation.current) return;

    setIsEvaluating(true);
    try {
      const result = await hifzEvaluationProvider.evaluateRecitation({ audioUri, expectedAyahs });
      if (request === generation.current) completeWithResult(result);
    } catch (err) {
      const message =
        err instanceof RecitationEvaluationError
          ? err.message
          : 'Could not evaluate your recitation. Please try again.';
      if (request === generation.current) toast.show(message, 'error');
    } finally {
      if (request === generation.current) setIsEvaluating(false);
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
