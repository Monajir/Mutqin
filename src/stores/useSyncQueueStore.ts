import { create } from 'zustand';

export interface PendingWrite {
  id: string;
  entityType: 'hifz_progress' | 'hifz_session' | 'bookmark';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  createdAt: string;
}

interface SyncQueueState {
  pendingWrites: PendingWrite[];
  enqueue: (write: PendingWrite) => void;
  dequeue: (id: string) => void;
  setQueue: (writes: PendingWrite[]) => void;
}

/**
 * In-memory mirror of the `sync_queue` SQLite table (source of truth), kept
 * here purely so UI (OfflineBanner, Settings > Sync status) can subscribe
 * reactively without querying SQLite on every render.
 */
export const useSyncQueueStore = create<SyncQueueState>((set, get) => ({
  pendingWrites: [],
  enqueue: (write) => set({ pendingWrites: [...get().pendingWrites, write] }),
  dequeue: (id) => set({ pendingWrites: get().pendingWrites.filter((w) => w.id !== id) }),
  setQueue: (writes) => set({ pendingWrites: writes }),
}));
