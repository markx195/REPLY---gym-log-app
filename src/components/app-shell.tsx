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
  createEmailUser,
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
  pushAllCustomWorkouts,
  pushAllHistory,
  pushCustomWorkout,
  pushFavorites,
  pushHistorySession,
  pushPreferences,
  upsertProfile,
} from '@/lib/cloud-sync';
import {
  authUserFromSupabase,
  getSupabaseSessionUser,
  isSupabaseConfigured,
  signInWithEmailMagicLink,
  signInWithOAuthProvider,
  signOutSupabase,
} from '@/lib/supabase/auth';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AppTab } from '@/types/navigation';

type AppView =
  | { type: 'tabs'; tab: AppTab }
  | { type: 'workout'; session: WorkoutSession }
  | { type: 'done'; session: WorkoutSession; durationMs: number }
  | { type: 'history'; sessionId: string };

type Gate = 'booting' | 'auth' | 'onboarding' | 'entering' | 'ready';

const FAVORITES_KEY = 'reply.favorites';
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
  const [emailHint, setEmailHint] = useState<string | null>(null);
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

  const pullLatestFromCloud = useCallback(async () => {
    if (!cloudEnabled || !user || user.mode === 'guest') return;
    const snap = await pullCloudSnapshot();
    if (!snap) return;

    const localPrefs = prefs ?? loadPreferences();
    let localFavorites = favoriteIds;
    try {
      const raw = window.localStorage.getItem(FAVORITES_KEY);
      if (raw) localFavorites = JSON.parse(raw) as string[];
    } catch {
      // ignore
    }

    const merged = mergeLocalWithCloud({
      localPrefs,
      cloudPrefs: snap.preferences,
      localHistory: history,
      cloudHistory: snap.history,
      localCustoms: customWorkouts,
      cloudCustoms: snap.customWorkouts,
      localFavorites,
      cloudFavorites: snap.favorites,
    });
    savePreferences(merged.preferences);
    saveHistory(merged.history);
    saveCustomWorkouts(merged.customWorkouts);
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(merged.favorites));
    } catch {
      // ignore
    }
    setPrefs(merged.preferences);
    setHistory(merged.history);
    setCustomWorkouts(merged.customWorkouts);
    setFavoriteIds(merged.favorites);
  }, [cloudEnabled, customWorkouts, favoriteIds, history, prefs, user]);

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
        let favoriteIdsLocal: string[] = [];
        try {
          const raw = window.localStorage.getItem(FAVORITES_KEY);
          if (raw) favoriteIdsLocal = JSON.parse(raw) as string[];
        } catch {
          // ignore
        }

        let nextHistory = loadHistory();
        let nextUser = loadAuthUser();
        let nextPrefs = loadPreferences();
        let nextCustoms = loadCustomWorkouts();
        const nextDraft = loadWorkoutDraft();
        const nextReminder = loadReminderSettings();

        if (cloudEnabled) {
          const cloudUser = await getCloudUserWithRetry();
          if (cancelled) return;
          if (cloudUser) {
            nextUser = cloudUser;
            saveAuthUser(cloudUser);
            const snap = await pullCloudSnapshot();
            if (cancelled) return;
            if (snap) {
              const merged = mergeLocalWithCloud({
                localPrefs: nextPrefs,
                cloudPrefs: snap.preferences,
                localHistory: nextHistory,
                cloudHistory: snap.history,
                localCustoms: nextCustoms,
                cloudCustoms: snap.customWorkouts,
                localFavorites: favoriteIdsLocal,
                cloudFavorites: snap.favorites,
              });
              nextPrefs = merged.preferences;
              nextHistory = merged.history;
              nextCustoms = merged.customWorkouts;
              favoriteIdsLocal = merged.favorites;
              savePreferences(nextPrefs);
              saveHistory(nextHistory);
              saveCustomWorkouts(nextCustoms);
              try {
                window.localStorage.setItem(
                  FAVORITES_KEY,
                  JSON.stringify(favoriteIdsLocal),
                );
              } catch {
                // ignore
              }
              void upsertProfile(cloudUser);
              void pushPreferences(cloudUser, nextPrefs);
              void pushAllHistory(cloudUser, nextHistory);
              void pushAllCustomWorkouts(cloudUser, nextCustoms);
              void pushFavorites(cloudUser, favoriteIdsLocal);
            }
          } else if (nextUser && nextUser.mode !== 'guest') {
            // Stale local cloud-looking user without session → clear to auth.
            // Keep guest / demo local users when cloud is configured but unused.
            if (
              !nextUser.id.startsWith('guest_') &&
              !nextUser.id.startsWith('u_') &&
              !nextUser.id.startsWith('google_') &&
              !nextUser.id.startsWith('apple_') &&
              !nextUser.id.startsWith('facebook_')
            ) {
              clearAuthUser();
              nextUser = null;
            }
          }
        }

        if (cancelled) return;

        setFavoriteIds(favoriteIdsLocal);
        setHistory(nextHistory);
        setUser(nextUser);
        setPrefs(nextPrefs);
        setCustomWorkouts(nextCustoms);
        setDraft(nextDraft);
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

        if (!nextUser) {
          setGate('auth');
        } else if (!nextPrefs.onboarded) {
          setGate('onboarding');
        } else {
          setGate('ready');
        }

        // Clean magic-link return flag from URL without a full reload.
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
        setEmailHint(null);
        setGate((current) => {
          if (current !== 'auth') return current;
          return loadPreferences().onboarded ? 'ready' : 'onboarding';
        });
      }

      if (event === 'SIGNED_OUT') {
        clearAuthUser();
        setUser(null);
        setEmailHint(null);
        setGate('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [cloudEnabled]);

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
      try {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
      } catch {
        // ignore
      }
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
      const next = { ...current!, ...partial };
      savePreferences(next);
      if (user && user.mode !== 'guest') {
        void pushPreferences(user, next);
      }
      return next;
    });
  };

  const enterApp = async (nextUser: AuthUser, message: string) => {
    setLoadingMessage(message);
    setGate('entering');
    saveAuthUser(nextUser);
    setUser(nextUser);
    await delay(ENTER_MIN_MS);

    if (nextUser.mode !== 'guest' && cloudEnabled) {
      void upsertProfile(nextUser);
      const snap = await pullCloudSnapshot();
      const localPrefs = loadPreferences();
      const localHistory = loadHistory();
      const localCustoms = loadCustomWorkouts();
      let localFavorites: string[] = [];
      try {
        const raw = window.localStorage.getItem(FAVORITES_KEY);
        if (raw) localFavorites = JSON.parse(raw) as string[];
      } catch {
        // ignore
      }

      if (snap) {
        const merged = mergeLocalWithCloud({
          localPrefs,
          cloudPrefs: snap.preferences,
          localHistory,
          cloudHistory: snap.history,
          localCustoms,
          cloudCustoms: snap.customWorkouts,
          localFavorites,
          cloudFavorites: snap.favorites,
        });
        savePreferences(merged.preferences);
        saveHistory(merged.history);
        saveCustomWorkouts(merged.customWorkouts);
        try {
          window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(merged.favorites));
        } catch {
          // ignore
        }
        setPrefs(merged.preferences);
        setHistory(merged.history);
        setCustomWorkouts(merged.customWorkouts);
        setFavoriteIds(merged.favorites);
        void pushPreferences(nextUser, merged.preferences);
        void pushAllHistory(nextUser, merged.history);
        void pushAllCustomWorkouts(nextUser, merged.customWorkouts);
        void pushFavorites(nextUser, merged.favorites);

        if (!merged.preferences.onboarded) {
          setGate('onboarding');
        } else {
          setView({ type: 'tabs', tab: 'home' });
          setGate('ready');
        }
        return;
      }
    }

    const currentPrefs = loadPreferences();
    setPrefs(currentPrefs);
    if (!currentPrefs.onboarded) {
      setGate('onboarding');
    } else {
      setView({ type: 'tabs', tab: 'home' });
      setGate('ready');
    }
  };

  const loginWithEmail = async (email: string) => {
    if (cloudEnabled) {
      await signInWithEmailMagicLink(email);
      setEmailHint('Magic link sent — open it on this device to finish sign-in.');
      return;
    }
    await enterApp(createEmailUser(email), 'Signing you in…');
  };

  const loginWithSocial = async (provider: 'google' | 'apple' | 'facebook') => {
    if (cloudEnabled) {
      await signInWithOAuthProvider(provider);
      return;
    }
    const labels: Record<string, string> = {
      google: 'Google',
      apple: 'Apple',
      facebook: 'Facebook',
    };
    const mockUser = createSocialUser(
      provider,
      `${labels[provider]} User`,
      `user@${provider}.com`,
    );
    await enterApp(mockUser, `Connecting ${labels[provider]}…`);
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
    void signOutSupabase();
    clearAuthUser();
    setUser(null);
    setEmailHint(null);
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
      void upsertProfile(user);
      const snap = await pullCloudSnapshot();
      const localPrefs = prefs ?? loadPreferences();
      let localFavorites = favoriteIds;
      try {
        const raw = window.localStorage.getItem(FAVORITES_KEY);
        if (raw) localFavorites = JSON.parse(raw) as string[];
      } catch {
        // ignore
      }

      if (snap) {
        const merged = mergeLocalWithCloud({
          localPrefs,
          cloudPrefs: snap.preferences,
          localHistory: history,
          cloudHistory: snap.history,
          localCustoms: customWorkouts,
          cloudCustoms: snap.customWorkouts,
          localFavorites,
          cloudFavorites: snap.favorites,
        });
        savePreferences(merged.preferences);
        saveHistory(merged.history);
        saveCustomWorkouts(merged.customWorkouts);
        try {
          window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(merged.favorites));
        } catch {
          // ignore
        }
        setPrefs(merged.preferences);
        setHistory(merged.history);
        setCustomWorkouts(merged.customWorkouts);
        setFavoriteIds(merged.favorites);
        await Promise.all([
          pushPreferences(user, merged.preferences),
          pushAllHistory(user, merged.history),
          pushAllCustomWorkouts(user, merged.customWorkouts),
          pushFavorites(user, merged.favorites),
        ]);
      } else {
        await Promise.all([
          pushPreferences(user, localPrefs),
          pushAllHistory(user, history),
          pushAllCustomWorkouts(user, customWorkouts),
          pushFavorites(user, localFavorites),
        ]);
      }
      setSyncMessage(
        locale === 'vi'
          ? `Đã đồng bộ · ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
          : `Synced · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
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
      if (user && user.mode !== 'guest') void pushCustomWorkout(user, list);
      return next;
    });
  };

  const removeCustomList = (id: string) => {
    setCustomWorkouts((current) => {
      const next = deleteCustomWorkout(current, id);
      if (user && user.mode !== 'guest') void deleteCloudCustomWorkout(user, id);
      return next;
    });
  };

  const saveSessionAsList = (session: WorkoutSession) => {
    const list = customWorkoutFromSession(session);
    setCustomWorkouts((current) => {
      const next = upsertCustomWorkout(current, list);
      if (user && user.mode !== 'guest') void pushCustomWorkout(user, list);
      return next;
    });
  };

  const finishWorkout = (session: WorkoutSession, durationMs: number) => {
    clearWorkoutDraft();
    setDraft(null);
    setHistory((current) => {
      const next = persistCompletedWorkout(current, session, durationMs);
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
      };
      saveReminderSettings(next);
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

    setUser(applied.user);
    if (applied.user) saveAuthUser(applied.user);
    else clearAuthUser();

    if (applied.preferences) {
      setPrefs(applied.preferences);
      savePreferences(applied.preferences);
    }

    setHistory(applied.history);
    saveHistory(applied.history);

    setCustomWorkouts(applied.customWorkouts);
    saveCustomWorkouts(applied.customWorkouts);

    persistFavorites(applied.favorites);

    if (applied.reminder) {
      setReminder(applied.reminder);
      saveReminderSettings(applied.reminder);
    }

    setView({ type: 'tabs', tab: 'profile' });
    setGate(applied.user ? (applied.preferences?.onboarded ? 'ready' : 'onboarding') : 'auth');
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
          onLoginEmail={loginWithEmail}
          onLoginSocial={loginWithSocial}
          onLoginGuest={loginAsGuest}
          cloudEnabled={cloudEnabled}
          emailHint={emailHint}
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
