import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hifzKeys } from './hifzKeys';
import { hifzRepository } from './hifzRepository';
import type { HifzStatus } from '@/constants';
import type { RecitationEvaluationResult } from '@/services/ai/types';
import { deriveStatusUpdatesFromEvaluation } from '../utils/scoreRecitation';
import { useSyncQueueStore } from '@/stores';

export function useUpdateHifzStatus() {
  const queryClient = useQueryClient();
  const enqueueSync = useSyncQueueStore((s) => s.enqueue);

  return useMutation({
    mutationFn: async (input: { surahId: number; ayahNumber: number; status: HifzStatus }) => {
      hifzRepository.upsertStatus(input.surahId, input.ayahNumber, input.status, 'manual');
      enqueueSync({
        id: `${input.surahId}:${input.ayahNumber}:${Date.now()}`,
        entityType: 'hifz_progress',
        entityId: `${input.surahId}-${input.ayahNumber}`,
        operation: 'update',
        createdAt: new Date().toISOString(),
      });
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hifzKeys.all });
    },
  });
}

/** Applies all status transitions derived from a completed AI evaluation in one batch. */
export function useApplyEvaluationResult() {
  const queryClient = useQueryClient();
  const enqueueSync = useSyncQueueStore((s) => s.enqueue);

  return useMutation({
    mutationFn: async (result: RecitationEvaluationResult) => {
      const updates = deriveStatusUpdatesFromEvaluation(result);
      for (const update of updates) {
        hifzRepository.upsertStatus(update.surahId, update.ayahNumber, update.status, 'ai_session');
        enqueueSync({
          id: `${update.surahId}:${update.ayahNumber}:${Date.now()}`,
          entityType: 'hifz_progress',
          entityId: `${update.surahId}-${update.ayahNumber}`,
          operation: 'update',
          createdAt: new Date().toISOString(),
        });
      }
      return updates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hifzKeys.all });
    },
  });
}
