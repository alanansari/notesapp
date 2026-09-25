import type { Note, SyncRequest, SyncResponse } from '@noted/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../src/api';
import { type LocalNote, NotedDB } from '../src/db';
import { createNotesRepo } from '../src/notes';
import { syncOnce } from '../src/sync';
import { createTasksRepo } from '../src/tasks';

let db: NotedDB;

beforeEach(async () => {
  db = new NotedDB(`test-${crypto.randomUUID()}`);
  await db.open();
});

function fakeApi(respond: (req: SyncRequest) => Partial<SyncResponse>): ApiClient {
  return {
    sync: vi.fn(async (req: SyncRequest) => ({
      cursor: 1,
      hasMore: false,
      notes: [],
      tasks: [],
      ...respond(req),
    })),
  } as unknown as ApiClient;
}

const remoteNote = (overrides: Partial<Note>): Note => ({
  id: crypto.randomUUID(),
  body: 'Remote',
  color: 'cyan',
  tags: [],
  status: 'active',
  order: 0,
  x: null,
  y: null,
  z: 1,
  createdAt: 1,
  updatedAt: 1,
  deletedAt: null,
  ...overrides,
});

describe('syncOnce', () => {
  it('pushes dirty notes and marks them clean', async () => {
    const notes = createNotesRepo(db, () => {});
    const created = await notes.create({ body: 'Local', color: 'yellow', tags: [] });
    const api = fakeApi((req) => ({ notes: req.notes }));

    await syncOnce(db, api);

    expect(api.sync).toHaveBeenCalledWith(expect.objectContaining({ cursor: 0 }));
    const [sent] = vi.mocked(api.sync).mock.calls[0]?.[0].notes ?? [];
    expect(sent).not.toHaveProperty('dirty');
    expect((await db.notes.get(created.id))?.dirty).toBe(0);
    expect(await db.getMeta('sync.cursor')).toBe(1);
  });

  it('keeps a newer local edit over an older remote copy', async () => {
    const notes = createNotesRepo(db, () => {});
    const local = await notes.create({ body: 'Mine', color: 'yellow', tags: [] });
    const stale = remoteNote({ id: local.id, body: 'Theirs', updatedAt: local.updatedAt - 100 });

    await syncOnce(
      db,
      fakeApi(() => ({ notes: [stale] })),
    );

    const stored = (await db.notes.get(local.id)) as LocalNote;
    expect(stored.body).toBe('Mine');
    expect(stored.dirty).toBe(0);
  });

  it('does not clean a note edited again while its push was in flight', async () => {
    const notes = createNotesRepo(db, () => {});
    const local = await notes.create({ body: 'First', color: 'yellow', tags: [] });
    const api = fakeApi(() => ({}));
    vi.mocked(api.sync).mockImplementationOnce(async () => {
      await notes.update(local.id, { body: 'Second' });
      return { cursor: 1, hasMore: false, notes: [], tasks: [] };
    });

    await syncOnce(db, api);

    const stored = (await db.notes.get(local.id)) as LocalNote;
    expect(stored.body).toBe('Second');
    expect(stored.dirty).toBe(1);
  });

  it('applies newer remote changes', async () => {
    const incoming = remoteNote({ updatedAt: 50 });
    await syncOnce(
      db,
      fakeApi(() => ({ notes: [incoming] })),
    );
    expect((await db.notes.get(incoming.id))?.body).toBe('Remote');
  });
});

describe('tasks repo', () => {
  it('orders tasks when moving before another', async () => {
    const tasks = createTasksRepo(db, () => {});
    const a = await tasks.create('A', 'todo');
    const b = await tasks.create('B', 'todo');
    const c = await tasks.create('C', 'backlog');

    await tasks.move(c.id, 'todo', b.id);

    const ordered = (await db.tasks.where('column').equals('todo').toArray()).sort(
      (x, y) => x.order - y.order,
    );
    expect(ordered.map((t) => t.title)).toEqual([a.title, c.title, b.title]);
  });
});
