import { usePlatform } from '../lib/context';
import { useSession } from '../lib/hooks';
import { usePreference } from '../lib/preferences';
import styles from './CloudPrompt.module.css';

const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export function CloudPrompt({ noteCount }: { noteCount: number }) {
  const { navigate } = usePlatform();
  const session = useSession();
  const [snoozedAt, setSnoozedAt] = usePreference<string>('cloudPromptSnoozedAt', '0');

  if (session !== null || noteCount === 0 || Date.now() - Number(snoozedAt) < SNOOZE_MS) return null;

  return (
    <aside className={styles.banner} aria-label="Back up your notes">
      <span className={styles.icon} aria-hidden>
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A6 6 0 0 0 4.5 12.5 3.5 3.5 0 0 0 6 19h11.5Z" />
          <path d="M12 16v-5m0 0-2 2m2-2 2 2" />
        </svg>
      </span>
      <div className={styles.copy}>
        <strong>Your notes only live on this device.</strong>
        <span>
          Create a free account to back them up and pick up where you left off on the web, macOS and Windows.
        </span>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => navigate('signup')}>
          Sign up free
        </button>
        <button type="button" className={styles.secondary} onClick={() => navigate('login')}>
          Log in
        </button>
        <button
          type="button"
          className={styles.close}
          aria-label="Remind me later"
          title="Remind me later"
          onClick={() => setSnoozedAt(String(Date.now()))}
        >
          ×
        </button>
      </div>
    </aside>
  );
}
