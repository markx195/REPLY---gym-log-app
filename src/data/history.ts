import type { WorkoutSession } from '@/data/session';
import { workouts, type WorkoutTone } from '@/data/workouts';

export type HistorySet = {
  weight: number;
  reps: number;
  isWarmup?: boolean;
  rpe?: number;
  note?: string;
};

export type HistoryExercise = {
  id: string;
  name: string;
  sets: HistorySet[];
};

export type HistorySession = {
  id: string;
  title: string;
  workoutId: string;
  date: string;
  dateLabel: string;
  durationMin: number;
  volume: number;
  tone: string;
  exercises: HistoryExercise[];
};

const toneWash: Record<WorkoutTone, string> = {
  sky: 'from-[var(--tone-sky-from)] to-[var(--tone-sky-to)]',
  mist: 'from-[var(--tone-mist-from)] to-[var(--tone-mist-to)]',
  slate: 'from-[var(--tone-slate-from)] to-[var(--tone-slate-to)]',
  ink: 'from-[var(--panel-ink)] to-[var(--panel-ink-end)]',
};

export function toneForWorkout(workoutId: string) {
  const workout = workouts.find((item) => item.id === workoutId);
  return toneWash[workout?.tone ?? 'sky'];
}

export function formatVolume(volume: number) {
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}k`;
  return String(volume);
}

export function isoDateFromMs(ms: number) {
  const date = new Date(ms);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dateLabelFromIso(iso: string, now = new Date()) {
  const today = isoDateFromMs(now.getTime());
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterday = isoDateFromMs(yesterdayDate.getTime());

  if (iso === today) return 'Today';
  if (iso === yesterday) return 'Yesterday';

  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function computeVolume(session: Pick<HistorySession, 'exercises'>) {
  return session.exercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.sets.reduce(
        (setSum, set) => (set.isWarmup ? setSum : setSum + set.weight * set.reps),
        0,
      ),
    0,
  );
}

export function withRecalculatedVolume(session: HistorySession): HistorySession {
  return {
    ...session,
    volume: Math.round(computeVolume(session)),
    dateLabel: dateLabelFromIso(session.date),
  };
}

export function sessionFromWorkout(
  workout: WorkoutSession,
  durationMs: number,
  finishedAt = Date.now(),
): HistorySession {
  const exercises = workout.exercises
    .filter((exercise) => exercise.sets.length > 0)
    .map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      sets: exercise.sets.map((set) => ({
        weight: set.weight,
        reps: set.reps,
        isWarmup: set.isWarmup,
        rpe: set.rpe,
        note: set.note,
      })),
    }));

  const date = isoDateFromMs(finishedAt);

  return {
    id: `h_${finishedAt}`,
    title: workout.title,
    workoutId: workout.workoutId,
    date,
    dateLabel: dateLabelFromIso(date, new Date(finishedAt)),
    durationMin: Math.max(1, Math.round(durationMs / 60000)),
    volume: Math.round(computeVolume({ exercises })),
    tone: toneForWorkout(workout.workoutId),
    exercises,
  };
}

/** Demo seed — used once on first launch. */
export const seedHistorySessions: HistorySession[] = [
  {
    id: 'seed_h1',
    title: 'Upper Chest Focus',
    workoutId: 'upper-chest',
    date: isoDateFromMs(Date.now()),
    dateLabel: 'Today',
    durationMin: 42,
    volume: 8420,
    tone: toneWash.sky,
    exercises: [
      {
        id: 'bench',
        name: 'Bench Press',
        sets: [
          { weight: 80, reps: 8 },
          { weight: 80, reps: 8 },
          { weight: 80, reps: 7 },
          { weight: 77.5, reps: 6 },
        ],
      },
      {
        id: 'incline-db',
        name: 'Incline Dumbbell Press',
        sets: [
          { weight: 28, reps: 10 },
          { weight: 28, reps: 9 },
          { weight: 26, reps: 10 },
        ],
      },
      {
        id: 'cable-fly',
        name: 'Cable Fly',
        sets: [
          { weight: 15, reps: 15 },
          { weight: 15, reps: 12 },
          { weight: 12.5, reps: 12 },
        ],
      },
    ],
  },
  {
    id: 'seed_h2',
    title: 'Machine Only',
    workoutId: 'machine-only',
    date: isoDateFromMs(Date.now() - 2 * 24 * 60 * 60 * 1000),
    dateLabel: dateLabelFromIso(isoDateFromMs(Date.now() - 2 * 24 * 60 * 60 * 1000)),
    durationMin: 38,
    volume: 6120,
    tone: toneWash.mist,
    exercises: [
      {
        id: 'chest-press',
        name: 'Chest Press Machine',
        sets: [
          { weight: 55, reps: 10 },
          { weight: 55, reps: 10 },
          { weight: 50, reps: 12 },
        ],
      },
      {
        id: 'lat-pulldown',
        name: 'Lat Pulldown',
        sets: [
          { weight: 50, reps: 10 },
          { weight: 50, reps: 9 },
          { weight: 45, reps: 10 },
        ],
      },
      {
        id: 'leg-press',
        name: 'Leg Press',
        sets: [
          { weight: 110, reps: 12 },
          { weight: 110, reps: 12 },
          { weight: 100, reps: 12 },
          { weight: 100, reps: 10 },
        ],
      },
    ],
  },
  {
    id: 'seed_h3',
    title: 'Strength Day',
    workoutId: 'strength-a',
    date: isoDateFromMs(Date.now() - 4 * 24 * 60 * 60 * 1000),
    dateLabel: dateLabelFromIso(isoDateFromMs(Date.now() - 4 * 24 * 60 * 60 * 1000)),
    durationMin: 50,
    volume: 9240,
    tone: toneWash.ink,
    exercises: [
      {
        id: 'squat',
        name: 'Back Squat',
        sets: [
          { weight: 100, reps: 5 },
          { weight: 100, reps: 5 },
          { weight: 100, reps: 5 },
          { weight: 95, reps: 5 },
        ],
      },
      {
        id: 'ohp',
        name: 'Overhead Press',
        sets: [
          { weight: 50, reps: 6 },
          { weight: 50, reps: 6 },
          { weight: 47.5, reps: 6 },
        ],
      },
    ],
  },
];
