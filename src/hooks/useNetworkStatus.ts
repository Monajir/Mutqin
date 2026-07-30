import { useConnectivityStore } from '@/stores/useConnectivityStore';

/** Thin, semantically-named hook so feature code reads intent, not store internals. */
export function useNetworkStatus(): { isOnline: boolean } {
  const isOnline = useConnectivityStore((s) => s.isOnline);
  return { isOnline };
}
