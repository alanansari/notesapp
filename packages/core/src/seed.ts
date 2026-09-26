import { defaultWorkspace } from '@noted/shared';
import type { NotedDB } from './db';

const SEEDED_KEY = 'seeded';

// Seeds stay clean (dirty: 0) so they never count as the guest's own data. Accounts get their
// own copies from the server when they are created.
export async function seedFirstRun(db: NotedDB): Promise<void> {
  if (await db.getMeta<boolean>(SEEDED_KEY)) return;
  const { notes, tasks } = defaultWorkspace('guest', () => crypto.randomUUID(), Date.now());

  await db.transaction('rw', db.notes, db.tasks, db.meta, async () => {
    if ((await db.notes.count()) > 0) return;
    await db.notes.bulkAdd(notes.map((note) => ({ ...note, dirty: 0 as const })));
    await db.tasks.bulkAdd(tasks.map((task) => ({ ...task, dirty: 0 as const })));
  });
  await db.setMeta(SEEDED_KEY, true);
}
