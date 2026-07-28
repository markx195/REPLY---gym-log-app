import { cn } from '@/lib/cn';

type ProgressRingProps = {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
};

export function ProgressRing({
  value,
  max = 100,
  size = 140,
  strokeWidth = 10,
  label,
  sublabel,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value / max, 0), 1);
  const offset = circumference * (1 - progress);
  const labelSize = Math.round(size * 0.2);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        {label ? (
          <span
            className="font-semibold tracking-[var(--tracking-snug)] tabular-nums text-[var(--black)]"
            style={{ fontSize: labelSize }}
          >
            {label}
          </span>
        ) : null}
        {sublabel ? (
          <span className="mt-0.5 text-[var(--text-xs)] font-medium text-[var(--muted)]">
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
