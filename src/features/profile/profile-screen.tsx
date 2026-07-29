'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { BottomSheet, Button, Card, InputNumber } from '@/components/ui';
import { GearPicker } from '@/components/ui/gear-picker';
import type { HistorySession } from '@/data/history';
import { formatVolume } from '@/data/history';
import type { AuthUser } from '@/lib/auth-store';
import { computeProgressInsights, type LiveWeeklyStats } from '@/lib/history-store';
import {
  formatReminderSummary,
  reminderDayLabels,
  reminderDayOrder,
  toggleReminderDay,
  type ReminderSettings,
} from '@/lib/reminder-store';
import { translate } from '@/lib/i18n';
import {
  focusLabels,
  formatGearSummary,
  goalLabels,
  jointCareLabels,
  levelLabels,
  type FitnessLevel,
  type FocusPriority,
  type JointCare,
  type PrimaryGoal,
  type UserPreferences,
} from '@/lib/preferences-store';
import {
  formatBackupStamp,
  parseBackupPayload,
  summarizeBackup,
  type BackupPayload,
  type BackupSummary,
  type ImportMode,
} from '@/lib/user-data-backup';
import { cn } from '@/lib/cn';

type ProfileScreenProps = {
  user: AuthUser;
  preferences: UserPreferences;
  weeklyStats: LiveWeeklyStats;
  historyCount: number;
  onUpdatePrefs: (partial: Partial<UserPreferences>) => void;
  onClearHistory: () => void;
  onLoadSampleHistory: () => void;
  onSignOut: () => void;
  onUpdateUserName: (name: string) => void;
  history: HistorySession[];
  onOpenHistory: (sessionId: string) => void;
  onExportData: () => void;
  onShareSyncPack: () => Promise<void>;
  onApplyImport: (payload: BackupPayload, mode: ImportMode) => void;
  onEnableSystemNotify: () => Promise<boolean>;
  reminder: ReminderSettings;
  onUpdateReminder: (partial: Partial<ReminderSettings>) => void;
  cloudSyncEnabled?: boolean;
  syncBusy?: boolean;
  syncMessage?: string | null;
  onSyncNow?: () => void | Promise<void>;
  onGoTrain?: () => void;
};

