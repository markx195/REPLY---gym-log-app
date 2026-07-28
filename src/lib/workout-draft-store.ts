import type { WorkoutSession } from '@/data/session';

export type WorkoutDraft = {
  session: WorkoutSession;
  savedAt: number;
};

const DRAFT_KEY = 'reply.workoutDraft.v1';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadWorkoutDraft(): WorkoutDraft | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkoutDraft | WorkoutSession;

    // New shape: { session, savedAt }
    if (
      parsed &&
      typeof parsed === 'object' &&
      'session' in parsed &&
      parsed.session &&
      typeof (parsed as WorkoutDraft).savedAt === 'number'
    ) {
      const draft = parsed as WorkoutDraft;
      if (!draft.session.workoutId || !Array.isArray(draft.session.exercises)) return null;
      return draft;
    }

    // Legacy shape: bare WorkoutSession
    const legacy = parsed as WorkoutSession;
    if (!legacy?.workoutId || !Array.isArray(legacy?.exercises)) return null;
    return { session: legacy, savedAt: Date.now() };
  } catch {
    return null;
  }
}

export function saveWorkoutDraft(session: WorkoutSession) {
  if (!canUseStorage()) return;
  try {
    const payload: WorkoutDraft = { session, savedAt: Date.now() };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota
  }
}

export function clearWorkoutDraft() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(DRAFT_KEY);
}

export function formatDraftSavedAgo(savedAt: number, locale: 'en' | 'vi' = 'en') {
  const seconds = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
  if (seconds < 45) {
    return locale === 'vi' ? 'vừa lưu' : 'just saved';
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return locale === 'vi' ? `đã lưu ${minutes} phút trước` : `saved ${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return locale === 'vi' ? `đã lưu ${hours} giờ trước` : `saved ${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return locale === 'vi' ? `đã lưu ${days} ngày trước` : `saved ${days}d ago`;
}
