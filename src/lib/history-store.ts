import type { HistorySession } from '@/data/history';
import {
  dateLabelFromIso,
  seedHistorySessions,
  sessionFromWorkout,
} from '@/data/history';
import type { WorkoutSession } from '@/data/session';

const HISTORY_KEY = 'reply.history.v1';
const SEEDED_KEY = 'reply.history.seeded';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadHistory(): HistorySession[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as HistorySession[];
      if (Array.isArray(parsed)) return parsed;
    }

    // Soft launch: start empty — do not inject demo sessions as real history.
    if (!window.localStorage.getItem(SEEDED_KEY)) {
      window.localStorage.setItem(SEEDED_KEY, '1');
    }
  } catch {
    // ignore corrupt storage
  }

  return [];
}

/** Optional: load sample sessions for internal demos / screenshots. */
export function loadDemoHistorySeed(): HistorySession[] {
  if (!canUseStorage()) return [...seedHistorySessions];
  saveHistory([...seedHistorySessions]);
  window.localStorage.setItem(SEEDED_KEY, '1');
  return [...seedHistorySessions];
}

export function saveHistory(sessions: HistorySession[]) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
  } catch {
    // ignore quota errors
  }
}

export function getHistoryById(
  sessions: HistorySession[],
  id: string,
): HistorySession | undefined {
  return sessions.find((session) => session.id === id);
}

export function persistCompletedWorkout(
  sessions: HistorySession[],
  workout: WorkoutSession,
  durationMs: number,
): HistorySession[] {
  const loggedExercises = workout.exercises.filter((exercise) => exercise.sets.length > 0);
  if (loggedExercises.length === 0) return sessions;

  const entry = sessionFromWorkout(workout, durationMs);
  const next = [entry, ...sessions.filter((item) => item.id !== entry.id)];
  saveHistory(next);
  return next;
}

export function updateHistorySession(
  sessions: HistorySession[],
  updated: HistorySession,
): HistorySession[] {
  const next = sessions.map((session) =>
    session.id === updated.id ? updated : session,
  );
  saveHistory(next);
  return next;
}

export function deleteHistorySession(
  sessions: HistorySession[],
  sessionId: string,
): HistorySession[] {
  const next = sessions.filter((session) => session.id !== sessionId);
  saveHistory(next);
  return next;
}

export function clearHistory() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(HISTORY_KEY);
  window.localStorage.setItem(SEEDED_KEY, '1');
}

export type LiveWeeklyStats = {
  sessionsDone: number;
  sessionsGoal: number;
  totalMinutes: number;
  streak: number;
  weekDays: Array<{ label: string; done: boolean }>;
};

