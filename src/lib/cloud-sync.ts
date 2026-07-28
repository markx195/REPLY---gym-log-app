import type { HistorySession } from '@/data/history';
import type { AuthUser } from '@/lib/auth-store';
import type { CustomWorkout } from '@/lib/custom-workouts-store';
import type { UserPreferences } from '@/lib/preferences-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { authUserFromSupabase } from '@/lib/supabase/auth';

export type CloudSnapshot = {
  user: AuthUser;
  preferences: UserPreferences | null;
  history: HistorySession[];
  customWorkouts: CustomWorkout[];
  favorites: string[];
};

function canSync(user: AuthUser | null | undefined) {
  return Boolean(user && user.mode !== 'guest' && getSupabaseBrowserClient());
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
    supabase.from('user_preferences').select('data').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('history_sessions')
      .select('payload')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false }),
    supabase.from('custom_workouts').select('payload').eq('user_id', user.id),
    supabase.from('favorites').select('workout_ids').eq('user_id', user.id).maybeSingle(),
  ]);

  const preferences =
    (prefsRes.data?.data as UserPreferences | null | undefined) ?? null;
  const history = (historyRes.data ?? [])
    .map((row) => row.payload as HistorySession)
    .filter((item) => item && typeof item.id === 'string');
  const customWorkouts = (customsRes.data ?? [])
    .map((row) => row.payload as CustomWorkout)
    .filter((item) => item && typeof item.id === 'string');
  const favorites = Array.isArray(favoritesRes.data?.workout_ids)
    ? (favoritesRes.data!.workout_ids as string[])
    : [];

  return { user, preferences, history, customWorkouts, favorites };
}

export async function upsertProfile(user: AuthUser) {
  if (!canSync(user)) return;
  const supabase = getSupabaseBrowserClient()!;
  await supabase.from('profiles').upsert({
    id: user.id,
    display_name: user.name,
    email: user.email,
    auth_mode: user.mode,
    updated_at: new Date().toISOString(),
  });
}

export async function pushPreferences(user: AuthUser, preferences: UserPreferences) {
  if (!canSync(user)) return;
  const supabase = getSupabaseBrowserClient()!;
  await supabase.from('user_preferences').upsert({
    user_id: user.id,
    data: preferences,
    updated_at: new Date().toISOString(),
  });
}

export async function pushHistorySession(user: AuthUser, session: HistorySession) {
  if (!canSync(user)) return;
  const supabase = getSupabaseBrowserClient()!;
  await supabase.from('history_sessions').upsert({
    id: session.id,
    user_id: user.id,
    payload: session,
    session_date: session.date,
    updated_at: new Date().toISOString(),
  });
}

export async function pushAllHistory(user: AuthUser, sessions: HistorySession[]) {
  if (!canSync(user) || sessions.length === 0) return;
  const supabase = getSupabaseBrowserClient()!;
  const rows = sessions.map((session) => ({
    id: session.id,
    user_id: user.id,
    payload: session,
    session_date: session.date,
    updated_at: new Date().toISOString(),
  }));
  await supabase.from('history_sessions').upsert(rows);
}

export async function deleteCloudHistorySession(user: AuthUser, sessionId: string) {
  if (!canSync(user)) return;
  const supabase = getSupabaseBrowserClient()!;
  await supabase
    .from('history_sessions')
    .delete()
    .eq('user_id', user.id)
    .eq('id', sessionId);
}

export async function clearCloudHistory(user: AuthUser) {
  if (!canSync(user)) return;
  const supabase = getSupabaseBrowserClient()!;
  await supabase.from('history_sessions').delete().eq('user_id', user.id);
}

export async function pushCustomWorkout(user: AuthUser, list: CustomWorkout) {
  if (!canSync(user)) return;
  const supabase = getSupabaseBrowserClient()!;
  await supabase.from('custom_workouts').upsert({
    id: list.id,
    user_id: user.id,
    payload: list,
    updated_at: new Date().toISOString(),
  });
}

export async function pushAllCustomWorkouts(user: AuthUser, lists: CustomWorkout[]) {
  if (!canSync(user)) return;
  const supabase = getSupabaseBrowserClient()!;
  if (lists.length === 0) return;
  const rows = lists.map((list) => ({
    id: list.id,
    user_id: user.id,
    payload: list,
    updated_at: new Date().toISOString(),
  }));
  await supabase.from('custom_workouts').upsert(rows);
}

export async function deleteCloudCustomWorkout(user: AuthUser, id: string) {
  if (!canSync(user)) return;
  const supabase = getSupabaseBrowserClient()!;
  await supabase.from('custom_workouts').delete().eq('user_id', user.id).eq('id', id);
}

export async function pushFavorites(user: AuthUser, favorites: string[]) {
  if (!canSync(user)) return;
  const supabase = getSupabaseBrowserClient()!;
  await supabase.from('favorites').upsert({
    user_id: user.id,
    workout_ids: favorites,
    updated_at: new Date().toISOString(),
  });
}

/** After login: merge local + cloud (cloud wins on id conflicts for history/lists). */
export function mergeLocalWithCloud(input: {
  localPrefs: UserPreferences;
  cloudPrefs: UserPreferences | null;
  localHistory: HistorySession[];
  cloudHistory: HistorySession[];
  localCustoms: CustomWorkout[];
  cloudCustoms: CustomWorkout[];
  localFavorites: string[];
  cloudFavorites: string[];
}) {
  const preferences = input.cloudPrefs
    ? { ...input.localPrefs, ...input.cloudPrefs }
    : input.localPrefs;

  const historyMap = new Map<string, HistorySession>();
  for (const item of input.localHistory) historyMap.set(item.id, item);
  for (const item of input.cloudHistory) historyMap.set(item.id, item);
  const history = [...historyMap.values()].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );

  const customMap = new Map<string, CustomWorkout>();
  for (const item of input.localCustoms) customMap.set(item.id, item);
  for (const item of input.cloudCustoms) customMap.set(item.id, item);
  const customWorkouts = [...customMap.values()].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );

  const favorites = [...new Set([...input.localFavorites, ...input.cloudFavorites])];

  return { preferences, history, customWorkouts, favorites };
}
