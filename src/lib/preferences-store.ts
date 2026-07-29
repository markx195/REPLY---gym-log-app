import {
  defaultGearIds,
  gearCatalog,
  gearPresetIds,
} from '@/data/exercises/gear-catalog';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type PrimaryGoal = 'muscle' | 'strength' | 'fat-loss' | 'consistency';
export type FocusPriority = 'push' | 'pull' | 'legs' | 'full-body';
export type JointCare = 'none' | 'shoulder' | 'knee' | 'lower-back';
export type GearPreset = 'full-gym' | 'home' | 'machines' | 'bodyweight';
export type Locale = 'en' | 'vi';

/** @deprecated kept for migration only */
export type Gear =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'body only'
  | 'kettlebells'
  | 'bands';

export type UserPreferences = {
  weeklyGoal: number;
  /** Specific gear/machine ids from gear-catalog */
  availableGearIds: string[];
  level: FitnessLevel;
  primaryGoal: PrimaryGoal;
  focusPriority: FocusPriority;
  jointCare: JointCare;
  sessionMin: number;
  units: 'kg' | 'lbs';
  /** Default rest between working sets (seconds) */
  defaultRestSeconds: number;
  theme: 'light' | 'dark' | 'system';
  locale: Locale;
  onboarded: boolean;
  /** Optional body check-in for Home motivation (cm / kg stored). */
  heightCm?: number;
  weightKg?: number;
  targetWeightKg?: number;
};

const PREFS_KEY = 'reply.prefs.v1';

const legacyGearMap: Record<string, string> = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  cable: 'cable',
  machine: 'chest-press',
  'body only': 'body-only',
  kettlebells: 'kettlebells',
  bands: 'bands',
};

const defaults: UserPreferences = {
  weeklyGoal: 4,
  availableGearIds: [...defaultGearIds],
  level: 'beginner',
  primaryGoal: 'consistency',
  focusPriority: 'full-body',
  jointCare: 'none',
  sessionMin: 45,
  units: 'kg',
  defaultRestSeconds: 90,
  theme: 'system',
  locale: 'en',
  onboarded: false,
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeGearIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const valid = new Set(gearCatalog.map((item) => item.id));
  const filtered = value.filter((item): item is string => typeof item === 'string' && valid.has(item));
  return filtered.length > 0 ? filtered : null;
}

function migrateLegacy(raw: Record<string, unknown>): string[] | null {
  if (Array.isArray(raw.availableEquipment)) {
    const mapped = raw.availableEquipment
      .map((item) => legacyGearMap[String(item)])
      .filter((item): item is string => Boolean(item));
    if (mapped.includes('chest-press')) {
      mapped.push(
        'lat-pulldown',
        'leg-press',
        'pec-deck',
        'shoulder-press-machine',
        'smith-machine',
        'hack-squat',
        'leg-extension',
        'seated-row',
      );
    }
    return mapped.length > 0 ? [...new Set(mapped)] : null;
  }

  const legacy = raw.equipment;
  if (typeof legacy !== 'string') return null;
  if (legacy === 'full-gym') return [...gearPresetIds['full-gym']];
  if (legacy === 'dumbbells') return [...gearPresetIds.home];
  if (legacy === 'machines') return [...gearPresetIds.machines];
  if (legacy === 'bodyweight') return [...gearPresetIds.bodyweight];
  return null;
}

export function loadPreferences(): UserPreferences {
  if (!canUseStorage()) {
    return { ...defaults, availableGearIds: [...defaults.availableGearIds] };
  }
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const availableGearIds =
        normalizeGearIds(parsed.availableGearIds) ??
        migrateLegacy(parsed) ??
        [...defaults.availableGearIds];
      const locale = parsed.locale === 'vi' ? 'vi' : 'en';
      const defaultRestSeconds =
        typeof parsed.defaultRestSeconds === 'number'
          ? Math.min(300, Math.max(30, Math.round(parsed.defaultRestSeconds)))
          : defaults.defaultRestSeconds;
      return {
        ...defaults,
        ...parsed,
        availableGearIds,
        locale,
        defaultRestSeconds,
      } as UserPreferences;
    }
  } catch {
    // ignore
  }
  return { ...defaults, availableGearIds: [...defaults.availableGearIds] };
}

export function savePreferences(prefs: UserPreferences) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function formatGearSummary(ids: string[], locale: Locale = 'en') {
  if (ids.length >= gearCatalog.length) {
    return locale === 'vi' ? 'Phòng gym đầy đủ' : 'Full gym';
  }
  if (ids.length === 0) return locale === 'vi' ? 'Chưa chọn' : 'None set';
  if (ids.length <= 2) {
    return ids
      .map((id) => gearCatalog.find((item) => item.id === id)?.name[locale] ?? id)
      .join(', ');
  }
  return locale === 'vi' ? `${ids.length} món` : `${ids.length} items`;
}

export const gearPresetLabels: Record<GearPreset, { en: string; vi: string }> = {
  'full-gym': { en: 'Full gym', vi: 'Phòng gym đầy đủ' },
  home: { en: 'Home gym', vi: 'Tập tại nhà' },
  machines: { en: 'Machines only', vi: 'Chỉ máy' },
  bodyweight: { en: 'Bodyweight only', vi: 'Chỉ thân người' },
};

export const levelLabels: Record<FitnessLevel, { en: string; vi: string }> = {
  beginner: { en: 'Beginner', vi: 'Mới bắt đầu' },
  intermediate: { en: 'Intermediate', vi: 'Trung cấp' },
  advanced: { en: 'Advanced', vi: 'Nâng cao' },
};

export const goalLabels: Record<PrimaryGoal, { en: string; vi: string }> = {
  muscle: { en: 'Build muscle', vi: 'Tăng cơ' },
  strength: { en: 'Get stronger', vi: 'Tăng sức mạnh' },
  'fat-loss': { en: 'Lose fat', vi: 'Giảm mỡ' },
  consistency: { en: 'Stay consistent', vi: 'Duy trì đều' },
};

export const focusLabels: Record<FocusPriority, { en: string; vi: string }> = {
  push: { en: 'Push', vi: 'Đẩy' },
  pull: { en: 'Pull', vi: 'Kéo' },
  legs: { en: 'Legs', vi: 'Chân' },
  'full-body': { en: 'Full body', vi: 'Toàn thân' },
};

export const jointCareLabels: Record<JointCare, { en: string; vi: string }> = {
  none: { en: 'No limitation', vi: 'Không hạn chế' },
  shoulder: { en: 'Shoulder friendly', vi: 'Thân thiện vai' },
  knee: { en: 'Knee friendly', vi: 'Thân thiện gối' },
  'lower-back': { en: 'Lower-back friendly', vi: 'Thân thiện lưng dưới' },
};
