import { cn } from '@/lib/cn';

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  lastWeight?: number;
  unit?: string;
};

type ExerciseRowProps = {
  exercise: Exercise;
  active?: boolean;
  index?: number;
  onClick?: () => void;
  className?: string;
};

export function ExerciseRow({
  exercise,
  active = false,
  index,
  onClick,
  className,
}: ExerciseRowProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'flex min-h-[var(--row-min-h)] items-center gap-3.5 rounded-[var(--radius-xl)] px-4 py-3',
        'bg-[var(--white)] shadow-[var(--shadow-md)]',
        onClick && 'cursor-pointer transition-transform active:scale-[0.985]',
        active && 'ring-2 ring-[var(--accent)]/30 bg-[var(--accent-mist)] shadow-none',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-sm)] font-semibold',
          active
            ? 'bg-[var(--accent)] text-white'
            : 'bg-[var(--surface)] text-[var(--muted)]',
        )}
      >
        {index !== undefined ? index + 1 : exercise.name.slice(0, 1)}
      </div>

      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-[var(--text-lg)] font-medium tracking-[var(--tracking-normal)] text-[var(--black)]">
          {exercise.name}
        </p>
        <p className="truncate text-[var(--text-sm)] text-[var(--muted)]">
          {exercise.sets}×{exercise.reps}
        </p>
      </div>

      {exercise.lastWeight !== undefined ? (
        <div className="shrink-0 rounded-[var(--radius-md)] bg-[var(--surface)] px-3 py-2 text-right">
          <p className="text-[var(--text-lg)] font-semibold tabular-nums text-[var(--black)]">
            {exercise.lastWeight}
            <span className="ml-0.5 text-[var(--text-xs)] font-medium text-[var(--muted)]">
              {exercise.unit ?? 'kg'}
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
