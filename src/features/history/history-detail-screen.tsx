'use client';

import { useEffect, useMemo, useState } from 'react';
import { BottomSheet, Button, Card, InputNumber } from '@/components/ui';
import {
  formatVolume,
  withRecalculatedVolume,
  type HistorySession,
  type HistorySet,
} from '@/data/history';
import { cn } from '@/lib/cn';
import { translate, type Locale } from '@/lib/i18n';

type HistoryDetailScreenProps = {
  session: HistorySession;
  locale: Locale;
  onBack: () => void;
  onSave: (session: HistorySession) => void;
  onDelete: (sessionId: string) => void;
};

type EditTarget = {
  exerciseIndex: number;
  setIndex: number;
  weight: number;
  reps: number;
};

export function HistoryDetailScreen({
  session: initial,
  locale,
  onBack,
  onSave,
  onDelete,
}: HistoryDetailScreenProps) {
  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);

  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const totalSets = draft.exercises.reduce((sum, item) => sum + item.sets.length, 0);

  const openSetEditor = (exerciseIndex: number, setIndex: number, set: HistorySet) => {
    if (!editing) return;
    setEditTarget({
      exerciseIndex,
      setIndex,
      weight: set.weight,
      reps: set.reps,
    });
  };

  const saveSetEdit = () => {
    if (!editTarget) return;
    const next = structuredClone(draft);
    const exercise = next.exercises[editTarget.exerciseIndex];
    if (!exercise) return;
    exercise.sets[editTarget.setIndex] = {
      weight: editTarget.weight,
      reps: editTarget.reps,
    };
    const updated = withRecalculatedVolume(next);
    setDraft(updated);
    onSave(updated);
    setEditTarget(null);
    setToast(t('setUpdatedToast'));
  };

  const deleteSet = (exerciseIndex: number, setIndex: number) => {
    const next = structuredClone(draft);
    const exercise = next.exercises[exerciseIndex];
    if (!exercise) return;
    exercise.sets.splice(setIndex, 1);
    if (exercise.sets.length === 0) {
      next.exercises.splice(exerciseIndex, 1);
    }
    const updated = withRecalculatedVolume(next);
    setDraft(updated);
    onSave(updated);
    setEditTarget(null);
    setToast(t('setRemovedToast'));
  };

  const addSet = (exerciseIndex: number) => {
    const next = structuredClone(draft);
    const exercise = next.exercises[exerciseIndex];
    if (!exercise) return;
    const last = exercise.sets[exercise.sets.length - 1];
    exercise.sets.push({
      weight: last?.weight ?? 0,
      reps: last?.reps ?? 8,
    });
    const updated = withRecalculatedVolume(next);
    setDraft(updated);
    onSave(updated);
    setToast(t('setAddedToast'));
  };

  const bumpDuration = (delta: number) => {
    const updated = withRecalculatedVolume({
      ...draft,
      durationMin: Math.max(1, draft.durationMin + delta),
    });
    setDraft(updated);
    onSave(updated);
  };

  const heaviest = useMemo(() => {
    let best: { name: string; weight: number; reps: number } | null = null;
    for (const exercise of draft.exercises) {
      for (const set of exercise.sets) {
        if (!best || set.weight > best.weight) {
          best = { name: exercise.name, weight: set.weight, reps: set.reps };
        }
      }
    }
    return best;
  }, [draft]);

  return (
    <div className="relative space-y-6 fade-in">
      {toast ? (
        <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full bg-[var(--black)] px-4 py-2 text-[13px] font-semibold text-white">
          {toast}
        </div>
      ) : null}

      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--white)] text-[var(--black)] shadow-[var(--shadow-sm)] active:scale-95"
          aria-label={t('back')}
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[var(--muted)]">{draft.dateLabel}</p>
          <h1 className="truncate text-[24px] font-semibold tracking-[var(--tracking-snug)] text-[var(--black)]">
            {draft.title}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className={cn(
            'rounded-full px-3.5 py-2 text-[13px] font-semibold shadow-[var(--shadow-sm)]',
            editing
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--white)] text-[var(--accent)]',
          )}
        >
          {editing ? t('done') : t('edit')}
        </button>
      </header>

      <div
        className={`relative overflow-hidden rounded-[var(--radius-2xl)] bg-gradient-to-br p-5 shadow-[var(--shadow-md)] ${draft.tone}`}
      >
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[16px] bg-white/70 px-3 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-medium text-[var(--muted)]">{t('time')}</p>
            <p className="mt-1 text-[20px] font-semibold tabular-nums text-[var(--black)]">
              {draft.durationMin}m
            </p>
            {editing ? (
              <div className="mt-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => bumpDuration(-1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[14px] font-semibold"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => bumpDuration(1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[14px] font-semibold"
                >
                  +
                </button>
              </div>
            ) : null}
          </div>
          <div className="rounded-[16px] bg-white/70 px-3 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-medium text-[var(--muted)]">{t('sets')}</p>
            <p className="mt-1 text-[20px] font-semibold tabular-nums text-[var(--black)]">
              {totalSets}
            </p>
          </div>
          <div className="rounded-[16px] bg-white/70 px-3 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-medium text-[var(--muted)]">{t('volume')}</p>
            <p className="mt-1 text-[20px] font-semibold tabular-nums text-[var(--black)]">
              {formatVolume(draft.volume)}
            </p>
          </div>
        </div>
        {heaviest ? (
          <p className="mt-4 text-[13px] font-medium text-[var(--black)]/70">
            {t('topSet', {
              name: heaviest.name,
              weight: heaviest.weight,
              reps: heaviest.reps,
            })}
          </p>
        ) : null}
      </div>

      {editing ? (
        <p className="rounded-[var(--radius-lg)] bg-[var(--accent-mist)] px-4 py-3 text-[13px] font-medium text-[var(--accent)]">
          {t('editingHint')}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
          {t('exercises')}
        </h2>
        {draft.exercises.length === 0 ? (
          <Card variant="surface" padding="md" className="py-8 text-center">
            <p className="text-[14px] text-[var(--muted)]">{t('noSetsLeft')}</p>
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {draft.exercises.map((exercise, exerciseIndex) => (
              <li key={`${exercise.id}-${exerciseIndex}`}>
                <Card padding="md" className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-mist)] text-[13px] font-semibold text-[var(--accent)]">
                      {exerciseIndex + 1}
                    </span>
                    <p className="flex-1 text-[16px] font-semibold text-[var(--black)]">
                      {exercise.name}
                    </p>
                    {editing ? (
                      <button
                        type="button"
                        onClick={() => addSet(exerciseIndex)}
                        className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[12px] font-semibold text-[var(--accent)]"
                      >
                        + {t('set')}
                      </button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {exercise.sets.map((set, setIndex) => (
                      <button
                        key={`${exercise.id}-${setIndex}`}
                        type="button"
                        disabled={!editing}
                        onClick={() => openSetEditor(exerciseIndex, setIndex, set)}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-[13px] font-semibold tabular-nums',
                          editing
                            ? 'bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/20'
                            : 'bg-[var(--surface)] text-[var(--black)]',
                        )}
                      >
                        S{setIndex + 1} {set.weight}×{set.reps}
                      </button>
                    ))}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="space-y-2">
        <Button variant="secondary" fullWidth size="lg" onClick={onBack}>
          {t('backToProgress')}
        </Button>
        {editing ? (
          <Button
            variant="ghost"
            fullWidth
            size="lg"
            className="text-red-500"
            onClick={() => setConfirmDelete(true)}
          >
            {t('deleteSession')}
          </Button>
        ) : null}
      </div>

      <BottomSheet
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title={t('editSetTitle')}
      >
        {editTarget ? (
          <div className="space-y-5">
            <InputNumber
              label={t('weightLabel')}
              value={editTarget.weight}
              onChange={(weight) => setEditTarget({ ...editTarget, weight })}
              step={2.5}
              min={0}
              max={500}
              unit="kg"
              allowDecimal
            />
            <InputNumber
              label={t('repsLabel')}
              value={editTarget.reps}
              onChange={(reps) => setEditTarget({ ...editTarget, reps })}
              step={1}
              min={1}
              max={50}
              allowDecimal={false}
            />
            <Button fullWidth size="lg" onClick={saveSetEdit}>
              {t('saveSet')}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              size="lg"
              onClick={() => deleteSet(editTarget.exerciseIndex, editTarget.setIndex)}
            >
              {t('deleteSet')}
            </Button>
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('deleteSessionTitle')}
      >
        <div className="space-y-4">
          <p className="text-[15px] text-[var(--muted)]">
            {t('confirmDeleteBody', { title: draft.title })}
          </p>
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              onDelete(draft.id);
              setConfirmDelete(false);
            }}
          >
            {t('delete')}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            onClick={() => setConfirmDelete(false)}
          >
            {t('cancel')}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
