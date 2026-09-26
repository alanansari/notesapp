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
  /** Returning to the tab only syncs if the last successful sync is older than this. */
  refocusMs?: number;
}

const isOnline = () => globalThis.navigator?.onLine ?? true;
const isHidden = () => globalThis.document?.visibilityState === 'hidden';
// The request timeout can also fire while the response body is still being read.
const isTimeout = (error: unknown) => error instanceof DOMException && error.name === 'TimeoutError';

export function createSyncManager({
  db,
  api,
  sessions,
  onDeferred,
  debounceMs = 800,
  intervalMs = 60_000,
  refocusMs = 30_000,
}: SyncManagerOptions) {
  let state: SyncState = { status: 'guest', error: null };
  const listeners = new Set<(state: SyncState) => void>();
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let intervalTimer: ReturnType<typeof setInterval> | undefined;
  let running: Promise<void> | null = null;
  let rerun = false;
  let lastSuccessAt = 0;

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
    try {
      // Another tab or the service worker may hold the lock; only show progress once this tab syncs.
      await withLock(SYNC_LOCK, async () => {
        set({ status: 'syncing', error: null });
        await syncOnce(db, api);
      });
      lastSuccessAt = Date.now();
      set({ status: 'idle', error: null });
    } catch (error) {
      if (error instanceof NetworkError || isTimeout(error)) {
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
  function startInterval(): void {
    clearInterval(intervalTimer);
    intervalTimer = setInterval(() => void syncNow(), intervalMs);
  }

  // Hidden tabs stop polling; edits made there still sync through `request`.
  const onVisibilityChange = () => {
    if (isHidden()) return clearInterval(intervalTimer);
    startInterval();
    if (Date.now() - lastSuccessAt >= refocusMs) void syncNow();
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
      globalThis.document?.addEventListener('visibilitychange', onVisibilityChange);
      if (!isHidden()) startInterval();
      void syncNow();
    },
    stop() {
      clearTimeout(debounceTimer);
      clearInterval(intervalTimer);
      globalThis.removeEventListener?.('online', onOnline);
      globalThis.removeEventListener?.('offline', onOffline);
      globalThis.document?.removeEventListener('visibilitychange', onVisibilityChange);
    },
  };
}

export type SyncManager = ReturnType<typeof createSyncManager>;
