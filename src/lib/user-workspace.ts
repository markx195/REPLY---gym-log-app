import type { HistorySession } from '@/data/history';
import type { CustomWorkout } from '@/lib/custom-workouts-store';
import {
  loadCustomWorkouts,
  saveCustomWorkouts,
} from '@/lib/custom-workouts-store';
import { loadHistory, saveHistory } from '@/lib/history-store';
import {
  createDefaultPreferences,
  loadPreferences,
  savePreferences,
  type UserPreferences,
} from '@/lib/preferences-store';
import {
  defaultReminder,
  loadReminderSettings,
  saveReminderSettings,
  type ReminderSettings,
} from '@/lib/reminder-store';
import {
  clearWorkoutDraft,
  loadWorkoutDraft,
  type WorkoutDraft,
} from '@/lib/workout-draft-store';

export const FAVORITES_KEY = 'reply.favorites';
const ACTIVE_SCOPE_KEY = 'reply.activeScope';
const SCOPE_PREFIX = 'reply.scope.';
const DRAFT_KEY = 'reply.workoutDraft.v1';

export type UserWorkspace = {
  preferences: UserPreferences;
  history: HistorySession[];
  customWorkouts: CustomWorkout[];
  favorites: string[];
  reminder: ReminderSettings;
  draft: WorkoutDraft | null;
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function emptyWorkspace(locale: 'en' | 'vi' = 'en'): UserWorkspace {
  return {
    preferences: { ...createDefaultPreferences(), locale },
    history: [],
    customWorkouts: [],
    favorites: [],
    reminder: { ...defaultReminder, days: [...defaultReminder.days] },
    draft: null,
  };
}

export function loadFavorites(): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

export function saveFavorites(ids: string[]) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function readActiveWorkspace(): UserWorkspace {
  return {
    preferences: loadPreferences(),
    history: loadHistory(),
    customWorkouts: loadCustomWorkouts(),
    favorites: loadFavorites(),
    reminder: loadReminderSettings(),
    draft: loadWorkoutDraft(),
  };
}

export function writeActiveWorkspace(ws: UserWorkspace) {
  savePreferences(ws.preferences);
  saveHistory(ws.history);
  saveCustomWorkouts(ws.customWorkouts);
  saveFavorites(ws.favorites);
  saveReminderSettings(ws.reminder);
  if (!canUseStorage()) return;
  try {
    if (ws.draft) {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(ws.draft));
    } else {
      clearWorkoutDraft();
    }
  } catch {
    // ignore
  }
}

function scopeBag(userId: string) {
  return `${SCOPE_PREFIX}${userId}`;
}

export function getActiveScopeId(): string | null {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(ACTIVE_SCOPE_KEY);
}

export function setActiveScopeId(userId: string | null) {
  if (!canUseStorage()) return;
  if (!userId) window.localStorage.removeItem(ACTIVE_SCOPE_KEY);
  else window.localStorage.setItem(ACTIVE_SCOPE_KEY, userId);
}

export function snapshotWorkspaceToUser(userId: string, ws = readActiveWorkspace()) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(scopeBag(userId), JSON.stringify(ws));
  } catch {
    // ignore quota
  }
}

export function loadScopedWorkspace(userId: string): UserWorkspace | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(scopeBag(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserWorkspace>;
    const base = emptyWorkspace();
    return {
      preferences: (parsed.preferences as UserPreferences) ?? base.preferences,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      customWorkouts: Array.isArray(parsed.customWorkouts) ? parsed.customWorkouts : [],
      favorites: Array.isArray(parsed.favorites)
        ? parsed.favorites.filter((id): id is string => typeof id === 'string')
        : [],
      reminder: parsed.reminder
        ? { ...defaultReminder, ...parsed.reminder, days: [...(parsed.reminder.days ?? defaultReminder.days)] }
        : base.reminder,
      draft: (parsed.draft as WorkoutDraft | null) ?? null,
    };
  } catch {
    return null;
  }
}

export function clearScopedWorkspace(userId: string) {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(scopeBag(userId));
}

