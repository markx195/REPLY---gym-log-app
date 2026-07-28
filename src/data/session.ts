export type PreviousSet = {
  weight: number;
  reps: number;
};

export type LoggedSet = {
  id: string;
  weight: number;
  reps: number;
  completedAt: number;
  isWarmup?: boolean;
  rpe?: number;
  note?: string;
};

export type SessionExercise = {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
  suggestedWeight: number;
  suggestedReps?: number;
  progressionNote?: string;
  lastWeight: number;
  lastReps: number;
  previousDate: string;
  previousSets: PreviousSet[];
  restSeconds: number;
  unit: string;
  weightStep: number;
  sets: LoggedSet[];
};

export type WorkoutSession = {
  workoutId: string;
  title: string;
  startedAt: number;
  exercises: SessionExercise[];
};

export const workoutSessions: Record<string, Omit<WorkoutSession, 'startedAt'>> = {
  'upper-chest': {
    workoutId: 'upper-chest',
    title: 'Upper Chest Focus',
    exercises: [
      {
        id: 'bench',
        name: 'Bench Press',
        targetSets: 4,
        targetReps: 8,
        suggestedWeight: 82.5,
        lastWeight: 80,
        lastReps: 8,
        previousDate: 'Sat, Jul 25',
        previousSets: [
          { weight: 80, reps: 8 },
          { weight: 80, reps: 8 },
          { weight: 80, reps: 7 },
          { weight: 77.5, reps: 6 },
        ],
        restSeconds: 90,
        unit: 'kg',
        weightStep: 2.5,
        sets: [],
      },
      {
        id: 'incline-db',
        name: 'Incline Dumbbell Press',
        targetSets: 3,
        targetReps: 10,
        suggestedWeight: 30,
        lastWeight: 28,
        lastReps: 10,
        previousDate: 'Sat, Jul 25',
        previousSets: [
          { weight: 28, reps: 10 },
          { weight: 28, reps: 9 },
          { weight: 26, reps: 10 },
        ],
        restSeconds: 75,
        unit: 'kg',
        weightStep: 2,
        sets: [],
      },
      {
        id: 'cable-fly',
        name: 'Cable Fly',
        targetSets: 3,
        targetReps: 12,
        suggestedWeight: 15,
        lastWeight: 15,
        lastReps: 12,
        previousDate: 'Sat, Jul 25',
        previousSets: [
          { weight: 15, reps: 15 },
          { weight: 15, reps: 12 },
          { weight: 12.5, reps: 12 },
        ],
        restSeconds: 60,
        unit: 'kg',
        weightStep: 2.5,
        sets: [],
      },
      {
        id: 'overhead-ext',
        name: 'Overhead Tricep Extension',
        targetSets: 3,
        targetReps: 12,
        suggestedWeight: 25,
        lastWeight: 22.5,
        lastReps: 12,
        previousDate: 'Sat, Jul 25',
        previousSets: [
          { weight: 22.5, reps: 12 },
          { weight: 22.5, reps: 11 },
          { weight: 20, reps: 12 },
        ],
        restSeconds: 60,
        unit: 'kg',
        weightStep: 2.5,
        sets: [],
      },
    ],
  },
  'machine-only': {
    workoutId: 'machine-only',
    title: 'Machine Only',
    exercises: [
      {
        id: 'chest-press',
        name: 'Chest Press Machine',
        targetSets: 3,
        targetReps: 10,
        suggestedWeight: 60,
        lastWeight: 55,
        lastReps: 10,
        previousDate: 'Thu, Jul 23',
        previousSets: [
          { weight: 55, reps: 10 },
          { weight: 55, reps: 10 },
          { weight: 50, reps: 12 },
        ],
        restSeconds: 75,
        unit: 'kg',
        weightStep: 5,
        sets: [],
      },
      {
        id: 'lat-pulldown',
        name: 'Lat Pulldown',
        targetSets: 3,
        targetReps: 10,
        suggestedWeight: 50,
        lastWeight: 50,
        lastReps: 10,
        previousDate: 'Thu, Jul 23',
        previousSets: [
          { weight: 50, reps: 10 },
          { weight: 50, reps: 9 },
          { weight: 45, reps: 10 },
        ],
        restSeconds: 75,
        unit: 'kg',
        weightStep: 5,
        sets: [],
      },
      {
        id: 'leg-press',
        name: 'Leg Press',
        targetSets: 4,
        targetReps: 12,
        suggestedWeight: 120,
        lastWeight: 110,
        lastReps: 12,
        previousDate: 'Thu, Jul 23',
        previousSets: [
          { weight: 110, reps: 12 },
          { weight: 110, reps: 12 },
          { weight: 100, reps: 12 },
          { weight: 100, reps: 10 },
        ],
        restSeconds: 90,
        unit: 'kg',
        weightStep: 10,
        sets: [],
      },
    ],
  },
};

export type ExerciseHistoryHint = {
  lastWeight: number;
  lastReps: number;
  previousSets: PreviousSet[];
  previousDate: string;
  suggestedWeight: number;
  suggestedReps?: number;
  progressionNote?: string;
};

export function createSession(
  workoutId: string,
  historyLookup?: (exerciseId: string) => ExerciseHistoryHint | null,
  options?: { defaultRestSeconds?: number; unit?: 'kg' | 'lbs' },
): WorkoutSession {
  const template = workoutSessions[workoutId] ?? workoutSessions['upper-chest'];
  return {
    ...template,
    startedAt: Date.now(),
    exercises: template.exercises.map((exercise) => {
      const restSeconds = options?.defaultRestSeconds ?? exercise.restSeconds;
      const unit = options?.unit ?? exercise.unit;
      const fromHistory = historyLookup?.(exercise.id) ?? null;
      if (!fromHistory) {
        return {
          ...exercise,
          restSeconds,
          unit,
          sets: [],
          previousSets: [...exercise.previousSets],
          suggestedReps: exercise.targetReps,
        };
      }

      return {
        ...exercise,
        restSeconds,
        unit,
        sets: [],
        lastWeight: fromHistory.lastWeight,
        lastReps: fromHistory.lastReps,
        previousSets: fromHistory.previousSets,
        previousDate: fromHistory.previousDate,
        suggestedWeight: fromHistory.suggestedWeight,
        suggestedReps: fromHistory.suggestedReps ?? exercise.targetReps,
        progressionNote: fromHistory.progressionNote,
      };
    }),
  };
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
