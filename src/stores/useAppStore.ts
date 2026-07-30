import { create } from 'zustand';
import { kvStorage, StorageKeys } from '@/services/storage/mmkv';

interface AppStoreState {
  isOnboarded: boolean;
  isDbReady: boolean;
  completeOnboarding: () => void;
  setDbReady: (ready: boolean) => void;
}

/** Coarse app-lifecycle flags read by the root layout to decide the initial route. */
export const useAppStore = create<AppStoreState>((set) => ({
  isOnboarded: kvStorage.getBoolean(StorageKeys.onboardingComplete) ?? false,
  isDbReady: false,
  completeOnboarding: () => {
    kvStorage.set(StorageKeys.onboardingComplete, true);
    set({ isOnboarded: true });
  },
  setDbReady: (ready) => set({ isDbReady: ready }),
}));
