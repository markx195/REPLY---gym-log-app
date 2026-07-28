'use client';

import { cn } from '@/lib/cn';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search workouts...',
  className,
}: SearchBarProps) {
  return (
    <div
      className={cn(
        'flex h-[var(--control-h-sm)] items-center gap-3 rounded-[var(--radius-xl)]',
        'bg-[var(--surface)] px-4 shadow-[var(--shadow-sm)]',
        'focus-within:ring-2 focus-within:ring-[var(--accent)]/20',
        className,
      )}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="shrink-0 text-[var(--muted-light)]"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M20 20l-3.5-3.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-[var(--text-md)] text-[var(--black)] outline-none placeholder:text-[var(--muted-light)]"
      />
    </div>
  );
}
