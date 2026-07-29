'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import { GearPicker } from '@/components/ui/gear-picker';
import { cn } from '@/lib/cn';
import { gearPresetIds } from '@/data/exercises/gear-catalog';
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

type StepId =
  | 'welcome'
  | 'goal'
  | 'rhythm'
  | 'level'
  | 'gear'
  | 'focus'
  | 'joints'
  | 'ready';

const STEPS: StepId[] = [
  'welcome',
  'goal',
  'rhythm',
  'level',
  'gear',
  'focus',
  'joints',
  'ready',
];

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-2.5 text-[14px] font-semibold transition-all active:scale-[0.98]',
        active
          ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]'
          : 'bg-[var(--white)] text-[var(--black)] shadow-[var(--shadow-sm)]',
      )}
    >
      {children}
    </button>
  );
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [locale, setLocale] = useState<Locale>('en');
  const [goal, setGoal] = useState(4);
  const [availableGearIds, setAvailableGearIds] = useState<string[]>([
    ...gearPresetIds['full-gym'],
  ]);
  const [level, setLevel] = useState<FitnessLevel>('beginner');
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>('consistency');
  const [focusPriority, setFocusPriority] = useState<FocusPriority>('full-body');
  const [jointCare, setJointCare] = useState<JointCare>('none');
  const [sessionMin, setSessionMin] = useState(45);

  const step = STEPS[stepIndex];
  const total = STEPS.length;
  const progress = ((stepIndex + 1) / total) * 100;
  const isLast = stepIndex === total - 1;

  const finish = (partial?: Partial<UserPreferences>) => {
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
      ...partial,
    });
  };

  const skipAll = () => {
    finish({
      weeklyGoal: 3,
      sessionMin: 30,
      level: 'beginner',
      primaryGoal: 'consistency',
      focusPriority: 'full-body',
      jointCare: 'none',
      availableGearIds: [...gearPresetIds['full-gym']],
      locale,
      onboarded: true,
    });
  };

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, total - 1));
  };

  const skipStep = () => next();

  const back = () => setStepIndex((i) => Math.max(0, i - 1));

  const summary = useMemo(
    () =>
      `${goal}x/${locale === 'vi' ? 'tuần' : 'week'} · ${sessionMin} ${
        locale === 'vi' ? 'phút' : 'min'
      } · ${formatGearSummary(availableGearIds, locale)}`,
    [availableGearIds, goal, locale, sessionMin],
  );

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

  const title =
    step === 'welcome'
      ? locale === 'vi'
        ? 'Chào mừng vào invite beta'
        : 'Welcome to invite beta'
      : step === 'goal'
        ? locale === 'vi'
          ? 'Mục tiêu chính của bạn?'
          : 'What’s your main goal?'
        : step === 'rhythm'
          ? locale === 'vi'
            ? 'Bạn muốn tập thế nào?'
            : 'How often do you train?'
          : step === 'level'
            ? locale === 'vi'
              ? 'Kinh nghiệm của bạn?'
              : 'Your experience level?'
            : step === 'gear'
              ? locale === 'vi'
                ? 'Bạn tập với đồ gì?'
                : 'What gear do you have?'
              : step === 'focus'
                ? locale === 'vi'
                  ? 'Ưu tiên nhóm nào?'
                  : 'Any focus priority?'
                : step === 'joints'
                  ? locale === 'vi'
                    ? 'Cần bảo vệ khớp nào?'
                    : 'Any joint to protect?'
                  : locale === 'vi'
                    ? 'Sẵn sàng bắt đầu'
                    : 'You’re ready';

  const subtitle =
    step === 'welcome'
      ? locale === 'vi'
        ? 'Trả lời vài câu ngắn — hoặc bỏ qua bất kỳ bước nào. Tài khoản Google mới cũng đăng ký được.'
        : 'A few short questions — skip any step. New Google accounts can sign up too.'
      : step === 'ready'
        ? locale === 'vi'
          ? 'Chúng tôi sẽ dùng cấu hình này để gợi ý buổi hôm nay.'
          : 'We’ll use this to pick today’s session.'
        : locale === 'vi'
          ? 'Chọn một đáp án rồi tiếp tục, hoặc Skip.'
          : 'Pick one, then continue — or skip.';

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

      <div className="relative flex flex-1 flex-col px-6 pb-10 safe-top">
        <header className="pt-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
              {locale === 'vi' ? 'Invite beta · khảo sát' : 'Invite beta · survey'}
            </p>
            <button
              type="button"
              onClick={skipAll}
              className="text-[13px] font-semibold text-[var(--ink-soft)] active:text-[var(--black)]"
            >
              {locale === 'vi' ? 'Bỏ qua hết' : 'Skip all'}
            </button>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--white)] shadow-[var(--shadow-sm)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[12px] font-medium text-[var(--muted)]">
            {stepIndex + 1}/{total}
          </p>

          <h1 className="mt-5 text-[30px] font-semibold leading-[1.15] tracking-[var(--tracking-snug)] text-[var(--black)]">
            {title}
          </h1>
          <p className="mt-2 text-[15px] font-medium text-[var(--ink-soft)]">{subtitle}</p>
        </header>

        <div className="mt-6 flex-1 overflow-y-auto pb-6">
          {step === 'welcome' ? (
            <div className="space-y-4">
              <p className="text-[13px] font-semibold text-[var(--black)]">
                {locale === 'vi' ? 'Ngôn ngữ' : 'Language'}
              </p>
              <div className="flex gap-2">
                {(['en', 'vi'] as Locale[]).map((code) => (
                  <Chip key={code} active={locale === code} onClick={() => setLocale(code)}>
                    {code === 'en' ? 'English' : 'Tiếng Việt'}
                  </Chip>
                ))}
              </div>
              <div className="rounded-[var(--radius-xl)] bg-[var(--white)] p-4 shadow-[var(--shadow-md)]">
                <p className="text-[14px] font-medium leading-relaxed text-[var(--ink-soft)]">
                  {locale === 'vi'
                    ? 'Mỗi tài khoản Google mới = đăng ký + đăng nhập được. Guest chỉ lưu trên máy này.'
                    : 'Any new Google account can sign up and sign in. Guest stays on this device only.'}
                </p>
              </div>
            </div>
          ) : null}

          {step === 'goal' ? (
            <div className="flex flex-wrap gap-2">
              {(Object.keys(goalLabels) as PrimaryGoal[]).map((key) => (
                <Chip
                  key={key}
                  active={primaryGoal === key}
                  onClick={() => setPrimaryGoal(key)}
                >
                  {goalLabels[key][locale]}
                </Chip>
              ))}
            </div>
          ) : null}

          {step === 'rhythm' ? (
            <div className="space-y-5">
              <div className="space-y-2.5">
                <p className="text-[13px] font-semibold text-[var(--black)]">
                  {locale === 'vi' ? 'Ngày / tuần' : 'Days / week'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[2, 3, 4, 5, 6].map((n) => (
                    <Chip key={n} active={goal === n} onClick={() => setGoal(n)}>
                      {n}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="space-y-2.5">
                <p className="text-[13px] font-semibold text-[var(--black)]">
                  {locale === 'vi' ? 'Thời lượng buổi' : 'Session length'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[20, 30, 45, 60].map((n) => (
                    <Chip key={n} active={sessionMin === n} onClick={() => setSessionMin(n)}>
                      {n} {locale === 'vi' ? 'phút' : 'min'}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 'level' ? (
            <div className="flex flex-wrap gap-2">
              {(Object.keys(levelLabels) as FitnessLevel[]).map((key) => (
                <Chip key={key} active={level === key} onClick={() => setLevel(key)}>
                  {levelLabels[key][locale]}
                </Chip>
              ))}
            </div>
          ) : null}

          {step === 'gear' ? (
            <div className="space-y-2">
              <p className="text-[12px] font-medium text-[var(--ink-soft)]">
                {locale === 'vi'
                  ? 'Chọn nhanh preset, rồi chỉnh từng món nếu cần.'
                  : 'Pick a quick preset, then toggle gear if needed.'}
              </p>
              <GearPicker
                selectedIds={availableGearIds}
                onChange={setAvailableGearIds}
                locale={locale}
              />
            </div>
          ) : null}

          {step === 'focus' ? (
            <div className="flex flex-wrap gap-2">
              {(Object.keys(focusLabels) as FocusPriority[]).map((key) => (
                <Chip
                  key={key}
                  active={focusPriority === key}
                  onClick={() => setFocusPriority(key)}
                >
                  {focusLabels[key][locale]}
                </Chip>
              ))}
            </div>
          ) : null}

          {step === 'joints' ? (
            <div className="flex flex-wrap gap-2">
              {(Object.keys(jointCareLabels) as JointCare[]).map((key) => (
                <Chip key={key} active={jointCare === key} onClick={() => setJointCare(key)}>
                  {jointCareLabels[key][locale]}
                </Chip>
              ))}
            </div>
          ) : null}

          {step === 'ready' ? (
            <div className="rounded-[var(--radius-xl)] bg-[var(--white)] p-5 shadow-[var(--shadow-md)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                {locale === 'vi' ? 'Preview hôm nay' : 'Today preview'}
              </p>
              <p className="mt-2 text-[20px] font-semibold text-[var(--black)]">{summary}</p>
              <p className="mt-2 text-[14px] font-medium leading-relaxed text-[var(--ink-soft)]">
                {preview}
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-2 pt-2">
          <Button fullWidth size="lg" onClick={next}>
            {isLast
              ? locale === 'vi'
                ? 'Vào app'
                : 'Enter app'
              : locale === 'vi'
                ? 'Tiếp tục'
                : 'Continue'}
          </Button>
          <div className="flex items-center justify-between gap-3 px-1">
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={back}
                className="py-2 text-[14px] font-semibold text-[var(--ink-soft)]"
              >
                {locale === 'vi' ? '← Quay lại' : '← Back'}
              </button>
            ) : (
              <span />
            )}
            {!isLast ? (
              <button
                type="button"
                onClick={skipStep}
                className="py-2 text-[14px] font-semibold text-[var(--ink-soft)]"
              >
                {locale === 'vi' ? 'Bỏ qua bước này' : 'Skip this step'}
              </button>
            ) : (
              <button
                type="button"
                onClick={skipAll}
                className="py-2 text-[14px] font-semibold text-[var(--ink-soft)]"
              >
                {locale === 'vi' ? 'Dùng mặc định nhanh' : 'Use quick defaults'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
