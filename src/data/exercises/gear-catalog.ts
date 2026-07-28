export type GearItem = {
  id: string;
  group: 'free-weights' | 'machines' | 'cables' | 'body' | 'accessories';
  /** Catalog equipment field values this item covers */
  equipment: string[];
  /** If set, exercise name must include one of these (case-insensitive) */
  keywords?: string[];
  image: string;
  name: { en: string; vi: string };
};

const IMG = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

export const gearCatalog: GearItem[] = [
  {
    id: 'barbell',
    group: 'free-weights',
    equipment: ['barbell'],
    image: `${IMG}/Barbell_Bench_Press_-_Medium_Grip/0.jpg`,
    name: { en: 'Barbell', vi: 'Thanh đòn' },
  },
  {
    id: 'dumbbell',
    group: 'free-weights',
    equipment: ['dumbbell'],
    image: `${IMG}/Incline_Dumbbell_Press/0.jpg`,
    name: { en: 'Dumbbells', vi: 'Tạ đơn' },
  },
  {
    id: 'ez-bar',
    group: 'free-weights',
    equipment: ['e-z curl bar', 'barbell'],
    keywords: ['ez', 'e-z', 'curl bar'],
    image: `${IMG}/EZ-Bar_Curl/0.jpg`,
    name: { en: 'EZ bar', vi: 'Thanh EZ' },
  },
  {
    id: 'kettlebells',
    group: 'free-weights',
    equipment: ['kettlebells'],
    image: `${IMG}/Two-Arm_Kettlebell_Clean/0.jpg`,
    name: { en: 'Kettlebells', vi: 'Tạ ấm' },
  },
  {
    id: 'cable',
    group: 'cables',
    equipment: ['cable'],
    image: `${IMG}/Cable_Crossover/0.jpg`,
    name: { en: 'Cable station', vi: 'Cáp đa năng' },
  },
  {
    id: 'seated-row',
    group: 'cables',
    equipment: ['cable'],
    keywords: ['seated cable row', 'seated row', 'cable row'],
    image: `${IMG}/Seated_Cable_Rows/0.jpg`,
    name: { en: 'Seated row', vi: 'Máy kéo cáp ngồi' },
  },
  {
    id: 'lat-pulldown',
    group: 'machines',
    equipment: ['cable', 'machine'],
    keywords: ['lat pulldown', 'pulldown'],
    image: `${IMG}/Wide-Grip_Lat_Pulldown/0.jpg`,
    name: { en: 'Lat pulldown', vi: 'Máy kéo xô' },
  },
  {
    id: 'chest-press',
    group: 'machines',
    equipment: ['machine'],
    keywords: ['chest press', 'leverage chest', 'machine bench'],
    image: `${IMG}/Leverage_Chest_Press/0.jpg`,
    name: { en: 'Chest press', vi: 'Máy đẩy ngực' },
  },
  {
    id: 'pec-deck',
    group: 'machines',
    equipment: ['machine'],
    keywords: ['butterfly', 'pec deck', 'pec fly'],
    image: `${IMG}/Butterfly/0.jpg`,
    name: { en: 'Pec deck', vi: 'Máy ép ngực' },
  },
  {
    id: 'shoulder-press-machine',
    group: 'machines',
    equipment: ['machine'],
    keywords: ['shoulder press', 'military press', 'leverage shoulder'],
    image: `${IMG}/Leverage_Shoulder_Press/0.jpg`,
    name: { en: 'Shoulder press', vi: 'Máy đẩy vai' },
  },
  {
    id: 'leg-press',
    group: 'machines',
    equipment: ['machine'],
    keywords: ['leg press'],
    image: `${IMG}/Leg_Press/0.jpg`,
    name: { en: 'Leg press', vi: 'Máy đạp chân' },
  },
  {
    id: 'leg-extension',
    group: 'machines',
    equipment: ['machine'],
    keywords: ['leg extension', 'leg curl'],
    image: `${IMG}/Leg_Extensions/0.jpg`,
    name: { en: 'Leg extension / curl', vi: 'Máy đá / cuốn đùi' },
  },
  {
    id: 'hack-squat',
    group: 'machines',
    equipment: ['machine'],
    keywords: ['hack squat'],
    image: `${IMG}/Hack_Squat/0.jpg`,
    name: { en: 'Hack squat', vi: 'Máy hack squat' },
  },
  {
    id: 'smith-machine',
    group: 'machines',
    equipment: ['machine', 'barbell'],
    keywords: ['smith'],
    image: `${IMG}/Smith_Machine_Bench_Press/0.jpg`,
    name: { en: 'Smith machine', vi: 'Khung Smith' },
  },
  {
    id: 'body-only',
    group: 'body',
    equipment: ['body only'],
    image: `${IMG}/Pushups/0.jpg`,
    name: { en: 'Bodyweight', vi: 'Thân người' },
  },
  {
    id: 'bands',
    group: 'accessories',
    equipment: ['bands'],
    image: `${IMG}/Band_Pull_Apart/0.jpg`,
    name: { en: 'Resistance bands', vi: 'Dây kháng lực' },
  },
];

export const gearItemById = new Map(gearCatalog.map((item) => [item.id, item]));

export const gearGroupLabels = {
  'free-weights': { en: 'Free weights', vi: 'Tạ tự do' },
  machines: { en: 'Machines', vi: 'Máy tập' },
  cables: { en: 'Cables', vi: 'Cáp' },
  body: { en: 'Bodyweight', vi: 'Thân người' },
  accessories: { en: 'Accessories', vi: 'Phụ kiện' },
} as const;

export const defaultGearIds = gearCatalog.map((item) => item.id);

export const gearPresetIds = {
  'full-gym': defaultGearIds,
  home: ['dumbbell', 'kettlebells', 'body-only', 'bands'],
  machines: [
    'cable',
    'seated-row',
    'lat-pulldown',
    'chest-press',
    'pec-deck',
    'shoulder-press-machine',
    'leg-press',
    'leg-extension',
    'hack-squat',
    'smith-machine',
    'body-only',
  ],
  bodyweight: ['body-only', 'bands'],
} as const;

export function exerciseMatchesGearItem(
  exercise: { name: string; equipment: string },
  item: GearItem,
) {
  if (!item.equipment.includes(exercise.equipment)) return false;
  if (!item.keywords || item.keywords.length === 0) return true;
  const name = exercise.name.toLowerCase();
  return item.keywords.some((keyword) => name.includes(keyword));
}

export function exerciseMatchesAnyGear(
  exercise: { name: string; equipment: string },
  selectedIds: string[],
) {
  if (selectedIds.length === 0) return true;
  if (selectedIds.length >= gearCatalog.length) return true;
  return selectedIds.some((id) => {
    const item = gearItemById.get(id);
    return item ? exerciseMatchesGearItem(exercise, item) : false;
  });
}
