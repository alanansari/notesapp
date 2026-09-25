'use client';

import Link from 'next/link';
import { createContext, type ReactNode, use, useEffect, useRef, useState } from 'react';
import styles from './landing.module.css';

type OS = 'mac' | 'windows';

const OS_NAME: Record<OS, string> = { mac: 'macOS', windows: 'Windows' };
const DOWNLOAD_URL: Record<OS, string> = {
  mac: process.env.NEXT_PUBLIC_DOWNLOAD_URL_MAC ?? 'https://github.com/alanansari/notesapp/releases/latest',
  windows:
    process.env.NEXT_PUBLIC_DOWNLOAD_URL_WINDOWS ?? 'https://github.com/alanansari/notesapp/releases/latest',
};

interface DownloadContextValue {
  os: OS;
  download: (os: OS) => void;
}

const DownloadContext = createContext<DownloadContextValue>({ os: 'mac', download: () => {} });

function detectOS(): OS {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent;
  return /win/i.test(platform) ? 'windows' : 'mac';
}

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [os, setOS] = useState<OS>('mac');
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setOS(detectOS());
    return () => clearTimeout(timer.current);
  }, []);

  function download(target: OS) {
    clearTimeout(timer.current);
    setToast(`Downloading Noted for ${OS_NAME[target]}…`);
    timer.current = setTimeout(() => setToast(null), 3000);
    window.location.href = DOWNLOAD_URL[target];
  }

  return (
    <DownloadContext value={{ os, download }}>
      {children}
      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}
    </DownloadContext>
  );
}

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
    <path
      d="M9 2v10m0 0l-4-4m4 4l4-4M3 15h12"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function DownloadCta({ variant }: { variant: 'hero' | 'final' }) {
  const { os, download } = use(DownloadContext);
  const other: OS = os === 'mac' ? 'windows' : 'mac';

  return (
    <div className={styles.ctaStack}>
      <button
        type="button"
        className={variant === 'hero' ? styles.ctaPrimary : styles.ctaDark}
        onClick={() => download(os)}
      >
        <DownloadIcon />
        <span>Download for {OS_NAME[os]}</span>
      </button>
      <span className={variant === 'hero' ? styles.ctaNote : styles.ctaNoteDark}>
        or{' '}
        <button type="button" className={styles.inlineLink} onClick={() => download(other)}>
          download for {OS_NAME[other]}
        </button>
        {variant === 'final' && (
          <>
            {' · '}
            <Link href="/app" className={styles.inlineLink}>
              use it on the web
            </Link>
          </>
        )}
      </span>
    </div>
  );
}

const PLATFORMS = [
  { id: 'web', name: 'Web', meta: 'Chrome, Safari, Firefox and Edge. Nothing to install.' },
  { id: 'mac', name: 'macOS', meta: 'macOS 12 or later. Apple silicon and Intel.' },
  { id: 'windows', name: 'Windows', meta: 'Windows 10 and 11, 64-bit.' },
] as const;

export function PlatformCards() {
  const { os, download } = use(DownloadContext);

  return (
    <div className={styles.platforms}>
      {PLATFORMS.map((p) => {
        const detected = p.id === os;
        return (
          <div key={p.id} className={styles.platform} data-detected={detected}>
            <div className={styles.platformHead}>
              <span className={styles.platformName}>{p.name}</span>
              {detected && <span className={styles.badge}>Your system</span>}
            </div>
            <span className={styles.platformMeta}>{p.meta}</span>
            {p.id === 'web' ? (
              <Link href="/app" className={styles.platformButton} data-detected={detected}>
                Open in browser
              </Link>
            ) : (
              <button
                type="button"
                className={styles.platformButton}
                data-detected={detected}
                onClick={() => download(p.id)}
              >
                Download for {p.name}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
