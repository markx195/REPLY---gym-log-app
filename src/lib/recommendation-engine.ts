import type { HistorySession } from '@/data/history';
import { gearCatalog } from '@/data/exercises/gear-catalog';
import { workouts, type Workout, type WorkoutTone } from '@/data/workouts';
import {
  customFitsGear,
  customFocusLabel,
  customTone,
  estimateCustomDurationMin,
  toRecommendableId,
  type CustomWorkout,
} from '@/lib/custom-workouts-store';
import type { Locale } from '@/lib/i18n';
import type { UserPreferences } from '@/lib/preferences-store';

export type RecommendationReason =
  | 'duration-fit'
  | 'equipment-fit'
  | 'goal-fit'
  | 'neglected-focus'
  | 'reduce-fatigue'
  | 'joint-friendly'
  | 'your-list'
  | 'consistency';

export type Recommendable = {
  id: string;
  title: string;
  subtitle: string;
  durationMin: number;
  focus: string;
  equipment: string;
  exercises: number;
  tone: WorkoutTone;
  source: 'builtin' | 'custom';
};

export type DailyRecommendation = {
  pick: Recommendable;
  reason: string;
  reasonType: RecommendationReason;
  ranked: Recommendable[];
};

function toDayMs(iso: string) {
  return new Date(`${iso}T12:00:00`).getTime();
}

