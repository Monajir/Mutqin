import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hifzKeys } from './hifzKeys';
import { hifzRepository } from './hifzRepository';
import type { HifzStatus } from '@/constants';

export function useUpdateHifzStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: 'always',
    mutationFn: async (input: { surahId: number; ayahNumber: number; status: HifzStatus }) => {
      hifzRepository.upsertStatus(input.surahId, input.ayahNumber, input.status, 'manual');
      return input;
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: hifzKeys.all });
    },
  });
}
