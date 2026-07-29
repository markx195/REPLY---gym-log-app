export type BmiZone = 'under' | 'healthy' | 'over' | 'high';

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
