'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

type SocialProvider = 'google' | 'apple' | 'facebook';

type LoginScreenProps = {
  onLoginEmail: (email: string) => void | Promise<void>;
  onLoginSocial: (provider: SocialProvider) => void | Promise<void>;
  onLoginGuest: () => void | Promise<void>;
  /** When true, buttons use Supabase (magic link / OAuth). */
  cloudEnabled?: boolean;
  emailHint?: string | null;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z" fill="#1877F2" />
    </svg>
  );
}

export function LoginScreen({
  onLoginEmail,
  onLoginSocial,
  onLoginGuest,
  cloudEnabled = false,
  emailHint = null,
}: LoginScreenProps) {
  const [showEmail, setShowEmail] = useState(cloudEnabled);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const badge = cloudEnabled ? 'Invite beta · cloud sync' : 'Invite beta · demo auth';
  const socialSuffix = cloudEnabled ? '' : ' (demo)';
  const emailLabel = cloudEnabled ? 'Send magic link' : 'Continue with email (demo)';
  const emailHelper = cloudEnabled
    ? 'Use a real inbox (Gmail, etc.). Check spam for the magic link.'
    : 'No password — creates a local demo profile only.';
  const disclaimer = cloudEnabled
    ? 'Sign in with Google or email magic link to sync history to the cloud. Guest stays on this device only.'
    : 'Demo auth only — Google / Apple / Facebook / email create a local profile on this device. Nothing syncs to a real account yet. Clearing site data deletes progress.';

  const submitEmail = async () => {
    if (!isValidEmail(email)) {
      setError('Enter a valid email');
      return;
    }
    setError(null);
    setBusy('email');
    try {
      await onLoginEmail(email.trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      const lower = message.toLowerCase();
      if (lower.includes('unsupported provider') || lower.includes('validation')) {
        setError(
          cloudEnabled
            ? 'Email provider is off in Supabase. Open Authentication → Providers → Email → Enable.'
            : message,
        );
      } else {
        setError(message);
      }
    } finally {
      setBusy(null);
    }
  };

  const submitSocial = async (provider: SocialProvider) => {
    setBusy(provider);
    setError(null);
    try {
      await onLoginSocial(provider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      const lower = message.toLowerCase();
      if (lower.includes('unsupported provider') || lower.includes('validation')) {
        setError(
          `Enable ${provider} in Supabase: Authentication → Providers → ${provider}. For now use email magic link.`,
        );
      } else {
        setError(message);
      }
    } finally {
      setBusy(null);
    }
  };

  const submitGuest = async () => {
    setBusy('guest');
    try {
      await onLoginGuest();
    } finally {
      setBusy(null);
    }
  };

  const disabled = busy !== null;

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--page-wash)' }}
        aria-hidden
      />
      <div
        className="ambient-blob -right-16 top-20 h-52 w-52 bg-[var(--accent)]/18"
        aria-hidden
      />
      <div
        className="ambient-blob -left-20 bottom-32 h-44 w-44 bg-[var(--blob)]/25"
        style={{ animationDelay: '-8s' }}
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col justify-between px-6 pb-10 safe-top fade-in">
        <div className="flex flex-1 flex-col items-center justify-center pb-8 pt-12 text-center">
          <div className="mb-4 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">
            {badge}
          </div>
          <div className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-gradient-to-br from-[var(--panel-ink)] to-[var(--panel-ink-end)] shadow-[var(--shadow-lg)]">
            <span className="text-[28px] font-semibold tracking-[var(--tracking-tight)] text-white">
              R
            </span>
          </div>
          <h1 className="mt-6 text-[48px] font-semibold leading-none tracking-[var(--tracking-tight)] text-[var(--black)]">
            REPLY
          </h1>
          <p className="mt-3 max-w-[280px] text-[16px] leading-relaxed text-[var(--muted)]">
            Discover your session. Start in seconds.
          </p>
          <p className="mt-3 max-w-[300px] text-[12px] leading-relaxed text-[var(--muted-light)]">
            {disclaimer}
          </p>
        </div>

        <div className="space-y-3">
          {error && !showEmail ? (
            <p className="rounded-[var(--radius-lg)] bg-[var(--accent-mist)] px-3 py-2 text-[13px] font-medium text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          {cloudEnabled ? (
            <div className="space-y-3 fade-in">
              <button
                type="button"
                disabled={disabled}
                onClick={() => void submitSocial('google')}
                className="flex h-[var(--control-h)] w-full items-center justify-center gap-3 rounded-[var(--radius-xl)] bg-[var(--white)] text-[16px] font-medium text-[var(--black)] shadow-[var(--shadow-md)] transition-all active:scale-[0.98] disabled:opacity-40"
              >
                <GoogleIcon />
                {busy === 'google' ? 'Starting…' : 'Continue with Google'}
              </button>

              <div className="flex items-center gap-4 py-1">
                <div className="h-px flex-1 bg-[var(--border)]" />
                <span className="text-[12px] font-medium text-[var(--muted-light)]">or email</span>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>

              <input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@gmail.com"
                value={email}
                disabled={disabled}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void submitEmail();
                }}
                className={cn(
                  'h-[var(--control-h)] w-full rounded-[var(--radius-xl)] border bg-[var(--white)] px-4 text-[16px] text-[var(--black)] outline-none transition-shadow placeholder:text-[var(--muted-light)]',
                  error
                    ? 'border-[var(--danger)] shadow-[0_0_0_3px_rgba(248,113,113,0.15)]'
                    : 'border-[var(--border)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]',
                )}
              />
              {error ? (
                <p className="text-[13px] font-medium text-[var(--danger)]">{error}</p>
              ) : emailHint ? (
                <p className="text-[12px] font-medium text-[var(--accent)]">{emailHint}</p>
              ) : (
                <p className="text-[12px] text-[var(--muted-light)]">{emailHelper}</p>
              )}
              <Button fullWidth size="lg" disabled={disabled} onClick={() => void submitEmail()}>
                {busy === 'email' ? 'Sending…' : emailLabel}
              </Button>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={disabled}
                onClick={() => void submitSocial('google')}
                className="flex h-[var(--control-h)] w-full items-center justify-center gap-3 rounded-[var(--radius-xl)] bg-[var(--white)] text-[16px] font-medium text-[var(--black)] shadow-[var(--shadow-md)] transition-all active:scale-[0.98] disabled:opacity-40"
              >
                <GoogleIcon />
                {busy === 'google' ? 'Starting…' : `Continue with Google${socialSuffix}`}
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => void submitSocial('apple')}
                className="flex h-[var(--control-h)] w-full items-center justify-center gap-3 rounded-[var(--radius-xl)] bg-[var(--black)] text-[16px] font-medium text-white shadow-[var(--shadow-md)] transition-all active:scale-[0.98] disabled:opacity-40"
              >
                <AppleIcon />
                {busy === 'apple' ? 'Starting…' : `Continue with Apple${socialSuffix}`}
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => void submitSocial('facebook')}
                className="flex h-[var(--control-h)] w-full items-center justify-center gap-3 rounded-[var(--radius-xl)] bg-[#1877F2] text-[16px] font-medium text-white shadow-[var(--shadow-md)] transition-all active:scale-[0.98] disabled:opacity-40"
              >
                <FacebookIcon />
                {busy === 'facebook' ? 'Starting…' : `Continue with Facebook${socialSuffix}`}
              </button>

              <div className="flex items-center gap-4 py-1">
                <div className="h-px flex-1 bg-[var(--border)]" />
                <span className="text-[12px] font-medium text-[var(--muted-light)]">or</span>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>

              {showEmail ? (
                <div className="space-y-3 fade-in">
                  <input
                    id="login-email-demo"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@email.com"
                    value={email}
                    disabled={disabled}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void submitEmail();
                    }}
                    className={cn(
                      'h-[var(--control-h)] w-full rounded-[var(--radius-xl)] border bg-[var(--white)] px-4 text-[16px] text-[var(--black)] outline-none transition-shadow placeholder:text-[var(--muted-light)]',
                      error
                        ? 'border-[var(--danger)] shadow-[0_0_0_3px_rgba(248,113,113,0.15)]'
                        : 'border-[var(--border)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]',
                    )}
                  />
                  {error ? (
                    <p className="text-[13px] font-medium text-[var(--danger)]">{error}</p>
                  ) : (
                    <p className="text-[12px] text-[var(--muted-light)]">{emailHelper}</p>
                  )}
                  <Button fullWidth size="lg" disabled={disabled} onClick={() => void submitEmail()}>
                    {busy === 'email' ? 'Signing in…' : emailLabel}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  fullWidth
                  size="lg"
                  disabled={disabled}
                  onClick={() => setShowEmail(true)}
                >
                  {emailLabel}
                </Button>
              )}
            </>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => void submitGuest()}
            className="w-full py-2 text-center text-[14px] font-medium text-[var(--muted)] transition-colors active:text-[var(--black)] disabled:opacity-40"
          >
            {busy === 'guest' ? 'Starting…' : 'Skip for now (guest)'}
          </button>

          <p className="px-2 text-center text-[11px] leading-relaxed text-[var(--muted-light)]">
            By continuing you agree to our{' '}
            <Link href="/legal/terms" className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline">
              Terms
            </Link>
            ,{' '}
            <Link href="/legal/privacy" className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
            , and{' '}
            <Link href="/legal/disclaimer" className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline">
              Health disclaimer
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
