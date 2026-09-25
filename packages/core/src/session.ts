import type { TokenPair, User } from '@noted/shared';
import type { NotedDB } from './db';

export interface Session extends TokenPair {
  user: User;
}

const KEY = 'session';

export function createSessionStore(db: NotedDB) {
  return {
    get: () => db.getMeta<Session>(KEY),
    set: (session: Session) => db.setMeta(KEY, session),
    clear: () => db.meta.delete(KEY),
  };
}

export type SessionStore = ReturnType<typeof createSessionStore>;
