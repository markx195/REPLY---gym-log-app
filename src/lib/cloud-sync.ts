import type { HistorySession } from '@/data/history';
import type { AuthUser } from '@/lib/auth-store';
import type { CustomWorkout } from '@/lib/custom-workouts-store';
import type { UserPreferences } from '@/lib/preferences-store';
import {
  defaultReminder,
  type ReminderSettings,
} from '@/lib/reminder-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { authUserFromSupabase } from '@/lib/supabase/auth';

export type SyncResult = { ok: boolean; error?: string };

export type CloudSnapshot = {
  user: AuthUser;
  preferences: UserPreferences | null;
  reminder: ReminderSettings | null;
  history: HistorySession[];
  customWorkouts: CustomWorkout[];
  favorites: string[];
  prefsUpdatedAt: number;
};

/** Envelope stored in user_preferences.data */
type CloudPrefsEnvelope = {
  preferences: UserPreferences;
  reminder?: ReminderSettings | null;
  clientUpdatedAt?: number;
};

function canSync(user: AuthUser | null | undefined) {
  return Boolean(user && user.mode !== 'guest' && getSupabaseBrowserClient());
}

function asError(error: unknown): string {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
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
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : undefined,
  };
}

function parsePrefsRow(data: unknown): {
  preferences: UserPreferences | null;
  reminder: ReminderSettings | null;
  prefsUpdatedAt: number;
} {
  if (!data || typeof data !== 'object') {
    return { preferences: null, reminder: null, prefsUpdatedAt: 0 };
  }

  const raw = data as Record<string, unknown>;

  // New envelope: { preferences, reminder, clientUpdatedAt }
  if (raw.preferences && typeof raw.preferences === 'object') {
    const envelope = raw as CloudPrefsEnvelope;
    const preferences = envelope.preferences;
    return {
      preferences,
      reminder: normalizeReminder(envelope.reminder),
      prefsUpdatedAt:
        typeof envelope.clientUpdatedAt === 'number'
          ? envelope.clientUpdatedAt
          : typeof preferences.prefsUpdatedAt === 'number'
            ? preferences.prefsUpdatedAt
            : 0,
    };
  }

  // Legacy: bare UserPreferences blob
  const preferences = data as UserPreferences;
  return {
    preferences,
    reminder: null,
    prefsUpdatedAt:
      typeof preferences.prefsUpdatedAt === 'number' ? preferences.prefsUpdatedAt : 0,
  };
}

export async function pullCloudSnapshot(): Promise<CloudSnapshot | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const sessionRes = await supabase.auth.getSession();
  let sourceUser = sessionRes.data.session?.user ?? null;
  if (!sourceUser) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return null;
    sourceUser = userData.user;
  }
  const user = authUserFromSupabase(sourceUser);

  const [prefsRes, historyRes, customsRes, favoritesRes] = await Promise.all([
    supabase.from('user_preferences').select('data, updated_at').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('history_sessions')
      .select('payload')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false }),
    supabase.from('custom_workouts').select('payload').eq('user_id', user.id),
    supabase.from('favorites').select('workout_ids').eq('user_id', user.id).maybeSingle(),
  ]);

  const parsed = parsePrefsRow(prefsRes.data?.data);
  const serverUpdatedAt = prefsRes.data?.updated_at
    ? Date.parse(String(prefsRes.data.updated_at))
    : 0;
  const history = (historyRes.data ?? [])
    .map((row) => row.payload as HistorySession)
    .filter((item) => item && typeof item.id === 'string');
  const customWorkouts = (customsRes.data ?? [])
    .map((row) => row.payload as CustomWorkout)
    .filter((item) => item && typeof item.id === 'string');
  const favorites = Array.isArray(favoritesRes.data?.workout_ids)
    ? (favoritesRes.data!.workout_ids as string[])
    : [];

  return {
    user,
    preferences: parsed.preferences,
    reminder: parsed.reminder,
    history,
    customWorkouts,
    favorites,
    prefsUpdatedAt: Math.max(parsed.prefsUpdatedAt, Number.isFinite(serverUpdatedAt) ? serverUpdatedAt : 0),
  };
}

export async function upsertProfile(user: AuthUser): Promise<SyncResult> {
  if (!canSync(user)) return { ok: false, error: 'Not signed in for sync' };
  const supabase = getSupabaseBrowserClient()!;
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    display_name: user.name,
    email: user.email,
    auth_mode: user.mode,
    updated_at: new Date().toISOString(),
  });
  return error ? { ok: false, error: asError(error) } : { ok: true };
}