function daysSince(iso: string, now = Date.now()) {
  const diff = now - toDayMs(iso);
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

function fromBuiltin(workout: Workout): Recommendable {
  return {
    id: workout.id,
    title: workout.title,
    subtitle: workout.subtitle,
    durationMin: workout.durationMin,
    focus: workout.focus,
    equipment: workout.equipment,
    exercises: workout.exercises,
    tone: workout.tone,
    source: 'builtin',
  };
}

function fromCustom(list: CustomWorkout, locale: Locale): Recommendable | null {
  if (list.exerciseIds.length === 0) return null;
  const durationMin = estimateCustomDurationMin(list);
  return {
    id: toRecommendableId(list.id),
    title: list.title,
    subtitle: locale === 'vi' ? 'List của bạn' : 'Your list',
    durationMin,
    focus: customFocusLabel(list, locale),
    equipment: locale === 'vi' ? 'Tự chọn' : 'Custom',
    exercises: list.exerciseIds.length,
    tone: customTone(list),
    source: 'custom',
  };
}

function workoutFitsEquipment(item: Recommendable, availableGearIds: string[], customs: CustomWorkout[]) {
  if (availableGearIds.length === 0 || availableGearIds.length >= gearCatalog.length) {
    return true;
  }

  if (item.source === 'custom') {
    const list = customs.find((c) => toRecommendableId(c.id) === item.id);
    return list ? customFitsGear(list, availableGearIds) : false;
  }

  const label = item.equipment.toLowerCase();
  const has = (id: string) => availableGearIds.includes(id);
  const checks: Array<[string, boolean]> = [
    ['barbell', has('barbell') || has('smith-machine') || has('ez-bar')],
    ['dumbbell', has('dumbbell')],
    ['cable', has('cable') || has('seated-row') || has('lat-pulldown')],
    [
      'machine',
      has('chest-press') ||
        has('leg-press') ||
        has('pec-deck') ||
        has('shoulder-press-machine') ||
        has('hack-squat') ||
        has('leg-extension') ||
        has('smith-machine') ||
        has('lat-pulldown'),
    ],
    ['minimal', has('body-only') || has('dumbbell') || has('bands')],
    ['bodyweight', has('body-only')],
  ];

  return checks.some(([token, ok]) => ok && label.includes(token));
}

function focusKey(item: Recommendable) {
  const focus = item.focus.toLowerCase();
  if (focus.includes('pull') || focus.includes('back') || focus.includes('lats') || focus.includes('kéo')) {
    return 'pull';
  }
  if (focus.includes('leg') || focus.includes('squat') || focus.includes('quad') || focus.includes('chân')) {
    return 'legs';
  }
  if (
    focus.includes('chest') ||
    focus.includes('push') ||
    focus.includes('press') ||
    focus.includes('ngực') ||
    focus.includes('đẩy')
  ) {
    return 'push';
  }
  if (focus.includes('full') || focus.includes('toàn')) return 'full-body';
  return 'other';
}

function isJointFriendly(item: Recommendable, jointCare: UserPreferences['jointCare']) {
  const text = `${item.title} ${item.focus} ${item.equipment}`.toLowerCase();
  if (jointCare === 'none') return true;
  if (jointCare === 'shoulder') {
    return !text.includes('overhead') && !text.includes('bench heavy');
  }
  if (jointCare === 'knee') {
    return !text.includes('squat') && !text.includes('leg press');
  }
  return !text.includes('squat') && !text.includes('deadlift') && !text.includes('heavy');
}

function mostNeglectedFocus(history: HistorySession[], pool: Recommendable[]) {
  const defaults: Record<string, number> = {
    push: 999,
    pull: 999,
    legs: 999,
    'full-body': 999,
    other: 999,
  };
  const lastSeen = { ...defaults };
  for (const session of history) {
    const item = pool.find((entry) => entry.id === session.workoutId);
    if (!item) continue;
    const key = focusKey(item);
    lastSeen[key] = Math.min(lastSeen[key], daysSince(session.date));
  }
  return Object.entries(lastSeen).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'other';
}

function daysSinceFocus(history: HistorySession[], pool: Recommendable[], focus: string) {
  for (const session of history) {
    const item = pool.find((entry) => entry.id === session.workoutId);
    if (item && focusKey(item) === focus) return daysSince(session.date);
  }
  return 999;
}

function scoreItem(
  item: Recommendable,
  history: HistorySession[],
  prefs: UserPreferences,
  customs: CustomWorkout[],
  pool: Recommendable[],
): { score: number; reasonType: RecommendationReason } {
  let score = 40;
  let reasonType: RecommendationReason = 'consistency';

  const durationGap = Math.abs(item.durationMin - prefs.sessionMin);
  score += Math.max(0, 28 - durationGap);
  if (durationGap <= 8) reasonType = 'duration-fit';

  if (prefs.primaryGoal === 'strength' && item.title.toLowerCase().includes('strength')) {
    score += 12;
    reasonType = 'goal-fit';
  }
  if (prefs.primaryGoal === 'muscle' && (item.focus.toLowerCase().includes('chest') || item.exercises >= 5)) {
    score += 8;
    reasonType = 'goal-fit';
  }
  if (prefs.primaryGoal === 'fat-loss' && item.durationMin <= 35) {
    score += 10;
    reasonType = 'goal-fit';
  }
  if (prefs.primaryGoal === 'consistency' && item.durationMin <= prefs.sessionMin + 5) {
    score += 8;
  }

  if (prefs.focusPriority !== 'full-body') {
    if (focusKey(item) === prefs.focusPriority) {
      score += 14;
      reasonType = 'goal-fit';
    }
  }

  if (workoutFitsEquipment(item, prefs.availableGearIds, customs)) {
    score += 22;
    if (reasonType === 'consistency') reasonType = 'equipment-fit';
  } else {
    score -= 24;
  }

  if (!isJointFriendly(item, prefs.jointCare)) {
    score -= 22;
  } else if (prefs.jointCare !== 'none') {
    score += 8;
    reasonType = 'joint-friendly';
  }

  const neglected = mostNeglectedFocus(history, pool);
  if (focusKey(item) === neglected && neglected !== 'other') {
    score += 18;
    reasonType = 'neglected-focus';
  }

  const recent = history.slice(0, 5).map((entry) => entry.workoutId);
  if (recent[0] === item.id) score -= 28;
  if (recent[1] === item.id) score -= 14;
  const recentFocus = recent
    .map((id) => pool.find((entry) => entry.id === id))
    .filter((entry): entry is Recommendable => Boolean(entry))
    .map(focusKey);
  if (recentFocus[0] === focusKey(item) && focusKey(item) !== 'full-body') {
    score -= 12;
    reasonType = 'reduce-fatigue';
  }
  if (recent.filter((id) => id === item.id).length >= 2) {
    score -= 18;
    reasonType = 'reduce-fatigue';
  }

  if (item.source === 'custom') {
    score += 10;
    if (reasonType === 'consistency' || reasonType === 'equipment-fit') {
      reasonType = 'your-list';
    }
    const lastCustom = history.find((session) => session.workoutId === item.id);
    if (!lastCustom) score += 6;
    else if (daysSince(lastCustom.date) >= 5) score += 8;
  }

  return { score, reasonType };
}

function buildReason(
  reasonType: RecommendationReason,
  item: Recommendable,
  history: HistorySession[],
  prefs: UserPreferences,
  pool: Recommendable[],
) {
  const locale = prefs.locale;
  const focus = focusKey(item);
  const neglectedDays = daysSinceFocus(history, pool, focus);

  if (locale === 'vi') {
    if (reasonType === 'duration-fit') {
      return `Vừa khoảng ${prefs.sessionMin} phút bạn muốn.`;
    }
    if (reasonType === 'equipment-fit') {
      return 'Khớp đồ tập bạn đang có.';
    }
    if (reasonType === 'goal-fit') {
      return 'Hướng đúng mục tiêu bạn đã chọn.';
    }
    if (reasonType === 'neglected-focus') {
      return neglectedDays < 900
        ? `Đã ${neglectedDays} ngày chưa tập nhóm này.`
        : 'Giữ cân bằng nhóm cơ trong tuần.';
    }
    if (reasonType === 'reduce-fatigue') {
      return 'Đổi hướng để đỡ lặp lại buổi trước.';
    }
    if (reasonType === 'joint-friendly') {
      return 'Thân thiện hơn với khớp bạn đang bảo vệ.';
    }
    if (reasonType === 'your-list') {
      return 'List của bạn — sẵn sàng tập tiếp.';
    }
    return 'Ổn định theo nhịp gần đây của bạn.';
  }

  if (reasonType === 'duration-fit') {
    return `Fits your ${prefs.sessionMin}-minute window.`;
  }
  if (reasonType === 'equipment-fit') {
    return 'Matches the gear you have today.';
  }
  if (reasonType === 'goal-fit') {
    return 'Lined up with your training goal.';
  }
  if (reasonType === 'neglected-focus') {
    return neglectedDays < 900
      ? `${neglectedDays} days since this focus.`
      : 'Keeps your week balanced.';
  }
  if (reasonType === 'reduce-fatigue') {
    return 'A fresher angle after recent sessions.';
  }
  if (reasonType === 'joint-friendly') {
    return 'Easier on the joints you marked.';
  }
  if (reasonType === 'your-list') {
    return 'Your list — ready when you are.';
  }
  return 'Solid pick for your recent rhythm.';
}

export function buildRecommendationPool(
  customs: CustomWorkout[],
  locale: Locale,
): Recommendable[] {
  const customItems = customs
    .map((list) => fromCustom(list, locale))
    .filter((item): item is Recommendable => item !== null);
  return [...customItems, ...workouts.map(fromBuiltin)];
}

export function getDailyRecommendation(
  history: HistorySession[],
  prefs: UserPreferences,
  customs: CustomWorkout[] = [],
  excludeIds: string[] = [],
): DailyRecommendation {
  const pool = buildRecommendationPool(customs, prefs.locale);
  const scored = pool
    .filter((item) => !excludeIds.includes(item.id))
    .map((item) => {
      const result = scoreItem(item, history, prefs, customs, pool);
      return { item, ...result };
    })
    .sort((a, b) => b.score - a.score);

  const fallbackPool = scored.length > 0
    ? scored
    : pool.map((item) => ({
        item,
        score: 0,
        reasonType: 'consistency' as const,
      }));

  const winner = fallbackPool[0];
  const ranked = fallbackPool.map((entry) => entry.item);

  return {
    pick: winner.item,
    reasonType: winner.reasonType,
    reason: buildReason(winner.reasonType, winner.item, history, prefs, pool),
    ranked,
  };
}

/** Next pick after the current one in the ranked list (wraps). */
export function nextRecommendation(
  ranked: Recommendable[],
  currentId: string,
): Recommendable | null {
  if (ranked.length <= 1) return null;
  const index = ranked.findIndex((item) => item.id === currentId);
  if (index < 0) return ranked[0] ?? null;
  return ranked[(index + 1) % ranked.length] ?? null;
}
