import { useClient, usePlatform } from '../lib/context';
import { formatRelative } from '../lib/format';
import { useLastSyncedAt, useNow, useOnline, usePendingCount, useSession, useSyncState } from '../lib/hooks';
import styles from './SyncStatus.module.css';

type Tone = 'local' | 'ok' | 'busy' | 'warn' | 'error';

interface Status {
  tone: Tone;
  title: string;
  short: string;
  detail: string;
  action?: { label: string; run: () => void };
}

function useStatus(): Status | null {
  const client = useClient();
  const { navigate } = usePlatform();
  const session = useSession();
  const sync = useSyncState();
  const pending = usePendingCount();
  const lastSyncedAt = useLastSyncedAt();
  const online = useOnline();
  const now = useNow();

  if (session === undefined) return null;
  if (!session) {
    return {
      tone: 'local',
      title: 'Saved on this device',
      short: 'Local only',
      detail: 'Sign up to back up to the cloud and sync across devices.',
      action: { label: 'Back up', run: () => navigate('signup') },
    };
  }
  if (!online || sync.status === 'offline') {
    return {
      tone: 'warn',
      title: 'Offline',
      short: 'Offline',
      detail: pending
        ? `${pending} change${pending === 1 ? '' : 's'} will sync when you reconnect.`
        : 'Everything is saved on this device.',
    };
  }
  if (sync.status === 'error') {
    return {
      tone: 'error',
      title: 'Sync paused',
      short: 'Sync paused',
      detail: sync.error ?? 'Something went wrong while syncing.',
      action: { label: 'Retry', run: () => void client.sync.syncNow() },
    };
  }
  if (sync.status === 'syncing' || pending > 0) {
    return { tone: 'busy', title: 'Syncing…', short: 'Syncing', detail: 'Saving your changes to the cloud.' };
  }
  return {
    tone: 'ok',
    title: lastSyncedAt ? `Synced ${formatRelative(lastSyncedAt, now)}` : 'Synced',
    short: 'Synced',
    detail: `Backed up to ${session.user.email}.`,
  };
}

export function SyncStatus({ variant = 'panel' }: { variant?: 'panel' | 'pill' }) {
  const status = useStatus();
  if (!status) return null;

  if (variant === 'pill') {
    return (
      <button
        type="button"
        className={styles.pill}
        data-tone={status.tone}
        title={`${status.title}. ${status.detail}`}
        onClick={status.action?.run}
      >
        <span className={styles.dot} aria-hidden />
        {status.short}
      </button>
    );
  }

  return (
    <div className={styles.panel} data-tone={status.tone} role="status">
      <span className={styles.dot} aria-hidden />
      <div className={styles.text}>
        <span className={styles.title}>{status.title}</span>
        <span className={styles.detail}>{status.detail}</span>
      </div>
      {status.action && (
        <button type="button" className={styles.action} onClick={status.action.run}>
          {status.action.label}
        </button>
      )}
    </div>
  );
}
