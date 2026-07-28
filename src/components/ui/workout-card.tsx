import { cn } from '@/lib/cn';
import { toneStyles, type Workout } from '@/data/workouts';

type WorkoutCardProps = {
  workout: Workout;
  variant?: 'featured' | 'compact';
  onStart?: () => void;
  className?: string;
};

export function WorkoutCard({
  workout,
  variant = 'compact',
  onStart,
  className,
}: WorkoutCardProps) {
  const tone = toneStyles[workout.tone];
  const isInk = workout.tone === 'ink';

  if (variant === 'featured') {
    return (
      <button
        type="button"
        onClick={onStart}
        className={cn(
          'group relative w-full overflow-hidden rounded-[var(--radius-2xl)] text-left',
          'shadow-[var(--shadow-lg)] transition-transform duration-200 active:scale-[0.985]',
          className,
        )}
      >
        <div
          className={cn('absolute inset-0 bg-gradient-to-br', tone.wash)}
          aria-hidden
        />
        <div
          className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/35 blur-2xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-16 left-8 h-40 w-40 rounded-full bg-[var(--accent)]/10 blur-2xl"
          aria-hidden
        />

        <div className="relative flex min-h-[300px] flex-col justify-between p-6">
          <div className="flex items-start justify-between gap-3">
            <span
              className={cn(
                'rounded-full px-3 py-1.5 text-[var(--text-xs)] font-semibold uppercase tracking-[0.12em]',
                isInk
                  ? 'bg-white/15 text-white/80'
                  : 'bg-white/70 text-[var(--accent)]',
              )}
            >
              Today
            </span>
            <span
              className={cn(
                'rounded-full px-3 py-1.5 text-[var(--text-sm)] font-semibold',
                isInk
                  ? 'bg-white/15 text-white'
                  : 'bg-white/80 text-[var(--black)]',
              )}
            >
              {workout.durationMin} min
            </span>
          </div>

          <div className="space-y-3 pt-10">
            <div className={cn('h-1.5 w-10 rounded-full', tone.mark)} />
            <h2
              className={cn(
                'max-w-[15ch] text-[34px] font-semibold leading-[1.05] tracking-[var(--tracking-snug)]',
                isInk ? 'text-white' : 'text-[var(--black)]',
              )}
            >
              {workout.title}
            </h2>
            <p
              className={cn(
                'max-w-[20rem] text-[var(--text-md)] leading-[var(--leading-snug)]',
                isInk ? 'text-white/70' : 'text-[var(--muted)]',
              )}
            >
              {workout.subtitle}
            </p>
            <div
              className={cn(
                'flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[var(--text-sm)]',
                isInk ? 'text-white/55' : 'text-[var(--muted)]',
              )}
            >
              <span>{workout.focus}</span>
              <span className="h-1 w-1 rounded-full bg-current opacity-40" />
              <span>{workout.exercises} moves</span>
            </div>
          </div>

          <div className="mt-7">
            <span
              className={cn(
                'inline-flex h-[52px] items-center justify-center rounded-[var(--radius-xl)] px-6 text-[var(--text-lg)] font-semibold shadow-[var(--shadow-sm)] transition-transform group-active:scale-[0.98]',
                isInk
                  ? 'bg-white text-[var(--black)]'
                  : 'bg-[var(--accent)] text-white',
              )}
            >
              Start now
            </span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onStart}
      className={cn(
        'group flex min-h-[var(--row-min-h)] w-full overflow-hidden rounded-[var(--radius-xl)] text-left',
        'bg-[var(--white)] shadow-[var(--shadow-md)] transition-transform duration-150 active:scale-[0.985]',
        className,
      )}
    >
      <div
        className={cn('relative w-[72px] shrink-0 bg-gradient-to-b', tone.wash)}
        aria-hidden
      >
        <div
          className={cn(
            'absolute left-4 top-4 h-2 w-2 rounded-full',
            isInk ? 'bg-white/80' : tone.mark,
          )}
        />
      </div>
      <div className="flex flex-1 items-center justify-between gap-3 px-4 py-4">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-[var(--text-lg)] font-medium tracking-[var(--tracking-normal)] text-[var(--black)]">
            {workout.title}
          </h3>
          <p className="truncate text-[var(--text-sm)] text-[var(--muted)]">
            {workout.durationMin} min · {workout.focus}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-[var(--text-sm)] font-semibold text-[var(--accent)]">
          Start
        </span>
      </div>
    </button>
  );
}