/** Merge two workspaces — prefers richer history / newer customs (same as backup merge). */
export function mergeWorkspaces(a: UserWorkspace, b: UserWorkspace): UserWorkspace {
  const prefA = a.preferences.prefsUpdatedAt ?? 0;
  const prefB = b.preferences.prefsUpdatedAt ?? 0;
  const preferences =
    prefB > prefA
      ? { ...a.preferences, ...b.preferences }
      : prefA > prefB
        ? { ...b.preferences, ...a.preferences }
        : { ...a.preferences, ...b.preferences };

  const historyMap = new Map<string, HistorySession>();
  for (const item of a.history) historyMap.set(item.id, item);
  for (const item of b.history) {
    const prev = historyMap.get(item.id);
    if (!prev || item.volume > prev.volume || item.date >= prev.date) {
      historyMap.set(item.id, item);
    }
  }
  const history = [...historyMap.values()].sort((x, y) =>
    x.date < y.date ? 1 : x.date > y.date ? -1 : 0,
  );

  const customMap = new Map<string, CustomWorkout>();
  for (const item of a.customWorkouts) customMap.set(item.id, item);
  for (const item of b.customWorkouts) {
    const prev = customMap.get(item.id);
    if (!prev || item.updatedAt >= prev.updatedAt) customMap.set(item.id, item);
  }
  const customWorkouts = [...customMap.values()].sort((x, y) => y.updatedAt - x.updatedAt);

  const remA = a.reminder.updatedAt ?? 0;
  const remB = b.reminder.updatedAt ?? 0;
  const reminder = remB >= remA ? b.reminder : a.reminder;

  const draftA = a.draft?.savedAt ?? 0;
  const draftB = b.draft?.savedAt ?? 0;
  const draft = draftB >= draftA ? b.draft : a.draft;

  return {
    preferences,
    history,
    customWorkouts,
    favorites: [...new Set([...a.favorites, ...b.favorites])],
    reminder,
    draft,
  };
}

function listGuestScopeIds(): string[] {
  if (!canUseStorage()) return [];
  const ids: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key?.startsWith(SCOPE_PREFIX)) continue;
    const id = key.slice(SCOPE_PREFIX.length);
    if (id.startsWith('guest_')) ids.push(id);
  }
  return ids;
}

/**
 * Collect leftover guest / unscoped local progress so upgrading to Google
 * does not wipe workouts done as guest on this device.
 */
export function collectMigratableLocalData(excludeUserId?: string): UserWorkspace {
  let merged = emptyWorkspace();
  let hasAny = false;

  const active = readActiveWorkspace();
  const activeHasData =
    active.history.length > 0 ||
    active.customWorkouts.length > 0 ||
    active.favorites.length > 0 ||
    active.preferences.onboarded ||
    Boolean(active.preferences.heightCm && active.preferences.weightKg);

  if (activeHasData) {
    merged = mergeWorkspaces(merged, active);
    hasAny = true;
  }

  for (const guestId of listGuestScopeIds()) {
    if (guestId === excludeUserId) continue;
    const scoped = loadScopedWorkspace(guestId);
    if (!scoped) continue;
    merged = mergeWorkspaces(merged, scoped);
    hasAny = true;
  }

  return hasAny ? merged : emptyWorkspace();
}

export function clearGuestScopes() {
  for (const guestId of listGuestScopeIds()) {
    clearScopedWorkspace(guestId);
  }
}

/**
 * Switch the active local workspace to `nextUserId`.
 * Snapshots the previous account first so accounts don't bleed into each other.
 */
export function bindUserWorkspace(
  nextUserId: string,
  options?: { migrateOrphans?: boolean },
): UserWorkspace {
  const previous = getActiveScopeId();
  if (previous && previous !== nextUserId) {
    snapshotWorkspaceToUser(previous);
  }

  let next = loadScopedWorkspace(nextUserId);

  if (!next) {
    // First time this account on this device.
    if (!previous) {
      // Legacy unscoped data → claim for this user.
      next = readActiveWorkspace();
    } else {
      next = emptyWorkspace();
    }
  }

  if (options?.migrateOrphans && !nextUserId.startsWith('guest_')) {
    const active = readActiveWorkspace();
    const activeHasData =
      active.history.length > 0 ||
      active.customWorkouts.length > 0 ||
      active.favorites.length > 0 ||
      active.preferences.onboarded ||
      Boolean(active.preferences.heightCm && active.preferences.weightKg);

    // Only migrate when this device still has live progress (guest → Google upgrade).
    // Avoid pulling stale guest scopes into a different account after logout.
    if (activeHasData) {
      const orphans = collectMigratableLocalData(nextUserId);
      next = mergeWorkspaces(orphans, next);
      clearGuestScopes();
    }
  }

  writeActiveWorkspace(next);
  setActiveScopeId(nextUserId);
  snapshotWorkspaceToUser(nextUserId, next);
  return next;
}

/** Flush active data into the current account scope, then blank the UI workspace. */
export function parkActiveWorkspaceAndClear(
  userId: string | null,
  locale: 'en' | 'vi' = 'en',
) {
  if (userId) snapshotWorkspaceToUser(userId);
  const blank = emptyWorkspace(locale);
  writeActiveWorkspace(blank);
  setActiveScopeId(null);
  return blank;
}
