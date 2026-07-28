'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 w-full max-w-md rounded-t-[var(--radius-2xl)] bg-[var(--white)]',
          'shadow-[var(--shadow-lg)] fade-in',
        )}
      >
        <div className="flex justify-center pt-3">
          <span className="h-1 w-10 rounded-full bg-[var(--muted-light)]/40" aria-hidden />
        </div>
        {title ? (
          <div className="border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-[var(--text-xl)] font-semibold tracking-[var(--tracking-normal)] text-[var(--black)]">
              {title}
            </h2>
          </div>
        ) : null}
        <div
          className="max-h-[min(70dvh,560px)] overflow-y-auto px-6 pt-5"
          style={{
            paddingBottom: 'max(2rem, calc(1.25rem + env(safe-area-inset-bottom)))',
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
