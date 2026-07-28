'use client';

import { cn } from '@/lib/cn';

type LoadingScreenProps = {
  message?: string;
  className?: string;
};

export function LoadingScreen({
  message = 'Getting ready…',
  className,
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-[var(--white)] px-8',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--page-wash)' }}
        aria-hidden
      />
      <div
        className="ambient-blob left-[-20%] top-[18%] h-56 w-56 bg-[var(--accent)]/20"
        aria-hidden
      />
      <div
        className="ambient-blob right-[-15%] bottom-[22%] h-48 w-48 bg-[var(--blob)]/35"
        style={{ animationDelay: '-6s' }}
        aria-hidden
      />

      <div className="relative flex flex-col items-center gap-8">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <span className="loading-ring absolute inset-0 rounded-full border-2 border-[var(--accent)]/15" />
          <span className="loading-ring-spin absolute inset-1 rounded-full border-2 border-transparent border-t-[var(--accent)]" />
          <span className="loading-pulse absolute inset-4 rounded-[22px] bg-gradient-to-br from-[var(--panel-ink)] to-[var(--panel-ink-end)] shadow-[var(--shadow-lg)]" />
          <span className="relative text-[22px] font-semibold tracking-[var(--tracking-tight)] text-white">
            R
          </span>
        </div>

        <div className="text-center">
          <p className="text-[42px] font-semibold leading-none tracking-[var(--tracking-tight)] text-[var(--black)]">
            REPLY
          </p>
          <p className="loading-message mt-3 text-[15px] font-medium text-[var(--muted)]">
            {message}
          </p>
        </div>

        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="loading-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          <span className="loading-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)] [animation-delay:160ms]" />
          <span className="loading-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)] [animation-delay:320ms]" />
        </div>
      </div>
    </div>
  );
}
