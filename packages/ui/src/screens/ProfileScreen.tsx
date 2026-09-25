import { ApiError, NetworkError } from '@noted/core';
import { AVATAR_COLORS, type DeviceSession, type User } from '@noted/shared';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { Switch } from '../components/Switch';
import { SyncStatus } from '../components/SyncStatus';
import { ToastProvider, useToast } from '../components/Toast';
import { useClient, usePlatform } from '../lib/context';
import { EMAIL_PATTERN, formatMonthYear, formatRelative } from '../lib/format';
import { useOnline, usePendingCount, useSession } from '../lib/hooks';
import { useBoardMode, useTheme } from '../lib/preferences';
import styles from './ProfileScreen.module.css';

function errorMessage(error: unknown): string {
  if (error instanceof NetworkError) return 'You’re offline. Try again when you’re back online.';
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Please try again.';
}

const PLATFORM_LABELS = {
  web: 'Web browser',
  macos: 'Mac app',
  windows: 'Windows app',
  linux: 'Linux app',
} as const;
const PLATFORM_SHORT = { web: 'Web', macos: 'Mac', windows: 'Win', linux: 'Linux' } as const;
const PLATFORM_TINT = { web: '#C9F0FB', macos: '#EDE9A6', windows: '#D6EAC3', linux: '#DDD9F3' } as const;

export function ProfileScreen() {
  return (
    <ToastProvider>
      <Profile />
    </ToastProvider>
  );
}

