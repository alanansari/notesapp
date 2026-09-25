'use client';

import dynamic from 'next/dynamic';

const ClientOnlyShell = dynamic(() => import('./WebShell'), {
  ssr: false,
  loading: () => <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />,
});

export default ClientOnlyShell;
