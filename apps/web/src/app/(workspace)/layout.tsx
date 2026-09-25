import type { ReactNode } from 'react';
import ClientOnlyShell from '@/components/ClientOnlyShell';

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <ClientOnlyShell>{children}</ClientOnlyShell>;
}
