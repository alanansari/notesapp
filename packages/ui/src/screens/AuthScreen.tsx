import { ApiError, NetworkError } from '@noted/core';
import type { PendingSignup } from '@noted/shared';
import { type FormEvent, useEffect, useState } from 'react';
import { useClient, usePlatform } from '../lib/context';
import { cx, EMAIL_PATTERN } from '../lib/format';
import { useOnline, usePendingCount, useSession } from '../lib/hooks';
import styles from './AuthScreen.module.css';

type Mode = 'login' | 'signup';

interface Errors {
  name?: string;
  email?: string;
  password?: string;
}

const COPY: Record<Mode, [title: string, subtitle: string, submit: string]> = {
  login: ['Welcome back', 'Log in to back up your notes and pick up where you left off.', 'Log in'],
  signup: ['Create your account', 'Free to start. Your notes sync across web and desktop.', 'Create account'],
};

const STRENGTH_COLORS = ['#E57373', '#F2C94C', '#56B8EA', '#3FAE74'];
const STRENGTH_LABELS = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'];

function describeError(error: unknown): string {
  if (error instanceof NetworkError)
    return 'You’re offline. Noted keeps working, so log in once you’re back online.';
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Please try again.';
}

function strength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 14) score++;
  return score;
}

export function AuthScreen({ mode }: { mode: Mode }) {
  const client = useClient();
  const { navigate, kind } = usePlatform();
  const session = useSession();
  const online = useOnline();
  const localCount = usePendingCount();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingSignup | null>(null);

  useEffect(() => {
    if (session) navigate('app');
  }, [session, navigate]);

  const [shownMode, setShownMode] = useState(mode);
  if (mode !== shownMode) {
    setShownMode(mode);
    setErrors({});
    setFormError(null);
    setPassword('');
    setPending(null);
  }

  function validate(): Errors {
    const next: Errors = {};
    if (mode === 'signup' && !name.trim()) next.name = 'Enter your name.';
    if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    else if (mode === 'signup' && password.length < 8) next.password = 'Use at least 8 characters.';
    return next;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length || loading) return;
    setLoading(true);
    try {
      if (mode === 'signup') {
        setPending(await client.auth.signup({ name: name.trim(), email: email.trim(), password }));
        setLoading(false);
      } else {
        await client.auth.login({ email: email.trim(), password });
        navigate('app');
      }
    } catch (error) {
      setFormError(describeError(error));
      setLoading(false);
    }
  }

  const [title, subtitle, submitLabel] = COPY[mode];
  const score = strength(password);
  const border = (error?: string) => cx(styles.input, error && styles.invalid);

  return (
    <div className={styles.page}>
      <div className={styles.formSide}>
        <button
          type="button"
          className={styles.logo}
          onClick={() => navigate(kind === 'web' ? 'home' : 'app')}
        >
          Noted.
        </button>
        <div className={styles.center}>
          {mode === 'signup' && pending ? (
            <VerifyEmailForm
              pending={pending}
              online={online}
              onResent={setPending}
              onBack={() => {
                setPending(null);
                setFormError(null);
              }}
            />
          ) : (
            <form className={styles.form} noValidate onSubmit={submit}>
              <div className={styles.heading}>
                <h1>{title}</h1>
                <p>{subtitle}</p>
              </div>

              <div className={styles.tabs} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => navigate('login')}
                >
                  Log in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  onClick={() => navigate('signup')}
                >
                  Sign up
                </button>
              </div>

              {!online && (
                <div className={styles.notice}>
                  You’re offline. You can keep using Noted and log in when you reconnect.
                </div>
              )}

              {mode === 'signup' && (
                <label className={styles.field}>
                  <span>Name</span>
                  <input
                    className={border(errors.name)}
                    value={name}
                    autoComplete="name"
                    placeholder="Alex Morgan"
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrors((x) => ({ ...x, name: undefined }));
                    }}
                  />
                  {errors.name && <span className={styles.error}>{errors.name}</span>}
                </label>
              )}

              <label className={styles.field}>
                <span>Email</span>
                <input
                  type="email"
                  className={border(errors.email)}
                  value={email}
                  autoComplete="email"
                  placeholder="you@example.com"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((x) => ({ ...x, email: undefined }));
                  }}
                />
                {errors.email && <span className={styles.error}>{errors.email}</span>}
              </label>

              <label className={styles.field}>
                <span>Password</span>
                <span className={styles.passwordWrap}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={cx(border(errors.password), styles.passwordInput)}
                    value={password}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((x) => ({ ...x, password: undefined }));
                    }}
                  />
                  <button type="button" className={styles.reveal} onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </span>
                {mode === 'signup' && password.length > 0 && (
                  <span className={styles.strength}>
                    <span className={styles.bars}>
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          style={{
                            background: i < score ? STRENGTH_COLORS[Math.max(0, score - 1)] : undefined,
                          }}
                        />
                      ))}
                    </span>
                    <span className={styles.strengthLabel}>{STRENGTH_LABELS[score]}</span>
                  </span>
                )}
                {errors.password && <span className={styles.error}>{errors.password}</span>}
              </label>

              {formError && <div className={styles.formError}>{formError}</div>}

              <button type="submit" className={styles.submit} disabled={loading || !online}>
                {loading ? 'Just a moment…' : submitLabel}
              </button>

              {localCount > 0 && (
                <p className={styles.small}>
                  {localCount} item{localCount === 1 ? '' : 's'} saved on this device will be added to your
                  account.
                </p>
              )}
              <button type="button" className={styles.back} onClick={() => navigate('app')}>
                Continue without an account →
              </button>
            </form>
          )}
        </div>
      </div>

      <div className={styles.art} aria-hidden>
        <div className={styles.dots} />
        <div className={cx(styles.sticky, styles.s1)}>
          <div className={styles.stickyTitle}>Today</div>
          <div>☑ Write the first note</div>
          <div>☐ Sign up for Noted</div>
          <div>☐ Plan the week</div>
        </div>
        <div className={cx(styles.sticky, styles.s2)}>Works offline, so the train tunnel can’t stop you.</div>
        <div className={cx(styles.sticky, styles.s3)}>
          Press <b>N</b> for a new note.
        </div>
        <div className={styles.tagline}>
          <span>Notes and tasks in one calm place, on the web and desktop.</span>
          <span>One account for the web, macOS and Windows.</span>
        </div>
      </div>
    </div>
  );
}

