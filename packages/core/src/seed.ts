import type { NotedDB } from './db';

const SEEDED_KEY = 'seeded';

export async function seedFirstRun(db: NotedDB): Promise<void> {
  if (await db.getMeta<boolean>(SEEDED_KEY)) return;
  const now = Date.now();
  const base = { createdAt: now, updatedAt: now, deletedAt: null, dirty: 0 as const, x: null, y: null };

  await db.transaction('rw', db.notes, db.tasks, db.meta, async () => {
    if ((await db.notes.count()) > 0) return;
    await db.notes.bulkAdd([
      {
        ...base,
        id: crypto.randomUUID(),
        body: '# Welcome to Noted\n- [x] Open Noted\n- [ ] Write your first note\n- [ ] Drag this card somewhere new\n\nEverything you write is saved on this device, even offline.',
        color: 'yellow',
        tags: ['start'],
        status: 'active',
        order: 0,
        z: 3,
      },
      {
        ...base,
        id: crypto.randomUUID(),
        body: 'Press `N` for a new note, `/` to search and `?` for every shortcut.',
        color: 'cyan',
        tags: ['tips'],
        status: 'active',
        order: 1,
        z: 2,
      },
      {
        ...base,
        id: crypto.randomUUID(),
        body: '# Back up your notes\nCreate a free account to keep everything in the cloud and pick up where you left off on the web, macOS and Windows.',
        color: 'green',
        tags: ['tips'],
        status: 'active',
        order: 2,
        z: 1,
      },
    ]);
    await db.tasks.bulkAdd([
      {
        ...base,
        id: crypto.randomUUID(),
        title: 'Sign up to sync across devices',
        column: 'backlog',
        order: 0,
      },
      { ...base, id: crypto.randomUUID(), title: 'Drag this task to Doing', column: 'todo', order: 0 },
      { ...base, id: crypto.randomUUID(), title: 'Open Noted for the first time', column: 'done', order: 0 },
    ]);
  });
  await db.setMeta(SEEDED_KEY, true);
}
