import type { AuthUser } from '@/lib/auth-store';
import type { CustomWorkout } from '@/lib/custom-workouts-store';
import type { HistorySession } from '@/data/history';
import type { UserPreferences } from '@/lib/preferences-store';
import {
  defaultReminder,
  type ReminderSettings,
} from '@/lib/reminder-store';

export type BackupPayload = {
  version: 1 | 2;
  exportedAt: string;
  user: AuthUser | null;
  preferences: UserPreferences | null;
  history: HistorySession[];
  customWorkouts: CustomWorkout[];
  favorites: string[];
  reminder: ReminderSettings | null;
};

export type BackupSummary = {
  exportedAt: string;
  userLabel: string;
  historyCount: number;
  customCount: number;
  favoritesCount: number;
  hasPreferences: boolean;
  hasReminder: boolean;
};

export type ImportMode = 'replace' | 'merge';

export type AppliedBackup = {
  user: AuthUser | null;
  preferences: UserPreferences | null;
  history: HistorySession[];
  customWorkouts: CustomWorkout[];
  favorites: string[];
  reminder: ReminderSettings | null;
};

export function buildBackupPayload(input: {
  user: AuthUser | null;
  preferences: UserPreferences | null;
  history: HistorySession[];
  customWorkouts: CustomWorkout[];
  favorites: string[];
  reminder?: ReminderSettings | null;
}): BackupPayload {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    user: input.user,
    preferences: input.preferences,
    history: input.history,
    customWorkouts: input.customWorkouts,
    favorites: input.favorites,
    reminder: input.reminder ?? null,
  };
}

function normalizeReminder(value: unknown): ReminderSettings | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<ReminderSettings>;
  const days = Array.isArray(raw.days)
    ? raw.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6)
    : [...defaultReminder.days];
  return {
    enabled: Boolean(raw.enabled),
    hour:
      typeof raw.hour === 'number'
        ? Math.min(23, Math.max(0, Math.round(raw.hour)))
        : defaultReminder.hour,
    days: days.length > 0 ? [...new Set(days)].sort((a, b) => a - b) : [...defaultReminder.days],
    lastPromptIso: typeof raw.lastPromptIso === 'string' ? raw.lastPromptIso : null,
    systemNotify: Boolean(raw.systemNotify),
  };
}

export function parseBackupPayload(raw: string): BackupPayload {
  const data = JSON.parse(raw) as Partial<BackupPayload>;
  if (!data || (data.version !== 1 && data.version !== 2)) {
    throw new Error('Unsupported backup version');
  }
  return {
    version: data.version,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    user: (data.user as AuthUser | null) ?? null,
    preferences: (data.preferences as UserPreferences | null) ?? null,
    history: Array.isArray(data.history) ? (data.history as HistorySession[]) : [],
    customWorkouts: Array.isArray(data.customWorkouts)
      ? (data.customWorkouts as CustomWorkout[])
      : [],
    favorites: Array.isArray(data.favorites)
      ? data.favorites.filter((v): v is string => typeof v === 'string')
      : [],
    reminder: normalizeReminder(data.reminder),
  };
}

export function summarizeBackup(
  payload: BackupPayload,
  locale: 'en' | 'vi' = 'en',
): BackupSummary {
  const userLabel = payload.user
    ? payload.user.name || payload.user.email || payload.user.mode
    : locale === 'vi'
      ? 'Không có tài khoản'
      : 'No account';

  return {
    exportedAt: payload.exportedAt,
    userLabel,
    historyCount: payload.history.length,
    customCount: payload.customWorkouts.length,
    favoritesCount: payload.favorites.length,
    hasPreferences: Boolean(payload.preferences),
    hasReminder: Boolean(payload.reminder),
  };
}

function mergeHistory(
  current: HistorySession[],
  incoming: HistorySession[],
): HistorySession[] {
  const map = new Map<string, HistorySession>();
  for (const item of current) map.set(item.id, item);
  for (const item of incoming) {
    const prev = map.get(item.id);
    if (!prev) {
      map.set(item.id, item);
      continue;
    }
    // Prefer the session with more volume, then newer date string.
    if (item.volume > prev.volume || item.date >= prev.date) {
      map.set(item.id, item);
    }
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function mergeCustomWorkouts(
  current: CustomWorkout[],
  incoming: CustomWorkout[],
): CustomWorkout[] {
  const map = new Map<string, CustomWorkout>();
  for (const item of current) map.set(item.id, item);
  for (const item of incoming) {
    const prev = map.get(item.id);
    if (!prev || item.updatedAt >= prev.updatedAt) {
      map.set(item.id, item);
    }
  }
  return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function applyBackupPayload(
  current: AppliedBackup,
  incoming: BackupPayload,
  mode: ImportMode,
): AppliedBackup {
  if (mode === 'replace') {
    return {
      user: incoming.user,
      preferences: incoming.preferences ?? current.preferences,
      history: incoming.history,
      customWorkouts: incoming.customWorkouts,
      favorites: incoming.favorites,
      reminder: incoming.reminder ?? current.reminder,
    };
  }

  return {
    user: incoming.user ?? current.user,
    preferences: incoming.preferences ?? current.preferences,
    history: mergeHistory(current.history, incoming.history),
    customWorkouts: mergeCustomWorkouts(current.customWorkouts, incoming.customWorkouts),
    favorites: [...new Set([...current.favorites, ...incoming.favorites])],
    reminder: incoming.reminder ?? current.reminder,
  };
}

export function formatBackupStamp(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export async function shareBackupBlob(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'application/json' });
  const payload = { files: [file], title: 'REPLY sync pack', text: 'REPLY workout data transfer' };
  if (typeof navigator !== 'undefined' && navigator.canShare?.(payload)) {
    await navigator.share(payload);
    return true;
  }
  return false;
}
