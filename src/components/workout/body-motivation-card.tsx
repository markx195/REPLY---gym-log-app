'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  bmiTrackProgress,
  bmiZone,
  calcBmi,
  kgFromLbs,
  lbsFromKg,
  type BmiZone,
} from '@/lib/body-metrics';
import type { Locale } from '@/lib/i18n';
import type { UserPreferences } from '@/lib/preferences-store';

type BodyMotivationCardProps = {
  preferences: UserPreferences;
  sessionsThisWeek: number;
  locale: Locale;
  onUpdatePrefs: (partial: Partial<UserPreferences>) => void;
  onStartToday: () => void;
};

function zoneCopy(zone: BmiZone, locale: Locale) {
  if (locale === 'vi') {
    if (zone === 'under') return 'Dưới vùng cân bằng — tập đều để khỏe hơn.';
    if (zone === 'healthy') return 'Trong vùng cân bằng — giữ nhịp tập là thắng.';
    if (zone === 'over') return 'Hơi cao — buổi hôm nay vẫn đẩy bạn tiến gần mục tiêu.';
    return 'Ưu tiên đều đặn + phục hồi — từng buổi đều tính.';
  }
  if (zone === 'under') return 'Below balance range — consistent training helps.';
  if (zone === 'healthy') return 'In balance range — keep showing up.';
  if (zone === 'over') return 'A bit high — today’s session still moves you forward.';
  return 'Prioritize consistency + recovery — every session counts.';
}

export function BodyMotivationCard({
  preferences,
  sessionsThisWeek,
  locale,
  onUpdatePrefs,
  onStartToday,
}: BodyMotivationCardProps) {
  const units = preferences.units;
  const hasBody =
    typeof preferences.heightCm === 'number' &&
    preferences.heightCm > 0 &&
    typeof preferences.weightKg === 'number' &&
    preferences.weightKg > 0;

  const [editing, setEditing] = useState(!hasBody);
  const [heightCm, setHeightCm] = useState(String(preferences.heightCm ?? 170));
  const [weightInput, setWeightInput] = useState(() => {
    if (!preferences.weightKg) return units === 'lbs' ? '154' : '70';
    return String(units === 'lbs' ? lbsFromKg(preferences.weightKg) : preferences.weightKg);
  });

  const bmi = useMemo(() => {
    if (!hasBody) return null;
    return calcBmi(preferences.weightKg!, preferences.heightCm!);
  }, [hasBody, preferences.heightCm, preferences.weightKg]);

  const weekGoal = Math.max(1, preferences.weeklyGoal);
  const weekProgress = Math.min(1, sessionsThisWeek / weekGoal);
  const zone = bmi ? bmiZone(bmi) : null;
  const track = bmi ? bmiTrackProgress(bmi) : 0;

  const saveBody = () => {
    const h = Number(heightCm);
    const wRaw = Number(weightInput);
    if (!h || !wRaw || h < 120 || h > 230) return;
    const weightKg = units === 'lbs' ? kgFromLbs(wRaw) : wRaw;
    if (weightKg < 30 || weightKg > 250) return;
    onUpdatePrefs({ heightCm: Math.round(h), weightKg });
    setEditing(false);
  };

  return (
    <section className="overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--white)] p-4 shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            {locale === 'vi' ? 'Động lực tuần này' : 'This week’s drive'}
          </p>
          <p className="mt-1 text-[18px] font-semibold text-[var(--black)]">
            {locale === 'vi' ? 'Cơ thể + nhịp tập' : 'Body + training rhythm'}
          </p>
        </div>
        {hasBody && !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[12px] font-semibold text-[var(--accent)]"
          >
            {locale === 'vi' ? 'Sửa' : 'Edit'}
          </button>
        ) : null}
      </div>

      {/* Weekly sessions bar — always visible */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <p className="text-[13px] font-semibold text-[var(--black)]">
            {locale === 'vi' ? 'Mục tiêu tuần' : 'Weekly goal'}
          </p>
          <p className="text-[13px] font-semibold tabular-nums text-[var(--accent)]">
            {sessionsThisWeek}/{weekGoal}
          </p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
            style={{ width: `${weekProgress * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-[12px] font-medium text-[var(--ink-soft)]">
          {sessionsThisWeek >= weekGoal
            ? locale === 'vi'
              ? 'Đủ mục tiêu tuần — giữ đà thôi.'
              : 'Week goal hit — keep the streak.'
            : locale === 'vi'
              ? `Còn ${weekGoal - sessionsThisWeek} buổi để chạm mục tiêu.`
              : `${weekGoal - sessionsThisWeek} session${weekGoal - sessionsThisWeek === 1 ? '' : 's'} to hit your goal.`}
        </p>
      </div>

      {editing || !hasBody ? (
        <div className="mt-4 space-y-3 rounded-[20px] bg-[var(--surface)] p-3">
          <p className="text-[13px] font-medium text-[var(--ink-soft)]">
            {locale === 'vi'
              ? 'Nhập chiều cao + cân để hiện BMI (chỉ trên thiết bị / cloud của bạn).'
              : 'Add height + weight to show BMI (stays in your prefs / cloud).'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {locale === 'vi' ? 'Chiều cao (cm)' : 'Height (cm)'}
              </span>
              <input
                inputMode="numeric"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value.replace(/[^\d]/g, ''))}
                className="h-11 w-full rounded-[14px] bg-[var(--white)] px-3 text-[15px] font-semibold text-[var(--black)] outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {locale === 'vi' ? `Cân (${units})` : `Weight (${units})`}
              </span>
              <input
                inputMode="decimal"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value.replace(/[^\d.]/g, ''))}
                className="h-11 w-full rounded-[14px] bg-[var(--white)] px-3 text-[15px] font-semibold text-[var(--black)] outline-none"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveBody}>
              {locale === 'vi' ? 'Lưu BMI' : 'Save BMI'}
            </Button>
            {hasBody ? (
              <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                {locale === 'vi' ? 'Hủy' : 'Cancel'}
              </Button>
            ) : null}
          </div>
        </div>
      ) : bmi && zone ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                BMI
              </p>
              <p className="mt-0.5 text-[32px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-[var(--black)]">
                {bmi}
              </p>
            </div>
            <p className="max-w-[14rem] text-right text-[12px] font-medium leading-snug text-[var(--ink-soft)]">
              {zoneCopy(zone, locale)}
            </p>
          </div>

          <div className="relative pt-1">
            <div className="relative h-3 overflow-hidden rounded-full bg-[var(--surface)]">
              {/* healthy band ~18.5–25 on 15–35 scale → (18.5-15)/20=0.175 to (25-15)/20=0.5 */}
              <div
                className="absolute inset-y-0 bg-[var(--accent)]/25"
                style={{ left: '17.5%', width: '32.5%' }}
              />
              <div
                className={cn(
                  'absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[var(--shadow-sm)]',
                  zone === 'healthy' ? 'bg-[var(--accent)]' : 'bg-[#3b9aff]',
                )}
                style={{ left: `${track * 100}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              <span>15</span>
              <span>{locale === 'vi' ? 'Cân bằng' : 'Balance'}</span>
              <span>35</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onStartToday}
            className="w-full rounded-full bg-[var(--accent-mist)] px-4 py-2.5 text-[13px] font-semibold text-[var(--accent)] active:scale-[0.99]"
          >
            {locale === 'vi' ? 'Tập hôm nay để giữ đà →' : 'Train today to keep momentum →'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
