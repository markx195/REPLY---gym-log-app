'use client';

import { cn } from '@/lib/cn';
import { translate, type Locale } from '@/lib/i18n';
import type { AppTab } from '@/types/navigation';
import { tabs } from '@/types/navigation';

type TabBarProps = {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  locale?: Locale;
};

const icons: Record<AppTab, React.ReactNode> = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),
  discovery: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M20 20l-3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
  profile: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5 20c0-3.314 3.134-6 7-6s7 2.686 7 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export function TabBar({ active, onChange, locale = 'en' }: TabBarProps) {
  return (
    <nav className="safe-bottom border-t border-[var(--border)] bg-[var(--white)]/95 backdrop-blur-xl">
      <ul
        className="mx-auto grid max-w-md px-3 pt-2"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                className={cn(
                  'flex w-full flex-col items-center gap-1 py-2 transition-colors',
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--muted-light)]',
                )}
              >
                {icons[tab.id]}
                <span
                  className={cn(
                    'text-[var(--text-xs)] tracking-[var(--tracking-normal)]',
                    isActive ? 'font-semibold' : 'font-medium',
                  )}
                >
                  {translate(locale, tab.id)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
