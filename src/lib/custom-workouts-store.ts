import { getExerciseById, type CatalogExercise } from '@/data/exercises/catalog';
import { exerciseMatchesAnyGear } from '@/data/exercises/gear-catalog';
import type {
  ExerciseHistoryHint,
  SessionExercise,
  WorkoutSession,
} from '@/data/session';
import type { WorkoutTone } from '@/data/workouts';

export const CUSTOM_PREFIX = 'custom:';

export type CustomWorkout = {
  id: string;
  title: string;
  exerciseIds: string[];
  targetSets: number;
  targetReps: number;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = 'reply.customWorkouts.v1';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function toRecommendableId(customId: string) {
  return customId.startsWith(CUSTOM_PREFIX) ? customId : `${CUSTOM_PREFIX}${customId}`;
}

export function parseCustomWorkoutId(workoutId: string): string | null {
  if (!workoutId.startsWith(CUSTOM_PREFIX)) return null;
  return workoutId.slice(CUSTOM_PREFIX.length);
}

export function loadCustomWorkouts(): CustomWorkout[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomWorkout[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        Array.isArray(item.exerciseIds),
    );
  } catch {
    return [];
  }
}

export function saveCustomWorkouts(lists: CustomWorkout[]) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  } catch {
    // ignore quota
  }
}

export function upsertCustomWorkout(
  lists: CustomWorkout[],
  next: CustomWorkout,
): CustomWorkout[] {
  const without = lists.filter((item) => item.id !== next.id);
  const updated = [next, ...without].sort((a, b) => b.updatedAt - a.updatedAt);
  saveCustomWorkouts(updated);
  return updated;
}

export function deleteCustomWorkout(
  lists: CustomWorkout[],
  id: string,
): CustomWorkout[] {
  const next = lists.filter((item) => item.id !== id);
  saveCustomWorkouts(next);
  return next;
}

export function getCustomWorkout(
  lists: CustomWorkout[],
  idOrPrefixed: string,
): CustomWorkout | undefined {
  const id = parseCustomWorkoutId(idOrPrefixed) ?? idOrPrefixed;
  return lists.find((item) => item.id === id);
}

function weightStepFor(equipment: string) {
  if (equipment === 'machine' || equipment === 'barbell') return 2.5;
  if (equipment === 'dumbbell' || equipment === 'kettlebells') return 2;
  if (equipment === 'cable') return 2.5;
  return 1;
}

function restFor(mechanic: CatalogExercise['mechanic']) {
  return mechanic === 'compound' ? 90 : 60;
}

export function estimateCustomDurationMin(list: CustomWorkout) {
  const perExercise = list.targetSets * 2.5 + 1.5;
  return Math.max(15, Math.round(list.exerciseIds.length * perExercise));
}

export function customFocusLabel(list: CustomWorkout, locale: 'en' | 'vi' = 'en') {
  const muscles = list.exerciseIds
    .map((id) => getExerciseById(id)?.primaryMuscles[0])
    .filter((m): m is string => Boolean(m));
  if (muscles.length === 0) {
    return locale === 'vi' ? 'List của bạn' : 'Your list';
  }
  const counts = new Map<string, number>();
  for (const m of muscles) counts.set(m, (counts.get(m) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([m]) => m);
  return top.join(' · ');
}

export function customTone(list: CustomWorkout): WorkoutTone {
  const n = list.exerciseIds.length;
  if (n >= 7) return 'ink';
  if (n >= 5) return 'slate';
  if (n >= 3) return 'mist';
  return 'sky';
}

export function customFitsGear(list: CustomWorkout, availableGearIds: string[]) {
  if (list.exerciseIds.length === 0) return false;
  if (availableGearIds.length === 0) return true;
  const resolved = list.exerciseIds
    .map((id) => getExerciseById(id))
    .filter((item): item is CatalogExercise => Boolean(item));
  if (resolved.length === 0) return false;
  const matched = resolved.filter((ex) => exerciseMatchesAnyGear(ex, availableGearIds));
  return matched.length / resolved.length >= 0.6;
}

export function createCustomWorkout(input: {
  title: string;
  exerciseIds: string[];
  targetSets?: number;
  targetReps?: number;
  id?: string;
}): CustomWorkout {
  const now = Date.now();
  return {
    id: input.id ?? `cw_${now.toString(36)}`,
    title: input.title.trim() || 'My list',
    exerciseIds: [...input.exerciseIds],
    targetSets: input.targetSets ?? 3,
    targetReps: input.targetReps ?? 10,
    createdAt: now,
    updatedAt: now,
  };
}

export function customWorkoutFromSession(
  session: WorkoutSession,
  title?: string,
): CustomWorkout {
  const exerciseIds = session.exercises
    .map((item) => getExerciseById(item.id)?.id ?? null)
    .filter((id): id is string => Boolean(id));

  const fallbackIds =
    exerciseIds.length > 0 ? exerciseIds : session.exercises.map((item) => item.id);

  const avgSets =
    session.exercises.length > 0
      ? Math.round(
          session.exercises.reduce((sum, item) => sum + Math.max(item.targetSets, item.sets.length), 0) /
            session.exercises.length,
        )
      : 3;
  const avgReps =
    session.exercises.length > 0
      ? Math.round(
          session.exercises.reduce((sum, item) => sum + item.targetReps, 0) /
            session.exercises.length,
        )
      : 10;

  return createCustomWorkout({
    title: title?.trim() || session.title,
    exerciseIds: fallbackIds,
    targetSets: Math.min(5, Math.max(2, avgSets)),
    targetReps: Math.min(15, Math.max(5, avgReps)),
  });
}

export function buildCustomSession(
  list: CustomWorkout,
  historyLookup?: (exerciseId: string) => ExerciseHistoryHint | null,
  options?: { defaultRestSeconds?: number; unit?: 'kg' | 'lbs' },
): WorkoutSession {
  const exercises: SessionExercise[] = [];

  for (const id of list.exerciseIds) {
    const catalog = getExerciseById(id);
    if (!catalog) continue;
    const step = weightStepFor(catalog.equipment);
    const fromHistory = historyLookup?.(catalog.id) ?? null;
    const lastWeight = fromHistory?.lastWeight ?? (catalog.equipment === 'body only' ? 0 : 20);
    const lastReps = fromHistory?.lastReps ?? list.targetReps;
    const suggestedWeight = fromHistory?.suggestedWeight ?? lastWeight;
    const suggestedReps = fromHistory?.suggestedReps ?? list.targetReps;

    exercises.push({
      id: catalog.id,
      name: catalog.name,
      targetSets: list.targetSets,
      targetReps: list.targetReps,
      suggestedWeight,
      suggestedReps,
      progressionNote: fromHistory?.progressionNote,
      lastWeight,
      lastReps,
      previousDate: fromHistory?.previousDate ?? '—',
      previousSets: fromHistory?.previousSets ?? [],
      restSeconds: options?.defaultRestSeconds ?? restFor(catalog.mechanic),
      unit: options?.unit ?? 'kg',
      weightStep: step,
      sets: [],
    });
  }

  return {
    workoutId: toRecommendableId(list.id),
    title: list.title,
    startedAt: Date.now(),
    exercises,
  };
}