export async function pushPreferences(
  user: AuthUser,
  preferences: UserPreferences,
  reminder?: ReminderSettings | null,
): Promise<SyncResult> {
  if (!canSync(user)) return { ok: false, error: 'Not signed in for sync' };
  const supabase = getSupabaseBrowserClient()!;
  const envelope: CloudPrefsEnvelope = {
    preferences,
    reminder: reminder ?? null,
    clientUpdatedAt: preferences.prefsUpdatedAt ?? Date.now(),
  };
  const { error } = await supabase.from('user_preferences').upsert({
    user_id: user.id,
    data: envelope,
    updated_at: new Date().toISOString(),
  });
  return error ? { ok: false, error: asError(error) } : { ok: true };
}

export async function pushHistorySession(
  user: AuthUser,
  session: HistorySession,
): Promise<SyncResult> {
  if (!canSync(user)) return { ok: false, error: 'Not signed in for sync' };
  const supabase = getSupabaseBrowserClient()!;
  const { error } = await supabase.from('history_sessions').upsert({
    id: session.id,
    user_id: user.id,
    payload: session,
    session_date: session.date,
    updated_at: new Date().toISOString(),
  });
  return error ? { ok: false, error: asError(error) } : { ok: true };
}

export async function pushAllHistory(
  user: AuthUser,
  sessions: HistorySession[],
): Promise<SyncResult> {
  if (!canSync(user)) return { ok: false, error: 'Not signed in for sync' };
  if (sessions.length === 0) return { ok: true };
  const supabase = getSupabaseBrowserClient()!;
  const rows = sessions.map((session) => ({
    id: session.id,
    user_id: user.id,
    payload: session,
    session_date: session.date,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('history_sessions').upsert(rows);
  return error ? { ok: false, error: asError(error) } : { ok: true };
}

export async function deleteCloudHistorySession(
  user: AuthUser,
  sessionId: string,
): Promise<SyncResult> {
  if (!canSync(user)) return { ok: false, error: 'Not signed in for sync' };
  const supabase = getSupabaseBrowserClient()!;
  const { error } = await supabase
    .from('history_sessions')
    .delete()
    .eq('user_id', user.id)
    .eq('id', sessionId);
  return error ? { ok: false, error: asError(error) } : { ok: true };
}

export async function clearCloudHistory(user: AuthUser): Promise<SyncResult> {
  if (!canSync(user)) return { ok: false, error: 'Not signed in for sync' };
  const supabase = getSupabaseBrowserClient()!;
  const { error } = await supabase.from('history_sessions').delete().eq('user_id', user.id);
  return error ? { ok: false, error: asError(error) } : { ok: true };
}

export async function pushCustomWorkout(
  user: AuthUser,
  list: CustomWorkout,
): Promise<SyncResult> {
  if (!canSync(user)) return { ok: false, error: 'Not signed in for sync' };
  const supabase = getSupabaseBrowserClient()!;
  const { error } = await supabase.from('custom_workouts').upsert({
    id: list.id,
    user_id: user.id,
    payload: list,
    updated_at: new Date().toISOString(),
  });
  return error ? { ok: false, error: asError(error) } : { ok: true };
}

export async function pushAllCustomWorkouts(
  user: AuthUser,
  lists: CustomWorkout[],
): Promise<SyncResult> {
  if (!canSync(user)) return { ok: false, error: 'Not signed in for sync' };
  if (lists.length === 0) return { ok: true };
  const supabase = getSupabaseBrowserClient()!;
  const rows = lists.map((list) => ({
    id: list.id,
    user_id: user.id,
    payload: list,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('custom_workouts').upsert(rows);
  return error ? { ok: false, error: asError(error) } : { ok: true };
}

export async function deleteCloudCustomWorkout(
  user: AuthUser,
  id: string,
): Promise<SyncResult> {
  if (!canSync(user)) return { ok: false, error: 'Not signed in for sync' };
  const supabase = getSupabaseBrowserClient()!;
  const { error } = await supabase
    .from('custom_workouts')
    .delete()
    .eq('user_id', user.id)
    .eq('id', id);
  return error ? { ok: false, error: asError(error) } : { ok: true };
}

export async function pushFavorites(
  user: AuthUser,
  favorites: string[],
): Promise<SyncResult> {
  if (!canSync(user)) return { ok: false, error: 'Not signed in for sync' };
  const supabase = getSupabaseBrowserClient()!;
  const { error } = await supabase.from('favorites').upsert({
    user_id: user.id,
    workout_ids: favorites,
    updated_at: new Date().toISOString(),
  });
  return error ? { ok: false, error: asError(error) } : { ok: true };
}

export async function pushFullSnapshot(
  user: AuthUser,
  input: {
    preferences: UserPreferences;
    reminder?: ReminderSettings | null;
    history: HistorySession[];
    customWorkouts: CustomWorkout[];
    favorites: string[];
  },
): Promise<SyncResult> {
  const results = await Promise.all([
    upsertProfile(user),
    pushPreferences(user, input.preferences, input.reminder),
    pushAllHistory(user, input.history),
    pushAllCustomWorkouts(user, input.customWorkouts),
    pushFavorites(user, input.favorites),
  ]);
  const failed = results.find((r) => !r.ok);
  return failed ?? { ok: true };
}

function mergeHistorySessions(
  local: HistorySession[],
  cloud: HistorySession[],
): HistorySession[] {
  const map = new Map<string, HistorySession>();
  for (const item of local) map.set(item.id, item);
  for (const item of cloud) {
    const prev = map.get(item.id);
    if (!prev) {
      map.set(item.id, item);
      continue;
    }
    // Prefer richer volume, then newer calendar date (keeps streak accurate).
    if (item.volume > prev.volume || item.date > prev.date) {
      map.set(item.id, item);
    } else if (item.date === prev.date && item.volume === prev.volume) {
      // Equal — prefer cloud only if it has more logged sets
      const localSets = prev.exercises.reduce((n, e) => n + e.sets.length, 0);
      const cloudSets = item.exercises.reduce((n, e) => n + e.sets.length, 0);
      if (cloudSets > localSets) map.set(item.id, item);
    }
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function mergeCustomLists(local: CustomWorkout[], cloud: CustomWorkout[]): CustomWorkout[] {
  const map = new Map<string, CustomWorkout>();
  for (const item of local) map.set(item.id, item);
  for (const item of cloud) {
    const prev = map.get(item.id);
    if (!prev || item.updatedAt >= prev.updatedAt) map.set(item.id, item);
  }
  return [...map.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Smart merge: LWW for prefs/reminder/customs, union favorites, richer history. */
export function mergeLocalWithCloud(input: {
  localPrefs: UserPreferences;
  cloudPrefs: UserPreferences | null;
  localReminder?: ReminderSettings | null;
  cloudReminder?: ReminderSettings | null;
  localPrefsUpdatedAt?: number;
  cloudPrefsUpdatedAt?: number;
  localHistory: HistorySession[];
  cloudHistory: HistorySession[];
  localCustoms: CustomWorkout[];
  cloudCustoms: CustomWorkout[];
  localFavorites: string[];
  cloudFavorites: string[];
}) {
  const localTs =
    input.localPrefsUpdatedAt ??
    input.localPrefs.prefsUpdatedAt ??
    0;
  const cloudTs = input.cloudPrefsUpdatedAt ?? input.cloudPrefs?.prefsUpdatedAt ?? 0;

  let preferences: UserPreferences;
  if (input.cloudPrefs && cloudTs > localTs) {
    preferences = { ...input.localPrefs, ...input.cloudPrefs };
  } else if (input.cloudPrefs && localTs > cloudTs) {
    preferences = { ...input.cloudPrefs, ...input.localPrefs };
  } else if (input.cloudPrefs) {
    // Equal / unknown — prefer local onboarded + body metrics if cloud empty
    preferences = {
      ...input.cloudPrefs,
      ...input.localPrefs,
      // Keep cloud onboarded if local never finished
      onboarded: input.localPrefs.onboarded || input.cloudPrefs.onboarded,
      heightCm: input.localPrefs.heightCm ?? input.cloudPrefs.heightCm,
      weightKg: input.localPrefs.weightKg ?? input.cloudPrefs.weightKg,
      targetWeightKg: input.localPrefs.targetWeightKg ?? input.cloudPrefs.targetWeightKg,
    };
  } else {
    preferences = input.localPrefs;
  }

  const localRem = input.localReminder ?? null;
  const cloudRem = input.cloudReminder ?? null;
  const remLocalTs = localRem?.updatedAt ?? 0;
  const remCloudTs = cloudRem?.updatedAt ?? 0;
  const reminder: ReminderSettings | null =
    cloudRem && remCloudTs > remLocalTs
      ? cloudRem
      : localRem && remLocalTs >= remCloudTs
        ? localRem
        : cloudRem ?? localRem;

  return {
    preferences,
    reminder,
    history: mergeHistorySessions(input.localHistory, input.cloudHistory),
    customWorkouts: mergeCustomLists(input.localCustoms, input.cloudCustoms),
    favorites: [...new Set([...input.localFavorites, ...input.cloudFavorites])],
  };
}
