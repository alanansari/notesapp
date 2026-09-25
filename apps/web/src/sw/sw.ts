import { BACKGROUND_SYNC_TAG, runBackgroundSync } from '@noted/core/background';

declare const self: ServiceWorkerGlobalScope;
declare const __BUILD_ID__: string;
declare const __API_URL__: string;

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

const PRECACHE = `noted-precache-${__BUILD_ID__}`;
const RUNTIME = `noted-runtime-${__BUILD_ID__}`;
const APP_SHELL = ['/', '/app', '/login', '/signup', '/profile', '/offline'];
const WORKSPACE_ROUTES = ['/app', '/login', '/signup', '/profile'];
const STATIC_FILES = [
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];
const NETWORK_TIMEOUT_MS = 3000;
const ASSET_PATTERN = /\/_next\/static\/[^"'\s\\)<>]+/g;

function extractAssets(text: string): string[] {
  return [...new Set(text.match(ASSET_PATTERN) ?? [])];
}

async function precache(): Promise<void> {
  const cache = await caches.open(PRECACHE);
  const assets = new Set(STATIC_FILES);

  await Promise.all(
    APP_SHELL.map(async (path) => {
      const res = await fetch(path, { cache: 'reload' });
      if (!res.ok) throw new Error(`Could not precache ${path}`);
      await cache.put(path, res.clone());
      for (const asset of extractAssets(await res.text())) assets.add(asset);
    }),
  );

  const cacheAsset = async (url: string): Promise<void> => {
    const res = await fetch(url);
    if (!res.ok) return;
    if (url.endsWith('.css')) {
      const nested = extractAssets(await res.clone().text()).filter((u) => !assets.has(u));
      for (const u of nested) assets.add(u);
      await Promise.allSettled(nested.map(cacheAsset));
    }
    await cache.put(url, res);
  };
  await Promise.allSettled([...assets].map(cacheAsset));
}

async function activate(): Promise<void> {
  const keep = new Set([PRECACHE, RUNTIME]);
  const names = await caches.keys();
  await Promise.all(names.filter((n) => n.startsWith('noted-') && !keep.has(n)).map((n) => caches.delete(n)));
  await self.registration.navigationPreload?.enable();
  await self.clients.claim();
}

async function cachedPage(pathname: string): Promise<Response | undefined> {
  const exact = await caches.match(pathname, { ignoreSearch: true });
  if (exact) return exact;
  const shell = WORKSPACE_ROUTES.find((route) => pathname === route || pathname.startsWith(`${route}/`));
  return (shell && (await caches.match(shell))) || undefined;
}

async function offlineFallback(pathname: string): Promise<Response> {
  return (await cachedPage(pathname)) ?? (await caches.match('/offline')) ?? Response.error();
}

async function networkFirst(event: FetchEvent): Promise<Response> {
  const { pathname } = new URL(event.request.url);

  const network = (async () => {
    const res = ((await event.preloadResponse) as Response | undefined) ?? (await fetch(event.request));
    if (res.ok && !res.redirected) {
      const cache = await caches.open(RUNTIME);
      await cache.put(pathname, res.clone());
    }
    return res;
  })();
  event.waitUntil(
    network.then(
      () => undefined,
      () => undefined,
    ),
  );

  const timeout = new Promise<'timeout'>((resolve) =>
    setTimeout(() => resolve('timeout'), NETWORK_TIMEOUT_MS),
  );
  try {
    const winner = await Promise.race([network, timeout]);
    if (winner !== 'timeout') return winner;
    return (await cachedPage(pathname)) ?? (await network);
  } catch {
    return offlineFallback(pathname);
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) {
    const cache = await caches.open(RUNTIME);
    await cache.put(request, res.clone());
  }
  return res;
}

async function staleWhileRevalidate(event: FetchEvent): Promise<Response> {
  const cached = await caches.match(event.request);
  const network = fetch(event.request).then(async (res) => {
    if (res.ok) {
      const cache = await caches.open(RUNTIME);
      await cache.put(event.request, res.clone());
    }
    return res;
  });
  if (!cached) return network;
  event.waitUntil(
    network.then(
      () => undefined,
      () => undefined,
    ),
  );
  return cached;
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(activate());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('sync', (event) => {
  const sync = event as SyncEvent;
  if (sync.tag === BACKGROUND_SYNC_TAG) sync.waitUntil(runBackgroundSync(__API_URL__));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === 'navigate') {
    event.respondWith(networkFirst(event));
  } else if (
    request.headers.has('RSC') ||
    url.searchParams.has('_rsc') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/__')
  ) {
    return;
  } else {
    event.respondWith(staleWhileRevalidate(event));
  }
});
