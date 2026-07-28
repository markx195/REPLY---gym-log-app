import type { PrimaryGoal, FitnessLevel } from '@/lib/preferences-store';

export type ProgressionInput = {
  lastWeight: number;
  lastReps: number;
  targetReps: number;
  weightStep: number;
  /** Working sets from last session for this exercise */
  previousSets: Array<{ weight: number; reps: number }>;
  goal?: PrimaryGoal;
  level?: FitnessLevel;
};

export type ProgressionSuggestion = {
  weight: number;
  reps: number;
  reasonEn: string;
  reasonVi: string;
};

function roundToStep(value: number, step: number) {
  if (step <= 0) return Number(value.toFixed(2));
  return Number((Math.round(value / step) * step).toFixed(2));
}

/**
 * Double progression: hit all sets at/above target reps → bump weight;
 * otherwise keep weight and push reps; missed badly → slight deload.
 */
export function suggestProgression(input: ProgressionInput): ProgressionSuggestion {
  const {
    lastWeight,
    lastReps,
    targetReps,
    weightStep,
    previousSets,
    goal = 'consistency',
    level = 'beginner',
  } = input;

  const working = previousSets.length > 0 ? previousSets : [{ weight: lastWeight, reps: lastReps }];
  const allHitTarget = working.every((set) => set.reps >= targetReps);
  const avgReps =
    working.reduce((sum, set) => sum + set.reps, 0) / Math.max(working.length, 1);
  const minReps = Math.min(...working.map((set) => set.reps));

  const step =
    level === 'advanced' ? weightStep : level === 'beginner' ? weightStep : weightStep;

  // Failed session — deload slightly
  if (minReps <= Math.max(1, targetReps - 4) || avgReps < targetReps * 0.7) {
    const weight = roundToStep(Math.max(0, lastWeight - step), step);
    return {
      weight,
      reps: targetReps,
      reasonEn: 'Last session dipped — slight deload to rebuild quality.',
      reasonVi: 'Buổi trước yếu hơn — giảm nhẹ tạ để lấy lại form.',
    };
  }

  // Strength bias: prefer weight bumps sooner
  if (goal === 'strength' && allHitTarget) {
    return {
      weight: roundToStep(lastWeight + step, step),
      reps: Math.max(3, targetReps - 1),
      reasonEn: 'All sets hit target — add load for strength.',
      reasonVi: 'Đủ reps mục tiêu — tăng tạ để phát triển sức mạnh.',
    };
  }

  // Hypertrophy / muscle: double progression
  if (allHitTarget) {
    return {
      weight: roundToStep(lastWeight + step, step),
      reps: targetReps,
      reasonEn: 'Hit every set at target reps — time to add weight.',
      reasonVi: 'Đủ reps mọi set — đến lúc tăng tạ.',
    };
  }

  if (avgReps >= targetReps - 1) {
    return {
      weight: lastWeight,
      reps: Math.min(targetReps + 1, targetReps + 2),
      reasonEn: 'Close to target — keep weight, push +1 rep.',
      reasonVi: 'Gần mục tiêu — giữ tạ, cố +1 rep.',
    };
  }

  return {
    weight: lastWeight,
    reps: targetReps,
    reasonEn: 'Repeat last weight and chase target reps.',
    reasonVi: 'Giữ tạ lần trước và nhắm đủ reps mục tiêu.',
  };
}
