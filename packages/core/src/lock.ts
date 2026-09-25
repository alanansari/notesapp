export const SYNC_LOCK = 'noted-sync';

export async function withLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const locks = globalThis.navigator?.locks;
  if (!locks) return fn();
  return locks.request(name, fn) as Promise<T>;
}
