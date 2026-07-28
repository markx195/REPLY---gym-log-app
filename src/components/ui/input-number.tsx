'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

type InputNumberProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  allowDecimal?: boolean;
  size?: 'default' | 'hero';
  autoFocus?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function InputNumber({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  unit,
  allowDecimal = true,
  size = 'default',
  autoFocus = false,
}: InputNumberProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(String(value));
  const isHero = size === 'hero';

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const normalized = raw.replace(',', '.').trim();
    if (normalized === '' || normalized === '.') {
      setDraft(String(value));
      return;
    }
    const parsed = Number(normalized);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    const next = clamp(parsed, min, max);
    onChange(next);
    setDraft(String(next));
  };

  const decrement = () =>
    onChange(clamp(Number((value - step).toFixed(2)), min, max));
  const increment = () =>
    onChange(clamp(Number((value + step).toFixed(2)), min, max));

  const focusInput = () => {
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-soft)]"
      >
        {label}
      </label>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={decrement}
          aria-label={`Decrease ${label}`}
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[22px] font-medium text-[var(--black)] shadow-[var(--shadow-sm)] active:scale-95',
            isHero ? 'h-14 w-14' : 'h-12 w-12',
          )}
        >
          −
        </button>

        <div
          role="presentation"
          onPointerDown={(event) => {
            if (event.target === inputRef.current) return;
            event.preventDefault();
            focusInput();
          }}
          className={cn(
            'flex flex-1 cursor-text items-center justify-center gap-1.5',
            'rounded-[var(--radius-xl)] bg-[var(--surface)]',
            'transition-shadow focus-within:ring-2 focus-within:ring-[var(--accent)]/25',
            isHero ? 'h-[72px]' : 'h-[var(--control-h)]',
          )}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            inputMode={allowDecimal ? 'decimal' : 'numeric'}
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            autoFocus={autoFocus}
            pattern={allowDecimal ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'}
            value={draft}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => {
              const next = event.target.value;
              if (allowDecimal) {
                if (/^\d*[.,]?\d*$/.test(next)) setDraft(next);
              } else if (/^\d*$/.test(next)) {
                setDraft(next);
              }
            }}
            onBlur={() => commit(draft)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            className={cn(
              'min-w-0 bg-transparent text-center font-semibold tabular-nums text-[var(--black)] outline-none caret-[var(--accent)]',
              isHero
                ? 'w-[7.5rem] text-[44px] tracking-[var(--tracking-tight)]'
                : 'w-[5.5rem] text-[var(--text-3xl)] tracking-[var(--tracking-snug)]',
            )}
            aria-label={label}
          />
          {unit ? (
            <span
              className={cn(
                'pointer-events-none font-semibold text-[var(--muted)]',
                isHero ? 'mt-2 text-[14px]' : 'mt-1 text-[var(--text-sm)]',
              )}
            >
              {unit}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={increment}
          aria-label={`Increase ${label}`}
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[22px] font-medium text-[var(--black)] shadow-[var(--shadow-sm)] active:scale-95',
            isHero ? 'h-14 w-14' : 'h-12 w-12',
          )}
        >
          +
        </button>
      </div>
    </div>
  );
}
