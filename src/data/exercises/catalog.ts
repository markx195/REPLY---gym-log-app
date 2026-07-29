/**
 * Normalized catalog from yuhonas/free-exercise-db (Unlicense / public domain metadata).
 * Images point at GitHub raw CDN — treat as provisional (image copyright unclear upstream).
 * Source: https://github.com/yuhonas/free-exercise-db
 */
import catalogJson from '@/data/exercises/catalog.json';
import aliasesJson from '@/data/exercises/aliases.json';
import { exerciseMatchesAnyGear } from '@/data/exercises/gear-catalog';

export type ExerciseLevel = 'beginner' | 'intermediate' | 'advanced';
export type ExerciseForce = 'push' | 'pull' | 'static' | null;
export type ExerciseMechanic = 'compound' | 'isolation' | null;

export type CatalogExercise = {
  id: string;
  slug: string;
  name: string;
  force: ExerciseForce;
  level: ExerciseLevel;
  mechanic: ExerciseMechanic;
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  category: string;
  instructions: string[];
  image: string | null;
};

export const exerciseCatalog = catalogJson as CatalogExercise[];
export const exerciseAliases = aliasesJson as Record<string, string>;

const byId = new Map(exerciseCatalog.map((item) => [item.id, item]));

export const muscleFilters = [
  'chest',
  'shoulders',
  'lats',
  'middle back',
  'quadriceps',
  'hamstrings',
  'glutes',
  'biceps',
  'triceps',
  'abdominals',
  'calves',
  'lower back',
  'forearms',
  'traps',
  'adductors',
  'abductors',
  'neck',
] as const;

export const equipmentFilters = [
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'body only',
  'kettlebells',
  'bands',
] as const;

export type ExerciseCategory =
  | 'strength'
  | 'powerlifting'
  | 'olympic weightlifting'
  | 'strongman'
  | 'cardio'
  | 'hiit'
  | 'stretching'
  | 'warmup'
  | 'cooldown'
  | 'calisthenics';

export const categoryFilters: { id: ExerciseCategory; icon: string; en: string; vi: string }[] = [
  { id: 'strength', icon: '🏋️', en: 'Strength', vi: 'Sức mạnh' },
  { id: 'cardio', icon: '🏃', en: 'Cardio', vi: 'Cardio' },
  { id: 'hiit', icon: '⚡', en: 'HIIT', vi: 'HIIT' },
  { id: 'stretching', icon: '🧘', en: 'Stretching', vi: 'Giãn cơ' },
  { id: 'warmup', icon: '🔥', en: 'Warm-up', vi: 'Khởi động' },
  { id: 'cooldown', icon: '❄️', en: 'Cool-down', vi: 'Thả lỏng' },
  { id: 'calisthenics', icon: '🤸', en: 'Calisthenics', vi: 'Calisthenics' },
  { id: 'powerlifting', icon: '🏆', en: 'Powerlifting', vi: 'Powerlifting' },
  { id: 'olympic weightlifting', icon: '🥇', en: 'Olympic', vi: 'Cử tạ Olympic' },
  { id: 'strongman', icon: '💪', en: 'Strongman', vi: 'Strongman' },
];

export function getExerciseById(id: string): CatalogExercise | undefined {
  return byId.get(id) ?? byId.get(exerciseAliases[id] ?? '');
}

function matchesMuscle(exercise: CatalogExercise, muscle: string) {
  return (
    exercise.primaryMuscles.includes(muscle) ||
    exercise.secondaryMuscles.includes(muscle)
  );
}

export function searchExercises(
  query: string,
  opts?: {
    muscle?: string;
    equipment?: string;
    category?: string;
    availableGearIds?: string[];
    level?: ExerciseLevel;
    force?: Exclude<ExerciseForce, null>;
    limit?: number;
    offset?: number;
  },
): { items: CatalogExercise[]; total: number } {
  const q = query.trim().toLowerCase();
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;
  const matched: CatalogExercise[] = [];

  for (const exercise of exerciseCatalog) {
    if (opts?.muscle && !matchesMuscle(exercise, opts.muscle)) continue;
    if (opts?.equipment && exercise.equipment !== opts.equipment) continue;
    if (opts?.category && exercise.category !== opts.category) continue;
    if (
      opts?.availableGearIds &&
      !exerciseMatchesAnyGear(exercise, opts.availableGearIds)
    ) {
      continue;
    }
    if (opts?.level && exercise.level !== opts.level) continue;
    if (opts?.force && exercise.force !== opts.force) continue;
    if (
      q &&
      !exercise.name.toLowerCase().includes(q) &&
      !exercise.primaryMuscles.some((m) => m.includes(q)) &&
      !exercise.equipment.toLowerCase().includes(q) &&
      !exercise.category.toLowerCase().includes(q)
    ) {
      continue;
    }
    matched.push(exercise);
  }

  return {
    total: matched.length,
    items: matched.slice(offset, offset + limit),
  };
}

/** Find swap candidates that keep movement pattern close. */
export function findSwapCandidates(
  sessionExerciseId: string,
  limit = 6,
  availableGearIds?: string[],
): CatalogExercise[] {
  const current = getExerciseById(sessionExerciseId);
  if (!current) {
    return searchExercises('', {
      limit,
      availableGearIds,
    }).items;
  }

  return exerciseCatalog
    .filter((item) => item.id !== current.id)
    .filter((item) =>
      availableGearIds ? exerciseMatchesAnyGear(item, availableGearIds) : true,
    )
    .map((item) => {
      let score = 0;
      const sharedPrimary = item.primaryMuscles.filter((m) =>
        current.primaryMuscles.includes(m),
      ).length;
      score += sharedPrimary * 12;
      if (item.force && item.force === current.force) score += 8;
      if (item.mechanic && item.mechanic === current.mechanic) score += 4;
      if (item.equipment === current.equipment) score += 3;
      else score += 2;
      if (item.level === current.level) score += 1;
      return { item, score };
    })
    .filter((row) => row.score >= 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.item);
}

export function catalogStats() {
  return {
    total: exerciseCatalog.length,
    withImages: exerciseCatalog.filter((item) => Boolean(item.image)).length,
  };
}
