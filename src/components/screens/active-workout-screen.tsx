'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BottomSheet, Button, InputNumber } from '@/components/ui';
import { RestTimer } from '@/components/workout/rest-timer';
import {
  applySwap,
  getExerciseAlternatives,
} from '@/data/alternatives';
import { getExerciseById } from '@/data/exercises/catalog';
import {
  formatDuration,
  type LoggedSet,
  type SessionExercise,
  type WorkoutSession,
} from '@/data/session';
import { cn } from '@/lib/cn';
import { clearWorkoutDraft, saveWorkoutDraft } from '@/lib/workout-draft-store';

type ActiveWorkoutScreenProps = {
  session: WorkoutSession;
  availableGearIds?: string[];
  onFinish: (session: WorkoutSession, durationMs: number) => void;
  onCancel: () => void;
};

function isExerciseDone(exercise: SessionExercise) {
  const working = exercise.sets.filter((set) => !set.isWarmup).length;
  return working >= exercise.targetSets;
}

function jumpToExercise(
  session: WorkoutSession,
  index: number,
  setExerciseIndex: (i: number) => void,
  setWeight: (n: number) => void,
  setReps: (n: number) => void,
  setResting: (v: boolean) => void,
) {
  const next = session.exercises[index];
  if (!next) return;
  setResting(false);
  setExerciseIndex(index);
  setWeight(next.suggestedWeight);
  setReps(next.targetReps);
}

