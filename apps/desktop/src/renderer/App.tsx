import { createNotedClient } from '@noted/core';
import { AuthScreen, NotedApp, NotedProvider, type PlatformInfo, ProfileScreen, type Route } from '@noted/ui';
import { useMemo, useState } from 'react';

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL ?? 'http://localhost:3000';

const client = createNotedClient({
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  platform: window.noted.platform,
});

export function App() {
  const [route, setRoute] = useState<Exclude<Route, 'home'>>('app');

  const platform = useMemo<PlatformInfo>(
    () => ({
      kind: 'desktop',
      navigate: (next) => {
        if (next === 'home') void window.noted.openExternal(WEBSITE_URL);
        else setRoute(next);
      },
    }),
    [],
  );

  return (
    <NotedProvider client={client} platform={platform}>
      {window.noted.platform === 'macos' && <div className="noted-drag-strip" />}
      {route === 'app' && <NotedApp />}
      {route === 'login' && <AuthScreen mode="login" />}
      {route === 'signup' && <AuthScreen mode="signup" />}
      {route === 'profile' && <ProfileScreen />}
    </NotedProvider>
  );
}
