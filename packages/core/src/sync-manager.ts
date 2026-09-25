import { type ApiClient, ApiError, NetworkError } from './api';
import type { NotedDB } from './db';
import { SYNC_LOCK, withLock } from './lock';
import type { SessionStore } from './session';
import { syncOnce } from './sync';

export type SyncStatus = 'guest' | 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncState {
  status: SyncStatus;
  error: string | null;
}

export interface SyncManagerOptions {
  db: NotedDB;
  api: ApiClient;
  sessions: SessionStore;
  onDeferred?: () => void;
  debounceMs?: number;
  intervalMs?: number;
}

const isOnline = () => globalThis.navigator?.onLine ?? true;

export function createSyncManager({
  db,
  api,
  sessions,
  onDeferred,
  debounceMs = 800,
  intervalMs = 60_000,
}: SyncManagerOptions) {
  let state: SyncState = { status: 'guest', error: null };
  const listeners = new Set<(state: SyncState) => void>();
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let intervalTimer: ReturnType<typeof setInterval> | undefined;
  let running: Promise<void> | null = null;
  let rerun = false;

  function set(next: SyncState) {
    state = next;
    for (const listener of listeners) listener(state);
  }

  async function run(): Promise<void> {
    if (!(await sessions.get())) return set({ status: 'guest', error: null });
    if (!isOnline()) {
      onDeferred?.();
      return set({ status: 'offline', error: null });
    }
    set({ status: 'syncing', error: null });
    try {
      await withLock(SYNC_LOCK, () => syncOnce(db, api));
      set({ status: 'idle', error: null });
    } catch (error) {
      if (error instanceof NetworkError) {
        onDeferred?.();
        set({ status: 'offline', error: null });
      } else if (error instanceof ApiError && error.status === 401) {
        set({ status: 'guest', error: null });
      } else {
        set({ status: 'error', error: error instanceof Error ? error.message : 'Sync failed' });
      }
    }
  }

  function syncNow(): Promise<void> {
    clearTimeout(debounceTimer);
    if (running) {
      rerun = true;
      return running;
    }
    running = run().finally(() => {
      running = null;
      if (rerun) {
        rerun = false;
        void syncNow();
      }
    });
    return running;
  }

  function request(): void {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => void syncNow(), debounceMs);
  }

  const onOnline = () => void syncNow();
  const onOffline = () => set({ ...state, status: state.status === 'guest' ? 'guest' : 'offline' });
  const onVisible = () => {
    if (document.visibilityState === 'visible') void syncNow();
  };

  return {
    getState: () => state,
    subscribe(listener: (state: SyncState) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    syncNow,
    request,
    start() {
      globalThis.addEventListener?.('online', onOnline);
      globalThis.addEventListener?.('offline', onOffline);
      globalThis.document?.addEventListener('visibilitychange', onVisible);
      intervalTimer = setInterval(() => void syncNow(), intervalMs);
      void syncNow();
    },
    stop() {
      clearTimeout(debounceTimer);
      clearInterval(intervalTimer);
      globalThis.removeEventListener?.('online', onOnline);
      globalThis.removeEventListener?.('offline', onOffline);
      globalThis.document?.removeEventListener('visibilitychange', onVisible);
    },
  };
}

export type SyncManager = ReturnType<typeof createSyncManager>;
