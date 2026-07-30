'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BottomSheet, Button, TabBar } from '@/components/ui';
import { ActiveWorkoutScreen } from '@/features/workout/active-workout-screen';
import { DiscoveryScreen } from '@/features/discovery/discovery-screen';
import { HistoryDetailScreen } from '@/features/history/history-detail-screen';
import { HomeScreen } from '@/features/home/home-screen';
import { LoadingScreen } from '@/features/common/loading-screen';
import { LoginScreen } from '@/features/auth/login-screen';
import { OnboardingScreen } from '@/features/onboarding/onboarding-screen';
import { ProfileScreen } from '@/features/profile/profile-screen';
import { WorkoutDoneScreen } from '@/features/workout/workout-done-screen';
import type { HistorySession } from '@/data/history';
import { createSession, type WorkoutSession } from '@/data/session';
import {
  clearAuthUser,
  createGuestUser,
  createSocialUser,
  delay,
  loadAuthUser,
  saveAuthUser,
  type AuthUser,
} from '@/lib/auth-store';
import {
  buildCustomSession,
  customWorkoutFromSession,
  deleteCustomWorkout,
  getCustomWorkout,
  loadCustomWorkouts,
  saveCustomWorkouts,
  upsertCustomWorkout,
  type CustomWorkout,
} from '@/lib/custom-workouts-store';
import {
  clearHistory,
  computeWeeklyStats,
  deleteHistorySession,
  getHistoryById,
  getLastExercisePerformance,
  loadDemoHistorySeed,
  loadHistory,
  persistCompletedWorkout,
  saveHistory,
  updateHistorySession,
} from '@/lib/history-store';
import {
  loadPreferences,
  savePreferences,
  type UserPreferences,
} from '@/lib/preferences-store';

import {
  applyBackupPayload,
  buildBackupPayload,
  shareBackupBlob,
  type BackupPayload,
  type ImportMode,
} from '@/lib/user-data-backup';
import { clearWorkoutDraft, loadWorkoutDraft, type WorkoutDraft } from '@/lib/workout-draft-store';
import {
  defaultReminder,
  loadReminderSettings,
  markReminderPrompted,
  saveReminderSettings,
  shouldPromptReminder,
  type ReminderSettings,
} from '@/lib/reminder-store';
import {
  clearReplyServiceWorkers,
  requestNotificationPermission,
  showWorkoutReminderNotification,
} from '@/lib/notifications';
import {
  clearCloudHistory,
  deleteCloudCustomWorkout,
  deleteCloudHistorySession,
  mergeLocalWithCloud,
  pullCloudSnapshot,
  pushCustomWorkout,
  pushFavorites,
  pushFullSnapshot,
  pushHistorySession,
  pushPreferences,
  upsertProfile,
} from '@/lib/cloud-sync';
import {
  authUserFromSupabase,
  getSupabaseSessionUser,
  isSupabaseConfigured,
  signInWithOAuthProvider,
  signOutSupabase,
} from '@/lib/supabase/auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  bindUserWorkspace,
  loadFavorites,
  parkActiveWorkspaceAndClear,
  readActiveWorkspace,
  saveFavorites,
  snapshotWorkspaceToUser,
  writeActiveWorkspace,
} from '@/lib/user-workspace';
import type { AppTab } from '@/types/navigation';

type AppView =
  | { type: 'tabs'; tab: AppTab }
  | { type: 'workout'; session: WorkoutSession }
  | { type: 'done'; session: WorkoutSession; durationMs: number }
  | { type: 'history'; sessionId: string };

type Gate = 'booting' | 'auth' | 'onboarding' | 'entering' | 'ready';

const ENTER_MIN_MS = 900;
const AUTH_RETURN_RETRY_DELAYS_MS = [0, 250, 700, 1400, 2400];

