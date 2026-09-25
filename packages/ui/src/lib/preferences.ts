import { useCallback, useSyncExternalStore } from 'react';
import { THEME_KEY } from './theme-script';

export type Theme = 'light' | 'dark';
export type BoardMode = 'free' | 'grid';

const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = () => listener();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function resolveTheme(): Theme {
  return read(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: Theme = resolveTheme()) {
  document.documentElement.dataset.theme = theme;
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, resolveTheme, () => 'light' as Theme);
  const set = useCallback((next: Theme) => {
    write(THEME_KEY, next);
    applyTheme(next);
  }, []);
  return [theme, set];
}

export function usePreference<T extends string>(key: string, fallback: T): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => (read(`noted.${key}`) as T | null) ?? fallback,
    () => fallback,
  );
  const set = useCallback((next: T) => write(`noted.${key}`, next), [key]);
  return [value, set];
}

export const useBoardMode = () => usePreference<BoardMode>('boardMode', 'free');