function isoDay(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Monday-start week labels M..S */
export function computeWeeklyStats(
  sessions: HistorySession[],
  sessionsGoal = 4,
): LiveWeeklyStats {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // Mon=0
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  monday.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = isoDay(date);
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return {
      label: labels[index],
      done: sessions.some((session) => session.date === key),
      key,
    };
  });

  const weekSessions = sessions.filter((session) =>
    weekDays.some((dayInfo) => dayInfo.key === session.date),
  );

  const totalMinutes = weekSessions.reduce(
    (sum, session) => sum + session.durationMin,
    0,
  );

  const daySet = new Set(sessions.map((session) => session.date));
  let streak = 0;
  const cursor = new Date(now);
  if (!daySet.has(isoDay(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (daySet.has(isoDay(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    sessionsDone: weekSessions.length,
    sessionsGoal,
    totalMinutes,
    streak,
    weekDays: weekDays.map(({ label, done }) => ({ label, done })),
  };
}

/** Latest logged sets for an exercise id across history (most recent first). */
import { suggestProgression } from '@/lib/progression';
import type { FitnessLevel, PrimaryGoal } from '@/lib/preferences-store';

export function getLastExercisePerformance(
  sessions: HistorySession[],
  exerciseId: string,
  options?: {
    targetReps?: number;
    weightStep?: number;
    goal?: PrimaryGoal;
    level?: FitnessLevel;
    locale?: 'en' | 'vi';
  },
) {
  for (const session of sessions) {
    const exercise = session.exercises.find((item) => item.id === exerciseId);
    if (exercise && exercise.sets.length > 0) {
      const working = exercise.sets.filter((set) => !set.isWarmup);
      const pool = working.length > 0 ? working : exercise.sets;
      const last = pool[pool.length - 1];
      const previousSets = pool.map((set) => ({
        weight: set.weight,
        reps: set.reps,
      }));
      const targetReps = options?.targetReps ?? last.reps;
      const weightStep = options?.weightStep ?? 2.5;
      const suggestion = suggestProgression({
        lastWeight: last.weight,
        lastReps: last.reps,
        targetReps,
        weightStep,
        previousSets,
        goal: options?.goal,
        level: options?.level,
      });

      return {
        lastWeight: last.weight,
        lastReps: last.reps,
        previousSets,
        previousDate: dateLabelFromIso(session.date),
        suggestedWeight: suggestion.weight,
        suggestedReps: suggestion.reps,
        progressionNote:
          options?.locale === 'vi' ? suggestion.reasonVi : suggestion.reasonEn,
      };
    }
  }
  return null;
}

export type PersonalRecord = {
  exerciseId: string;
  name: string;
  weight: number;
  reps: number;
  dateLabel: string;
};

export type DayVolume = {
  label: string;
  volume: number;
  date: string;
};

export type ProgressInsights = {
  totalVolume: number;
  totalSessions: number;
  weekVolume: number;
  lastWeekVolume: number;
  volumeDeltaPct: number | null;
  dayVolumes: DayVolume[];
  /** Oldest → newest, last 4 calendar weeks (Mon–Sun). */
  weekTrend: Array<{ label: string; volume: number; sessions: number }>;
  personalRecords: PersonalRecord[];
  bestSession: HistorySession | null;
  muscleVolume: Array<{ muscle: string; volume: number }>;
  sessionsThisWeek: number;
  avgSessionMin: number;
};

export function computeProgressInsights(sessions: HistorySession[]): ProgressInsights {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  monday.setHours(0, 0, 0, 0);

  const lastMonday = new Date(monday);
  lastMonday.setDate(monday.getDate() - 7);

  const dayVolumes: DayVolume[] = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = isoDay(date);
    const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const volume = sessions
      .filter((session) => session.date === key)
      .reduce((sum, session) => sum + session.volume, 0);
    return { label: labels[index], volume, date: key };
  });

  const weekVolume = dayVolumes.reduce((sum, dayInfo) => sum + dayInfo.volume, 0);
  const sessionsThisWeek = sessions.filter((session) => {
    const time = new Date(`${session.date}T12:00:00`).getTime();
    return time >= monday.getTime();
  }).length;

  const lastWeekVolume = sessions
    .filter((session) => {
      const time = new Date(`${session.date}T12:00:00`).getTime();
      return time >= lastMonday.getTime() && time < monday.getTime();
    })
    .reduce((sum, session) => sum + session.volume, 0);

  const volumeDeltaPct =
    lastWeekVolume > 0
      ? Math.round(((weekVolume - lastWeekVolume) / lastWeekVolume) * 100)
      : weekVolume > 0
        ? 100
        : null;

  const weekTrend = Array.from({ length: 4 }, (_, index) => {
    const offset = 3 - index; // oldest first
    const start = new Date(monday);
    start.setDate(monday.getDate() - offset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const inWeek = sessions.filter((session) => {
      const time = new Date(`${session.date}T12:00:00`).getTime();
      return time >= start.getTime() && time < end.getTime();
    });
    const label =
      offset === 0
        ? 'Now'
        : offset === 1
          ? '-1w'
          : offset === 2
            ? '-2w'
            : '-3w';
    return {
      label,
      volume: inWeek.reduce((sum, s) => sum + s.volume, 0),
      sessions: inWeek.length,
    };
  });

  const prMap = new Map<string, PersonalRecord>();
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        if (set.isWarmup) continue;
        const existing = prMap.get(exercise.id);
        const better =
          !existing ||
          set.weight > existing.weight ||
          (set.weight === existing.weight && set.reps > existing.reps);
        if (better) {
          prMap.set(exercise.id, {
            exerciseId: exercise.id,
            name: exercise.name,
            weight: set.weight,
            reps: set.reps,
            dateLabel: session.dateLabel,
          });
        }
      }
    }
  }

  const personalRecords = [...prMap.values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);

  const muscleMap = new Map<string, number>();
  for (const session of sessions) {
    const time = new Date(`${session.date}T12:00:00`).getTime();
    if (time < monday.getTime()) continue;
    for (const exercise of session.exercises) {
      const key = exercise.name.split(' ')[0] || exercise.name;
      const vol = exercise.sets
        .filter((set) => !set.isWarmup)
        .reduce((sum, set) => sum + set.weight * set.reps, 0);
      muscleMap.set(key, (muscleMap.get(key) ?? 0) + vol);
    }
  }
  const muscleVolume = [...muscleMap.entries()]
    .map(([muscle, volume]) => ({ muscle, volume }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  const bestSession =
    sessions.length === 0
      ? null
      : sessions.reduce((best, session) =>
          session.volume > best.volume ? session : best,
        );

  const avgSessionMin =
    sessions.length === 0
      ? 0
      : Math.round(
          sessions.reduce((sum, s) => sum + s.durationMin, 0) / sessions.length,
        );

  return {
    totalVolume: sessions.reduce((sum, session) => sum + session.volume, 0),
    totalSessions: sessions.length,
    weekVolume,
    lastWeekVolume,
    volumeDeltaPct,
    dayVolumes,
    weekTrend,
    personalRecords,
    bestSession,
    muscleVolume,
    sessionsThisWeek,
    avgSessionMin,
  };
}
