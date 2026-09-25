import { Avatar } from '../../components/Avatar';
import { SwitchTrack } from '../../components/Switch';
import { SyncStatus } from '../../components/SyncStatus';
import { usePlatform } from '../../lib/context';
import { useSession } from '../../lib/hooks';
import { useTheme } from '../../lib/preferences';
import styles from './Sidebar.module.css';
import { type Counts, VIEWS, type View } from './views';

interface NavProps {
  view: View;
  counts: Counts;
  onSelect: (view: View) => void;
}

function NavItem({ id, view, counts, onSelect, small }: NavProps & { id: View; small?: boolean }) {
  return (
    <button
      type="button"
      className={styles.navItem}
      data-small={small}
      aria-current={view === id ? 'page' : undefined}
      onClick={() => onSelect(id)}
    >
      <span>{VIEWS[id].title}</span>
      <span className={styles.count}>{counts[id] || ''}</span>
    </button>
  );
}

export function Sidebar({ onShortcuts, ...nav }: NavProps & { onShortcuts: () => void }) {
  const [theme, setTheme] = useTheme();
  const session = useSession();
  const { navigate } = usePlatform();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>Noted.</div>
      <nav className={styles.nav} aria-label="Views">
        <NavItem id="notes" {...nav} />
        <NavItem id="tasks" {...nav} />
        <div className={styles.divider} />
        <NavItem id="archive" small {...nav} />
        <NavItem id="trash" small {...nav} />
      </nav>
      <div className={styles.spacer} />
      <SyncStatus />
      <div className={styles.footer}>
        <button
          type="button"
          role="switch"
          aria-checked={theme === 'dark'}
          className={styles.row}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <span>Dark mode</span>
          <SwitchTrack size="sm" on={theme === 'dark'} />
        </button>
        <button type="button" className={styles.row} onClick={onShortcuts}>
          <span>Shortcuts</span>
          <kbd className={styles.kbd}>?</kbd>
        </button>
        <button
          type="button"
          className={styles.profile}
          onClick={() => navigate(session ? 'profile' : 'login')}
        >
          {session ? (
            <>
              <Avatar name={session.user.name} color={session.user.avatar} />
              <span className={styles.name}>{session.user.name}</span>
            </>
          ) : (
            <>
              <span className={styles.guestAvatar} aria-hidden>
                ?
              </span>
              <span className={styles.name}>Log in or sign up</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export function MobileNav({ view, counts, onSelect }: NavProps) {
  return (
    <nav className={styles.mobileNav} aria-label="Views">
      {(['notes', 'tasks', 'archive', 'trash'] as const).map((id) => (
        <button
          key={id}
          type="button"
          className={styles.mobileItem}
          aria-current={view === id ? 'page' : undefined}
          onClick={() => onSelect(id)}
        >
          <span>{VIEWS[id].short}</span>
          <span className={styles.count}>{counts[id] || ''}</span>
        </button>
      ))}
    </nav>
  );
}
