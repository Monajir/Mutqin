import { create } from 'zustand';
import type { ThemeName } from '@/design-system/tokens/colors';
import { kvStorage, StorageKeys } from '@/services/storage/mmkv';

interface ThemeStoreState {
  preference: ThemeName | 'system';
  setPreference: (pref: ThemeName | 'system') => void;
}

const persistedPreference = (kvStorage.getString(StorageKeys.themePreference) as ThemeName | 'system' | undefined) ?? 'system';

export const useThemeStore = create<ThemeStoreState>((set) => ({
  preference: persistedPreference,
  setPreference: (pref) => {
    kvStorage.set(StorageKeys.themePreference, pref);
    set({ preference: pref });
  },
}));
