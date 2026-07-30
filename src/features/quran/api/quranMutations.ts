import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setJson, StorageKeys } from '@/services/storage/mmkv';
import { quranKeys } from './quranKeys';
import type { LastReadPosition } from '../types/quran.types';

export function useSetLastRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (position: LastReadPosition) => {
      setJson(StorageKeys.lastReadAyah, position);
      return position;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quranKeys.lastRead() }),
  });
}
