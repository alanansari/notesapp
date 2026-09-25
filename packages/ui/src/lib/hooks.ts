import type { LocalNote, LocalTask, Session, SyncState } from '@noted/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useClient } from './context';

export function useNotes(): LocalNote[] | undefined {
  const { db } = useClient();
  return useLiveQuery(async () => {
    const notes = await db.notes.filter((n) => n.deletedAt === null).toArray();
    return notes.sort((a, b) => a.order - b.order);
  }, [db]);
}

export function useTasks(): LocalTask[] | undefined {
  const { db } = useClient();
  return useLiveQuery(async () => {
    const tasks = await db.tasks.filter((t) => t.deletedAt === null).toArray();
    return tasks.sort((a, b) => a.order - b.order);
  }, [db]);
}

export function useSession(): Session | null | undefined {
  const { db } = useClient();
  return useLiveQuery(async () => (await db.getMeta<Session>('session')) ?? null, [db]);
}

export function usePendingCount(): number {
  const client = useClient();
  return useLiveQuery(() => client.pendingCount(), [client]) ?? 0;
}

export function useLastSyncedAt(): number | null {
  const { db } = useClient();
  return useLiveQuery(async () => (await db.getMeta<number>('sync.lastSyncedAt')) ?? null, [db]) ?? null;
}

export function useSyncState(): SyncState {
  const { sync } = useClient();
  return useSyncExternalStore(sync.subscribe, sync.getState, sync.getState);
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const useIsMobile = () => useMediaQuery('(max-width: 759px)');

function subscribeOnline(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
