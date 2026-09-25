import type { Note } from '@noted/shared';
import type { FastifyInstance } from 'fastify';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/create-app.js';
import { loadEnv } from '../src/env.js';
import type { EmailMessage } from '../src/lib/mailer.js';
import { PendingSignup } from '../src/models/pending-signup.js';

let mongo: MongoMemoryServer;
let app: FastifyInstance;
const outbox: EmailMessage[] = [];

function lastCodeFor(email: string): string {
  const message = outbox.findLast((m) => m.to === email);
  const code = message?.subject.match(/^(\d{6}) /)?.[1];
  if (!code) throw new Error(`No verification email sent to ${email}`);
  return code;
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = await buildApp(loadEnv({ NODE_ENV: 'test', JWT_SECRET: 'x'.repeat(32) }), {
    mailer: { send: async (message) => void outbox.push(message) },
  });
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
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ email: 'alex@example.com', resendAfter: expect.any(Number) });
    expect(res.body.accessToken).toBeUndefined();

    const early = await call('POST', '/auth/login', { ...credentials, platform: 'web' });
    expect(early.status).toBe(401);

    const verified = await call('POST', '/auth/signup/verify', {
      email: credentials.email,
      code: lastCodeFor(credentials.email),
      platform: 'web',
    });
    expect(verified.status).toBe(201);
    expect(verified.body.user.email).toBe('alex@example.com');
    web = verified.body;

    const dup = await call('POST', '/auth/signup', { ...credentials, name: 'Alex', platform: 'web' });
    expect(dup.status).toBe(409);
  });

  it('requires the emailed code before creating the account', async () => {
    const email = 'sam@example.com';
    const signup = { email, password: 'correct-horse', name: 'Sam', platform: 'web' };
    expect((await call('POST', '/auth/signup', signup)).status).toBe(202);
    const code = lastCodeFor(email);
    const wrong = code === '000000' ? '111111' : '000000';

    const bad = await call('POST', '/auth/signup/verify', { email, code: wrong, platform: 'web' });
    expect(bad.status).toBe(400);

    const tooSoon = await call('POST', '/auth/signup/resend', { email });
    expect(tooSoon.status).toBe(429);

    await PendingSignup.updateOne({ email }, { sentAt: new Date(Date.now() - 61_000) });
    expect((await call('POST', '/auth/signup/resend', { email })).status).toBe(200);
    const fresh = lastCodeFor(email);
    if (fresh !== code) {
      const stale = await call('POST', '/auth/signup/verify', { email, code, platform: 'web' });
      expect(stale.status).toBe(400);
    }

    for (let i = 0; i < 5; i++)
      await call('POST', '/auth/signup/verify', { email, code: wrong, platform: 'web' });
    const locked = await call('POST', '/auth/signup/verify', { email, code: fresh, platform: 'web' });
    expect(locked.status).toBe(400);

    await PendingSignup.updateOne({ email }, { sentAt: new Date(Date.now() - 61_000) });
    await call('POST', '/auth/signup/resend', { email });
    const ok = await call('POST', '/auth/signup/verify', {
      email,
      code: lastCodeFor(email),
      platform: 'web',
    });
    expect(ok.status).toBe(201);
    expect(await PendingSignup.exists({ email })).toBeNull();
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
