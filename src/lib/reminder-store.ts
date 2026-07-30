export type ReminderSettings = {
  enabled: boolean;
  hour: number;
  days: number[]; // 0..6, Sun..Sat
  lastPromptIso: string | null;
  /** Show OS notification when reminder fires (requires permission). */
  systemNotify: boolean;
  /** Client clock when reminder last changed — cloud LWW merge. */
  updatedAt?: number;
};

const KEY = 'reply.reminder.v1';

export const defaultReminder: ReminderSettings = {
  enabled: false,
  hour: 19,
  days: [1, 2, 3, 4, 5],
  lastPromptIso: null,
  systemNotify: false,
};

/** Display order Mon→Sun with JS getDay() values */
export const reminderDayOrder = [1, 2, 3, 4, 5, 6, 0] as const;

export const reminderDayLabels: Record<number, { en: string; vi: string }> = {
  0: { en: 'Sun', vi: 'CN' },
  1: { en: 'Mon', vi: 'T2' },
  2: { en: 'Tue', vi: 'T3' },
  3: { en: 'Wed', vi: 'T4' },
  4: { en: 'Thu', vi: 'T5' },
  5: { en: 'Fri', vi: 'T6' },
  6: { en: 'Sat', vi: 'T7' },
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadReminderSettings(): ReminderSettings {
  if (!canUseStorage()) return { ...defaultReminder, days: [...defaultReminder.days] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...defaultReminder, days: [...defaultReminder.days] };
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
    const days = Array.isArray(parsed.days)
      ? parsed.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6)
      : [...defaultReminder.days];
    return {
      enabled: Boolean(parsed.enabled),
      hour:
        typeof parsed.hour === 'number'
          ? Math.min(23, Math.max(0, Math.round(parsed.hour)))
          : 19,
      days: days.length > 0 ? [...new Set(days)].sort((a, b) => a - b) : [...defaultReminder.days],
      lastPromptIso: typeof parsed.lastPromptIso === 'string' ? parsed.lastPromptIso : null,
      systemNotify: Boolean(parsed.systemNotify),
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : undefined,
    };
  } catch {
    return { ...defaultReminder, days: [...defaultReminder.days] };
  }
}

export function saveReminderSettings(settings: ReminderSettings) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function isoDay(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shouldPromptReminder(settings: ReminderSettings, now = new Date()) {
  if (!settings.enabled) return false;
  if (settings.days.length === 0) return false;
  if (!settings.days.includes(now.getDay())) return false;
  if (now.getHours() < settings.hour) return false;
  return settings.lastPromptIso !== isoDay(now);
}

export function markReminderPrompted(
  settings: ReminderSettings,
  now = new Date(),
): ReminderSettings {
  return { ...settings, lastPromptIso: isoDay(now) };
}

export function toggleReminderDay(days: number[], day: number) {
  if (days.includes(day)) {
    const next = days.filter((item) => item !== day);
    return next.length > 0 ? next : days;
  }
  return [...days, day].sort((a, b) => a - b);
}

export function formatReminderSummary(
  settings: ReminderSettings,
  locale: 'en' | 'vi' = 'en',
) {
  if (!settings.enabled) return locale === 'vi' ? 'Tắt' : 'Off';
  const dayText = reminderDayOrder
    .filter((day) => settings.days.includes(day))
    .map((day) => reminderDayLabels[day][locale])
    .join('·');
  const time = `${String(settings.hour).padStart(2, '0')}:00`;
  const notify =
    settings.systemNotify
      ? locale === 'vi'
        ? ' · thông báo'
        : ' · notify'
      : '';
  return `${time} · ${dayText || (locale === 'vi' ? 'Chưa chọn ngày' : 'No days')}${notify}`;
}
