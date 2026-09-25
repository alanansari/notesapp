import { type Note, SYNC_BATCH_LIMIT, type Task } from '@noted/shared';
import type { ApiClient } from './api';
import type { Dirty, NotedDB } from './db';

const CURSOR_KEY = 'sync.cursor';
export const LAST_SYNCED_KEY = 'sync.lastSyncedAt';

function strip<T extends { dirty: Dirty }>(record: T): Omit<T, 'dirty'> {
  const { dirty: _dirty, ...rest } = record;
  return rest;
}

interface Store<L> {
  get(id: string): PromiseLike<L | undefined>;
  put(item: L): PromiseLike<unknown>;
}

async function reconcile<R extends Note | Task>(
  store: Store<R & { dirty: Dirty }>,
  pushed: R[],
  pulled: R[],
): Promise<void> {
  for (const sent of pushed) {
    const local = await store.get(sent.id);
    if (local && local.updatedAt === sent.updatedAt) await store.put({ ...local, dirty: 0 });
  }

  for (const remote of pulled) {
    const local = await store.get(remote.id);
    if (!local || remote.updatedAt >= local.updatedAt) {
      await store.put({ ...remote, dirty: 0 });
    }
  }
}

export async function syncOnce(db: NotedDB, api: ApiClient): Promise<void> {
  for (;;) {
    const [notes, tasks, cursor] = await Promise.all([
      db.notes.where('dirty').equals(1).limit(SYNC_BATCH_LIMIT).toArray(),
      db.tasks.where('dirty').equals(1).limit(SYNC_BATCH_LIMIT).toArray(),
      db.getMeta<number>(CURSOR_KEY),
    ]);

    const pushedNotes = notes.map(strip) as Note[];
    const pushedTasks = tasks.map(strip) as Task[];
    const res = await api.sync({ cursor: cursor ?? 0, notes: pushedNotes, tasks: pushedTasks });

    await db.transaction('rw', db.notes, db.tasks, db.meta, async () => {
      await reconcile(db.notes, pushedNotes, res.notes);
      await reconcile(db.tasks, pushedTasks, res.tasks);
      await db.setMeta(CURSOR_KEY, res.cursor);
      await db.setMeta(LAST_SYNCED_KEY, Date.now());
    });

    const pushedFullBatch = notes.length === SYNC_BATCH_LIMIT || tasks.length === SYNC_BATCH_LIMIT;
    if (!res.hasMore && !pushedFullBatch) return;
  }
}

export async function resetSyncState(db: NotedDB): Promise<void> {
  await db.meta.bulkDelete([CURSOR_KEY, LAST_SYNCED_KEY]);
}