export function ActiveWorkoutScreen({
  session: initialSession,
  availableGearIds,
  onFinish,
  onCancel,
}: ActiveWorkoutScreenProps) {
  const [session, setSession] = useState(initialSession);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [resting, setResting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [justLogged, setJustLogged] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [logWarmup, setLogWarmup] = useState(false);
  const [rpe, setRpe] = useState(7);
  const [note, setNote] = useState('');
  const [showExtras, setShowExtras] = useState(false);

  const exercise = session.exercises[exerciseIndex];
  const [weight, setWeight] = useState(exercise.suggestedWeight);
  const [reps, setReps] = useState(exercise.suggestedReps ?? exercise.targetReps);
  const catalog = getExerciseById(exercise.id);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed(Date.now() - session.startedAt);
    }, 1000);
    return () => window.clearInterval(id);
  }, [session.startedAt]);

  useEffect(() => {
    setWeight(exercise.suggestedWeight);
    setReps(exercise.suggestedReps ?? exercise.targetReps);
    setNote('');
    setLogWarmup(false);
  }, [exercise.id, exercise.suggestedWeight, exercise.suggestedReps, exercise.targetReps]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(id);
  }, [toast]);


  useEffect(() => {
    saveWorkoutDraft(session);
  }, [session]);

  const completedSets = exercise.sets.filter((set) => !set.isWarmup).length;
  const setComplete = completedSets >= exercise.targetSets;
  const totalSets = session.exercises.reduce((sum, item) => sum + item.targetSets, 0);
  const loggedSets = session.exercises.reduce(
    (sum, item) => sum + item.sets.filter((set) => !set.isWarmup).length,
    0,
  );
  const currentSet = Math.min(completedSets + 1, exercise.targetSets);
  const delta = Number((weight - exercise.lastWeight).toFixed(1));
  const canGoBack = exerciseIndex > 0 && !resting;

  const remainingIncomplete = useMemo(
    () =>
      session.exercises.filter(
        (item, index) => index !== exerciseIndex && !isExerciseDone(item),
      ).length,
    [session.exercises, exerciseIndex],
  );

  const workoutComplete = useMemo(
    () => session.exercises.every(isExerciseDone),
    [session.exercises],
  );

  const canSkip = remainingIncomplete > 0 && !resting;
  const swaps = useMemo(
    () => getExerciseAlternatives(exercise, availableGearIds),
    [exercise, availableGearIds],
  );

  const logSet = useCallback(() => {
    if (setComplete || resting) return;

    const nextSet: LoggedSet = {
      id: `${exercise.id}-${Date.now()}`,
      weight,
      reps,
      completedAt: Date.now(),
      isWarmup: logWarmup || undefined,
      rpe: showExtras ? rpe : undefined,
      note: note.trim() || undefined,
    };

    setSession((current) => {
      const exercises = current.exercises.map((item, index) => {
        if (index !== exerciseIndex) return item;
        return { ...item, sets: [...item.sets, nextSet] };
      });
      return { ...current, exercises };
    });

    setJustLogged(true);
    window.setTimeout(() => setJustLogged(false), 420);
    if (!logWarmup) setResting(true);
    setNote('');
    setLogWarmup(false);
  }, [
    exercise.id,
    exerciseIndex,
    logWarmup,
    note,
    reps,
    resting,
    rpe,
    setComplete,
    showExtras,
    weight,
  ]);

  const undoLastSet = useCallback(() => {
    if (resting) {
      setResting(false);
      return;
    }
    if (exercise.sets.length === 0) return;
    setSession((current) => {
      const exercises = current.exercises.map((item, index) => {
        if (index !== exerciseIndex) return item;
        return { ...item, sets: item.sets.slice(0, -1) };
      });
      return { ...current, exercises };
    });
    setToast('Undid last set');
  }, [exercise.sets.length, exerciseIndex, resting]);

  const endRest = useCallback(() => setResting(false), []);

  const goNextIncomplete = useCallback(() => {
    setResting(false);
    const nextIndex = session.exercises.findIndex(
      (item, index) => index > exerciseIndex && !isExerciseDone(item),
    );
    if (nextIndex !== -1) {
      jumpToExercise(
        session,
        nextIndex,
        setExerciseIndex,
        setWeight,
        setReps,
        setResting,
      );
      return;
    }
    const wrapIndex = session.exercises.findIndex(
      (item, index) => index < exerciseIndex && !isExerciseDone(item),
    );
    if (wrapIndex !== -1) {
      jumpToExercise(
        session,
        wrapIndex,
        setExerciseIndex,
        setWeight,
        setReps,
        setResting,
      );
      return;
    }
    clearWorkoutDraft();
    onFinish(session, Date.now() - session.startedAt);
  }, [exerciseIndex, onFinish, session]);

  const goNextExercise = () => {
    if (workoutComplete) {
      clearWorkoutDraft();
    onFinish(session, Date.now() - session.startedAt);
      return;
    }
    goNextIncomplete();
  };

  const goBack = () => {
    if (!canGoBack) return;
    jumpToExercise(
      session,
      exerciseIndex - 1,
      setExerciseIndex,
      setWeight,
      setReps,
      setResting,
    );
    setToast('Back to previous');
  };

  const skipForLater = () => {
    if (!canSkip) return;
    setResting(false);

    const currentExercise = session.exercises[exerciseIndex];
    const before = session.exercises.slice(0, exerciseIndex);
    const after = session.exercises.slice(exerciseIndex + 1);
    const reordered = [...before, ...after, currentExercise];

    let nextIdx = after.length > 0 ? exerciseIndex : 0;
    if (isExerciseDone(reordered[nextIdx])) {
      nextIdx = Math.max(
        reordered.findIndex((item) => !isExerciseDone(item)),
        0,
      );
    }

    const nextExercise = reordered[nextIdx];
    setSession({ ...session, exercises: reordered });
    setExerciseIndex(nextIdx);
    setWeight(nextExercise.suggestedWeight);
    setReps(nextExercise.targetReps);
    setToast('Saved for later');
  };

  const selectFromQueue = (index: number) => {
    jumpToExercise(
      session,
      index,
      setExerciseIndex,
      setWeight,
      setReps,
      setResting,
    );
    setQueueOpen(false);
    if (index > exerciseIndex) setToast('Jumped ahead');
    if (index < exerciseIndex) setToast('Came back');
  };

  const swapExercise = (altId: string) => {
    const alt = swaps.find((item) => item.id === altId);
    if (!alt) return;
    const updated = applySwap(exercise, alt);
    setSession((current) => ({
      ...current,
      exercises: current.exercises.map((item, index) =>
        index === exerciseIndex ? updated : item,
      ),
    }));
    setWeight(updated.suggestedWeight);
    setReps(updated.targetReps);
    setSwapOpen(false);
    setToast(`Swapped → ${updated.name}`);
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden fade-in">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--page-wash)' }}
        aria-hidden
      />
      <div
        className="ambient-blob -right-16 top-24 h-48 w-48 bg-[var(--accent)]/12"
        aria-hidden
      />

      {toast ? (
        <div className="pointer-events-none absolute left-1/2 top-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] z-30 -translate-x-1/2 rounded-full bg-[var(--black)] px-4 py-2 text-[13px] font-semibold text-white shadow-[var(--shadow-md)]">
          {toast}
        </div>
      ) : null}

      <header className="safe-top relative z-10 flex items-center justify-between gap-3 px-5 pt-2">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close workout"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--white)] text-[var(--black)] shadow-[var(--shadow-md)] active:scale-95"
        >
          <CloseIcon />
        </button>
        <div className="rounded-full bg-[var(--white)] px-4 py-2 shadow-[var(--shadow-md)]">
          <p className="text-[15px] font-semibold tabular-nums tracking-[var(--tracking-snug)] text-[var(--black)]">
            {formatDuration(elapsed)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { clearWorkoutDraft(); onFinish(session, Date.now() - session.startedAt); }}
          className="rounded-full px-3 py-2 text-[15px] font-semibold text-[var(--accent)] active:opacity-70"
        >
          Done
        </button>
      </header>

      <div className="relative z-10 px-5 pt-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--white)]/80 shadow-[var(--shadow-sm)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
            style={{ width: `${(loggedSets / Math.max(totalSets, 1)) * 100}%` }}
          />
        </div>
      </div>

      <main className="relative z-10 flex flex-1 flex-col px-5 pb-6 pt-5">
        {/* Hero exercise card */}
        <section className="overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--white)] shadow-[var(--shadow-lg)]">
          <div className="flex gap-4 p-5">
            {catalog?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={catalog.image}
                alt=""
                className="h-[72px] w-[72px] shrink-0 rounded-[20px] object-cover bg-[var(--surface)]"
              />
            ) : (
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-[var(--tone-sky-from)] to-[var(--wash-a)] text-[18px] font-semibold text-[var(--accent)]">
                {exerciseIndex + 1}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                  Set {currentSet}/{exercise.targetSets}
                </span>
                <button
                  type="button"
                  onClick={() => setQueueOpen(true)}
                  className="text-[12px] font-semibold text-[var(--ink-soft)]"
                >
                  {exerciseIndex + 1}/{session.exercises.length} · Queue
                </button>
              </div>
              <h1 className="mt-2 line-clamp-2 text-[24px] font-semibold leading-[1.1] tracking-[var(--tracking-snug)] text-[var(--black)]">
                {exercise.name}
              </h1>
            </div>
          </div>

          {/* Set progress rail */}
          <div className="flex gap-1.5 px-5 pb-4">
            {Array.from({ length: exercise.targetSets }).map((_, index) => {
              const logged = exercise.sets[index];
              const isCurrent = index === completedSets && !setComplete;
              return (
                <div
                  key={index}
                  className={cn(
                    'h-2 flex-1 rounded-full transition-all duration-200',
                    logged
                      ? 'bg-[var(--accent)]'
                      : isCurrent
                        ? 'bg-[var(--accent)]/35 ring-2 ring-[var(--accent)]/30 ring-offset-1'
                        : 'bg-[var(--surface)]',
                  )}
                  title={logged ? `${logged.weight}×${logged.reps}` : `Set ${index + 1}`}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-2 border-t border-[var(--border)] px-5 py-3">
            <button
              type="button"
              onClick={() => setQueueOpen(true)}
              className="rounded-full bg-[var(--surface)] px-3.5 py-2 text-[13px] font-semibold text-[var(--black)]"
            >
              Queue
            </button>
            {swaps.length > 0 ? (
              <button
                type="button"
                onClick={() => setSwapOpen(true)}
                className="rounded-full bg-[var(--accent-soft)] px-3.5 py-2 text-[13px] font-semibold text-[var(--accent)]"
              >
                Swap
              </button>
            ) : null}
            <div className="flex-1" />
            <button
              type="button"
              disabled={!canGoBack}
              onClick={goBack}
              className="rounded-full px-3 py-2 text-[13px] font-semibold text-[var(--ink-soft)] disabled:opacity-30"
            >
              ← Prev
            </button>
          </div>
        </section>

        {/* Last chips */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <button
            type="button"
            onClick={() => {
              setWeight(exercise.lastWeight);
              setReps(exercise.lastReps);
            }}
            className="shrink-0 rounded-full bg-[var(--black)] px-3.5 py-2 text-[13px] font-semibold text-white active:scale-95"
          >
            Last {exercise.lastWeight}×{exercise.lastReps}
          </button>
          {exercise.previousSets.slice(0, 3).map((set, index) => (
            <button
              key={`${set.weight}-${set.reps}-${index}`}
              type="button"
              onClick={() => {
                setWeight(set.weight);
                setReps(set.reps);
              }}
              className="shrink-0 rounded-full bg-[var(--white)] px-3 py-2 text-[13px] font-semibold tabular-nums text-[var(--ink-soft)] shadow-[var(--shadow-sm)] active:scale-95"
            >
              {set.weight}×{set.reps}
            </button>
          ))}
        </div>

        {/* Logger panel */}
        <section className="mt-4 overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--white)] p-4 shadow-[var(--shadow-lg)]">
          <InputNumber
            label="Weight"
            value={weight}
            onChange={setWeight}
            step={exercise.weightStep}
            min={0}
            max={500}
            unit={exercise.unit}
            allowDecimal
            size="hero"
          />


          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setWeight(Math.max(0, Number((weight - exercise.weightStep).toFixed(2))))}
              className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink-soft)]"
            >
              -{exercise.weightStep}
            </button>
            <button
              type="button"
              onClick={() => setWeight(Number((weight + exercise.weightStep).toFixed(2)))}
              className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink-soft)]"
            >
              +{exercise.weightStep}
            </button>
          </div>

          <p
            className={cn(
              'mt-2 text-center text-[13px] font-semibold tabular-nums',
              delta > 0
                ? 'text-[var(--accent)]'
                : delta < 0
                  ? 'text-[var(--muted)]'
                  : 'text-[var(--muted-light)]',
            )}
          >
            {delta > 0 ? `+${delta} vs last` : delta < 0 ? `${delta} vs last` : 'Same as last'}
          </p>
          <div className="my-4 h-px bg-[var(--border)]" />
          <InputNumber
            label="Reps"
            value={reps}
            onChange={setReps}
            step={1}
            min={1}
            max={50}
            allowDecimal={false}
            size="hero"
          />

          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setReps(Math.max(1, reps - 1))}
              className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink-soft)]"
            >
              -1
            </button>
            <button
              type="button"
              onClick={() => setReps(Math.min(50, reps + 1))}
              className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink-soft)]"
            >
              +1
            </button>
          </div>

          {exercise.progressionNote ? (
            <p className="mt-3 text-center text-[12px] font-medium leading-relaxed text-[var(--accent)]">
              {exercise.progressionNote}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setLogWarmup((value) => !value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[12px] font-semibold',
                logWarmup
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface)] text-[var(--ink-soft)]',
              )}
            >
              Warmup
            </button>
            <button
              type="button"
              onClick={() => setShowExtras((value) => !value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[12px] font-semibold',
                showExtras
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface)] text-[var(--ink-soft)]',
              )}
            >
              RPE / Note
            </button>
            <button
              type="button"
              onClick={undoLastSet}
              disabled={exercise.sets.length === 0 && !resting}
              className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--ink-soft)] disabled:opacity-40"
            >
              Undo
            </button>
          </div>

          {showExtras ? (
            <div className="mt-3 space-y-3 rounded-[var(--radius-lg)] bg-[var(--surface)] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[var(--ink-soft)]">RPE</span>
                <div className="flex gap-1">
                  {[6, 7, 8, 9, 10].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRpe(value)}
                      className={cn(
                        'h-8 w-8 rounded-full text-[12px] font-semibold',
                        rpe === value
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--white)] text-[var(--muted)]',
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, 80))}
                placeholder="Set note (optional)"
                className="h-10 w-full rounded-[var(--radius-md)] bg-[var(--white)] px-3 text-[13px] text-[var(--black)] outline-none"
              />
            </div>
          ) : null}

        </section>

        <div className="mt-auto space-y-3 pt-5">
          {resting ? (
            <RestTimer
              seconds={exercise.restSeconds}
              onSkip={endRest}
              onDone={endRest}
            />
          ) : null}

          {!resting && !setComplete ? (
            <>
              <Button
                size="lg"
                fullWidth
                onClick={logSet}
                className={cn(
                  'h-[56px] text-[17px] font-semibold shadow-[var(--shadow-md)]',
                  justLogged && 'scale-[0.98]',
                )}
              >
                Log set {currentSet}
              </Button>
              <button
                type="button"
                disabled={!canSkip}
                onClick={skipForLater}
                className="w-full py-2 text-center text-[14px] font-semibold text-[var(--ink-soft)] disabled:opacity-30"
              >
                Skip for later
              </button>
            </>
          ) : null}

          {!resting && setComplete ? (
            <Button size="lg" fullWidth className="h-[56px] text-[17px] font-semibold" onClick={goNextExercise}>
              {workoutComplete ? 'Finish strong' : 'Next exercise'}
            </Button>
          ) : null}
        </div>
      </main>

      <BottomSheet open={queueOpen} onClose={() => setQueueOpen(false)} title="Session queue">
        <ul className="space-y-2">
          {session.exercises.map((item, index) => {
            const done = isExerciseDone(item);
            const current = index === exerciseIndex;
            const later = index > exerciseIndex && !done;
            return (
              <li key={`${item.id}-${index}`}>
                <button
                  type="button"
                  onClick={() => selectFromQueue(index)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[var(--radius-xl)] px-4 py-3.5 text-left shadow-[var(--shadow-sm)] transition-transform active:scale-[0.985]',
                    current
                      ? 'bg-[var(--accent-mist)] ring-2 ring-[var(--accent)]/25'
                      : 'bg-[var(--surface)]',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold',
                      done || current
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--white)] text-[var(--muted)]',
                    )}
                  >
                    {done ? '✓' : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-[var(--black)]">
                      {item.name}
                    </p>
                    <p className="text-[12px] font-medium text-[var(--ink-soft)]">
                      {item.sets.length}/{item.targetSets} sets
                      {current ? ' · now' : later ? ' · later' : done ? ' · done' : ''}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>

      <BottomSheet open={swapOpen} onClose={() => setSwapOpen(false)} title="Swap exercise">
        <p className="mb-4 text-[14px] font-medium text-[var(--ink-soft)]">
          Same pattern, different tool — progression stays intact.
        </p>
        <ul className="space-y-2">
          {swaps.map((alt) => (
            <li key={alt.id}>
              <button
                type="button"
                onClick={() => swapExercise(alt.id)}
                className="flex w-full items-center gap-3 rounded-[var(--radius-xl)] bg-[var(--surface)] px-3 py-3 text-left shadow-[var(--shadow-sm)] active:scale-[0.985]"
              >
                {alt.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={alt.image}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-[14px] object-cover bg-[var(--white)]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[var(--white)] text-[12px] font-semibold text-[var(--muted)]">
                    ALT
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[var(--black)]">{alt.name}</p>
                  <p className="mt-0.5 text-[12px] font-medium text-[var(--ink-soft)]">{alt.reason}</p>
                </div>
                <span className="shrink-0 text-[13px] font-semibold text-[var(--accent)]">Use</span>
              </button>
            </li>
          ))}
          {swaps.length === 0 ? (
            <li className="rounded-[var(--radius-lg)] bg-[var(--surface)] px-4 py-6 text-center text-[14px] text-[var(--muted)]">
              No close alternatives found.
            </li>
          ) : null}
        </ul>
      </BottomSheet>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
