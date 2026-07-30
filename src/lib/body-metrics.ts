import type { FitnessLevel } from '@/lib/preferences-store';

export type BmiZone = 'under' | 'healthy' | 'over' | 'high';

/** Reference body weight used by canned session templates (~intermediate). */
export const TEMPLATE_REF_BODY_KG = 75;

export function calcBmi(weightKg: number, heightCm: number): number | null {
  if (!weightKg || !heightCm || heightCm < 100 || weightKg < 20) return null;
  const m = heightCm / 100;
  return Number((weightKg / (m * m)).toFixed(1));
}

export function bmiZone(bmi: number): BmiZone {
  if (bmi < 18.5) return 'under';
  if (bmi < 25) return 'healthy';
  if (bmi < 30) return 'over';
  return 'high';
}

/** Map BMI onto a 0–1 track (visual range ~15–35). */
export function bmiTrackProgress(bmi: number): number {
  return Math.min(1, Math.max(0, (bmi - 15) / 20));
}

export function kgFromLbs(lbs: number) {
  return Number((lbs / 2.2046226218).toFixed(1));
}

export function lbsFromKg(kg: number) {
  return Number((kg * 2.2046226218).toFixed(1));
}

function roundToStep(value: number, step: number) {
  if (step <= 0) return Number(value.toFixed(2));
  return Number((Math.round(value / step) * step).toFixed(2));
}

const levelLoadFactor: Record<FitnessLevel, number> = {
  beginner: 0.65,
  intermediate: 1,
  advanced: 1.2,
};

/**
 * Scale a template / default load using body weight, BMI zone, and experience.
 * Used when the user has no real history yet ("suggest for you").
 */
export function suggestStartingLoad(opts: {
  templateWeight: number;
  weightStep: number;
  bodyWeightKg?: number;
  heightCm?: number;
  level?: FitnessLevel;
}): number {
  const { templateWeight, weightStep, bodyWeightKg, heightCm, level = 'beginner' } = opts;
  if (!bodyWeightKg || bodyWeightKg < 30) {
    return roundToStep(templateWeight * levelLoadFactor[level], weightStep);
  }

  const bwFactor = Math.min(1.45, Math.max(0.55, bodyWeightKg / TEMPLATE_REF_BODY_KG));
  let factor = bwFactor * levelLoadFactor[level];

  const bmi = heightCm ? calcBmi(bodyWeightKg, heightCm) : null;
  if (bmi != null) {
    const zone = bmiZone(bmi);
    if (zone === 'under') factor *= 0.9;
    else if (zone === 'high') factor *= 0.85;
  }

  return roundToStep(Math.max(0, templateWeight * factor), weightStep);
}

export function startingLoadNote(locale: 'en' | 'vi', hasBody: boolean): string {
  if (!hasBody) {
    return locale === 'vi'
      ? 'Gợi ý theo level — cập nhật chiều cao/cân để chính xác hơn.'
      : 'Suggested from your level — add height/weight for a better fit.';
  }
  return locale === 'vi'
    ? 'Gợi ý theo BMI & level của bạn — chỉnh nếu nặng/nhẹ quá.'
    : 'Suggested from your BMI & level — adjust if it feels off.';
}
