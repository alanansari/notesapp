import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './offline.module.css';

export const metadata: Metadata = { title: 'Offline' };

export default function OfflinePage() {
  return (
    <main className={styles.page}>
      <div className={styles.logo}>Noted.</div>
      <h1>You’re offline</h1>
      <p>This page isn’t saved on your device yet. Your notes and tasks are, so you can keep working.</p>
      <Link href="/app" className={styles.button}>
        Open my notes
      </Link>
    </main>
  );
}
