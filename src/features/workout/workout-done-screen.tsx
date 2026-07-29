'use client';

import { useState } from 'react';
import { Button, Card, ProgressRing } from '@/components/ui';
import { formatDuration, type WorkoutSession } from '@/data/session';
import { translate, type Locale } from '@/lib/i18n';

type WorkoutDoneScreenProps = {
  session: WorkoutSession;
  durationMs: number;
  locale?: Locale;
  onDone: () => void;
  onSaveAsList?: (session: WorkoutSession) => void;
};

export function WorkoutDoneScreen({
  session,
  durationMs,
  locale = 'en',
  onDone,
  onSaveAsList,
}: WorkoutDoneScreenProps) {
  const t = (key: string) => translate(locale, key);
  const [saved, setSaved] = useState(false);

  const totalSets = session.exercises.reduce((sum, item) => sum + item.sets.length, 0);
  const totalVolume = session.exercises.reduce(
    (sum, exercise) =>
      sum + exercise.sets.reduce((setSum, set) => setSum + set.weight * set.reps, 0),
    0,
  );

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden px-5 pb-10 fade-in safe-top">
      <div
        className="ambient-blob left-1/2 top-16 h-64 w-64 -translate-x-1/2 bg-[var(--accent)]/20"
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <div className="rounded-[var(--radius-2xl)] bg-gradient-to-br from-[var(--tone-sky-from)] via-[var(--white)] to-[var(--tone-sky-via)] p-8 shadow-[var(--shadow-lg)]">
          <ProgressRing
            value={100}
            max={100}
            size={140}
            strokeWidth={10}
            label={locale === 'vi' ? 'Xong' : 'Done'}
            sublabel={locale === 'vi' ? 'đã lưu' : 'locked in'}
          />
        </div>

        <h1 className="mt-8 text-[var(--text-4xl)] font-semibold tracking-[var(--tracking-tight)] text-[var(--black)]">
          {t('sessionComplete')}
        </h1>
        <p className="mt-3 max-w-[18rem] text-[var(--text-md)] text-[var(--muted)]">
          {session.title} · {t('savedToHistory')}
        </p>

        <div className="mt-8 grid w-full grid-cols-3 gap-3">
          <Card padding="sm" className="space-y-1 text-center">
            <p className="text-[var(--text-xs)] font-medium text-[var(--muted)]">{t('time')}</p>
            <p className="text-[var(--text-lg)] font-semibold tabular-nums text-[var(--black)]">
              {formatDuration(durationMs)}
            </p>
          </Card>
          <Card padding="sm" className="space-y-1 text-center bg-[var(--accent-mist)] shadow-none">
            <p className="text-[var(--text-xs)] font-medium text-[var(--accent)]">{t('sets')}</p>
            <p className="text-[var(--text-lg)] font-semibold tabular-nums text-[var(--black)]">
              {totalSets}
            </p>
          </Card>
          <Card padding="sm" className="space-y-1 text-center">
            <p className="text-[var(--text-xs)] font-medium text-[var(--muted)]">{t('volume')}</p>
            <p className="text-[var(--text-lg)] font-semibold tabular-nums text-[var(--black)]">
              {Math.round(totalVolume)}
            </p>
          </Card>
        </div>
      </div>

      <div className="space-y-2">
        {onSaveAsList ? (
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            disabled={saved}
            onClick={() => {
              onSaveAsList(session);
              setSaved(true);
            }}
          >
            {saved ? t('listSaved') : t('saveAsMyList')}
          </Button>
        ) : null}
        <Button size="lg" fullWidth onClick={onDone}>
          {t('seeProgress')}
        </Button>
      </div>
    </div>
  );
}
