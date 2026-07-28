import type { SessionExercise } from '@/data/session';
import {
  findSwapCandidates,
  getExerciseById,
  type CatalogExercise,
} from '@/data/exercises/catalog';

export type ExerciseAlternative = {
  id: string;
  name: string;
  suggestedWeight: number;
  lastWeight: number;
  lastReps: number;
  targetReps: number;
  weightStep: number;
  unit: string;
  reason: string;
  image?: string | null;
  equipment?: string;
  primaryMuscles?: string[];
};

function weightStepFor(equipment: string) {
  if (equipment === 'machine' || equipment === 'barbell') return 2.5;
  if (equipment === 'dumbbell' || equipment === 'kettlebells') return 2;
  if (equipment === 'cable') return 2.5;
  return 1;
}

function reasonFor(current: CatalogExercise | undefined, alt: CatalogExercise) {
  if (!current) return 'Similar pattern';
  const shared = alt.primaryMuscles.filter((m) => current.primaryMuscles.includes(m));
  if (shared.length && alt.equipment !== current.equipment) {
    return `Same ${shared[0]} · ${alt.equipment}`;
  }
  if (shared.length) return `Keeps ${shared[0]} volume`;
  if (alt.force && alt.force === current.force) return `Same ${alt.force} pattern`;
  return 'Close alternative';
}

function toAlternative(
  current: SessionExercise,
  alt: CatalogExercise,
  currentCatalog?: CatalogExercise,
): ExerciseAlternative {
  const step = weightStepFor(alt.equipment);
  const base =
    alt.equipment === 'body only'
      ? 0
      : Math.max(0, Number((current.suggestedWeight * 0.9).toFixed(1)));

  return {
    id: alt.id,
    name: alt.name,
    suggestedWeight: base,
    lastWeight: base,
    lastReps: current.targetReps,
    targetReps: current.targetReps,
    weightStep: step,
    unit: current.unit,
    reason: reasonFor(currentCatalog, alt),
    image: alt.image,
    equipment: alt.equipment,
    primaryMuscles: alt.primaryMuscles,
  };
}

/** Dynamic swaps from free-exercise-db catalog. */
export function getExerciseAlternatives(
  sessionExercise: SessionExercise,
  availableGearIds?: string[],
): ExerciseAlternative[] {
  const currentCatalog = getExerciseById(sessionExercise.id);
  return findSwapCandidates(sessionExercise.id, 6, availableGearIds).map((alt) =>
    toAlternative(sessionExercise, alt, currentCatalog),
  );
}

export function applySwap(
  current: SessionExercise,
  alt: ExerciseAlternative,
): SessionExercise {
  return {
    ...current,
    id: alt.id,
    name: alt.name,
    suggestedWeight: alt.suggestedWeight,
    lastWeight: alt.lastWeight,
    lastReps: alt.lastReps,
    targetReps: alt.targetReps,
    weightStep: alt.weightStep,
    unit: alt.unit,
    previousSets: Array.from({ length: current.targetSets }, (_, index) => ({
      weight: alt.lastWeight,
      reps: index === 0 ? alt.lastReps : Math.max(alt.lastReps - 1, 6),
    })),
    previousDate: 'Alt · today',
    sets: [],
  };
}
