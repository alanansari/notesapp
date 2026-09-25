'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getWebClient } from '@/components/web-client';
import styles from './landing.module.css';

export function HeaderActions() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    getWebClient()
      .auth.getSession()
      .then((session) => setSignedIn(Boolean(session)))
      .catch(() => undefined);
  }, []);

  if (signedIn) {
    return (
      <div className={styles.headerActions}>
        <Link href="/app" className={styles.signup}>
          Open Noted
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.headerActions}>
      <Link href="/login" className={styles.login}>
        Log in
      </Link>
      <Link href="/signup" className={styles.signup}>
        Sign up
      </Link>
    </div>
  );
}
