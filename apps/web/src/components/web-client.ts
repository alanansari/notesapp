import { createNotedClient, type NotedClient } from '@noted/core';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

let client: NotedClient | undefined;

async function registerBackgroundSync(): Promise<void> {
  if (!navigator.serviceWorker?.controller) return;
  const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
    sync?: { register(tag: string): Promise<void> };
  };
  await registration.sync?.register('noted-sync').catch(() => undefined);
}

export function getWebClient(): NotedClient {
  client ??= createNotedClient({
    apiUrl: API_URL,
    platform: 'web',
    onSyncDeferred: () => void registerBackgroundSync(),
  });
  return client;
}
