import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { kvStorage } from './mmkv';

/**
 * Persists the React Query cache to MMKV so server-derived data (prayer
 * times, recommendations, hadith of the day) survives app restarts and is
 * available offline immediately on cold start, before any network refetch.
 */
const asyncStorageAdapter = {
  getItem: async (key: string) => kvStorage.getString(key) ?? null,
  setItem: async (key: string, value: string) => kvStorage.set(key, value),
  removeItem: async (key: string) => kvStorage.delete(key),
};

export const queryPersister = createAsyncStoragePersister({
  storage: asyncStorageAdapter,
  key: 'mutqin-query-cache',
  throttleTime: 1000,
});
