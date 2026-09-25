import { createApiClient } from './api';
import { NotedDB } from './db';
import { SYNC_LOCK, withLock } from './lock';
import { createSessionStore } from './session';
import { syncOnce } from './sync';

export const BACKGROUND_SYNC_TAG = 'noted-sync';

export async function runBackgroundSync(apiUrl: string): Promise<void> {
  const db = new NotedDB();
  try {
    const sessions = createSessionStore(db);
    if (!(await sessions.get())) return;
    const api = createApiClient(apiUrl, sessions);
    await withLock(SYNC_LOCK, () => syncOnce(db, api));
  } finally {
    db.close();
  }
}
