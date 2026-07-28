export type WorkoutMood =
  | 'All'
  | '45 min'
  | 'Upper'
  | 'Machines'
  | 'Home'
  | 'Travel'
  | 'Strength'
  | 'Hypertrophy';

export type WorkoutTone = 'sky' | 'mist' | 'slate' | 'ink';

export type Workout = {
  id: string;
  title: string;
  subtitle: string;
  durationMin: number;
  focus: string;
  equipment: string;
  mood: WorkoutMood[];
  exercises: number;
  tone: WorkoutTone;
  featured?: boolean;
};

export const moods: WorkoutMood[] = [
  'All',
  '45 min',
  'Upper',
  'Machines',
  'Home',
  'Travel',
  'Strength',
  'Hypertrophy',
];

export const toneStyles: Record<
  WorkoutTone,
  { wash: string; mark: string; soft: string }
> = {
  sky: {
    wash: 'from-[var(--tone-sky-from)] via-[var(--tone-sky-via)] to-[var(--tone-sky-to)]',
    mark: 'bg-[var(--accent)]',
    soft: 'bg-[var(--accent-mist)]',
  },
  mist: {
    wash: 'from-[var(--tone-mist-from)] via-[var(--tone-mist-via)] to-[var(--tone-mist-to)]',
    mark: 'bg-[var(--tone-mist-mark)]',
    soft: 'bg-[var(--wash-b)]',
  },
  slate: {
    wash: 'from-[var(--tone-slate-from)] via-[var(--tone-slate-via)] to-[var(--tone-slate-to)]',
    mark: 'bg-[var(--tone-slate-mark)]',
    soft: 'bg-[var(--wash-d)]',
  },
  ink: {
    wash: 'from-[var(--panel-ink)] via-[var(--panel-ink-mid)] to-[var(--panel-ink-end)]',
    mark: 'bg-white/80',
    soft: 'bg-[var(--panel-ink)]',
  },
};

export const workouts: Workout[] = [
  {
    id: 'upper-chest',
    title: 'Upper Chest Focus',
    subtitle: 'Press variations with intelligent rotation.',
    durationMin: 42,
    focus: 'Chest · Triceps',
    equipment: 'Barbell · Cables',
    mood: ['All', 'Upper', '45 min', 'Hypertrophy'],
    exercises: 6,
    tone: 'sky',
    featured: true,
  },
  {
    id: 'machine-only',
    title: 'Machine Only',
    subtitle: 'Zero setup. Peak-hour friendly.',
    durationMin: 38,
    focus: 'Full Body',
    equipment: 'Machines',
    mood: ['All', 'Machines', '45 min'],
    exercises: 7,
    tone: 'mist',
  },
  {
    id: 'cable-density',
    title: 'Cable Density',
    subtitle: 'Continuous tension, no waiting on benches.',
    durationMin: 35,
    focus: 'Push · Arms',
    equipment: 'Cables',
    mood: ['All', 'Upper', '45 min', 'Hypertrophy'],
    exercises: 5,
    tone: 'slate',
  },
  {
    id: 'strength-a',
    title: 'Strength Day',
    subtitle: 'Heavy compounds. Low decision load.',
    durationMin: 50,
    focus: 'Squat · Press',
    equipment: 'Barbell',
    mood: ['All', 'Strength'],
    exercises: 5,
    tone: 'ink',
  },
  {
    id: 'home-minimal',
    title: 'Home Minimal',
    subtitle: 'Dumbbells and floor space only.',
    durationMin: 28,
    focus: 'Full Body',
    equipment: 'Dumbbells',
    mood: ['All', 'Home', 'Travel', '45 min'],
    exercises: 6,
    tone: 'sky',
  },
  {
    id: 'travel-hotel',
    title: 'Travel Workout',
    subtitle: 'Hotel gym or bodyweight fallback.',
    durationMin: 25,
    focus: 'Conditioning',
    equipment: 'Minimal',
    mood: ['All', 'Travel', 'Home'],
    exercises: 5,
    tone: 'mist',
  },
];

export const todayExercises = [
  {
    id: 'bench',
    name: 'Bench Press',
    sets: 4,
    reps: '6–8',
    lastWeight: 80,
    unit: 'kg',
  },
  {
    id: 'incline-db',
    name: 'Incline Dumbbell Press',
    sets: 3,
    reps: '8–10',
    lastWeight: 28,
    unit: 'kg',
  },
  {
    id: 'cable-fly',
    name: 'Cable Fly',
    sets: 3,
    reps: '12–15',
    lastWeight: 15,
    unit: 'kg',
  },
];
