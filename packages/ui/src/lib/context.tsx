import type { NotedClient } from '@noted/core';
import { createContext, type ReactNode, use, useEffect } from 'react';

export type Route = 'home' | 'app' | 'login' | 'signup' | 'profile';

export interface PlatformInfo {
  kind: 'web' | 'desktop';
  navigate: (route: Route) => void;
  downloadsUrl?: string;
}

interface NotedContextValue {
  client: NotedClient;
  platform: PlatformInfo;
}

const NotedContext = createContext<NotedContextValue | null>(null);

export function NotedProvider({ client, platform, children }: NotedContextValue & { children: ReactNode }) {
  useEffect(() => {
    void client.start();
    return () => client.stop();
  }, [client]);

  return <NotedContext value={{ client, platform }}>{children}</NotedContext>;
}

function useNotedContext(): NotedContextValue {
  const value = use(NotedContext);
  if (!value) throw new Error('NotedProvider is missing');
  return value;
}

export const useClient = () => useNotedContext().client;
export const usePlatform = () => useNotedContext().platform;