function Profile() {
  const { navigate, kind, downloadsUrl } = usePlatform();
  const session = useSession();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.logo} onClick={() => navigate('app')}>
          Noted.
        </button>
        <span className={styles.flex} />
        <button type="button" className={styles.back} onClick={() => navigate('app')}>
          ← Back to notes
        </button>
      </header>
      <main className={styles.main}>
        {session === undefined ? null : session ? (
          <AccountProfile user={session.user} preferences={<Preferences />} />
        ) : (
          <section className={styles.guest}>
            <h1>You’re using Noted without an account</h1>
            <p>
              Everything you write is saved on this device. Create a free account to back it up to the cloud
              and sync across the web, macOS and Windows.
            </p>
            <div className={styles.row}>
              <button type="button" className={styles.primary} onClick={() => navigate('signup')}>
                Sign up free
              </button>
              <button type="button" className={styles.secondary} onClick={() => navigate('login')}>
                Log in
              </button>
            </div>
          </section>
        )}
        {!session && <Preferences />}
        {kind === 'web' && downloadsUrl && (
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h2>Desktop app</h2>
              <a href={downloadsUrl}>Get the desktop app</a>
            </div>
            <p className={styles.muted}>
              Install Noted on macOS or Windows. Your notes follow you once you log in.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function Preferences() {
  const [theme, setTheme] = useTheme();
  const [boardMode, setBoardMode] = useBoardMode();

  return (
    <section className={styles.card}>
      <h2>Preferences</h2>
      <div className={styles.setting}>
        <div className={styles.settingText}>
          <span>Dark mode</span>
          <span className={styles.muted}>Also toggles with D in the app.</span>
        </div>
        <Switch
          label="Dark mode"
          checked={theme === 'dark'}
          onChange={(on) => setTheme(on ? 'dark' : 'light')}
        />
      </div>
      <div className={styles.setting}>
        <div className={styles.settingText}>
          <span>Board layout</span>
          <span className={styles.muted}>How sticky notes are placed on the board.</span>
        </div>
        <div className={styles.segmented} role="radiogroup" aria-label="Board layout">
          {(['free', 'grid'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={boardMode === mode}
              onClick={() => setBoardMode(mode)}
            >
              {mode === 'free' ? 'Free' : 'Grid'}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function AccountProfile({ user, preferences }: { user: User; preferences: ReactNode }) {
  const client = useClient();
  const { navigate } = usePlatform();
  const toast = useToast();
  const online = useOnline();
  const pending = usePendingCount();

  const [draftName, setDraftName] = useState(user.name);
  const [draftEmail, setDraftEmail] = useState(user.email);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [devices, setDevices] = useState<DeviceSession[] | null>(null);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    try {
      setDevices(await client.api.sessions());
      setDevicesError(null);
    } catch (error) {
      setDevicesError(errorMessage(error));
    }
  }, [client]);

  useEffect(() => {
    if (online) {
      void loadDevices();
      void client.auth.refreshUser().catch(() => undefined);
    }
  }, [online, loadDevices, client]);

  useEffect(() => {
    setDraftName(user.name);
    setDraftEmail(user.email);
  }, [user.name, user.email]);

  const validEmail = EMAIL_PATTERN.test(draftEmail.trim());
  const dirty = draftName.trim() !== user.name || draftEmail.trim().toLowerCase() !== user.email;
  const canSave = dirty && validEmail && draftName.trim().length > 0 && !saving;

  async function saveAccount() {
    if (!canSave) return;
    setSaving(true);
    setAccountError(null);
    try {
      await client.auth.updateProfile({ name: draftName.trim(), email: draftEmail.trim() });
      toast('Saved');
    } catch (error) {
      setAccountError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function pickAvatar(avatar: (typeof AVATAR_COLORS)[number]) {
    try {
      await client.auth.updateProfile({ avatar });
    } catch (error) {
      toast(errorMessage(error));
    }
  }

  async function savePassword() {
    if (!currentPassword) return setPasswordError('Enter your current password.');
    if (newPassword.length < 8) return setPasswordError('New password needs at least 8 characters.');
    try {
      await client.auth.changePassword({ currentPassword, newPassword });
      setPasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      toast('Password updated. Other devices were signed out.');
      void loadDevices();
    } catch (error) {
      setPasswordError(errorMessage(error));
    }
  }

  async function revoke(device: DeviceSession) {
    try {
      await client.api.revokeSession(device.id);
      setDevices((list) => list?.filter((d) => d.id !== device.id) ?? null);
      toast(`Signed out of ${PLATFORM_LABELS[device.platform]}`);
    } catch (error) {
      toast(errorMessage(error));
    }
  }

  async function logout() {
    await client.auth.logout();
    navigate('login');
  }

  async function deleteAccount() {
    if (deleteText !== 'DELETE') return;
    try {
      await client.auth.deleteAccount();
      navigate('app');
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  }

  return (
    <>
      <section className={styles.identity}>
        <Avatar name={user.name} color={user.avatar} size={84} />
        <div className={styles.identityText}>
          <h1>{user.name}</h1>
          <span className={styles.muted}>
            {user.email} · Member since {formatMonthYear(user.createdAt)}
          </span>
        </div>
        <div className={styles.swatches} role="radiogroup" aria-label="Avatar colour">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={user.avatar === color}
              aria-label={`Avatar colour ${color}`}
              style={{ background: color }}
              onClick={() => void pickAvatar(color)}
            />
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <h2>Cloud sync</h2>
        <SyncStatus />
        <div className={styles.cardFoot}>
          <span className={styles.muted}>
            {pending
              ? `${pending} change${pending === 1 ? '' : 's'} waiting to upload.`
              : 'All changes are backed up.'}
          </span>
          <button
            type="button"
            className={styles.secondary}
            disabled={!online}
            onClick={() => void client.sync.syncNow()}
          >
            Sync now
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <h2>Account</h2>
        <div className={styles.fields}>
          <label className={styles.field}>
            <span>Name</span>
            <input value={draftName} onChange={(e) => setDraftName(e.target.value)} autoComplete="name" />
          </label>
          <label className={styles.field}>
            <span>Email</span>
            <input
              type="email"
              value={draftEmail}
              data-invalid={!validEmail && draftEmail.length > 0}
              onChange={(e) => setDraftEmail(e.target.value)}
              autoComplete="email"
            />
            {!validEmail && draftEmail.length > 0 && (
              <span className={styles.error}>Enter a valid email address.</span>
            )}
          </label>
        </div>
        {accountError && <span className={styles.error}>{accountError}</span>}
        <div className={styles.actions}>
          {dirty && (
            <button
              type="button"
              className={styles.ghost}
              onClick={() => {
                setDraftName(user.name);
                setDraftEmail(user.email);
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className={styles.primary}
            disabled={!canSave}
            onClick={() => void saveAccount()}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </section>

      {preferences}

      <section className={styles.card}>
        <h2>Devices</h2>
        {devicesError && <span className={styles.muted}>{devicesError}</span>}
        {devices?.map((device) => (
          <div key={device.id} className={styles.device}>
            <span className={styles.deviceIcon} style={{ background: PLATFORM_TINT[device.platform] }}>
              {PLATFORM_SHORT[device.platform]}
            </span>
            <div className={styles.deviceText}>
              <span>{PLATFORM_LABELS[device.platform]}</span>
              <span className={styles.muted}>
                {device.current ? 'Active now' : `Last active ${formatRelative(device.lastSeenAt)}`}
              </span>
            </div>
            {device.current ? (
              <span className={styles.badge}>This device</span>
            ) : (
              <button type="button" className={styles.outline} onClick={() => void revoke(device)}>
                Sign out
              </button>
            )}
          </div>
        ))}
      </section>

      <section className={styles.card}>
        <h2>Password</h2>
        {passwordOpen ? (
          <>
            <div className={styles.fields}>
              <input
                type="password"
                className={styles.bare}
                placeholder="Current password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordError(null);
                }}
              />
              <input
                type="password"
                className={styles.bare}
                placeholder="New password (8+ characters)"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError(null);
                }}
              />
            </div>
            <div className={styles.actions}>
              {passwordError && <span className={styles.errorFlex}>{passwordError}</span>}
              <button type="button" className={styles.ghost} onClick={() => setPasswordOpen(false)}>
                Cancel
              </button>
              <button type="button" className={styles.primary} onClick={() => void savePassword()}>
                Update password
              </button>
            </div>
          </>
        ) : (
          <div className={styles.cardFoot}>
            <span className={styles.muted}>Last changed {formatRelative(user.passwordChangedAt)}.</span>
            <button type="button" className={styles.outline} onClick={() => setPasswordOpen(true)}>
              Change password
            </button>
          </div>
        )}
      </section>

      <section className={styles.dangerRow}>
        <button
          type="button"
          className={styles.surfaceButton}
          onClick={() => (pending > 0 ? setConfirmLogout(true) : void logout())}
        >
          Log out
        </button>
        <button type="button" className={styles.dangerButton} onClick={() => setConfirmDelete(true)}>
          Delete account
        </button>
      </section>

      {confirmLogout && (
        <Modal label="Log out" onClose={() => setConfirmLogout(false)} className={styles.dialog}>
          <h3>Log out with unsynced changes?</h3>
          <p className={styles.muted}>
            {pending} change{pending === 1 ? ' hasn’t' : 's haven’t'} reached the cloud yet. Logging out
            removes your notes from this device, so those changes will be lost.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={() => setConfirmLogout(false)}>
              Cancel
            </button>
            <button type="button" className={styles.danger} onClick={() => void logout()}>
              Log out anyway
            </button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal label="Delete account" onClose={() => setConfirmDelete(false)} className={styles.dialog}>
          <h3>Delete your account?</h3>
          <p className={styles.muted}>
            This removes your notes and tasks from every device. It can’t be undone.
          </p>
          <input
            className={styles.bare}
            value={deleteText}
            placeholder="Type DELETE to confirm"
            onChange={(e) => setDeleteText(e.target.value)}
          />
          {deleteError && <span className={styles.error}>{deleteError}</span>}
          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.danger}
              disabled={deleteText !== 'DELETE'}
              onClick={() => void deleteAccount()}
            >
              Delete account
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