export function ProfileScreen({
  user,
  preferences,
  weeklyStats,
  historyCount,
  onUpdatePrefs,
  onClearHistory,
  onLoadSampleHistory,
  onSignOut,
  onUpdateUserName,
  history,
  onOpenHistory,
  onExportData,
  onShareSyncPack,
  onApplyImport,
  onEnableSystemNotify,
  reminder,
  onUpdateReminder,
  cloudSyncEnabled = false,
  syncBusy = false,
  syncMessage = null,
  onSyncNow,
  onGoTrain,
}: ProfileScreenProps) {
  const locale = preferences.locale;
  const isVi = locale === 'vi';
  const l = (viText: string, enText: string) => (isVi ? viText : enText);
  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);

  const insights = useMemo(() => computeProgressInsights(history), [history]);
  const maxDayVolume = Math.max(...insights.dayVolumes.map((day) => day.volume), 1);
  const maxWeekTrend = Math.max(...insights.weekTrend.map((w) => w.volume), 1);
  const todayIso = new Date().toISOString().slice(0, 10);

  const volumeDeltaLabel =
    insights.volumeDeltaPct === null
      ? l('Tuần đầu theo dõi', 'First week tracking')
      : insights.volumeDeltaPct === 0
        ? l('Volume bằng tuần trước', 'Same volume as last week')
        : insights.volumeDeltaPct > 0
          ? `+${insights.volumeDeltaPct}%`
          : `${insights.volumeDeltaPct}%`;

  const weekLeft = Math.max(0, preferences.weeklyGoal - insights.sessionsThisWeek);

  const coachNotes = useMemo(() => {
    const notes: string[] = [];
    if (history.length < 2) {
      notes.push(
        l(
          'Bắt đầu với 2-3 buổi/tuần. Sau 2 buổi, REPLY sẽ gợi ý tăng tạ/reps theo từng bài.',
          'Start with 2-3 sessions/week. After 2 sessions, REPLY suggests weight/reps per exercise.',
        ),
      );
    }

    if (insights.volumeDeltaPct !== null) {
      if (insights.volumeDeltaPct < -10) {
        notes.push(
          locale === 'vi'
            ? `Volume tuần này giảm ${Math.abs(insights.volumeDeltaPct)}%. Thêm 1 buổi ngắn hoặc giữ tạ, tăng reps.`
            : `Volume dropped ${Math.abs(insights.volumeDeltaPct)}% this week. Add one short session or hold weight and push reps.`,
        );
      } else if (insights.volumeDeltaPct > 20) {
        notes.push(
          locale === 'vi'
            ? `Volume tăng ${insights.volumeDeltaPct}% — cân nhắc 1 ngày nhẹ hoặc rest dài hơn giữa set.`
            : `Volume up ${insights.volumeDeltaPct}% — consider one lighter day or longer rest between sets.`,
        );
      }
    }

    if (insights.sessionsThisWeek < preferences.weeklyGoal && history.length >= 2) {
      const left = preferences.weeklyGoal - insights.sessionsThisWeek;
      notes.push(
        locale === 'vi'
          ? `Còn ${left} buổi để đạt mục tiêu tuần (${preferences.weeklyGoal}).`
          : `${left} session${left === 1 ? '' : 's'} left to hit your weekly goal (${preferences.weeklyGoal}).`,
      );
    }

    if (insights.personalRecords[0]) {
      const pr = insights.personalRecords[0];
      notes.push(
        locale === 'vi'
          ? `PR gần nhất: ${pr.name} ${pr.weight}${preferences.units}×${pr.reps}. Giữ form khi tăng tiếp.`
          : `Top PR: ${pr.name} ${pr.weight}${preferences.units}×${pr.reps}. Keep form when progressing.`,
      );
    }

    if (insights.muscleVolume.length >= 2) {
      const top = insights.muscleVolume[0];
      const low = insights.muscleVolume[insights.muscleVolume.length - 1];
      if (top.volume > low.volume * 2.2) {
        notes.push(
          locale === 'vi'
            ? `Tuần này nghiêng ${top.muscle}. Lần tới cân bằng hơn với nhóm yếu hơn.`
            : `This week skews ${top.muscle}. Balance next session toward underworked work.`,
        );
      }
    }

    if (weeklyStats.streak >= 5) {
      notes.push(
        locale === 'vi'
          ? 'Chuỗi đang tốt — giữ 30-45 phút và progressive overload từng bài.'
          : 'Great streak — keep 30-45 min sessions and progressive overload per lift.',
      );
    }

    if (notes.length === 0) {
      notes.push(
        locale === 'vi'
          ? 'Tiếp tục nhịp hiện tại, ưu tiên form và tăng dần theo gợi ý từng bài.'
          : 'Keep current rhythm; prioritize form and follow per-exercise progression cues.',
      );
    }

    return notes.slice(0, 3);
  }, [
    history.length,
    insights.muscleVolume,
    insights.personalRecords,
    insights.sessionsThisWeek,
    insights.volumeDeltaPct,
    locale,
    preferences.units,
    preferences.weeklyGoal,
    weeklyStats.streak,
  ]);

  const [settingsSheet, setSettingsSheet] = useState(false);
  const [historySheet, setHistorySheet] = useState(false);
  const [goalSheet, setGoalSheet] = useState(false);
  const [goalDraft, setGoalDraft] = useState(preferences.weeklyGoal);
  const [equipSheet, setEquipSheet] = useState(false);
  const [levelSheet, setLevelSheet] = useState(false);
  const [goalTypeSheet, setGoalTypeSheet] = useState(false);
  const [focusSheet, setFocusSheet] = useState(false);
  const [jointSheet, setJointSheet] = useState(false);
  const [durationSheet, setDurationSheet] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [reminderSheet, setReminderSheet] = useState(false);
  const [nicknameSheet, setNicknameSheet] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(user.name);
  const [importBusy, setImportBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    payload: BackupPayload;
    summary: BackupSummary;
  } | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initial = user.name.trim().charAt(0).toUpperCase() || 'R';
  const shortUserId = user.id.length > 12 ? `${user.id.slice(0, 6)}...${user.id.slice(-4)}` : user.id;
  const roleLabel = user.mode === 'guest'
    ? l('Khách', 'Guest athlete')
    : cloudSyncEnabled
      ? l('Cloud · đã đăng nhập', 'Cloud · signed in')
      : l('Vận động viên', 'Athlete');
  const emailLabel = user.email ?? l('Phiên khách cục bộ', 'Local guest session');

  const themeLabel =
    preferences.theme === 'dark'
      ? l('Tối', 'Dark')
      : preferences.theme === 'light'
        ? l('Sáng', 'Light')
        : l('Hệ thống', 'System');

  const cycleTheme = () => {
    const order: UserPreferences['theme'][] = ['system', 'light', 'dark'];
    const idx = order.indexOf(preferences.theme);
    onUpdatePrefs({ theme: order[(idx + 1) % order.length] });
  };

  const settings = [
    {
      id: 'nickname',
      label: l('Nickname', 'Nickname'),
      value: user.name,
      action: () => {
        setNicknameDraft(user.name);
        setNicknameSheet(true);
      },
    },
    {
      id: 'account-id',
      label: l('User ID', 'User ID'),
      value: shortUserId,
    },
    {
      id: 'language',
      label: t('language'),
      value: l('Tiếng Việt', 'English'),
      action: () => onUpdatePrefs({ locale: locale === 'en' ? 'vi' : 'en' }),
    },
    {
      id: 'goal',
      label: t('weeklyGoal'),
      value: `${preferences.weeklyGoal} ${l('buổi', 'sessions')}`,
      action: () => {
        setGoalDraft(preferences.weeklyGoal);
        setGoalSheet(true);
      },
    },
    {
      id: 'goal-type',
      label: t('primaryGoal'),
      value: goalLabels[preferences.primaryGoal][locale],
      action: () => setGoalTypeSheet(true),
    },
    {
      id: 'equipment',
      label: t('availableGear'),
      value: formatGearSummary(preferences.availableGearIds, locale),
      action: () => setEquipSheet(true),
    },
    {
      id: 'level',
      label: t('level'),
      value: levelLabels[preferences.level][locale],
      action: () => setLevelSheet(true),
    },
    {
      id: 'focus',
      label: t('focusPriority'),
      value: focusLabels[preferences.focusPriority][locale],
      action: () => setFocusSheet(true),
    },
    {
      id: 'joint',
      label: t('jointCare'),
      value: jointCareLabels[preferences.jointCare][locale],
      action: () => setJointSheet(true),
    },
    {
      id: 'duration',
      label: t('sessionLength'),
      value: `${preferences.sessionMin} ${t('min')}`,
      action: () => setDurationSheet(true),
    },
    {
      id: 'units',
      label: t('weightUnits'),
      value: preferences.units,
      action: () => onUpdatePrefs({ units: preferences.units === 'kg' ? 'lbs' : 'kg' }),
    },
    {
      id: 'rest',
      label: l('Rest mặc định', 'Default rest'),
      value: `${preferences.defaultRestSeconds}s`,
      action: () =>
        onUpdatePrefs({
          defaultRestSeconds:
            preferences.defaultRestSeconds >= 120
              ? 60
              : preferences.defaultRestSeconds + 30,
        }),
    },
    {
      id: 'theme',
      label: t('theme'),
      value: themeLabel,
      action: cycleTheme,
    },
    {
      id: 'reminder',
      label: l('Nhắc tập tuần', 'Weekly reminder'),
      value: formatReminderSummary(reminder, locale),
      action: () => setReminderSheet(true),
    },
    {
      id: 'history',
      label: t('savedSessions'),
      value: `${historyCount}`,
      action: () => setConfirmClear(true),
    },
  ];

  return (
    <>
      <div className="relative space-y-6 fade-in">
        <div className="ambient-blob -right-12 top-0 h-48 w-48 bg-[var(--blob)]/30" aria-hidden />

        <section className="relative overflow-hidden rounded-[var(--radius-2xl)] bg-gradient-to-br from-[var(--panel-ink)] via-[var(--panel-ink-mid)] to-[var(--panel-ink-end)] p-6 text-white shadow-[var(--shadow-lg)]">
          <button
            type="button"
            onClick={() => setSettingsSheet(true)}
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-sm"
          >
            {l('Cài đặt', 'Settings')}
          </button>
          <div className="flex items-center gap-4">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-white/10 text-[28px] font-semibold backdrop-blur-sm">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-white/55">{roleLabel}</p>
              <h1 className="mt-0.5 truncate text-[28px] font-semibold tracking-[var(--tracking-snug)]">
                {user.name}
              </h1>
              <p className="mt-1 truncate text-[14px] text-white/60">{emailLabel}</p>
              <p className="mt-1 truncate text-[12px] font-semibold text-white/45">
                ID: {shortUserId}
              </p>
            </div>
          </div>

          <div className="mt-5 flex justify-between gap-1">
            {weeklyStats.weekDays.map((day, index) => (
              <div key={`${day.label}-${index}`} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    day.done ? 'bg-[var(--accent)]' : 'bg-white/25',
                  )}
                />
                <span className="text-[10px] font-semibold text-white/50">{day.label}</span>
              </div>
            ))}
          </div>

          {weekLeft > 0 ? (
            <button
              type="button"
              onClick={onGoTrain}
              className="mt-5 w-full rounded-full bg-[var(--accent)] px-4 py-3 text-[14px] font-semibold text-white active:scale-[0.99]"
            >
              {isVi
                ? `Còn ${weekLeft} buổi tuần này — tập ngay →`
                : `${weekLeft} session${weekLeft === 1 ? '' : 's'} left this week — train →`}
            </button>
          ) : (
            <p className="mt-5 text-center text-[13px] font-semibold text-white/70">
              {isVi
                ? 'Đã đủ mục tiêu tuần — giữ đà!'
                : 'Weekly goal hit — keep the streak!'}
            </p>
          )}
        </section>

        <section className="grid grid-cols-4 gap-2">
          {[
            {
              label: 'Streak',
              value: String(weeklyStats.streak),
              hint: l('ngày', 'days'),
            },
            {
              label: l('Tuần', 'Week'),
              value: `${weeklyStats.sessionsDone}/${weeklyStats.sessionsGoal}`,
              hint: l('buổi', 'sessions'),
            },
            {
              label: 'Volume',
              value: formatVolume(insights.weekVolume),
              hint: volumeDeltaLabel,
            },
            {
              label: l('TB buổi', 'Avg'),
              value: insights.avgSessionMin ? `${insights.avgSessionMin}` : '—',
              hint: t('min'),
            },
          ].map((stat) => (
            <Card key={stat.label} padding="none" className="px-2 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {stat.label}
              </p>
              <p className="mt-1 text-[16px] font-semibold tabular-nums text-[var(--black)]">
                {stat.value}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-[var(--ink-soft)]">{stat.hint}</p>
            </Card>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
              {l('Volume tuần này', 'Volume this week')}
            </h2>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                insights.volumeDeltaPct !== null && insights.volumeDeltaPct > 0
                  ? 'bg-[var(--accent-mist)] text-[var(--accent)]'
                  : 'bg-[var(--surface)] text-[var(--ink-soft)]',
              )}
            >
              {volumeDeltaLabel}
              {insights.volumeDeltaPct !== null && insights.volumeDeltaPct !== 0
                ? l(' vs tuần trước', ' vs last week')
                : ''}
            </span>
          </div>
          <Card>
            <div className="flex h-36 items-end justify-between gap-2">
              {insights.dayVolumes.map((day) => {
                const ratio = day.volume / maxDayVolume;
                const isToday = day.date === todayIso;
                return (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <p className="text-[10px] font-semibold tabular-nums text-[var(--muted)]">
                      {day.volume > 0 ? formatVolume(day.volume) : ''}
                    </p>
                    <div className="flex h-24 w-full items-end justify-center">
                      <div
                        className={cn(
                          'w-full max-w-[30px] rounded-t-[10px] transition-all',
                          day.volume > 0
                            ? isToday
                              ? 'bg-[var(--accent)]'
                              : 'bg-[var(--accent)]/45'
                            : 'bg-[var(--surface)]',
                        )}
                        style={{ height: `${Math.max(8, ratio * 100)}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-[11px] font-semibold',
                        isToday ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)]',
                      )}
                    >
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
            {l('Xu hướng 4 tuần', '4-week trend')}
          </h2>
          <Card>
            <div className="flex h-28 items-end gap-3">
              {insights.weekTrend.map((week) => {
                const ratio = week.volume / maxWeekTrend;
                const isNow = week.label === 'Now';
                return (
                  <div key={week.label} className="flex flex-1 flex-col items-center gap-2">
                    <p className="text-[11px] font-semibold tabular-nums text-[var(--muted)]">
                      {week.sessions}
                      {l('b', 's')}
                    </p>
                    <div className="flex h-16 w-full items-end justify-center">
                      <div
                        className={cn(
                          'w-full max-w-[40px] rounded-t-[12px]',
                          week.volume > 0
                            ? isNow
                              ? 'bg-[var(--accent)]'
                              : 'bg-[var(--accent)]/35'
                            : 'bg-[var(--surface)]',
                        )}
                        style={{ height: `${Math.max(10, ratio * 100)}%` }}
                        title={formatVolume(week.volume)}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-[11px] font-semibold',
                        isNow ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)]',
                      )}
                    >
                      {week.label === 'Now'
                        ? l('Tuần này', 'Now')
                        : week.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {insights.personalRecords.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
              {l('Kỷ lục cá nhân', 'Personal records')}
            </h2>
            <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 hide-scrollbar">
              {insights.personalRecords.map((pr) => (
                <div
                  key={pr.exerciseId}
                  className="w-[148px] shrink-0 overflow-hidden rounded-[var(--radius-xl)] bg-[var(--white)] p-4 shadow-[var(--shadow-md)]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">
                    PR
                  </p>
                  <p className="mt-2 line-clamp-2 text-[14px] font-semibold leading-snug text-[var(--black)]">
                    {pr.name}
                  </p>
                  <p className="mt-3 text-[26px] font-semibold tracking-[var(--tracking-snug)] tabular-nums text-[var(--black)]">
                    {pr.weight}
                    <span className="ml-1 text-[12px] font-medium text-[var(--muted)]">
                      {preferences.units}
                    </span>
                  </p>
                  <p className="text-[12px] text-[var(--muted)]">
                    ×{pr.reps} · {pr.dateLabel}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {insights.bestSession ? (
          <button
            type="button"
            onClick={() => onOpenHistory(insights.bestSession!.id)}
            className="w-full overflow-hidden rounded-[var(--radius-2xl)] bg-gradient-to-br from-[var(--panel-ink)] to-[var(--panel-ink-end)] p-5 text-left text-white shadow-[var(--shadow-lg)] active:scale-[0.985]"
          >
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/55">
              {l('Buổi mạnh nhất', 'Best session')}
            </p>
            <p className="mt-2 text-[22px] font-semibold tracking-[var(--tracking-snug)]">
              {insights.bestSession.title}
            </p>
            <p className="mt-1 text-[14px] text-white/65">
              {formatVolume(insights.bestSession.volume)} volume · {insights.bestSession.dateLabel} ·{' '}
              {l('xem chi tiết', 'tap to view')}
            </p>
          </button>
        ) : null}

        {insights.muscleVolume.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
              {l('Focus tuần này', 'This week focus')}
            </h2>
            <Card className="space-y-2.5">
              {insights.muscleVolume.map((item) => {
                const max = insights.muscleVolume[0]?.volume || 1;
                return (
                  <div key={item.muscle} className="space-y-1">
                    <div className="flex justify-between text-[12px] font-semibold">
                      <span className="text-[var(--ink-soft)]">{item.muscle}</span>
                      <span className="tabular-nums text-[var(--muted)]">
                        {formatVolume(item.volume)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--surface)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${Math.max(8, (item.volume / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </Card>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
              {l('Lịch sử tập', 'Workout history')}
            </h2>
            {history.length > 0 ? (
              <button
                type="button"
                onClick={() => setHistorySheet(true)}
                className="text-[13px] font-semibold text-[var(--accent)]"
              >
                {l(`Xem tất cả (${history.length})`, `See all (${history.length})`)}
              </button>
            ) : (
              <span className="text-[12px] font-semibold text-[var(--ink-soft)]">0</span>
            )}
          </div>
          {history.length === 0 ? (
            <Card className="space-y-3 text-center">
              <p className="text-[14px] text-[var(--ink-soft)]">
                {isVi
                  ? 'Chưa có buổi nào. Tập xong sẽ hiện ở đây — mở biểu đồ và PR.'
                  : 'No sessions yet. Finish a workout to unlock charts and PRs here.'}
              </p>
              <div className="flex justify-center gap-2">
                {onGoTrain ? (
                  <Button size="sm" onClick={onGoTrain}>
                    {l('Tập hôm nay', 'Train today')}
                  </Button>
                ) : null}
                <Button variant="secondary" size="sm" onClick={onLoadSampleHistory}>
                  {l('Xem demo', 'Preview sample')}
                </Button>
              </div>
            </Card>
          ) : (
            <ul className="space-y-2">
              {history.slice(0, 5).map((session) => {
                const setCount = session.exercises.reduce(
                  (sum, item) => sum + item.sets.length,
                  0,
                );
                return (
                  <li key={session.id}>
                    <button
                      type="button"
                      onClick={() => onOpenHistory(session.id)}
                      className="flex w-full overflow-hidden rounded-[var(--radius-xl)] bg-[var(--white)] text-left shadow-[var(--shadow-md)] active:scale-[0.985]"
                    >
                      <div
                        className={cn('w-14 shrink-0 bg-gradient-to-b', session.tone)}
                        aria-hidden
                      />
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-3.5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-[var(--black)]">
                            {session.title}
                          </p>
                          <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
                            {session.dateLabel} · {session.durationMin} {t('min')} · {setCount}{' '}
                            {t('sets')}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[14px] font-semibold tabular-nums text-[var(--black)]">
                            {formatVolume(session.volume)}
                          </p>
                          <p className="text-[11px] font-semibold text-[var(--accent)]">
                            {l('Mở', 'Open')}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
            {l('Gợi ý cho bạn', 'Coach notes')}
          </h2>
          <div className="space-y-2">
            {coachNotes.map((note) => (
              <Card key={note} className="border border-[var(--border)] bg-[var(--accent-mist)]/40">
                <p className="text-[14px] leading-relaxed text-[var(--black)]">{note}</p>
              </Card>
            ))}
          </div>
        </section>

        <Button variant="secondary" fullWidth size="lg" onClick={onSignOut}>
          {t('signOut')}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-[var(--muted-light)]">
          {cloudSyncEnabled
            ? locale === 'vi'
              ? 'Invite beta · prefs, history, lists & favorites đồng bộ cloud'
              : 'Invite beta · prefs, history, lists & favorites sync to cloud'
            : locale === 'vi'
              ? 'Invite beta · dữ liệu chỉ trên thiết bị này'
              : 'Invite beta · data stays on this device'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 text-[12px] font-semibold text-[var(--accent)]">
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/disclaimer">{l('Disclaimer sức khỏe', 'Health')}</Link>
        </div>
      </div>

      <BottomSheet
        open={historySheet}
        onClose={() => setHistorySheet(false)}
        title={l('Toàn bộ lịch sử', 'All workout history')}
        size="tall"
      >
        <ul className="space-y-2">
          {history.map((session) => {
            const setCount = session.exercises.reduce(
              (sum, item) => sum + item.sets.length,
              0,
            );
            return (
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() => {
                    setHistorySheet(false);
                    onOpenHistory(session.id);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-xl)] bg-[var(--surface)] px-4 py-3.5 text-left active:scale-[0.985]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[var(--black)]">
                      {session.title}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
                      {session.dateLabel} · {session.durationMin} {t('min')} · {setCount} {t('sets')}
                    </p>
                  </div>
                  <span className="shrink-0 text-[14px] font-semibold tabular-nums text-[var(--accent)]">
                    {formatVolume(session.volume)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>

      <BottomSheet open={settingsSheet} onClose={() => setSettingsSheet(false)} title={l('Cài đặt', 'Settings')}>
        <div className="space-y-3">
          {cloudSyncEnabled ? (
            <div className="space-y-2 rounded-[var(--radius-xl)] bg-[var(--surface)] p-3">
              <p className="text-[13px] font-semibold text-[var(--black)]">
                {l('Đồng bộ cloud', 'Cloud sync')}
              </p>
              <p className="text-[12px] leading-relaxed text-[var(--muted)]">
                {isVi
                  ? 'Prefs, lịch sử, list tùy chỉnh và favorites tự đẩy lên Supabase khi bạn thay đổi. Bấm Sync now để kéo + đẩy ngay.'
                  : 'Prefs, history, custom lists, and favorites push to Supabase as you change them. Tap Sync now to pull + push immediately.'}
              </p>
              {syncMessage ? (
                <p className="text-[12px] font-medium text-[var(--accent)]">{syncMessage}</p>
              ) : null}
              <Button
                variant="primary"
                size="sm"
                fullWidth
                disabled={syncBusy || !onSyncNow}
                onClick={() => void onSyncNow?.()}
              >
                {syncBusy
                  ? l('Đang đồng bộ…', 'Syncing…')
                  : l('Sync now', 'Sync now')}
              </Button>
            </div>
          ) : null}
          <div className="space-y-2 rounded-[var(--radius-xl)] bg-[var(--surface)] p-3">
            <p className="text-[13px] font-semibold text-[var(--black)]">
              {l('Đồng bộ thiết bị', 'Sync devices')}
            </p>
            <p className="text-[12px] leading-relaxed text-[var(--muted)]">
              {cloudSyncEnabled
                ? isVi
                  ? 'Vẫn có thể xuất/nhập file để backup tay hoặc chuyển máy khi offline.'
                  : 'You can still export/import a file for manual backup or offline handoff.'
                : isVi
                  ? 'Xuất gói dữ liệu trên máy này → gửi/AirDrop → nhập trên máy kia. Đăng nhập email để bật cloud sync.'
                  : 'Export a sync pack on this device → share/AirDrop → import on the other. Sign in with email to enable cloud sync.'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={onExportData}>
                {l('Xuất gói', 'Export pack')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={shareBusy}
                onClick={async () => {
                  setShareBusy(true);
                  try {
                    await onShareSyncPack();
                  } finally {
                    setShareBusy(false);
                  }
                }}
              >
                {shareBusy
                  ? l('Đang gửi…', 'Sharing…')
                  : l('Chia sẻ', 'Share')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="col-span-2"
                disabled={importBusy}
                onClick={() => {
                  setImportError(null);
                  fileInputRef.current?.click();
                }}
              >
                {importBusy
                  ? l('Đang đọc…', 'Reading…')
                  : l('Nhập gói (xem trước)', 'Import pack (preview)')}
              </Button>
            </div>
            {importError ? (
              <p className="text-[12px] font-medium text-red-500">{importError}</p>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setImportBusy(true);
                setImportError(null);
                try {
                  const raw = await file.text();
                  const payload = parseBackupPayload(raw);
                  const summary = summarizeBackup(payload, locale);
                  setImportMode('merge');
                  setImportPreview({ payload, summary });
                  setSettingsSheet(false);
                } catch {
                  setImportError(
                    isVi
                      ? 'File không hợp lệ hoặc phiên bản không hỗ trợ.'
                      : 'Invalid file or unsupported backup version.',
                  );
                } finally {
                  setImportBusy(false);
                  event.currentTarget.value = '';
                }
              }}
            />
          </div>

          <Card padding="none" className="overflow-hidden">
          {settings.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => item.action?.()}
              className={cn(
                'flex min-h-[var(--row-min-h)] w-full items-center gap-3.5 px-4 text-left transition-colors active:bg-[var(--surface)]',
                index < settings.length - 1 && 'border-b border-[var(--border)]',
              )}
            >
              <span className="flex-1 text-[var(--text-lg)] font-medium text-[var(--black)]">{item.label}</span>
              <span className="max-w-[55%] truncate text-right text-[var(--text-md)] text-[var(--muted)]">{item.value}</span>
            </button>
          ))}
        </Card>
        </div>
      </BottomSheet>

      <BottomSheet
        open={Boolean(importPreview)}
        onClose={() => setImportPreview(null)}
        title={l('Xem trước nhập liệu', 'Import preview')}
      >
        {importPreview ? (
          <div className="space-y-4">
            <div className="space-y-1.5 rounded-[var(--radius-xl)] bg-[var(--surface)] p-4 text-[13px] text-[var(--ink-soft)]">
              <p>
                <span className="font-semibold text-[var(--black)]">
                  {l('Tài khoản: ', 'Account: ')}
                </span>
                {importPreview.summary.userLabel}
              </p>
              <p>
                <span className="font-semibold text-[var(--black)]">
                  {l('Xuất lúc: ', 'Exported: ')}
                </span>
                {formatBackupStamp(importPreview.summary.exportedAt)}
              </p>
              <p>
                {l('Lịch sử', 'History')}: {importPreview.summary.historyCount} ·{' '}
                {l('List', 'Lists')}: {importPreview.summary.customCount} ·{' '}
                {l('Yêu thích', 'Favorites')}: {importPreview.summary.favoritesCount}
              </p>
              <p>
                {importPreview.summary.hasPreferences
                  ? l('Có preferences', 'Includes preferences')
                  : l('Không có preferences', 'No preferences')}
                {' · '}
                {importPreview.summary.hasReminder
                  ? l('Có reminder', 'Includes reminder')
                  : l('Không có reminder', 'No reminder')}
              </p>
              <p className="pt-1 text-[12px] text-[var(--muted)]">
                {isVi
                  ? `Máy này hiện có ${historyCount} buổi trong lịch sử.`
                  : `This device currently has ${historyCount} history session${historyCount === 1 ? '' : 's'}.`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                className={cn(
                  'rounded-[var(--radius-lg)] px-3 py-3 text-left text-[13px] font-semibold',
                  importMode === 'merge'
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--surface)] text-[var(--ink-soft)]',
                )}
              >
                {l('Gộp (an toàn)', 'Merge (safe)')}
                <span className="mt-1 block text-[11px] font-medium opacity-80">
                  {l('Giữ data cũ + mới', 'Keep old + new')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={cn(
                  'rounded-[var(--radius-lg)] px-3 py-3 text-left text-[13px] font-semibold',
                  importMode === 'replace'
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--surface)] text-[var(--ink-soft)]',
                )}
              >
                {l('Ghi đè', 'Replace')}
                <span className="mt-1 block text-[11px] font-medium opacity-80">
                  {l('Xóa data máy này', 'Wipe this device')}
                </span>
              </button>
            </div>

            <Button
              fullWidth
              size="lg"
              onClick={() => {
                onApplyImport(importPreview.payload, importMode);
                setImportPreview(null);
              }}
            >
              {importMode === 'replace'
                ? l('Xác nhận ghi đè', 'Confirm replace')
                : l('Xác nhận gộp', 'Confirm merge')}
            </Button>
            <Button variant="secondary" fullWidth size="lg" onClick={() => setImportPreview(null)}>
              {l('Hủy', 'Cancel')}
            </Button>
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={reminderSheet}
        onClose={() => setReminderSheet(false)}
        title={l('Nhắc tập tuần', 'Weekly reminder')}
      >
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => onUpdateReminder({ enabled: !reminder.enabled })}
            className="flex min-h-[var(--row-min-h)] w-full items-center justify-between rounded-[var(--radius-xl)] bg-[var(--surface)] px-4"
          >
            <span className="text-[15px] font-medium text-[var(--black)]">
              {l('Bật nhắc trong app', 'Enable in-app reminder')}
            </span>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-[12px] font-semibold',
                reminder.enabled
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--border)] text-[var(--muted)]',
              )}
            >
              {reminder.enabled ? l('Bật', 'On') : l('Tắt', 'Off')}
            </span>
          </button>

          <button
            type="button"
            onClick={async () => {
              if (reminder.systemNotify) {
                onUpdateReminder({ systemNotify: false });
                return;
              }
              const granted = await onEnableSystemNotify();
              if (!granted) return;
              onUpdateReminder({ systemNotify: true, enabled: true });
            }}
            className="flex min-h-[var(--row-min-h)] w-full items-center justify-between rounded-[var(--radius-xl)] bg-[var(--surface)] px-4"
          >
            <span className="text-[15px] font-medium text-[var(--black)]">
              {l('Thông báo hệ thống', 'System notification')}
            </span>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-[12px] font-semibold',
                reminder.systemNotify
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--border)] text-[var(--muted)]',
              )}
            >
              {reminder.systemNotify ? l('Bật', 'On') : l('Tắt', 'Off')}
            </span>
          </button>

          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-[var(--ink-soft)]">
              {l('Ngày trong tuần', 'Days of week')}
            </p>
            <div className="flex flex-wrap gap-2">
              {reminderDayOrder.map((day) => {
                const selected = reminder.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      onUpdateReminder({
                        days: toggleReminderDay(reminder.days, day),
                        enabled: true,
                      })
                    }
                    className={cn(
                      'min-w-[44px] rounded-[var(--radius-lg)] px-3 py-2 text-[13px] font-semibold transition-colors',
                      selected
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--surface)] text-[var(--ink-soft)]',
                    )}
                  >
                    {reminderDayLabels[day][locale]}
                  </button>
                );
              })}
            </div>
          </div>

          <InputNumber
            label={l('Giờ nhắc (0–23)', 'Reminder hour (0–23)')}
            value={reminder.hour}
            onChange={(hour) => onUpdateReminder({ hour, enabled: true })}
            min={0}
            max={23}
            allowDecimal={false}
          />

          <p className="text-[13px] text-[var(--muted)]">
            {isVi
              ? 'Nhắc trong app khi mở REPLY. Bật thông báo hệ thống để hiện banner OS (cần cấp quyền; không phải push server).'
              : 'In-app prompt when you open REPLY. System notifications show an OS banner (needs permission; not server push).'}
          </p>

          <Button fullWidth size="lg" onClick={() => setReminderSheet(false)}>
            {t('done')}
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={goalSheet} onClose={() => setGoalSheet(false)} title={t('weeklyGoal')}>
        <div className="space-y-6">
          <InputNumber
            label={l('Buổi mỗi tuần', 'Sessions per week')}
            value={goalDraft}
            onChange={setGoalDraft}
            min={1}
            max={7}
            allowDecimal={false}
          />
          <Button fullWidth size="lg" onClick={() => { onUpdatePrefs({ weeklyGoal: goalDraft }); setGoalSheet(false); }}>
            {t('save')}
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={nicknameSheet} onClose={() => setNicknameSheet(false)} title={l('Nickname', 'Nickname')}>
        <div className="space-y-4">
          <input
            type="text"
            value={nicknameDraft}
            maxLength={24}
            onChange={(event) => setNicknameDraft(event.target.value)}
            placeholder={l('Nhập nickname của bạn', 'Enter your nickname')}
            className="h-[var(--control-h)] w-full rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--white)] px-4 text-[16px] text-[var(--black)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          />
          <p className="text-[12px] text-[var(--muted)]">
            {l('Nickname sẽ hiển thị trên hồ sơ tài khoản.', 'Nickname will be shown on your profile.')}
          </p>
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              const nextName = nicknameDraft.trim().slice(0, 24);
              if (!nextName) return;
              onUpdateUserName(nextName);
              setNicknameSheet(false);
            }}
          >
            {t('save')}
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={equipSheet} onClose={() => setEquipSheet(false)} title={t('availableGear')}>
        <div className="space-y-4">
          <p className="text-[14px] font-medium text-[var(--ink-soft)]">{t('quickPresets')}</p>
          <GearPicker selectedIds={preferences.availableGearIds} onChange={(ids) => onUpdatePrefs({ availableGearIds: ids })} locale={locale} />
          <Button fullWidth size="lg" onClick={() => setEquipSheet(false)}>{t('done')}</Button>
        </div>
      </BottomSheet>

      <BottomSheet open={goalTypeSheet} onClose={() => setGoalTypeSheet(false)} title={t('primaryGoal')}>
        <div className="space-y-2">
          {(Object.keys(goalLabels) as PrimaryGoal[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => { onUpdatePrefs({ primaryGoal: key }); setGoalTypeSheet(false); }}
              className={cn(
                'flex w-full items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3.5 text-left transition-all',
                preferences.primaryGoal === key ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface)] text-[var(--black)]',
              )}
            >
              <span className="text-[16px] font-semibold">{goalLabels[key][locale]}</span>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={levelSheet} onClose={() => setLevelSheet(false)} title={t('level')}>
        <div className="space-y-2">
          {(Object.keys(levelLabels) as FitnessLevel[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => { onUpdatePrefs({ level: key }); setLevelSheet(false); }}
              className={cn(
                'flex w-full items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3.5 text-left transition-all',
                preferences.level === key ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface)] text-[var(--black)]',
              )}
            >
              <span className="text-[16px] font-semibold">{levelLabels[key][locale]}</span>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={focusSheet} onClose={() => setFocusSheet(false)} title={t('focusPriority')}>
        <div className="space-y-2">
          {(Object.keys(focusLabels) as FocusPriority[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => { onUpdatePrefs({ focusPriority: key }); setFocusSheet(false); }}
              className={cn(
                'flex w-full items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3.5 text-left transition-all',
                preferences.focusPriority === key ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface)] text-[var(--black)]',
              )}
            >
              <span className="text-[16px] font-semibold">{focusLabels[key][locale]}</span>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={jointSheet} onClose={() => setJointSheet(false)} title={t('jointCare')}>
        <div className="space-y-2">
          {(Object.keys(jointCareLabels) as JointCare[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => { onUpdatePrefs({ jointCare: key }); setJointSheet(false); }}
              className={cn(
                'flex w-full items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3.5 text-left transition-all',
                preferences.jointCare === key ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface)] text-[var(--black)]',
              )}
            >
              <span className="text-[16px] font-semibold">{jointCareLabels[key][locale]}</span>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={durationSheet} onClose={() => setDurationSheet(false)} title={t('sessionLength')}>
        <div className="flex justify-center gap-3">
          {[20, 30, 45, 60].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => { onUpdatePrefs({ sessionMin: n }); setDurationSheet(false); }}
              className={cn(
                'flex h-20 w-20 flex-col items-center justify-center rounded-[20px] transition-all',
                preferences.sessionMin === n ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-lg)]' : 'bg-[var(--surface)] text-[var(--black)]',
              )}
            >
              <span className="text-[24px] font-semibold tabular-nums">{n}</span>
              <span className={cn('text-[11px] font-medium', preferences.sessionMin === n ? 'text-white/70' : 'text-[var(--muted)]')}>
                {t('min')}
              </span>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={confirmClear} onClose={() => setConfirmClear(false)} title={l('Xóa lịch sử?', 'Clear history?')}>
        <div className="space-y-4">
          <p className="text-[15px] text-[var(--muted)]">
            {isVi
              ? `Xóa ${historyCount} buổi đã lưu trên thiết bị này. Mục yêu thích vẫn giữ.`
              : `This removes ${historyCount} saved session${historyCount === 1 ? '' : 's'} from this device. Favorites stay.`}
          </p>
          <Button fullWidth size="lg" onClick={() => { onClearHistory(); setConfirmClear(false); }}>
            {l('Xóa lịch sử', 'Clear history')}
          </Button>
          <Button variant="secondary" fullWidth size="lg" onClick={() => setConfirmClear(false)}>
            {l('Hủy', 'Cancel')}
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
