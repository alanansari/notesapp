import type { Note } from '@noted/shared';
import type { FastifyInstance } from 'fastify';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { loadEnv } from '../src/env';

let mongo: MongoMemoryServer;
let app: FastifyInstance;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = await buildApp(loadEnv({ NODE_ENV: 'test', JWT_SECRET: 'x'.repeat(32) }));
});

afterAll(async () => {
  await app.close();
  await mongoose.disconnect();
  await mongo.stop();
});

const note = (overrides: Partial<Note> = {}): Note => ({
  id: crypto.randomUUID(),
  body: 'Hello',
  color: 'yellow',
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

async function call(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, body?: object, token?: string) {
  const res = await app.inject({
    method,
    url,
    ...(body ? { payload: body } : {}),
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return { status: res.statusCode, body: res.body ? res.json() : null };
}

describe('auth and sync', () => {
  const credentials = { email: 'alex@example.com', password: 'correct-horse' };
  let web: { accessToken: string; refreshToken: string };

  it('signs up and rejects duplicates', async () => {
    const res = await call('POST', '/auth/signup', { ...credentials, name: 'Alex', platform: 'web' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('alex@example.com');
    web = res.body;

    const dup = await call('POST', '/auth/signup', { ...credentials, name: 'Alex', platform: 'web' });
    expect(dup.status).toBe(409);
  });

  it('rejects a wrong password', async () => {
    const res = await call('POST', '/auth/login', { ...credentials, password: 'nope', platform: 'macos' });
    expect(res.status).toBe(401);
  });

  it('syncs notes between devices with last-write-wins', async () => {
    const desktop = (await call('POST', '/auth/login', { ...credentials, platform: 'macos' })).body;
    const shared = note({ updatedAt: 10 });

    const push = await call('POST', '/sync', { cursor: 0, notes: [shared], tasks: [] }, web.accessToken);
    expect(push.status).toBe(200);
    expect(push.body.notes).toHaveLength(1);

    const pull = await call('POST', '/sync', { cursor: 0, notes: [], tasks: [] }, desktop.accessToken);
    expect(pull.body.notes[0]).toMatchObject({ id: shared.id, body: 'Hello' });

    const stale = await call(
      'POST',
      '/sync',
      { cursor: pull.body.cursor, notes: [{ ...shared, body: 'Old', updatedAt: 5 }], tasks: [] },
      desktop.accessToken,
    );
    expect(stale.status).toBe(200);
    expect(stale.body.notes).toHaveLength(0);

    await call(
      'POST',
      '/sync',
      { cursor: 0, notes: [{ ...shared, body: 'New', updatedAt: 20 }], tasks: [] },
      desktop.accessToken,
    );
    const latest = await call(
      'POST',
      '/sync',
      { cursor: push.body.cursor, notes: [], tasks: [] },
      web.accessToken,
    );
    expect(latest.body.notes[0].body).toBe('New');
  });

  it('rotates refresh tokens', async () => {
    const refreshed = await call('POST', '/auth/refresh', { refreshToken: web.refreshToken });
    expect(refreshed.status).toBe(200);
    const reused = await call('POST', '/auth/refresh', { refreshToken: web.refreshToken });
    expect(reused.status).toBe(401);
    web = refreshed.body;
  });

  it('lists devices and revokes a session on logout', async () => {
    const sessions = await call('GET', '/me/sessions', undefined, web.accessToken);
    expect(sessions.body.length).toBeGreaterThanOrEqual(2);
    expect(sessions.body.filter((s: { current: boolean }) => s.current)).toHaveLength(1);

    expect((await call('POST', '/auth/logout', undefined, web.accessToken)).status).toBe(204);
    expect((await call('GET', '/me', undefined, web.accessToken)).status).toBe(401);
  });
});
