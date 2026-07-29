'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui';

type LoginScreenProps = {
  onLoginGoogle: () => void | Promise<void>;
  onLoginGuest: () => void | Promise<void>;
  cloudEnabled?: boolean;
};

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

export function LoginScreen({
  onLoginGoogle,
  onLoginGuest,
  cloudEnabled = false,
}: LoginScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const badge = cloudEnabled ? 'Invite beta · free signup' : 'Invite beta · demo auth';
  const disclaimer = cloudEnabled
    ? 'Continue with Google. If this Google account already exists, you will sign in. If not, we will create your account (sign up). Guest stays on this device only.'
    : 'Demo auth only — Google creates a local demo profile on this device. Nothing syncs to a real account yet. Clearing site data deletes progress.';

  const submitGoogle = async () => {
    setBusy('google');
    setError(null);
    try {
      await onLoginGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      setError(message);
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
          {error ? (
            <p className="rounded-[var(--radius-lg)] bg-[var(--accent-mist)] px-3 py-2 text-[13px] font-medium text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={disabled}
            onClick={() => void submitGoogle()}
            className="flex h-[var(--control-h)] w-full items-center justify-center gap-3 rounded-[var(--radius-xl)] bg-[var(--white)] text-[16px] font-medium text-[var(--black)] shadow-[var(--shadow-md)] transition-all active:scale-[0.98] disabled:opacity-40"
          >
            <GoogleIcon />
            {busy === 'google' ? 'Starting…' : 'Sign up / Log in with Google'}
          </button>

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
