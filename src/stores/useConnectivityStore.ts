import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';

interface ConnectivityState {
  isOnline: boolean;
  setOnline: (online: boolean) => void;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: true,
  setOnline: (online) => set({ isOnline: online }),
}));

/** Call once at app root to keep the store in sync with the OS network state. */
export function initConnectivityListener(): () => void {
  return NetInfo.addEventListener((state) => {
    useConnectivityStore.getState().setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
}
