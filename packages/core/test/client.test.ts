import type { AuthResponse, SyncRequest } from '@noted/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNotedClient, type NotedClient } from '../src/client';

let client: NotedClient;

const auth: AuthResponse = {
  user: {
    id: 'u1',
    name: 'Alex',
    email: 'alex@example.com',
    avatar: '#86CFFA',
    createdAt: 1,
    passwordChangedAt: 1,
  },
  accessToken: 'access',
  refreshToken: 'refresh',
};
const credentials = { email: 'alex@example.com', password: 'correct-horse' };

beforeEach(async () => {
  client = createNotedClient({
    apiUrl: 'http://api.test',
    platform: 'web',
    dbName: `test-${crypto.randomUUID()}`,
  });
  client.api.login = vi.fn(async () => auth);
  client.api.revoke = vi.fn(async () => undefined);
  client.api.sync = vi.fn(async (_req: SyncRequest) => ({ cursor: 1, hasMore: false, notes: [], tasks: [] }));
  await client.start();
  client.stop();
});

const liveNotes = () => client.db.notes.filter((n) => n.deletedAt === null).toArray();

describe('logging in on a device with local data', () => {
  it('drops untouched starter notes without asking', async () => {
    expect(await liveNotes()).toHaveLength(3);
    const resolve = vi.fn();

    expect(await client.auth.login(credentials, resolve)).toEqual(auth.user);

    expect(resolve).not.toHaveBeenCalled();
    expect(await client.db.notes.count()).toBe(0);
    expect(await client.db.tasks.count()).toBe(0);
  });

  it('keeps only the user’s own data when merging', async () => {
    const mine = await client.notes.create({ body: 'Mine', color: 'yellow', tags: [] });
    await client.tasks.create('My task', 'todo');
    const resolve = vi.fn(async () => 'merge' as const);

    await client.auth.login(credentials, resolve);

    expect(resolve).toHaveBeenCalledWith({ notes: 1, tasks: 1 });
    expect((await liveNotes()).map((n) => n.id)).toEqual([mine.id]);
    expect(await client.db.tasks.count()).toBe(1);
    expect(await client.auth.getSession()).toMatchObject({ accessToken: 'access' });
  });

  it('clears the device when using the account’s data', async () => {
    await client.notes.create({ body: 'Mine', color: 'yellow', tags: [] });

    await client.auth.login(credentials, async () => 'replace');

    expect(await client.db.notes.count()).toBe(0);
    expect(await client.auth.getSession()).toMatchObject({ accessToken: 'access' });
  });

  it('leaves everything alone and ends the new session when cancelled', async () => {
    await client.notes.create({ body: 'Mine', color: 'yellow', tags: [] });

    expect(await client.auth.login(credentials, async () => null)).toBeNull();

    expect(await liveNotes()).toHaveLength(4);
    expect(await client.auth.getSession()).toBeUndefined();
    expect(client.api.revoke).toHaveBeenCalledWith('access');
  });
});
