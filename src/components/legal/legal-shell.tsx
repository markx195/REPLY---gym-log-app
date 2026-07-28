import Link from 'next/link';
import type { ReactNode } from 'react';

export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[var(--bg-body-mid)] text-[var(--black)]">
      <div className="mx-auto max-w-md px-5 pb-16 pt-8">
        <Link
          href="/"
          className="text-[13px] font-semibold text-[var(--accent)]"
        >
          ← Back to REPLY
        </Link>
        <p className="mt-8 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
          REPLY
        </p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-[13px] text-[var(--muted)]">
          Last updated: July 27, 2026 · Soft-launch / invite beta
        </p>
        <div className="prose-legal mt-8 space-y-5 text-[15px] leading-relaxed text-[var(--ink-soft)]">
          {children}
        </div>
        <nav className="mt-10 flex flex-wrap gap-4 border-t border-[var(--border)] pt-6 text-[13px] font-semibold">
          <Link href="/legal/terms" className="text-[var(--accent)]">
            Terms
          </Link>
          <Link href="/legal/privacy" className="text-[var(--accent)]">
            Privacy
          </Link>
          <Link href="/legal/disclaimer" className="text-[var(--accent)]">
            Health disclaimer
          </Link>
        </nav>
      </div>
    </div>
  );
}
