'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

type RestTimerProps = {
  seconds: number;
  onSkip: () => void;
  onDone: () => void;
};

export function RestTimer({ seconds, onSkip, onDone }: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const finishedRef = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    finishedRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (remaining > 0) {
      const id = window.setInterval(() => {
        setRemaining((value) => value - 1);
      }, 1000);
      return () => window.clearInterval(id);
    }

    if (!finishedRef.current) {
      finishedRef.current = true;
      onDone();
    }
  }, [remaining, onDone]);

  const progress = seconds > 0 ? remaining / seconds : 0;

  return (
    <div className="overflow-hidden rounded-[var(--radius-2xl)] bg-gradient-to-br from-[var(--panel-ink)] to-[var(--panel-ink-end)] p-5 text-white shadow-[var(--shadow-lg)]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/55">
            Rest
          </p>
          <p
            className={cn(
              'mt-1 text-[48px] font-semibold leading-none tracking-[var(--tracking-tight)] tabular-nums',
              remaining <= 10 ? 'text-[var(--accent-bright)]' : 'text-white',
            )}
          >
            {Math.floor(remaining / 60)}:
            {(remaining % 60).toString().padStart(2, '0')}
          </p>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full bg-white/15 px-4 py-2.5 text-[14px] font-semibold text-white backdrop-blur-sm active:scale-95"
        >
          Skip rest
        </button>
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-white transition-[width] duration-1000 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
