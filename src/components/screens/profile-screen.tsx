'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { BottomSheet, Button, Card, InputNumber, ProgressRing } from '@/components/ui';
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
}: ProfileScreenProps) {
  const locale = preferences.locale;
  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);

  const insights = useMemo(() => computeProgressInsights(history), [history]);
  const maxDayVolume = Math.max(...insights.dayVolumes.map((day) => day.volume), 1);

  const coachNotes = useMemo(() => {
    const notes: string[] = [];
    if (history.length < 2) {
      notes.push(
        locale === 'vi'
          ? 'Bắt đầu với 2-3 buổi/tuần. Sau 2 buổi, REPLY sẽ gợi ý tăng tạ/reps theo từng bài.'
          : 'Start with 2-3 sessions/week. After 2 sessions, REPLY suggests weight/reps per exercise.',
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
  const roleLabel = user.mode === 'guest'
    ? (locale === 'vi' ? 'Khách' : 'Guest athlete')
    : cloudSyncEnabled
      ? (locale === 'vi' ? 'Cloud · đã đăng nhập' : 'Cloud · signed in')
      : (locale === 'vi' ? 'Vận động viên' : 'Athlete');
  const emailLabel = user.email ?? (locale === 'vi' ? 'Phiên khách cục bộ' : 'Local guest session');

  const themeLabel =
    preferences.theme === 'dark'
      ? (locale === 'vi' ? 'Tối' : 'Dark')
      : preferences.theme === 'light'
        ? (locale === 'vi' ? 'Sáng' : 'Light')
        : (locale === 'vi' ? 'Hệ thống' : 'System');

  const cycleTheme = () => {
    const order: UserPreferences['theme'][] = ['system', 'light', 'dark'];
    const idx = order.indexOf(preferences.theme);
    onUpdatePrefs({ theme: order[(idx + 1) % order.length] });
  };

  const settings = [
    {
      id: 'language',
      label: t('language'),
      value: locale === 'vi' ? 'Tiếng Việt' : 'English',
      action: () => onUpdatePrefs({ locale: locale === 'en' ? 'vi' : 'en' }),
    },
    {
      id: 'goal',
      label: t('weeklyGoal'),
      value: `${preferences.weeklyGoal} ${locale === 'vi' ? 'buổi' : 'sessions'}`,
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
      label: locale === 'vi' ? 'Rest mặc định' : 'Default rest',
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
      label: locale === 'vi' ? 'Nhắc tập tuần' : 'Weekly reminder',
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
            {locale === 'vi' ? 'Cài đặt' : 'Settings'}
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
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Card className="space-y-2">
            <p className="text-[12px] font-semibold text-[var(--ink-soft)]">{locale === 'vi' ? 'Tuần này' : 'This week'}</p>
            <div className="flex items-center justify-between">
              <ProgressRing
                value={weeklyStats.sessionsDone}
                max={Math.max(weeklyStats.sessionsGoal, 1)}
                size={78}
                strokeWidth={8}
                label={`${weeklyStats.sessionsDone}`}
                sublabel={`/ ${weeklyStats.sessionsGoal}`}
              />
              <div className="text-right">
                <p className="text-[24px] font-semibold text-[var(--black)]">{weeklyStats.streak}</p>
                <p className="text-[12px] text-[var(--ink-soft)]">{t('streak')}</p>
              </div>
            </div>
          </Card>
          <Card className="space-y-2">
            <p className="text-[12px] font-semibold text-[var(--ink-soft)]">{locale === 'vi' ? 'Tổng quan' : 'Overview'}</p>
            <p className="text-[24px] font-semibold text-[var(--black)]">{formatVolume(insights.totalVolume)}</p>
            <p className="text-[12px] text-[var(--ink-soft)]">
              {history.length} {locale === 'vi' ? 'buổi đã lưu' : 'saved sessions'}
            </p>
            <p className="text-[12px] text-[var(--ink-soft)]">
              {weeklyStats.totalMinutes} {t('min')}
            </p>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
            {locale === 'vi' ? 'Biểu đồ tuần' : 'Weekly volume'}
          </h2>
          <Card>
            <div className="flex h-32 items-end justify-between gap-2">
              {insights.dayVolumes.map((day) => {
                const ratio = day.volume / maxDayVolume;
                return (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-24 w-full items-end">
                      <div
                        className="w-full rounded-t-[8px] bg-[var(--accent)]/75"
                        style={{ height: `${Math.max(6, ratio * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-[var(--ink-soft)]">{day.label}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {insights.personalRecords.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
              {locale === 'vi' ? 'PR theo bài' : 'Exercise PRs'}
            </h2>
            <Card padding="none" className="overflow-hidden">
              {insights.personalRecords.map((pr, index) => (
                <div
                  key={pr.exerciseId}
                  className={cn(
                    'flex items-center justify-between gap-3 px-4 py-3',
                    index < insights.personalRecords.length - 1 && 'border-b border-[var(--border)]',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[var(--black)]">{pr.name}</p>
                    <p className="text-[12px] text-[var(--ink-soft)]">{pr.dateLabel}</p>
                  </div>
                  <p className="shrink-0 text-[15px] font-semibold tabular-nums text-[var(--accent)]">
                    {pr.weight}
                    {preferences.units}×{pr.reps}
                  </p>
                </div>
              ))}
            </Card>
          </section>
        ) : null}

        {insights.muscleVolume.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
              {locale === 'vi' ? 'Xu hướng tuần (nhóm)' : 'This week focus'}
            </h2>
            <Card className="space-y-2">
              {insights.muscleVolume.map((item) => {
                const max = insights.muscleVolume[0]?.volume || 1;
                return (
                  <div key={item.muscle} className="space-y-1">
                    <div className="flex justify-between text-[12px] font-semibold">
                      <span className="text-[var(--ink-soft)]">{item.muscle}</span>
                      <span className="tabular-nums text-[var(--muted)]">{formatVolume(item.volume)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
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
              {locale === 'vi' ? 'Lịch sử tập' : 'Workout history'}
            </h2>
            <span className="text-[12px] font-semibold text-[var(--ink-soft)]">
              {history.length} {locale === 'vi' ? 'buổi' : 'sessions'}
            </span>
          </div>
          {history.length === 0 ? (
            <Card className="space-y-3 text-center">
              <p className="text-[14px] text-[var(--ink-soft)]">
                {locale === 'vi'
                  ? 'Chưa có buổi tập nào. Về Home, chọn gợi ý hôm nay và Start — dữ liệu chỉ lưu trên thiết bị (invite beta).'
                  : 'No sessions yet. Go Home, pick today’s suggestion, and Start — data stays on this device (invite beta).'}
              </p>
              <Button variant="secondary" size="sm" onClick={onLoadSampleHistory}>
                {locale === 'vi' ? 'Xem demo lịch sử' : 'Preview sample history'}
              </Button>
            </Card>
          ) : (
            <Card padding="none" className="overflow-hidden">
              {history.slice(0, 6).map((session, index) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => onOpenHistory(session.id)}
                  className={cn(
                    'flex min-h-[var(--row-min-h)] w-full items-center gap-3.5 px-4 text-left transition-colors active:bg-[var(--surface)]',
                    index < Math.min(history.length, 6) - 1 && 'border-b border-[var(--border)]',
                  )}
                >
                  <div className="flex-1">
                    <p className="line-clamp-1 text-[15px] font-semibold text-[var(--black)]">{session.title}</p>
                    <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
                      {session.dateLabel} · {session.durationMin} {t('min')} · {formatVolume(session.volume)}
                    </p>
                  </div>
                  <span className="text-[12px] font-semibold text-[var(--accent)]">
                    {locale === 'vi' ? 'Mở' : 'Open'}
                  </span>
                </button>
              ))}
            </Card>
          )}
        </section>



        <section className="space-y-3">
          <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
            {locale === 'vi' ? 'Gợi ý tuần này' : 'Coach notes'}
          </h2>
          <Card className="space-y-2.5">
            {coachNotes.map((note) => (
              <p key={note} className="text-[14px] leading-relaxed text-[var(--ink-soft)]">
                • {note}
              </p>
            ))}
          </Card>
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
          <Link href="/legal/disclaimer">{locale === 'vi' ? 'Disclaimer sức khỏe' : 'Health'}</Link>
        </div>
      </div>

      <BottomSheet open={settingsSheet} onClose={() => setSettingsSheet(false)} title={locale === 'vi' ? 'Cài đặt' : 'Settings'}>
        <div className="space-y-3">
          {cloudSyncEnabled ? (
            <div className="space-y-2 rounded-[var(--radius-xl)] bg-[var(--surface)] p-3">
              <p className="text-[13px] font-semibold text-[var(--black)]">
                {locale === 'vi' ? 'Đồng bộ cloud' : 'Cloud sync'}
              </p>
              <p className="text-[12px] leading-relaxed text-[var(--muted)]">
                {locale === 'vi'
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
                  ? locale === 'vi'
                    ? 'Đang đồng bộ…'
                    : 'Syncing…'
                  : locale === 'vi'
                    ? 'Sync now'
                    : 'Sync now'}
              </Button>
            </div>
          ) : null}
          <div className="space-y-2 rounded-[var(--radius-xl)] bg-[var(--surface)] p-3">
            <p className="text-[13px] font-semibold text-[var(--black)]">
              {locale === 'vi' ? 'Đồng bộ thiết bị' : 'Sync devices'}
            </p>
            <p className="text-[12px] leading-relaxed text-[var(--muted)]">
              {cloudSyncEnabled
                ? locale === 'vi'
                  ? 'Vẫn có thể xuất/nhập file để backup tay hoặc chuyển máy khi offline.'
                  : 'You can still export/import a file for manual backup or offline handoff.'
                : locale === 'vi'
                  ? 'Xuất gói dữ liệu trên máy này → gửi/AirDrop → nhập trên máy kia. Đăng nhập email để bật cloud sync.'
                  : 'Export a sync pack on this device → share/AirDrop → import on the other. Sign in with email to enable cloud sync.'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={onExportData}>
                {locale === 'vi' ? 'Xuất gói' : 'Export pack'}
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
                  ? locale === 'vi'
                    ? 'Đang gửi…'
                    : 'Sharing…'
                  : locale === 'vi'
                    ? 'Chia sẻ'
                    : 'Share'}
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
                  ? locale === 'vi'
                    ? 'Đang đọc…'
                    : 'Reading…'
                  : locale === 'vi'
                    ? 'Nhập gói (xem trước)'
                    : 'Import pack (preview)'}
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
                    locale === 'vi'
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
        title={locale === 'vi' ? 'Xem trước nhập liệu' : 'Import preview'}
      >
        {importPreview ? (
          <div className="space-y-4">
            <div className="space-y-1.5 rounded-[var(--radius-xl)] bg-[var(--surface)] p-4 text-[13px] text-[var(--ink-soft)]">
              <p>
                <span className="font-semibold text-[var(--black)]">
                  {locale === 'vi' ? 'Tài khoản: ' : 'Account: '}
                </span>
                {importPreview.summary.userLabel}
              </p>
              <p>
                <span className="font-semibold text-[var(--black)]">
                  {locale === 'vi' ? 'Xuất lúc: ' : 'Exported: '}
                </span>
                {formatBackupStamp(importPreview.summary.exportedAt)}
              </p>
              <p>
                {locale === 'vi' ? 'Lịch sử' : 'History'}: {importPreview.summary.historyCount} ·{' '}
                {locale === 'vi' ? 'List' : 'Lists'}: {importPreview.summary.customCount} ·{' '}
                {locale === 'vi' ? 'Yêu thích' : 'Favorites'}: {importPreview.summary.favoritesCount}
              </p>
              <p>
                {importPreview.summary.hasPreferences
                  ? locale === 'vi'
                    ? 'Có preferences'
                    : 'Includes preferences'
                  : locale === 'vi'
                    ? 'Không có preferences'
                    : 'No preferences'}
                {' · '}
                {importPreview.summary.hasReminder
                  ? locale === 'vi'
                    ? 'Có reminder'
                    : 'Includes reminder'
                  : locale === 'vi'
                    ? 'Không có reminder'
                    : 'No reminder'}
              </p>
              <p className="pt-1 text-[12px] text-[var(--muted)]">
                {locale === 'vi'
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
                {locale === 'vi' ? 'Gộp (an toàn)' : 'Merge (safe)'}
                <span className="mt-1 block text-[11px] font-medium opacity-80">
                  {locale === 'vi' ? 'Giữ data cũ + mới' : 'Keep old + new'}
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
                {locale === 'vi' ? 'Ghi đè' : 'Replace'}
                <span className="mt-1 block text-[11px] font-medium opacity-80">
                  {locale === 'vi' ? 'Xóa data máy này' : 'Wipe this device'}
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
                ? locale === 'vi'
                  ? 'Xác nhận ghi đè'
                  : 'Confirm replace'
                : locale === 'vi'
                  ? 'Xác nhận gộp'
                  : 'Confirm merge'}
            </Button>
            <Button variant="secondary" fullWidth size="lg" onClick={() => setImportPreview(null)}>
              {locale === 'vi' ? 'Hủy' : 'Cancel'}
            </Button>
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={reminderSheet}
        onClose={() => setReminderSheet(false)}
        title={locale === 'vi' ? 'Nhắc tập tuần' : 'Weekly reminder'}
      >
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => onUpdateReminder({ enabled: !reminder.enabled })}
            className="flex min-h-[var(--row-min-h)] w-full items-center justify-between rounded-[var(--radius-xl)] bg-[var(--surface)] px-4"
          >
            <span className="text-[15px] font-medium text-[var(--black)]">
              {locale === 'vi' ? 'Bật nhắc trong app' : 'Enable in-app reminder'}
            </span>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-[12px] font-semibold',
                reminder.enabled
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--border)] text-[var(--muted)]',
              )}
            >
              {reminder.enabled ? (locale === 'vi' ? 'Bật' : 'On') : locale === 'vi' ? 'Tắt' : 'Off'}
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
              {locale === 'vi' ? 'Thông báo hệ thống' : 'System notification'}
            </span>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-[12px] font-semibold',
                reminder.systemNotify
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--border)] text-[var(--muted)]',
              )}
            >
              {reminder.systemNotify ? (locale === 'vi' ? 'Bật' : 'On') : locale === 'vi' ? 'Tắt' : 'Off'}
            </span>
          </button>

          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-[var(--ink-soft)]">
              {locale === 'vi' ? 'Ngày trong tuần' : 'Days of week'}
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
            label={locale === 'vi' ? 'Giờ nhắc (0–23)' : 'Reminder hour (0–23)'}
            value={reminder.hour}
            onChange={(hour) => onUpdateReminder({ hour, enabled: true })}
            min={0}
            max={23}
            allowDecimal={false}
          />

          <p className="text-[13px] text-[var(--muted)]">
            {locale === 'vi'
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
            label={locale === 'vi' ? 'Buổi mỗi tuần' : 'Sessions per week'}
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

      <BottomSheet open={confirmClear} onClose={() => setConfirmClear(false)} title={locale === 'vi' ? 'Xóa lịch sử?' : 'Clear history?'}>
        <div className="space-y-4">
          <p className="text-[15px] text-[var(--muted)]">
            {locale === 'vi'
              ? `Xóa ${historyCount} buổi đã lưu trên thiết bị này. Mục yêu thích vẫn giữ.`
              : `This removes ${historyCount} saved session${historyCount === 1 ? '' : 's'} from this device. Favorites stay.`}
          </p>
          <Button fullWidth size="lg" onClick={() => { onClearHistory(); setConfirmClear(false); }}>
            {locale === 'vi' ? 'Xóa lịch sử' : 'Clear history'}
          </Button>
          <Button variant="secondary" fullWidth size="lg" onClick={() => setConfirmClear(false)}>
            {locale === 'vi' ? 'Hủy' : 'Cancel'}
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
