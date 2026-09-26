import type {
  AuthResponse,
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

/** What to do with this device's data when an account is opened on it. */
export type LocalDataChoice = 'merge' | 'replace';

export interface LocalDataSummary {
  notes: number;
  tasks: number;
}

/** Asked only when the device holds data the user made. Resolve `null` to cancel the login. */
export type ResolveLocalData = (summary: LocalDataSummary) => Promise<LocalDataChoice | null>;

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

  // Dirty, live records are the ones the user made or changed here. Clean records are untouched
  // defaults or leftovers from an account that is no longer signed in, so they never count.
  async function localDataSummary(): Promise<LocalDataSummary> {
    const [notes, tasks] = await Promise.all([
      db.notes
        .where('dirty')
        .equals(1)
        .filter((n) => n.deletedAt === null)
        .count(),
      db.tasks
        .where('dirty')
        .equals(1)
        .filter((t) => t.deletedAt === null)
        .count(),
    ]);
    return { notes, tasks };
  }

  async function adoptLocalData(choice: LocalDataChoice) {
    await db.transaction('rw', db.notes, db.tasks, async () => {
      if (choice === 'replace') {
        await Promise.all([db.notes.clear(), db.tasks.clear()]);
        return;
      }
      // Keep only what the user made; the account brings its own defaults.
      await db.notes.filter((n) => n.dirty === 0 || n.deletedAt !== null).delete();
      await db.tasks.filter((t) => t.dirty === 0 || t.deletedAt !== null).delete();
    });
  }

  async function startSession(response: AuthResponse, resolve: ResolveLocalData): Promise<User | null> {
    const summary = await localDataSummary();
    let choice: LocalDataChoice = 'replace';
    if (summary.notes + summary.tasks > 0) {
      const picked = await resolve(summary);
      if (!picked) {
        await api.revoke(response.accessToken).catch(() => undefined);
        return null;
      }
      choice = picked;
    }
    await adoptLocalData(choice);
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
      verifySignup: async (input: Omit<VerifySignupInput, 'platform'>, resolve: ResolveLocalData) =>
        startSession(await api.verifySignup({ ...input, platform }), resolve),
      resendSignupCode: (email: string) => api.resendSignupCode({ email }),
      login: async (input: Omit<LoginInput, 'platform'>, resolve: ResolveLocalData) =>
        startSession(await api.login({ ...input, platform }), resolve),
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
    localDataSummary,
    pendingCount: async () =>
      (await db.notes.where('dirty').equals(1).count()) + (await db.tasks.where('dirty').equals(1).count()),
  };
}

export type NotedClient = ReturnType<typeof createNotedClient>;
