import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../src/api';
import { NotedDB } from '../src/db';
import type { SessionStore } from '../src/session';
import { createSyncManager, type SyncManager, type SyncStatus } from '../src/sync-manager';

let visibility: DocumentVisibilityState;
let doc: EventTarget;
let manager: SyncManager | undefined;

beforeEach(() => {
  visibility = 'visible';
  doc = new EventTarget();
  Object.defineProperty(doc, 'visibilityState', { get: () => visibility });
  vi.stubGlobal('document', doc);
});

afterEach(() => {
  manager?.stop();
  manager = undefined;
  vi.unstubAllGlobals();
});

const tick = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

function setVisibility(next: DocumentVisibilityState) {
  visibility = next;
  doc.dispatchEvent(new Event('visibilitychange'));
}

async function setup(
  options: { refocusMs?: number; intervalMs?: number; sync?: () => Promise<unknown> } = {},
) {
  const db = new NotedDB(`test-${crypto.randomUUID()}`);
  await db.open();
  const sync = vi.fn(options.sync ?? (async () => ({ cursor: 1, hasMore: false, notes: [], tasks: [] })));
  const api = { sync } as unknown as ApiClient;
  const sessions = { get: async () => ({ accessToken: 'access' }) } as unknown as SessionStore;
  const statuses: SyncStatus[] = [];
  manager = createSyncManager({
    db,
    api,
    sessions,
    refocusMs: options.refocusMs,
    intervalMs: options.intervalMs,
  });
  manager.subscribe((state) => statuses.push(state.status));
  return { manager, sync, statuses };
}

describe('sync manager visibility', () => {
  it('does not sync when the tab is hidden', async () => {
    const { manager, sync } = await setup({ refocusMs: 0 });
    manager.start();
    await tick();
    setVisibility('hidden');
    await tick();
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it('skips the refocus sync right after a successful one', async () => {
    const { manager, sync } = await setup({ refocusMs: 60_000 });
    manager.start();
    await tick();
    setVisibility('hidden');
    setVisibility('visible');
    await tick();
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it('syncs on refocus once the last sync is stale', async () => {
    const { manager, sync } = await setup({ refocusMs: 10 });
    manager.start();
    await tick(30);
    setVisibility('hidden');
    setVisibility('visible');
    await tick();
    expect(sync).toHaveBeenCalledTimes(2);
  });

  it('pauses polling while hidden and resumes when visible', async () => {
    const { manager, sync } = await setup({ intervalMs: 20, refocusMs: 60_000 });
    manager.start();
    await tick(10);
    setVisibility('hidden');
    await tick(80);
    expect(sync).toHaveBeenCalledTimes(1);
    setVisibility('visible');
    await tick(50);
    expect(sync.mock.calls.length).toBeGreaterThan(1);
  });

  it('reports a timed-out request as offline', async () => {
    const { manager, statuses } = await setup({
      sync: async () => {
        throw new DOMException('The operation timed out.', 'TimeoutError');
      },
    });
    await manager.syncNow();
    expect(statuses.at(-1)).toBe('offline');
  });

  it('shows syncing only after the lock is acquired', async () => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal('navigator', {
      onLine: true,
      locks: {
        request: (_name: string, fn: () => Promise<unknown>) => held.then(fn),
      },
    });
    const { manager, statuses } = await setup();
    const done = manager.syncNow();
    await tick();
    expect(statuses).not.toContain('syncing');
    release();
    await done;
    expect(statuses).toEqual(['syncing', 'idle']);
  });
});
