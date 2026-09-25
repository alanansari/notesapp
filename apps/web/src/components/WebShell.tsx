'use client';

import { NotedProvider, type PlatformInfo, type Route } from '@noted/ui';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';
import { getWebClient } from './web-client';

const PATHS: Record<Route, string> = {
  home: '/',
  app: '/app',
  login: '/login',
  signup: '/signup',
  profile: '/profile',
};

export default function WebShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const platform = useMemo<PlatformInfo>(
    () => ({ kind: 'web', navigate: (route) => router.push(PATHS[route]), downloadsUrl: '/#everywhere' }),
    [router],
  );

  return (
    <NotedProvider client={getWebClient()} platform={platform}>
      {children}
    </NotedProvider>
  );
}
