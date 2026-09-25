import type {
  ChangePasswordInput,
  ClientPlatform,
  LoginInput,
  SignupInput,
  UpdateProfileInput,
  User,
  VerifySignupInput,
} from '@noted/shared';
import { createApiClient } from './api';
import { NotedDB } from './db';
import { createNotesRepo } from './notes';
import { seedFirstRun } from './seed';
import { createSessionStore } from './session';
import { resetSyncState } from './sync';
import { createSyncManager } from './sync-manager';
import { createTasksRepo } from './tasks';

export interface NotedClientOptions {
  apiUrl: string;
  platform: ClientPlatform;
  onSyncDeferred?: () => void;
  dbName?: string;
}

export function createNotedClient({ apiUrl, platform, onSyncDeferred, dbName }: NotedClientOptions) {
  const db = new NotedDB(dbName);
  const sessions = createSessionStore(db);
  const api = createApiClient(apiUrl, sessions);
  const sync = createSyncManager({
    db,
    api,
    sessions,
    ...(onSyncDeferred ? { onDeferred: onSyncDeferred } : {}),
  });
  const notes = createNotesRepo(db, sync.request);
  const tasks = createTasksRepo(db, sync.request);

  async function startSession(response: { user: User; accessToken: string; refreshToken: string }) {
    await sessions.set(response);
    await resetSyncState(db);
    void sync.syncNow();
    return response.user;
  }

  async function clearLocalData() {
    await db.transaction('rw', db.notes, db.tasks, db.meta, async () => {
      await Promise.all([db.notes.clear(), db.tasks.clear()]);
      await db.meta.where('key').notEqual('seeded').delete();
    });
  }

  async function updateStoredUser(user: User) {
    const session = await sessions.get();
    if (session) await sessions.set({ ...session, user });
    return user;
  }

  return {
    db,
    api,
    sync,
    notes,
    tasks,
    platform,
    async start() {
      await seedFirstRun(db);
      sync.start();
    },
    stop: () => sync.stop(),
    auth: {
      getSession: () => sessions.get(),
      signup: (input: Omit<SignupInput, 'platform'>) => api.signup({ ...input, platform }),
      verifySignup: async (input: Omit<VerifySignupInput, 'platform'>) =>
        startSession(await api.verifySignup({ ...input, platform })),
      resendSignupCode: (email: string) => api.resendSignupCode({ email }),
      login: async (input: Omit<LoginInput, 'platform'>) =>
        startSession(await api.login({ ...input, platform })),
      async logout() {
        await api.logout().catch(() => undefined);
        await sessions.clear();
        await clearLocalData();
        await sync.syncNow();
      },
      async deleteAccount() {
        await api.deleteAccount();
        await sessions.clear();
        await clearLocalData();
        await sync.syncNow();
      },
      refreshUser: async () => updateStoredUser(await api.me()),
      updateProfile: async (input: UpdateProfileInput) => updateStoredUser(await api.updateMe(input)),
      changePassword: async (input: ChangePasswordInput) => updateStoredUser(await api.changePassword(input)),
    },
    pendingCount: async () =>
      (await db.notes.where('dirty').equals(1).count()) + (await db.tasks.where('dirty').equals(1).count()),
  };
}

export type NotedClient = ReturnType<typeof createNotedClient>;
