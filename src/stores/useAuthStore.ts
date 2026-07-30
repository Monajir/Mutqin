import { create } from 'zustand';
import { kvStorage, StorageKeys, getJson, setJson } from '@/services/storage/mmkv';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthUser {
  id: string;
  displayName: string;
  email?: string;
}

interface AuthStoreState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  status: 'guest' | 'authenticated' | 'session_expired';
  setSession: (tokens: AuthTokens, user: AuthUser) => void;
  handleSessionExpired: () => void;
  signOut: () => void;
}

const persisted = getJson<AuthTokens>(StorageKeys.authTokens);

/**
 * Auth is optional for v1's core loop (offline content works fully as a
 * guest, per spec §10) — this store only gates cloud-sync and
 * recommendation personalization, never local reading/memorization features.
 */
export const useAuthStore = create<AuthStoreState>((set) => ({
  accessToken: persisted?.accessToken ?? null,
  refreshToken: persisted?.refreshToken ?? null,
  user: null,
  status: persisted ? 'authenticated' : 'guest',
  setSession: (tokens, user) => {
    setJson(StorageKeys.authTokens, tokens);
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user, status: 'authenticated' });
  },
  handleSessionExpired: () => {
    kvStorage.delete(StorageKeys.authTokens);
    set({ accessToken: null, refreshToken: null, user: null, status: 'session_expired' });
  },
  signOut: () => {
    kvStorage.delete(StorageKeys.authTokens);
    set({ accessToken: null, refreshToken: null, user: null, status: 'guest' });
  },
}));