function resolveTheme(pref: UserPreferences['theme']): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function AppShell() {
  const [gate, setGate] = useState<Gate>('booting');
  const [loadingMessage, setLoadingMessage] = useState('Getting ready…');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [view, setView] = useState<AppView>({ type: 'tabs', tab: 'home' });
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [customWorkouts, setCustomWorkouts] = useState<CustomWorkout[]>([]);
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const [reminder, setReminder] = useState<ReminderSettings>(defaultReminder);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const cloudEnabled = isSupabaseConfigured();

  const waitForSupabaseSignIn = useCallback(async (timeoutMs = 8000) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return null;

    return await new Promise<AuthUser | null>((resolve) => {
      let resolved = false;
      const finish = (next: AuthUser | null) => {
        if (resolved) return;
        resolved = true;
        window.clearTimeout(timeoutId);
        window.clearInterval(pollId);
        subscription.unsubscribe();
        resolve(next);
      };

      const checkCurrentSession = async () => {
        const current = await getSupabaseSessionUser();
        if (current) finish(current);
      };

      const timeoutId = window.setTimeout(() => {
        finish(null);
      }, timeoutMs);

      // Poll cached session in case auth event already fired before subscription.
      const pollId = window.setInterval(() => {
        void checkCurrentSession();
      }, 350);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          finish(authUserFromSupabase(session.user));
        }
      });

      void checkCurrentSession();
    });
  }, []);

  const getCloudUserWithRetry = useCallback(async () => {
    const url = new URL(window.location.href);
    const justReturnedFromAuth = url.searchParams.get('auth') === '1';
    if (!justReturnedFromAuth) return getSupabaseSessionUser();

    for (const delayMs of AUTH_RETURN_RETRY_DELAYS_MS) {
      if (delayMs > 0) await delay(delayMs);
      const current = await getSupabaseSessionUser();
      if (current) return current;
    }
    return waitForSupabaseSignIn();
  }, [waitForSupabaseSignIn]);

  /** Push local first, then pull+merge, then push merged — avoids overwriting newer local edits. */
  const syncRoundTrip = useCallback(
    async (activeUser: AuthUser) => {
      if (!cloudEnabled || activeUser.mode === 'guest') {
        return { ok: false as const, error: 'Cloud sync unavailable' };
      }

      const local = readActiveWorkspace();
      const pushFirst = await pushFullSnapshot(activeUser, {
        preferences: local.preferences,
        reminder: local.reminder,
        history: local.history,
        customWorkouts: local.customWorkouts,
        favorites: local.favorites,
      });
      if (!pushFirst.ok) return pushFirst;

      const snap = await pullCloudSnapshot();
      if (!snap) {
        return { ok: false as const, error: 'Could not read cloud snapshot' };
      }

      const merged = mergeLocalWithCloud({
        localPrefs: local.preferences,
        cloudPrefs: snap.preferences,
        localReminder: local.reminder,
        cloudReminder: snap.reminder,
        localPrefsUpdatedAt: local.preferences.prefsUpdatedAt,
        cloudPrefsUpdatedAt: snap.prefsUpdatedAt,
        localHistory: local.history,
        cloudHistory: snap.history,
        localCustoms: local.customWorkouts,
        cloudCustoms: snap.customWorkouts,
        localFavorites: local.favorites,
        cloudFavorites: snap.favorites,
      });

      savePreferences(merged.preferences);
      saveHistory(merged.history);
      saveCustomWorkouts(merged.customWorkouts);
      saveFavorites(merged.favorites);
      setPrefs(merged.preferences);
      setHistory(merged.history);
      setCustomWorkouts(merged.customWorkouts);
      setFavoriteIds(merged.favorites);
      if (merged.reminder) {
        saveReminderSettings(merged.reminder);
        setReminder(merged.reminder);
      }
      snapshotWorkspaceToUser(activeUser.id);

      const pushMerged = await pushFullSnapshot(activeUser, {
        preferences: merged.preferences,
        reminder: merged.reminder ?? local.reminder,
        history: merged.history,
        customWorkouts: merged.customWorkouts,
        favorites: merged.favorites,
      });
      return pushMerged;
    },
    [cloudEnabled],
  );

  const pullLatestFromCloud = useCallback(async () => {
    if (!cloudEnabled || !user || user.mode === 'guest') return;
    await syncRoundTrip(user);
  }, [cloudEnabled, syncRoundTrip, user]);

  // Apply theme to document
  useEffect(() => {
    if (!prefs) return;
    const resolved = resolveTheme(prefs.theme);
    document.documentElement.setAttribute('data-theme', resolved);

    if (prefs.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [prefs]);

  useEffect(() => {
    let cancelled = false;
    void clearReplyServiceWorkers();

    const boot = async () => {
      setLoadingMessage('Getting ready…');
      try {
        let nextUser = loadAuthUser();

        if (cloudEnabled) {
          const cloudUser = await getCloudUserWithRetry();
          if (cancelled) return;
          if (cloudUser) {
            nextUser = cloudUser;
            saveAuthUser(cloudUser);
            // Bind account workspace + migrate guest progress on this device
            const localWs = bindUserWorkspace(cloudUser.id, { migrateOrphans: true });
            if (cancelled) return;

            const snap = await pullCloudSnapshot();
            if (cancelled) return;

            let nextPrefs = localWs.preferences;
            let nextHistory = localWs.history;
            let nextCustoms = localWs.customWorkouts;
            let favoriteIdsLocal = localWs.favorites;
            let nextReminder = localWs.reminder;

            if (snap) {
              const merged = mergeLocalWithCloud({
                localPrefs: localWs.preferences,
                cloudPrefs: snap.preferences,
                localReminder: localWs.reminder,
                cloudReminder: snap.reminder,
                localPrefsUpdatedAt: localWs.preferences.prefsUpdatedAt,
                cloudPrefsUpdatedAt: snap.prefsUpdatedAt,
                localHistory: localWs.history,
                cloudHistory: snap.history,
                localCustoms: localWs.customWorkouts,
                cloudCustoms: snap.customWorkouts,
                localFavorites: localWs.favorites,
                cloudFavorites: snap.favorites,
              });
              nextPrefs = merged.preferences;
              nextHistory = merged.history;
              nextCustoms = merged.customWorkouts;
              favoriteIdsLocal = merged.favorites;
              if (merged.reminder) nextReminder = merged.reminder;

              writeActiveWorkspace({
                preferences: nextPrefs,
                history: nextHistory,
                customWorkouts: nextCustoms,
                favorites: favoriteIdsLocal,
                reminder: nextReminder,
                draft: localWs.draft,
              });
              snapshotWorkspaceToUser(cloudUser.id);

              void pushFullSnapshot(cloudUser, {
                preferences: nextPrefs,
                reminder: nextReminder,
                history: nextHistory,
                customWorkouts: nextCustoms,
                favorites: favoriteIdsLocal,
              });
            }

            if (cancelled) return;
            setFavoriteIds(favoriteIdsLocal);
            setHistory(nextHistory);
            setUser(nextUser);
            setPrefs(nextPrefs);
            setCustomWorkouts(nextCustoms);
            setDraft(localWs.draft);
            setReminder(nextReminder);

            if (shouldPromptReminder(nextReminder)) {
              setReminderOpen(true);
              const marked = markReminderPrompted(nextReminder);
              setReminder(marked);
              saveReminderSettings(marked);
              if (nextReminder.systemNotify) {
                void showWorkoutReminderNotification(nextPrefs.locale);
              }
            }

            if (!nextPrefs.onboarded) setGate('onboarding');
            else setGate('ready');

            try {
              const url = new URL(window.location.href);
              if (url.searchParams.has('auth')) {
                url.searchParams.delete('auth');
                window.history.replaceState({}, '', url.pathname + url.search + url.hash);
              }
            } catch {
              // ignore
            }
            return;
          }

          if (nextUser && nextUser.mode !== 'guest') {
            if (
              !nextUser.id.startsWith('guest_') &&
              !nextUser.id.startsWith('u_') &&
              !nextUser.id.startsWith('google_')
            ) {
              clearAuthUser();
              nextUser = null;
            }
          }
        }

        if (cancelled) return;

        if (nextUser) {
          const localWs = bindUserWorkspace(nextUser.id, {
            migrateOrphans: nextUser.mode !== 'guest',
          });
          setFavoriteIds(localWs.favorites);
          setHistory(localWs.history);
          setPrefs(localWs.preferences);
          setCustomWorkouts(localWs.customWorkouts);
          setDraft(localWs.draft);
          setReminder(localWs.reminder);

          if (shouldPromptReminder(localWs.reminder)) {
            setReminderOpen(true);
            const marked = markReminderPrompted(localWs.reminder);
            setReminder(marked);
            saveReminderSettings(marked);
            if (localWs.reminder.systemNotify) {
              void showWorkoutReminderNotification(localWs.preferences.locale);
            }
          }

          setUser(nextUser);
          if (!localWs.preferences.onboarded) setGate('onboarding');
          else setGate('ready');
        } else {
          setFavoriteIds(loadFavorites());
          setHistory(loadHistory());
          setPrefs(loadPreferences());
          setCustomWorkouts(loadCustomWorkouts());
          setDraft(loadWorkoutDraft());
          setReminder(loadReminderSettings());
          setUser(null);
          setGate('auth');
        }

        try {
          const url = new URL(window.location.href);
          if (url.searchParams.has('auth')) {
            url.searchParams.delete('auth');
            window.history.replaceState({}, '', url.pathname + url.search + url.hash);
          }
        } catch {
          // ignore
        }
      } catch {
        if (!cancelled) setGate('auth');
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [cloudEnabled, getCloudUserWithRetry]);

  useEffect(() => {
    if (!cloudEnabled) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        const cloudUser = authUserFromSupabase(session.user);
        saveAuthUser(cloudUser);
        setUser(cloudUser);
        if (event === 'SIGNED_IN') {
          const localWs = bindUserWorkspace(cloudUser.id, { migrateOrphans: true });
          setPrefs(localWs.preferences);
          setHistory(localWs.history);
          setCustomWorkouts(localWs.customWorkouts);
          setFavoriteIds(localWs.favorites);
          setReminder(localWs.reminder);
          setDraft(localWs.draft);
          void syncRoundTrip(cloudUser).then(() => {
            setGate((current) => {
              if (current !== 'auth' && current !== 'entering') return current;
              return (loadPreferences().onboarded ? 'ready' : 'onboarding') as Gate;
            });
          });
        } else {
          setGate((current) => {
            if (current !== 'auth') return current;
            return loadPreferences().onboarded ? 'ready' : 'onboarding';
          });
        }
      }

      if (event === 'SIGNED_OUT') {
        clearAuthUser();
        setUser(null);
        setGate('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [cloudEnabled, syncRoundTrip]);

  useEffect(() => {
    if (gate !== 'ready') return;

    const maybeFire = () => {
      setReminder((current) => {
        if (!shouldPromptReminder(current)) return current;
        setReminderOpen(true);
        if (current.systemNotify) {
          void showWorkoutReminderNotification(prefs?.locale ?? 'en');
        }
        const marked = markReminderPrompted(current);
        saveReminderSettings(marked);
        return marked;
      });
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') maybeFire();
    };

    document.addEventListener('visibilitychange', onVisible);
    const id = window.setInterval(maybeFire, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(id);
    };
  }, [gate, prefs?.locale]);

  useEffect(() => {
    if (gate !== 'ready') return;
    if (!cloudEnabled || !user || user.mode === 'guest') return;

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void pullLatestFromCloud();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    const id = window.setInterval(() => {
      void pullLatestFromCloud();
    }, 90_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(id);
    };
  }, [cloudEnabled, gate, pullLatestFromCloud, user]);

  const weeklyStats = useMemo(
    () => computeWeeklyStats(history, prefs?.weeklyGoal ?? 4),
    [history, prefs?.weeklyGoal],
  );

  const persistFavorites = useCallback(
    (ids: string[]) => {
      setFavoriteIds(ids);
      saveFavorites(ids);
      if (user) snapshotWorkspaceToUser(user.id);
      if (user && user.mode !== 'guest') {
        void pushFavorites(user, ids);
      }
    },
    [user],
  );

  const toggleFavorite = useCallback(
    (workoutId: string) => {
      persistFavorites(
        favoriteIds.includes(workoutId)
          ? favoriteIds.filter((id) => id !== workoutId)
          : [...favoriteIds, workoutId],
      );
    },
    [favoriteIds, persistFavorites],
  );

  const updatePrefs = (partial: Partial<UserPreferences>) => {
    setPrefs((current) => {
      const next = {
        ...current!,
        ...partial,
        prefsUpdatedAt: Date.now(),
      };
      savePreferences(next);
      if (user) snapshotWorkspaceToUser(user.id);
      if (user && user.mode !== 'guest') {
        void pushPreferences(user, next, reminder);
      }
      return next;
    });
  };

  const updateUserName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, name: trimmed };
      saveAuthUser(next);
      if (next.mode !== 'guest') {
        void upsertProfile(next);
      }
      return next;
    });
  };

  const enterApp = async (nextUser: AuthUser, message: string) => {
    setLoadingMessage(message);
    setGate('entering');
    saveAuthUser(nextUser);

    const localWs = bindUserWorkspace(nextUser.id, {
      migrateOrphans: nextUser.mode !== 'guest',
    });
    setUser(nextUser);
    setPrefs(localWs.preferences);
    setHistory(localWs.history);
    setCustomWorkouts(localWs.customWorkouts);
    setFavoriteIds(localWs.favorites);
    setReminder(localWs.reminder);
    setDraft(localWs.draft);

    await delay(ENTER_MIN_MS);

    if (nextUser.mode !== 'guest' && cloudEnabled) {
      const result = await syncRoundTrip(nextUser);
      if (!result.ok) {
        setSyncMessage(
          localWs.preferences.locale === 'vi'
            ? 'Đăng nhập ok · sync cloud lỗi, thử Sync now'
            : 'Signed in · cloud sync failed, try Sync now',
        );
      }

      const currentPrefs = loadPreferences();
      if (!currentPrefs.onboarded) {
        setGate('onboarding');
      } else {
        setView({ type: 'tabs', tab: 'home' });
        setGate('ready');
      }
      return;
    }

    if (!localWs.preferences.onboarded) {
      setGate('onboarding');
    } else {
      setView({ type: 'tabs', tab: 'home' });
      setGate('ready');
    }
  };

  const loginWithGoogle = async () => {
    if (cloudEnabled) {
      // Park current (guest) progress so OAuth redirect can migrate it on return
      const current = loadAuthUser();
      if (current) snapshotWorkspaceToUser(current.id);
      else snapshotWorkspaceToUser(`guest_pending_${Date.now()}`);
      await signInWithOAuthProvider('google');
      return;
    }
    const mockUser = createSocialUser(
      'google',
      'Google User',
      'user@google.com',
    );
    await enterApp(mockUser, 'Connecting Google…');
  };

  const loginAsGuest = async () => {
    await enterApp(createGuestUser(), 'Starting as guest…');
  };

  const finishOnboarding = (partial: Partial<UserPreferences>) => {
    updatePrefs({ ...partial, onboarded: true });
    setView({ type: 'tabs', tab: 'home' });
    setGate('ready');
  };

  const signOut = () => {
    const locale = prefs?.locale ?? 'en';
    if (user) parkActiveWorkspaceAndClear(user.id, locale);
    else parkActiveWorkspaceAndClear(null, locale);
    void signOutSupabase();
    clearAuthUser();
    setUser(null);
    setPrefs(null);
    setHistory([]);
    setCustomWorkouts([]);
    setFavoriteIds([]);
    setDraft(null);
    setReminder(defaultReminder);
    setSyncMessage(null);
    setView({ type: 'tabs', tab: 'home' });
    setGate('auth');
  };

  const syncNow = async () => {
    if (!user || user.mode === 'guest' || !cloudEnabled || syncBusy) return;
    const locale = prefs?.locale ?? 'en';
    setSyncBusy(true);
    setSyncMessage(locale === 'vi' ? 'Đang đồng bộ…' : 'Syncing…');
    try {
      const result = await syncRoundTrip(user);
      if (!result.ok) {
        setSyncMessage(
          locale === 'vi'
            ? `Đồng bộ thất bại · ${result.error ?? 'thử lại'}`
            : `Sync failed · ${result.error ?? 'try again'}`,
        );
        return;
      }
      const streak = computeWeeklyStats(loadHistory(), loadPreferences().weeklyGoal).streak;
      setSyncMessage(
        locale === 'vi'
          ? `Đã đồng bộ · streak ${streak} · ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
          : `Synced · streak ${streak} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      );
    } catch {
      setSyncMessage(locale === 'vi' ? 'Đồng bộ thất bại · thử lại' : 'Sync failed · try again');
    } finally {
      setSyncBusy(false);
    }
  };

  const startExerciseNow = (exerciseId: string) => {
    clearWorkoutDraft();
    setDraft(null);
    const transientList: CustomWorkout = {
      id: `quick_${exerciseId}`,
      title: prefs?.locale === 'vi' ? 'Buổi tập nhanh' : 'Quick workout',
      exerciseIds: [exerciseId],
      targetSets: 3,
      targetReps: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const session = buildCustomSession(
      transientList,
      (id) =>
        getLastExercisePerformance(history, id, {
          goal: prefs?.primaryGoal,
          level: prefs?.level,
          locale: prefs?.locale,
        }),
      {
        defaultRestSeconds: prefs?.defaultRestSeconds,
        unit: prefs?.units,
        bodyWeightKg: prefs?.weightKg,
        heightCm: prefs?.heightCm,
        level: prefs?.level,
        locale: prefs?.locale,
      },
    );
    if (session.exercises.length === 0) return;
    setView({ type: 'workout', session });
  };

  const startWorkout = (workoutId: string) => {
    clearWorkoutDraft();
    setDraft(null);
    const custom = getCustomWorkout(customWorkouts, workoutId);
    const lookup = (exerciseId: string) => {
      const template = custom
        ? {
            targetReps: custom.targetReps,
            weightStep: 2.5,
          }
        : undefined;
      return getLastExercisePerformance(history, exerciseId, {
        targetReps: template?.targetReps,
        weightStep: template?.weightStep,
        goal: prefs?.primaryGoal,
        level: prefs?.level,
        locale: prefs?.locale,
      });
    };
    const sessionOptions = {
      defaultRestSeconds: prefs?.defaultRestSeconds,
      unit: prefs?.units,
      bodyWeightKg: prefs?.weightKg,
      heightCm: prefs?.heightCm,
      level: prefs?.level,
      locale: prefs?.locale,
    };
    const session = custom
      ? buildCustomSession(custom, lookup, sessionOptions)
      : createSession(workoutId, lookup, sessionOptions);

    if (session.exercises.length === 0) return;
    setView({ type: 'workout', session });
  };

  const saveCustomList = (list: CustomWorkout) => {
    setCustomWorkouts((current) => {
      const next = upsertCustomWorkout(current, list);
      if (user) snapshotWorkspaceToUser(user.id);
      if (user && user.mode !== 'guest') void pushCustomWorkout(user, list);
      return next;
    });
  };

  const removeCustomList = (id: string) => {
    setCustomWorkouts((current) => {
      const next = deleteCustomWorkout(current, id);
      if (user) snapshotWorkspaceToUser(user.id);
      if (user && user.mode !== 'guest') void deleteCloudCustomWorkout(user, id);
      return next;
    });
  };

  const saveSessionAsList = (session: WorkoutSession) => {
    const list = customWorkoutFromSession(session);
    setCustomWorkouts((current) => {
      const next = upsertCustomWorkout(current, list);
      if (user) snapshotWorkspaceToUser(user.id);
      if (user && user.mode !== 'guest') void pushCustomWorkout(user, list);
      return next;
    });
  };

  const finishWorkout = (session: WorkoutSession, durationMs: number) => {
    clearWorkoutDraft();
    setDraft(null);
    setHistory((current) => {
      const next = persistCompletedWorkout(current, session, durationMs);
      if (user) snapshotWorkspaceToUser(user.id);
      if (user && user.mode !== 'guest' && next[0]) {
        void pushHistorySession(user, next[0]);
      }
      return next;
    });
    setView({ type: 'done', session, durationMs });
  };

  const resetHistory = () => {
    clearHistory();
    setHistory([]);
    if (user && user.mode !== 'guest') void clearCloudHistory(user);
  };

  const loadSampleHistory = () => {
    setHistory(loadDemoHistorySeed());
  };

  const saveHistorySession = (session: HistorySession) => {
    setHistory((current) => {
      const next = updateHistorySession(current, session);
      if (user && user.mode !== 'guest') void pushHistorySession(user, session);
      return next;
    });
  };

  const removeHistorySession = (sessionId: string) => {
    setHistory((current) => deleteHistorySession(current, sessionId));
    if (user && user.mode !== 'guest') void deleteCloudHistorySession(user, sessionId);
    setView({ type: 'tabs', tab: 'profile' });
  };




  const resumeDraftWorkout = () => {
    if (!draft) return;
    setView({ type: 'workout', session: draft.session });
  };

  const discardDraftWorkout = () => {
    clearWorkoutDraft();
    setDraft(null);
  };

  const updateReminder = (partial: Partial<ReminderSettings>) => {
    setReminder((current) => {
      const next: ReminderSettings = {
        ...current,
        ...partial,
        days: partial.days ?? current.days,
        updatedAt: Date.now(),
      };
      saveReminderSettings(next);
      if (user) snapshotWorkspaceToUser(user.id);
      if (user && user.mode !== 'guest' && prefs) {
        void pushPreferences(user, prefs, next);
      }
      return next;
    });
  };

  const exportData = () => {
    const payload = buildBackupPayload({
      user,
      preferences: prefs,
      history,
      customWorkouts,
      favorites: favoriteIds,
      reminder,
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.download = `reply-sync-${stamp}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const shareSyncPack = async () => {
    const payload = buildBackupPayload({
      user,
      preferences: prefs,
      history,
      customWorkouts,
      favorites: favoriteIds,
      reminder,
    });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = `reply-sync-${stamp}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const shared = await shareBackupBlob(blob, filename);
    if (!shared) {
      // Fallback to download if Web Share unavailable
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const applyImport = (incoming: BackupPayload, mode: ImportMode) => {
    const applied = applyBackupPayload(
      {
        user,
        preferences: prefs,
        history,
        customWorkouts,
        favorites: favoriteIds,
        reminder,
      },
      incoming,
      mode,
    );

    // Keep the currently signed-in cloud identity — never hijack session from a JSON file.
    const activeUser = user;
    if (applied.preferences) {
      const nextPrefs = {
        ...applied.preferences,
        prefsUpdatedAt: Date.now(),
      };
      setPrefs(nextPrefs);
      savePreferences(nextPrefs);
    }

    setHistory(applied.history);
    saveHistory(applied.history);

    setCustomWorkouts(applied.customWorkouts);
    saveCustomWorkouts(applied.customWorkouts);

    persistFavorites(applied.favorites);

    if (applied.reminder) {
      const nextReminder = { ...applied.reminder, updatedAt: Date.now() };
      setReminder(nextReminder);
      saveReminderSettings(nextReminder);
    }

    if (activeUser) snapshotWorkspaceToUser(activeUser.id);

    if (activeUser && activeUser.mode !== 'guest' && cloudEnabled) {
      const local = readActiveWorkspace();
      void pushFullSnapshot(activeUser, {
        preferences: local.preferences,
        reminder: local.reminder,
        history: local.history,
        customWorkouts: local.customWorkouts,
        favorites: local.favorites,
      }).then((result) => {
        setSyncMessage(
          result.ok
            ? prefs?.locale === 'vi'
              ? 'Đã nhập & đẩy lên cloud'
              : 'Imported & pushed to cloud'
            : prefs?.locale === 'vi'
              ? 'Đã nhập local · cloud push lỗi'
              : 'Imported locally · cloud push failed',
        );
      });
    }

    setView({ type: 'tabs', tab: 'profile' });
    setGate(activeUser ? (applied.preferences?.onboarded || prefs?.onboarded ? 'ready' : 'onboarding') : 'auth');
  };

  const enableSystemNotify = async () => {
    const perm = await requestNotificationPermission();
    return perm === 'granted';
  };

  // ── Gates ──

  if (gate === 'booting' || gate === 'entering') {
    return (
      <div className="relative mx-auto w-full max-w-md">
        <LoadingScreen message={loadingMessage} />
      </div>
    );
  }

  if (gate === 'auth' || !user) {
    return (
      <div className="relative mx-auto w-full max-w-md">
        <LoginScreen
          onLoginGoogle={loginWithGoogle}
          onLoginGuest={loginAsGuest}
          cloudEnabled={cloudEnabled}
        />
      </div>
    );
  }

  if (gate === 'onboarding') {
    return (
      <div className="relative mx-auto w-full max-w-md">
        <OnboardingScreen onComplete={finishOnboarding} />
      </div>
    );
  }

  // ── App ──

  if (view.type === 'workout') {
    return (
      <div className="relative mx-auto w-full max-w-md bg-[var(--white)]">
        <ActiveWorkoutScreen
          session={view.session}
          availableGearIds={prefs?.availableGearIds}
          locale={prefs?.locale ?? 'en'}
          onCancel={() => {
            setDraft(loadWorkoutDraft());
            setView({ type: 'tabs', tab: 'home' });
          }}
          onFinish={finishWorkout}
        />
      </div>
    );
  }

  if (view.type === 'done') {
    return (
      <div className="relative mx-auto w-full max-w-md bg-[var(--white)]">
        <WorkoutDoneScreen
          session={view.session}
          durationMs={view.durationMs}
          locale={prefs?.locale ?? 'en'}
          onSaveAsList={saveSessionAsList}
          onDone={() => setView({ type: 'tabs', tab: 'profile' })}
        />
      </div>
    );
  }

  if (view.type === 'history') {
    const session = getHistoryById(history, view.sessionId);
    return (
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden">
        <main className="safe-top flex-1 overflow-y-auto px-5 pb-10 pt-2 slide-right">
          {session ? (
            <HistoryDetailScreen
              session={session}
              locale={prefs?.locale ?? 'en'}
              onBack={() => setView({ type: 'tabs', tab: 'profile' })}
              onSave={saveHistorySession}
              onDelete={removeHistorySession}
            />
          ) : (
            <button
              type="button"
              onClick={() => setView({ type: 'tabs', tab: 'profile' })}
              className="text-[var(--accent)]"
            >
              Session not found · Back
            </button>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-transparent">
      <main className="safe-top relative z-10 flex-1 overflow-y-auto px-5 pb-28 pt-2">
        {view.tab === 'home' ? (
          <HomeScreen
            onStartWorkout={startWorkout}
            streak={weeklyStats.streak}
            history={history}
            preferences={prefs!}
            onUpdatePrefs={updatePrefs}
            customWorkouts={customWorkouts}
            onSaveCustomWorkout={saveCustomList}
            onDeleteCustomWorkout={removeCustomList}
            draft={draft}
            onResumeDraft={resumeDraftWorkout}
            onDiscardDraft={discardDraftWorkout}
          />
        ) : null}
        {view.tab === 'discovery' ? (
          <DiscoveryScreen
            onStartWorkout={startWorkout}
            onStartExercise={startExerciseNow}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
            preferences={prefs!}
            customWorkouts={customWorkouts}
            onSaveCustomWorkout={saveCustomList}
            onEditGear={() => setView({ type: 'tabs', tab: 'profile' })}
          />
        ) : null}
        {view.tab === 'profile' ? (
          <ProfileScreen
            user={user}
            preferences={prefs!}
            weeklyStats={weeklyStats}
            historyCount={history.length}
            onUpdatePrefs={updatePrefs}
            onClearHistory={resetHistory}
            onLoadSampleHistory={loadSampleHistory}
            onSignOut={signOut}
            onUpdateUserName={updateUserName}
            history={history}
            onOpenHistory={(sessionId) => setView({ type: 'history', sessionId })}
            onExportData={exportData}
            onShareSyncPack={shareSyncPack}
            onApplyImport={applyImport}
            onEnableSystemNotify={enableSystemNotify}
            reminder={reminder}
            onUpdateReminder={updateReminder}
            cloudSyncEnabled={cloudEnabled && user.mode !== 'guest'}
            syncBusy={syncBusy}
            syncMessage={syncMessage}
            onSyncNow={syncNow}
            onGoTrain={() => setView({ type: 'tabs', tab: 'home' })}
          />
        ) : null}
      </main>



      <BottomSheet
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        title={prefs?.locale === 'vi' ? 'Nhắc tập hôm nay' : 'Workout reminder'}
      >
        <div className="space-y-4">
          <p className="text-[15px] text-[var(--ink-soft)]">
            {prefs?.locale === 'vi'
              ? 'Đến giờ tập rồi. Một buổi ngắn 20-30 phút cũng đủ giữ nhịp.'
              : 'It is workout time. Even a quick 20-30 minute session keeps your streak alive.'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => { setReminderOpen(false); setView({ type: 'tabs', tab: 'home' }); }}>
              {prefs?.locale === 'vi' ? 'Mở gợi ý hôm nay' : 'Open today pick'}
            </Button>
            <Button variant="secondary" onClick={() => setReminderOpen(false)}>
              {prefs?.locale === 'vi' ? 'Để sau' : 'Later'}
            </Button>
          </div>
        </div>
      </BottomSheet>

      <div className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2">
        <TabBar
          active={view.tab}
          onChange={(tab) => setView({ type: 'tabs', tab })}
          locale={prefs?.locale ?? 'en'}
        />
      </div>
    </div>
  );
}