function VerifyEmailForm({
  pending,
  online,
  onResent,
  onBack,
}: {
  pending: PendingSignup;
  online: boolean;
  onResent: (pending: PendingSignup) => void;
  onBack: () => void;
}) {
  const client = useClient();
  const { navigate } = usePlatform();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const wait = Math.max(0, Math.ceil((pending.resendAfter - now) / 1000));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await client.auth.verifySignup({ email: pending.email, code });
      navigate('app');
    } catch (err) {
      setError(describeError(err));
      setLoading(false);
    }
  }

  async function resend() {
    if (resending || wait > 0) return;
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      onResent(await client.auth.resendSignupCode(pending.email));
      setCode('');
      setNotice(`We sent a new code to ${pending.email}.`);
    } catch (err) {
      setError(describeError(err));
    }
    setResending(false);
  }

  return (
    <form className={styles.form} noValidate onSubmit={submit}>
      <div className={styles.heading}>
        <h1>Check your email</h1>
        <p>
          We sent a 6-digit code to <strong className={styles.ink}>{pending.email}</strong>. Enter it below to
          finish creating your account.
        </p>
      </div>

      <label className={styles.field}>
        <span>Verification code</span>
        <input
          className={cx(styles.input, styles.code, error && styles.invalid)}
          value={code}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          autoFocus
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
            setError(null);
          }}
        />
      </label>

      {notice && <div className={styles.success}>{notice}</div>}
      {error && <div className={styles.formError}>{error}</div>}

      <button type="submit" className={styles.submit} disabled={loading || !online}>
        {loading ? 'Just a moment…' : 'Verify email'}
      </button>

      <p className={styles.small}>
        Didn’t get it? Check your spam folder, or{' '}
        <button
          type="button"
          className={styles.inlineLink}
          disabled={wait > 0 || resending || !online}
          onClick={resend}
        >
          {resending ? 'sending…' : wait > 0 ? `resend in ${wait}s` : 'send a new code'}
        </button>
        .
      </p>
      <button type="button" className={styles.back} onClick={onBack}>
        ← Use a different email
      </button>
    </form>
  );
}
