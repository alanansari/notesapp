'use client';

import { useEffect, useState } from 'react';
import styles from './ServiceWorkerRegistrar.module.css';

const enabled = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_SW_IN_DEV === 'true';
const UPDATE_CHECK_MS = 60 * 60 * 1000;

export function ServiceWorkerRegistrar() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!enabled || !('serviceWorker' in navigator)) return;
    const sw = navigator.serviceWorker;
    const hadController = Boolean(sw.controller);
    let reloading = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const onControllerChange = () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    };
    sw.addEventListener('controllerchange', onControllerChange);

    sw.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        if (registration.waiting && sw.controller) setWaiting(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && sw.controller) setWaiting(worker);
          });
        });
        timer = setInterval(() => void registration.update(), UPDATE_CHECK_MS);
      })
      .catch((error) => console.error('Service worker registration failed', error));

    return () => {
      clearInterval(timer);
      sw.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  if (!waiting) return null;

  return (
    <div className={styles.banner} role="status">
      <span>A new version of Noted is ready.</span>
      <button type="button" onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}>
        Reload
      </button>
    </div>
  );
}
