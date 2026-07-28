'use client';

import { useMemo } from 'react';
import { Card, ProgressRing } from '@/components/ui';
import { formatVolume, type HistorySession } from '@/data/history';
import {
  computeProgressInsights,
  type LiveWeeklyStats,
} from '@/lib/history-store';
import { cn } from '@/lib/cn';

type ProgressScreenProps = {
  history: HistorySession[];
  weeklyStats: LiveWeeklyStats;
  onOpenHistory: (sessionId: string) => void;
};

export function ProgressScreen({
  history,
  weeklyStats,
  onOpenHistory,
}: ProgressScreenProps) {
  const insights = useMemo(() => computeProgressInsights(history), [history]);
  const maxDayVolume = Math.max(...insights.dayVolumes.map((day) => day.volume), 1);

  const deltaLabel =
    insights.volumeDeltaPct === null
      ? 'First week tracking'
      : insights.volumeDeltaPct === 0
        ? 'Same volume as last week'
        : insights.volumeDeltaPct > 0
          ? `+${insights.volumeDeltaPct}% vs last week`
          : `${insights.volumeDeltaPct}% vs last week`;

  return (
    <div className="relative space-y-7 fade-in">
      <div
        className="ambient-blob right-0 top-10 h-44 w-44 bg-[var(--accent)]/12"
        aria-hidden
      />

      <header>
        <h1 className="text-[var(--text-4xl)] font-semibold leading-none tracking-[var(--tracking-tight)] text-[var(--black)]">
          Progress
        </h1>
        <p className="mt-2 text-[var(--text-md)] text-[var(--muted)]">
          {history.length === 0
            ? 'Finish a workout to start your story.'
            : deltaLabel}
        </p>
      </header>

      <div className="relative overflow-hidden rounded-[var(--radius-2xl)] bg-gradient-to-br from-[#d7e8fa] via-[#eaf2fb] to-white p-6 shadow-[var(--shadow-lg)]">
        <div
          className="absolute -right-10 top-0 h-36 w-36 rounded-full bg-white/60 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col items-center gap-4 text-center">
          <ProgressRing
            value={weeklyStats.sessionsDone}
            max={weeklyStats.sessionsGoal}
            size={148}
            strokeWidth={11}
            label={`${weeklyStats.sessionsDone}/${weeklyStats.sessionsGoal}`}
            sublabel="sessions"
          />
          <div className="flex w-full justify-between gap-2 pt-1">
            {weeklyStats.weekDays.map((day, index) => (
              <div key={`${day.label}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className={cn(
                    'h-2.5 w-2.5 rounded-full transition-colors',
                    day.done ? 'bg-[var(--accent)]' : 'bg-white/80',
                  )}
                />
                <span className="text-[11px] font-medium text-[var(--muted)]">{day.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3">
        <Card padding="md" className="relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[var(--accent-soft)]" aria-hidden />
          <p className="relative text-[var(--text-sm)] font-medium text-[var(--muted)]">Streak</p>
          <p className="relative mt-2 text-[40px] font-semibold tracking-[var(--tracking-tight)] tabular-nums text-[var(--black)]">
            {weeklyStats.streak}
          </p>
          <p className="relative text-[var(--text-sm)] font-medium text-[var(--accent)]">days hot</p>
        </Card>
        <Card padding="md" className="relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[var(--surface)]" aria-hidden />
          <p className="relative text-[var(--text-sm)] font-medium text-[var(--muted)]">Week vol</p>
          <p className="relative mt-2 text-[32px] font-semibold tracking-[var(--tracking-tight)] tabular-nums text-[var(--black)]">
            {formatVolume(insights.weekVolume)}
          </p>
          <p className="relative text-[var(--text-sm)] text-[var(--muted)]">
            {weeklyStats.totalMinutes} min
          </p>
        </Card>
      </section>

      {/* Volume chart */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
            Volume this week
          </h2>
          <span className="text-[var(--text-sm)] font-medium text-[var(--muted)]">
            {formatVolume(insights.weekVolume)}
          </span>
        </div>
        <Card padding="md">
          <div className="flex h-32 items-end gap-2">
            {insights.dayVolumes.map((day) => {
              const height = Math.max(8, (day.volume / maxDayVolume) * 100);
              const isToday =
                day.date ===
                new Date().toISOString().slice(0, 10);
              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-24 w-full items-end justify-center">
                    <div
                      className={cn(
                        'w-full max-w-[28px] rounded-t-[10px] transition-all',
                        day.volume > 0
                          ? isToday
                            ? 'bg-[var(--accent)]'
                            : 'bg-[var(--accent)]/45'
                          : 'bg-[var(--surface)]',
                      )}
                      style={{ height: `${height}%` }}
                      title={formatVolume(day.volume)}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-semibold',
                      isToday ? 'text-[var(--accent)]' : 'text-[var(--muted)]',
                    )}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      {/* Personal records */}
      {insights.personalRecords.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
            Personal records
          </h2>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 hide-scrollbar">
            {insights.personalRecords.map((pr) => (
              <div
                key={pr.exerciseId}
                className="w-[150px] shrink-0 overflow-hidden rounded-[var(--radius-xl)] bg-[var(--white)] p-4 shadow-[var(--shadow-md)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">
                  PR
                </p>
                <p className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-[var(--black)]">
                  {pr.name}
                </p>
                <p className="mt-3 text-[28px] font-semibold tracking-[var(--tracking-snug)] tabular-nums text-[var(--black)]">
                  {pr.weight}
                  <span className="ml-1 text-[13px] font-medium text-[var(--muted)]">kg</span>
                </p>
                <p className="text-[12px] text-[var(--muted)]">
                  ×{pr.reps} · {pr.dateLabel}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {insights.bestSession ? (
        <button
          type="button"
          onClick={() => onOpenHistory(insights.bestSession!.id)}
          className="w-full overflow-hidden rounded-[var(--radius-2xl)] bg-gradient-to-br from-[#1c2430] to-[#2f3f52] p-5 text-left text-white shadow-[var(--shadow-lg)] active:scale-[0.985]"
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/55">
            Best session
          </p>
          <p className="mt-2 text-[22px] font-semibold tracking-[var(--tracking-snug)]">
            {insights.bestSession.title}
          </p>
          <p className="mt-1 text-[14px] text-white/65">
            {formatVolume(insights.bestSession.volume)} volume · {insights.bestSession.dateLabel} ·
            tap to view
          </p>
        </button>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[var(--text-xl)] font-semibold tracking-[var(--tracking-normal)] text-[var(--black)]">
            History
          </h2>
          <span className="text-[var(--text-sm)] text-[var(--muted)]">
            {history.length} · tap to open
          </span>
        </div>

        {history.length === 0 ? (
          <Card variant="surface" padding="md" className="py-10 text-center">
            <p className="text-[var(--text-md)] text-[var(--muted)]">
              No sessions yet. Log a workout and it lands here.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {history.map((session) => {
              const setCount = session.exercises.reduce(
                (sum, item) => sum + item.sets.length,
                0,
              );
              return (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => onOpenHistory(session.id)}
                    className="flex w-full overflow-hidden rounded-[var(--radius-xl)] bg-[var(--white)] text-left shadow-[var(--shadow-md)] transition-transform active:scale-[0.985]"
                  >
                    <div
                      className={cn('w-16 shrink-0 bg-gradient-to-b', session.tone)}
                      aria-hidden
                    />
                    <div className="flex min-h-[var(--row-min-h)] flex-1 items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-[var(--text-lg)] font-medium text-[var(--black)]">
                          {session.title}
                        </p>
                        <p className="text-[var(--text-sm)] text-[var(--muted)]">
                          {session.dateLabel} · {session.durationMin} min · {setCount} sets
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-[var(--text-sm)] font-semibold tabular-nums text-[var(--black)]">
                          {formatVolume(session.volume)}
                        </span>
                        <span className="text-[11px] font-semibold text-[var(--accent)]">
                          View →
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
