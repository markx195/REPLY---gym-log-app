import { getExerciseById, muscleFilters } from '@/data/exercises/catalog';

/** Curated iconic covers so muscle tiles feel recognizable, not random alphabet hits. */
const MUSCLE_COVER_IDS: Record<(typeof muscleFilters)[number], string> = {
  chest: 'Barbell_Bench_Press_-_Medium_Grip',
  shoulders: 'Leverage_Shoulder_Press',
  lats: 'Wide-Grip_Lat_Pulldown',
  'middle back': 'Seated_Cable_Rows',
  quadriceps: 'Leg_Press',
  hamstrings: 'Lying_Leg_Curls',
  glutes: 'Barbell_Glute_Bridge',
  biceps: 'EZ-Bar_Curl',
  triceps: 'Triceps_Pushdown',
  abdominals: 'Cable_Crunch',
  calves: 'Standing_Calf_Raises',
  'lower back': 'Hyperextensions_Back_Extensions_',
  forearms: 'Palms-Up_Barbell_Wrist_Curl_Over_A_Bench',
  traps: 'Barbell_Shrug',
  adductors: 'Thigh_Adductor',
  abductors: 'Thigh_Abductor',
  neck: 'Neck_Press',
};

export function muscleCoverImage(muscle: string): string | null {
  const curated = MUSCLE_COVER_IDS[muscle as keyof typeof MUSCLE_COVER_IDS];
  if (curated) {
    const hit = getExerciseById(curated);
    if (hit?.image) return hit.image;
  }
  return null;
}

export type MuscleTile = {
  id: string;
  image: string | null;
};

export function muscleTiles(): MuscleTile[] {
  return muscleFilters.map((id) => ({
    id,
    image: muscleCoverImage(id),
  }));
}
