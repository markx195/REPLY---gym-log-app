'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { GearPicker } from '@/components/ui/gear-picker';
import { cn } from '@/lib/cn';
import { gearPresetIds } from '@/data/exercises/gear-catalog';
import { translate } from '@/lib/i18n';
import type {
  FitnessLevel,
  FocusPriority,
  JointCare,
  Locale,
  PrimaryGoal,
  UserPreferences,
} from '@/lib/preferences-store';
import {
  focusLabels,
  formatGearSummary,
  goalLabels,
  jointCareLabels,
  levelLabels,
} from '@/lib/preferences-store';

type OnboardingScreenProps = {
  onComplete: (prefs: Partial<UserPreferences>) => void;
};

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [locale, setLocale] = useState<Locale>('en');
  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);

  const [goal, setGoal] = useState(4);
  const [availableGearIds, setAvailableGearIds] = useState<string[]>([
    ...gearPresetIds['full-gym'],
  ]);
  const [level, setLevel] = useState<FitnessLevel>('beginner');
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>('consistency');
  const [focusPriority, setFocusPriority] = useState<FocusPriority>('full-body');
  const [jointCare, setJointCare] = useState<JointCare>('none');
  const [sessionMin, setSessionMin] = useState(45);
  const summary = `${goal}x/${locale === 'vi' ? 'tuần' : 'week'} · ${sessionMin} ${t('min')} · ${formatGearSummary(availableGearIds, locale)}`;

  const preview =
    jointCare !== 'none'
      ? locale === 'vi'
        ? `Kế hoạch hôm nay sẽ ${jointCareLabels[jointCare].vi.toLowerCase()} nhưng vẫn giữ tiến độ.`
        : `Today's plan will stay ${jointCareLabels[jointCare].en.toLowerCase()} while keeping progress on track.`
      : sessionMin <= 30
        ? locale === 'vi'
          ? 'Buổi ngắn, mật độ cao, ít setup.'
          : 'Quick density session with low setup time.'
        : level === 'advanced'
          ? locale === 'vi'
            ? 'Ưu tiên compound nặng với xoay vòng thông minh.'
            : 'Heavy compound emphasis with smart rotation.'
          : locale === 'vi'
            ? 'Volume cân bằng để xây dựng thói quen.'
            : 'Balanced volume to build consistency and momentum.';

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-hidden slide-up">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--page-wash)' }}
        aria-hidden
      />
      <div
        className="ambient-blob -right-16 top-16 h-52 w-52 bg-[var(--accent)]/15"
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col justify-between px-6 pb-10 safe-top">
        <div className="pt-6">
          <div className="mb-3 rounded-[var(--radius-lg)] bg-[var(--accent-mist)] px-3 py-2 text-[12px] font-medium text-[var(--ink-soft)]">
            {locale === 'vi'
              ? 'Invite beta · lưu cấu hình một lần rồi bắt đầu tập ngay.'
              : 'Invite beta · tune once and start your first workout right away.'}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.13em] text-[var(--accent)]">
              {t('tuneOnce')}
            </p>
            <div className="flex rounded-full bg-[var(--white)] p-1 shadow-[var(--shadow-sm)]">
              {(['en', 'vi'] as Locale[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLocale(code)}
                  className={cn(
                    'rounded-full px-3 py-1 text-[12px] font-semibold transition-all',
                    locale === code
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--ink-soft)]',
                  )}
                >
                  {code === 'en' ? 'EN' : 'VI'}
                </button>
              ))}
            </div>
          </div>
          <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-[var(--tracking-tight)] text-[var(--black)]">
            {t('shapeDaily')}
          </h1>
          <p className="mt-2 text-[15px] font-medium text-[var(--ink-soft)]">
            {t('noWizard')}
          </p>
        </div>

        <div className="space-y-5 overflow-y-auto pb-6">
          <section className="space-y-2.5">
            <p className="text-[13px] font-semibold text-[var(--black)]">{t('trainingDays')}</p>
            <div className="flex flex-wrap gap-2">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setGoal(n)}
                  className={cn(
                    'rounded-full px-4 py-2 text-[14px] font-semibold transition-all',
                    goal === n
                      ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]'
                      : 'bg-[var(--white)] text-[var(--black)] shadow-[var(--shadow-sm)]',
                  )}
                >
                  {n} {t('days')}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <p className="text-[13px] font-semibold text-[var(--black)]">{t('primaryGoal')}</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(goalLabels) as PrimaryGoal[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPrimaryGoal(key)}
                  className={cn(
                    'rounded-full px-4 py-2 text-[14px] font-semibold transition-all',
                    primaryGoal === key
                      ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]'
                      : 'bg-[var(--white)] text-[var(--black)] shadow-[var(--shadow-sm)]',
                  )}
                >
                  {goalLabels[key][locale]}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <p className="text-[13px] font-semibold text-[var(--black)]">{t('whereTrain')}</p>
            <p className="text-[12px] font-medium text-[var(--ink-soft)]">
              {t('fineTuneGear')}
            </p>
            <GearPicker
              selectedIds={availableGearIds}
              onChange={setAvailableGearIds}
              locale={locale}
            />
          </section>

          <section className="space-y-2.5">
            <p className="text-[13px] font-semibold text-[var(--black)]">{t('experience')}</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(levelLabels) as FitnessLevel[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLevel(key)}
                  className={cn(
                    'rounded-full px-4 py-2 text-[14px] font-semibold transition-all',
                    level === key
                      ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]'
                      : 'bg-[var(--white)] text-[var(--black)] shadow-[var(--shadow-sm)]',
                  )}
                >
                  {levelLabels[key][locale]}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <p className="text-[13px] font-semibold text-[var(--black)]">{t('priorityFocus')}</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(focusLabels) as FocusPriority[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFocusPriority(key)}
                  className={cn(
                    'rounded-full px-4 py-2 text-[14px] font-semibold transition-all',
                    focusPriority === key
                      ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]'
                      : 'bg-[var(--white)] text-[var(--black)] shadow-[var(--shadow-sm)]',
                  )}
                >
                  {focusLabels[key][locale]}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <p className="text-[13px] font-semibold text-[var(--black)]">{t('sessionLengthQ')}</p>
            <div className="flex flex-wrap gap-2">
              {[20, 30, 45, 60].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSessionMin(n)}
                  className={cn(
                    'rounded-full px-4 py-2 text-[14px] font-semibold transition-all',
                    sessionMin === n
                      ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]'
                      : 'bg-[var(--white)] text-[var(--black)] shadow-[var(--shadow-sm)]',
                  )}
                >
                  {n} {t('min')}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <p className="text-[13px] font-semibold text-[var(--black)]">{t('jointProtect')}</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(jointCareLabels) as JointCare[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setJointCare(key)}
                  className={cn(
                    'rounded-full px-4 py-2 text-[14px] font-semibold transition-all',
                    jointCare === key
                      ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]'
                      : 'bg-[var(--white)] text-[var(--black)] shadow-[var(--shadow-sm)]',
                  )}
                >
                  {jointCareLabels[key][locale]}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[var(--radius-xl)] bg-[var(--white)] p-4 shadow-[var(--shadow-md)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
              {t('previewToday')}
            </p>
            <p className="mt-2 text-[18px] font-semibold text-[var(--black)]">{summary}</p>
            <p className="mt-1 text-[14px] font-medium text-[var(--ink-soft)]">{preview}</p>
          </section>
        </div>

        <div className="space-y-3">
          <Button
            fullWidth
            size="lg"
            onClick={() =>
              onComplete({
                weeklyGoal: goal,
                availableGearIds:
                  availableGearIds.length > 0
                    ? availableGearIds
                    : [...gearPresetIds['full-gym']],
                level,
                primaryGoal,
                focusPriority,
                jointCare,
                sessionMin,
                locale,
                onboarded: true,
              })
            }
          >
            {t('saveAndContinue')}
          </Button>
          <button
            type="button"
            onClick={() =>
              onComplete({
                weeklyGoal: 3,
                sessionMin: 30,
                level: 'beginner',
                primaryGoal: 'consistency',
                focusPriority: 'full-body',
                jointCare: 'none',
                availableGearIds: [...gearPresetIds['full-gym']],
                onboarded: true,
                locale,
              })
            }
            className="w-full py-2 text-center text-[14px] font-medium text-[var(--ink-soft)] active:text-[var(--black)]"
          >
            {t('startIn60s')}
          </button>
        </div>
      </div>
    </div>
  );
}
