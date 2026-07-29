'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { BottomSheet, Button, Card, SearchBar } from '@/components/ui';
import { HScroll } from '@/components/ui/h-scroll';
import {
  catalogStats,
  categoryFilters,
  equipmentFilters,
  searchExercises,
  type CatalogExercise,
} from '@/data/exercises/catalog';
import { moods, toneStyles, workouts, type WorkoutMood } from '@/data/workouts';
import { getExerciseById } from '@/data/exercises/catalog';
import { muscleTiles } from '@/data/exercises/muscle-covers';
import { workoutSessions } from '@/data/session';
import {
  createCustomWorkout,
  type CustomWorkout,
} from '@/lib/custom-workouts-store';
import {
  formatGearSummary,
  type UserPreferences,
} from '@/lib/preferences-store';
import { muscleLabel, translate } from '@/lib/i18n';

type DiscoveryScreenProps = {
  onStartWorkout: (workoutId: string) => void;
  onStartExercise: (exerciseId: string) => void;
  favoriteIds: string[];
  onToggleFavorite: (workoutId: string) => void;
  preferences: UserPreferences;
  customWorkouts: CustomWorkout[];
  onSaveCustomWorkout: (list: CustomWorkout) => void;
  onEditGear?: () => void;
};

const PAGE = 20;

export function DiscoveryScreen({
  onStartWorkout,
  onStartExercise,
  favoriteIds,
  onToggleFavorite,
  preferences,
  customWorkouts,
  onSaveCustomWorkout,
  onEditGear,
}: DiscoveryScreenProps) {
  const locale = preferences.locale;
  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);

  const [query, setQuery] = useState('');
  const [activeMood, setActiveMood] = useState<WorkoutMood>('All');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [onlyMyGear, setOnlyMyGear] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [selected, setSelected] = useState<CatalogExercise | null>(null);
  const [pickerExercise, setPickerExercise] = useState<CatalogExercise | null>(null);
  const [muscleSheetOpen, setMuscleSheetOpen] = useState(false);
  const [equipmentSheetOpen, setEquipmentSheetOpen] = useState(false);
  const [gearSheetOpen, setGearSheetOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const librarySentinelRef = useRef<HTMLDivElement | null>(null);

  const stats = catalogStats();

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return workouts.filter((workout) => {
      const matchesMood = activeMood === 'All' || workout.mood.includes(activeMood);
      const matchesQuery =
        !normalized ||
        workout.title.toLowerCase().includes(normalized) ||
        workout.focus.toLowerCase().includes(normalized) ||
        workout.equipment.toLowerCase().includes(normalized);
      return matchesMood && matchesQuery;
    });
  }, [activeMood, query]);

  const exerciseResult = useMemo(
    () =>
      searchExercises(query, {
        muscle: muscle ?? undefined,
        equipment: equipment ?? undefined,
        category: category ?? undefined,
        availableGearIds: onlyMyGear ? preferences.availableGearIds : undefined,
        limit: visibleCount,
        offset: 0,
      }),
    [query, muscle, equipment, category, onlyMyGear, preferences.availableGearIds, visibleCount],
  );

  const collections = [
    {
      id: 'peak',
      title: locale === 'vi' ? 'Giờ cao điểm' : 'Gym peak hours',
      blurb:
        locale === 'vi'
          ? 'Ít setup — hợp giờ đông người.'
          : 'Low setup — peak-hour friendly.',
      mood: 'Machines' as WorkoutMood,
      tone: 'slate' as const,
      image: getExerciseById('chest-press')?.image ?? null,
    },
    {
      id: 'travel',
      title: locale === 'vi' ? 'Đi du lịch' : 'Travel ready',
      blurb:
        locale === 'vi'
          ? 'Thân người / tối giản — tập mọi nơi.'
          : 'Bodyweight / minimal — train anywhere.',
      mood: 'Travel' as WorkoutMood,
      tone: 'mist' as const,
      image: getExerciseById('Pushups')?.image ?? getExerciseById('squat')?.image ?? null,
    },
    {
      id: 'pump',
      title: locale === 'vi' ? 'Pump 45 phút' : '45-min pump',
      blurb:
        locale === 'vi'
          ? 'Buổi ngắn, mật độ cao.'
          : 'Short session, high density.',
      mood: '45 min' as WorkoutMood,
      tone: 'sky' as const,
      image: getExerciseById('cable-fly')?.image ?? null,
    },
  ];

  const openCollection = collections.find((c) => c.id === collectionId) ?? null;
  const collectionWorkouts = useMemo(() => {
    if (!openCollection) return [];
    return workouts.filter((w) => w.mood.includes(openCollection.mood));
  }, [openCollection]);

  const coverForWorkout = (workoutId: string) => {
    const firstId = workoutSessions[workoutId]?.exercises[0]?.id;
    return firstId ? getExerciseById(firstId)?.image ?? null : null;
  };

  const muscleTileItems = useMemo(() => muscleTiles(), []);

  const selectMuscle = (next: string | null) => {
    setMuscle(next);
    setVisibleCount(PAGE);
    setMuscleSheetOpen(false);
    if (next) setLibraryOpen(true);
  };

  useEffect(() => {
    if (!libraryOpen) return;
    const node = librarySentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        setVisibleCount((current) => {
          if (current >= exerciseResult.total) return current;
          return Math.min(current + PAGE, exerciseResult.total);
        });
      },
      { rootMargin: '220px 0px 220px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [exerciseResult.total, libraryOpen]);

  const quickStartFromExercise = (exercise: CatalogExercise) => {
    setSelected(null);
    setPickerExercise(null);
    onStartExercise(exercise.id);
  };

  const addExerciseToList = (list: CustomWorkout, exerciseId: string) => {
    if (list.exerciseIds.includes(exerciseId)) return;
    onSaveCustomWorkout({
      ...list,
      exerciseIds: [...list.exerciseIds, exerciseId],
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="relative space-y-6 fade-in">
      <div
        className="ambient-blob -left-20 top-4 h-52 w-52 bg-[var(--blob)]/35"
        aria-hidden
      />

      <header className="relative overflow-hidden rounded-[var(--radius-2xl)] shadow-[var(--shadow-lg)]">
        {getExerciseById('Barbell_Bench_Press_-_Medium_Grip')?.image ||
        getExerciseById('chest-press')?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={
              getExerciseById('Barbell_Bench_Press_-_Medium_Grip')?.image ??
              getExerciseById('chest-press')?.image ??
              ''
            }
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--tone-sky-from)] via-[var(--tone-sky-via)] to-[var(--tone-sky-to)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/55 to-black/35" />
        <div className="relative p-5 pb-6">
          <p className="text-[var(--text-sm)] font-semibold uppercase tracking-[0.12em] text-white/70">
            {t('discover')}
          </p>
          <h1 className="mt-2 text-[34px] font-semibold leading-[1.05] tracking-[var(--tracking-snug)] text-white">
            {t('freshSessions')}
          </h1>
          <p className="mt-2 max-w-[20rem] text-[var(--text-md)] font-medium text-white/75">
            {t('exercisesCount', { count: stats.total })} · {t('gearLabel')}:{' '}
            {formatGearSummary(preferences.availableGearIds, locale)}
          </p>
        </div>
      </header>

      <SearchBar
        value={query}
        onChange={(value) => {
          setQuery(value);
          setVisibleCount(PAGE);
        }}
        placeholder={t('searchPlaceholder')}
      />

      <HScroll contentClassName="gap-2">
        {moods.map((mood) => {
          const isActive = mood === activeMood;
          return (
            <button
              key={mood}
              type="button"
              onClick={() => setActiveMood(mood)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2.5 text-[var(--text-sm)] font-medium transition-all',
                isActive
                  ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)]'
                  : 'bg-[var(--white)] text-[var(--muted)] shadow-[var(--shadow-sm)]',
              )}
            >
              {mood}
            </button>
          );
        })}
      </HScroll>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
              {t('trainByMuscle')}
            </h2>
            <p className="mt-0.5 text-[12px] font-medium text-[var(--ink-soft)]">
              {t('pickAMuscle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMuscleSheetOpen(true)}
            className="text-[13px] font-semibold text-[var(--accent)]"
          >
            {t('allMuscles')}
          </button>
        </div>
        <HScroll contentClassName="gap-2.5">
          <button
            type="button"
            onClick={() => selectMuscle(null)}
            className={cn(
              'relative h-[148px] w-[112px] shrink-0 overflow-hidden rounded-[22px] text-left shadow-[var(--shadow-md)] active:scale-[0.98]',
              !muscle && 'ring-2 ring-[var(--accent)]',
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)] to-[var(--tone-sky-to)]" />
            <div className="relative flex h-full flex-col justify-end p-3">
              <p className="text-[14px] font-semibold leading-snug text-white">
                {t('allMuscles')}
              </p>
            </div>
          </button>
          {muscleTileItems.map((tile) => {
            const active = muscle === tile.id;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => selectMuscle(active ? null : tile.id)}
                className={cn(
                  'relative h-[148px] w-[112px] shrink-0 overflow-hidden rounded-[22px] text-left shadow-[var(--shadow-md)] active:scale-[0.98]',
                  active && 'ring-2 ring-[var(--accent)]',
                )}
              >
                {tile.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tile.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--tone-slate-from)] to-[var(--tone-slate-to)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="relative flex h-full flex-col justify-end p-3">
                  <p className="text-[14px] font-semibold leading-snug text-white">
                    {muscleLabel(tile.id, locale)}
                  </p>
                </div>
              </button>
            );
          })}
        </HScroll>
      </section>

      <section className="space-y-3">
        <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
          {locale === 'vi' ? 'Thể loại' : 'Categories'}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {categoryFilters.map((cat) => {
            const active = category === cat.id;
            const count = searchExercises('', { category: cat.id }).total;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategory(active ? null : cat.id);
                  setVisibleCount(PAGE);
                  if (!active) setLibraryOpen(true);
                }}
                className={cn(
                  'flex items-center gap-2.5 rounded-[18px] px-3.5 py-3 text-left transition-all active:scale-[0.97]',
                  active
                    ? 'bg-[var(--accent)] shadow-[var(--shadow-md)]'
                    : 'bg-[var(--white)] shadow-[var(--shadow-sm)]',
                )}
              >
                <span className="text-[20px]">{cat.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-[14px] font-semibold leading-tight', active ? 'text-white' : 'text-[var(--black)]')}>
                    {locale === 'vi' ? cat.vi : cat.en}
                  </p>
                  <p className={cn('text-[11px] font-medium', active ? 'text-white/70' : 'text-[var(--muted)]')}>
                    {count} {locale === 'vi' ? 'bài' : 'exercises'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
          {t('collections')}
        </h2>
        <HScroll>
          {collections.map((item) => {
            const tone = toneStyles[item.tone];
            const count = workouts.filter((w) => w.mood.includes(item.mood)).length;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCollectionId(item.id)}
                className="relative h-[132px] w-[168px] shrink-0 overflow-hidden rounded-[var(--radius-xl)] text-left shadow-[var(--shadow-md)] active:scale-[0.98]"
              >
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className={cn('absolute inset-0 bg-gradient-to-br', tone.wash)} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
                <div className="relative flex h-full flex-col justify-end p-4">
                  <p className="text-[16px] font-semibold leading-snug text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-white/75">
                    {count} {locale === 'vi' ? 'buổi' : 'workouts'}
                  </p>
                </div>
              </button>
            );
          })}
        </HScroll>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
            {t('forYou')}
          </h2>
          <span className="text-[var(--text-sm)] text-[var(--muted)]">{filtered.length}</span>
        </div>

        {filtered.length === 0 ? (
          <Card variant="surface" padding="md" className="py-10 text-center">
            <p className="text-[var(--text-md)] text-[var(--muted)]">{t('nothingHere')}</p>
          </Card>
        ) : (
          <HScroll>
            {filtered.map((workout) => {
              const saved = favoriteIds.includes(workout.id);
              const cover = coverForWorkout(workout.id);
              return (
                <div key={workout.id} className="w-[196px] shrink-0 space-y-2">
                  <button
                    type="button"
                    onClick={() => onStartWorkout(workout.id)}
                    className="relative h-[148px] w-full overflow-hidden rounded-[var(--radius-xl)] text-left shadow-[var(--shadow-md)] active:scale-[0.98]"
                  >
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className={cn(
                          'absolute inset-0 bg-gradient-to-br',
                          toneStyles[workout.tone].wash,
                        )}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/15" />
                    <div className="relative flex h-full flex-col justify-between p-4">
                      <span className="self-start rounded-full bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-white">
                        {workout.durationMin} min
                      </span>
                      <div>
                        <p className="text-[16px] font-semibold leading-snug text-white">
                          {workout.title}
                        </p>
                        <p className="mt-1 text-[12px] font-medium text-white/70">
                          {workout.focus}
                        </p>
                        <span className="mt-2.5 inline-flex rounded-full bg-[var(--accent)] px-3 py-1 text-[11px] font-semibold text-white">
                          {locale === 'vi' ? 'Bắt đầu' : 'Start'}
                        </span>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(workout.id)}
                    className={cn(
                      'ml-1 text-[12px] font-semibold',
                      saved ? 'text-[var(--accent)]' : 'text-[var(--muted)]',
                    )}
                  >
                    {saved ? `★ ${t('saved')}` : `☆ ${t('save')}`}
                  </button>
                </div>
              );
            })}
          </HScroll>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
          {t('exerciseLibrary')}
        </h2>
        <button
          type="button"
          onClick={() => {
            setVisibleCount(PAGE);
            setLibraryOpen(true);
          }}
          className="flex w-full items-center gap-4 overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--white)] p-4 text-left shadow-[var(--shadow-md)] active:scale-[0.99]"
        >
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[18px]">
            {getExerciseById('Barbell_Bench_Press_-_Medium_Grip')?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getExerciseById('Barbell_Bench_Press_-_Medium_Grip')!.image!}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[var(--accent)] to-[var(--tone-sky-to)]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold text-[var(--black)]">
              {t('browseLibrary')}
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-[var(--ink-soft)]">
              {t('openLibraryHint')}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-[var(--accent)]">
              {exerciseResult.total} · {muscle ? muscleLabel(muscle, locale) : t('allMuscles')}
              {equipment ? ` · ${equipment}` : ''}
              {category ? ` · ${categoryFilters.find((c) => c.id === category)?.[locale === 'vi' ? 'vi' : 'en'] ?? category}` : ''}
            </p>
          </div>
          <span className="text-[18px] font-semibold text-[var(--muted)]">›</span>
        </button>
      </section>

      <BottomSheet
        open={Boolean(openCollection)}
        onClose={() => setCollectionId(null)}
        title={openCollection?.title ?? t('collections')}
        size="tall"
      >
        {openCollection ? (
          <div className="space-y-4">
            <p className="text-[14px] font-medium text-[var(--ink-soft)]">
              {openCollection.blurb}
            </p>
            <ul className="space-y-2">
              {collectionWorkouts.map((workout) => {
                const cover = coverForWorkout(workout.id);
                return (
                  <li key={workout.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setCollectionId(null);
                        onStartWorkout(workout.id);
                      }}
                      className="flex w-full items-center gap-3 overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface)] text-left active:scale-[0.985]"
                    >
                      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className={cn(
                              'h-full w-full bg-gradient-to-br',
                              toneStyles[workout.tone].wash,
                            )}
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 py-3 pr-3">
                        <p className="truncate text-[15px] font-semibold text-[var(--black)]">
                          {workout.title}
                        </p>
                        <p className="mt-0.5 text-[12px] font-medium text-[var(--ink-soft)]">
                          {workout.durationMin} min · {workout.focus}
                        </p>
                      </div>
                      <span className="shrink-0 pr-4 text-[13px] font-semibold text-[var(--accent)]">
                        {locale === 'vi' ? 'Bắt đầu' : 'Start'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {collectionWorkouts.length === 0 ? (
              <p className="py-6 text-center text-[14px] text-[var(--muted)]">
                {t('nothingHere')}
              </p>
            ) : null}
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        title={t('exerciseLibrary')}
        size="tall"
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGearSheetOpen(true)}
            className={cn(
              'rounded-full px-3.5 py-2 text-[13px] font-semibold',
              onlyMyGear
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface)] text-[var(--black)]',
            )}
          >
            {onlyMyGear ? t('myGear') : t('allExercises')} ▾
          </button>
          <button
            type="button"
            onClick={() => setMuscleSheetOpen(true)}
            className={cn(
              'rounded-full px-3.5 py-2 text-[13px] font-semibold',
              muscle
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface)] text-[var(--black)]',
            )}
          >
            {muscle ? muscleLabel(muscle, locale) : t('allMuscles')} ▾
          </button>
          <button
            type="button"
            onClick={() => setEquipmentSheetOpen(true)}
            className={cn(
              'rounded-full px-3.5 py-2 text-[13px] font-semibold capitalize',
              equipment
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface)] text-[var(--black)]',
            )}
          >
            {equipment ?? t('anyType')} ▾
          </button>
          {category ? (
            <button
              type="button"
              onClick={() => { setCategory(null); setVisibleCount(PAGE); }}
              className="rounded-full bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white"
            >
              {categoryFilters.find((c) => c.id === category)?.[locale === 'vi' ? 'vi' : 'en'] ?? category} ✕
            </button>
          ) : null}
        </div>

        <p className="mb-3 text-[12px] font-medium text-[var(--ink-soft)]">
          {exerciseResult.total}{' '}
          {locale === 'vi' ? 'bài khớp bộ lọc' : 'matches'}
        </p>

        <ul className="space-y-2">
          {exerciseResult.items.map((exercise) => (
            <li key={exercise.id}>
              <button
                type="button"
                onClick={() => {
                  setLibraryOpen(false);
                  setSelected(exercise);
                }}
                className="flex w-full items-center gap-3 rounded-[var(--radius-xl)] bg-[var(--surface)] p-3 text-left active:scale-[0.985]"
              >
                {exercise.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={exercise.image}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-[14px] object-cover bg-[var(--white)]"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-[14px] bg-[var(--white)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[var(--black)]">
                    {exercise.name}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium text-[var(--ink-soft)]">
                    {exercise.primaryMuscles
                      .map((m) => muscleLabel(m, locale))
                      .join(', ')}{' '}
                    · {exercise.equipment}
                  </p>
                  <span className="mt-1 inline-flex rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold capitalize text-[var(--accent)]">
                    {categoryFilters.find((c) => c.id === exercise.category)?.icon ?? ''}{' '}
                    {locale === 'vi'
                      ? (categoryFilters.find((c) => c.id === exercise.category)?.vi ?? exercise.category)
                      : (categoryFilters.find((c) => c.id === exercise.category)?.en ?? exercise.category)}
                  </span>
                </div>
                <span className="shrink-0 text-[12px] font-semibold text-[var(--accent)]">
                  {t('view')}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {visibleCount < exerciseResult.total ? (
          <div
            ref={librarySentinelRef}
            className="py-3 text-center text-[12px] font-medium text-[var(--muted-light)]"
          >
            {locale === 'vi' ? 'Kéo xuống để tải thêm…' : 'Scroll to load more…'}
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name ?? 'Exercise'}
      >
        {selected ? (
          <div className="space-y-4">
            {selected.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.image}
                alt={selected.name}
                className="h-48 w-full rounded-[var(--radius-xl)] object-cover bg-[var(--surface)]"
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-[12px] font-semibold capitalize text-[var(--accent)]">
                {selected.level}
              </span>
              <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold capitalize text-[var(--black)]">
                {selected.equipment}
              </span>
              <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold capitalize text-[var(--black)]">
                {categoryFilters.find((c) => c.id === selected.category)?.icon ?? ''}{' '}
                {locale === 'vi'
                  ? (categoryFilters.find((c) => c.id === selected.category)?.vi ?? selected.category)
                  : (categoryFilters.find((c) => c.id === selected.category)?.en ?? selected.category)}
              </span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[var(--black)]">{t('muscles')}</p>
              <p className="mt-1 text-[14px] font-medium text-[var(--ink-soft)]">
                {selected.primaryMuscles.map((m) => muscleLabel(m, locale)).join(', ')}
                {selected.secondaryMuscles.length
                  ? ` · ${t('secondary')}: ${selected.secondaryMuscles
                      .map((m) => muscleLabel(m, locale))
                      .join(', ')}`
                  : ''}
              </p>
            </div>
            {selected.instructions.length > 0 ? (
              <div>
                <p className="text-[13px] font-semibold text-[var(--black)]">{t('howTo')}</p>
                <ol className="mt-2 list-decimal space-y-2 pl-5">
                  {selected.instructions.map((step, index) => (
                    <li
                      key={index}
                      className="text-[14px] font-medium leading-snug text-[var(--ink-soft)]"
                    >
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" onClick={() => quickStartFromExercise(selected)}>
                {locale === 'vi' ? 'Tập nhanh' : 'Quick start'}
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setPickerExercise(selected)}>
                {locale === 'vi' ? 'Thêm vào list' : 'Add to list'}
              </Button>
            </div>
            <Button fullWidth size="lg" onClick={() => setSelected(null)}>
              {t('close')}
            </Button>
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={Boolean(pickerExercise)}
        onClose={() => setPickerExercise(null)}
        title={locale === 'vi' ? 'Thêm vào list của bạn' : 'Add to your list'}
      >
        {pickerExercise ? (
          <div className="space-y-3">
            <Button
              fullWidth
              size="lg"
              onClick={() => {
                const list = createCustomWorkout({
                  title: pickerExercise.name,
                  exerciseIds: [pickerExercise.id],
                  targetSets: 3,
                  targetReps: 10,
                });
                onSaveCustomWorkout(list);
                setPickerExercise(null);
              }}
            >
              {locale === 'vi' ? 'Tạo list mới từ bài này' : 'Create new list from this exercise'}
            </Button>

            {customWorkouts.length === 0 ? (
              <p className="text-[13px] text-[var(--muted)]">
                {locale === 'vi'
                  ? 'Bạn chưa có list tùy chỉnh nào.'
                  : 'You do not have any custom list yet.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {customWorkouts.map((list) => {
                  const exists = list.exerciseIds.includes(pickerExercise.id);
                  return (
                    <li key={list.id} className="rounded-[14px] bg-[var(--surface)] px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-[var(--black)]">
                            {list.title}
                          </p>
                          <p className="text-[12px] text-[var(--muted)]">
                            {list.exerciseIds.length} {locale === 'vi' ? 'bài' : 'exercises'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={exists ? 'secondary' : 'primary'}
                          disabled={exists}
                          onClick={() => addExerciseToList(list, pickerExercise.id)}
                        >
                          {exists ? (locale === 'vi' ? 'Đã có' : 'Added') : (locale === 'vi' ? 'Thêm' : 'Add')}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={gearSheetOpen}
        onClose={() => setGearSheetOpen(false)}
        title={locale === 'vi' ? 'Lọc theo đồ tập' : 'Filter by gear'}
      >
        <ul className="space-y-2">
          {(
            [
              { id: 'my', label: t('myGear'), value: true },
              { id: 'all', label: t('allExercises'), value: false },
            ] as const
          ).map((opt) => {
            const active = onlyMyGear === opt.value;
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOnlyMyGear(opt.value);
                    setVisibleCount(PAGE);
                    setGearSheetOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-[var(--radius-xl)] px-4 py-3.5 text-left shadow-[var(--shadow-sm)] active:scale-[0.985]',
                    active
                      ? 'bg-[var(--accent-mist)] ring-2 ring-[var(--accent)]/25'
                      : 'bg-[var(--surface)]',
                  )}
                >
                  <span className="text-[15px] font-semibold text-[var(--black)]">
                    {opt.label}
                  </span>
                  {active ? (
                    <span className="text-[13px] font-semibold text-[var(--accent)]">✓</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        {onEditGear ? (
          <button
            type="button"
            onClick={() => {
              setGearSheetOpen(false);
              onEditGear();
            }}
            className="mt-4 w-full rounded-[var(--radius-xl)] bg-[var(--white)] px-4 py-3.5 text-center text-[15px] font-semibold text-[var(--accent)] shadow-[var(--shadow-sm)]"
          >
            {t('editGear')}
          </button>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={muscleSheetOpen}
        onClose={() => setMuscleSheetOpen(false)}
        title={locale === 'vi' ? 'Nhóm cơ' : 'Muscle group'}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => selectMuscle(null)}
            className={cn(
              'relative h-[112px] overflow-hidden rounded-[20px] text-left shadow-[var(--shadow-sm)] active:scale-[0.98]',
              !muscle && 'ring-2 ring-[var(--accent)]',
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)] to-[var(--tone-sky-to)]" />
            <div className="relative flex h-full flex-col justify-end p-3">
              <p className="text-[14px] font-semibold text-white">{t('allMuscles')}</p>
            </div>
          </button>
          {muscleTileItems.map((tile) => {
            const active = muscle === tile.id;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => selectMuscle(tile.id)}
                className={cn(
                  'relative h-[112px] overflow-hidden rounded-[20px] text-left shadow-[var(--shadow-sm)] active:scale-[0.98]',
                  active && 'ring-2 ring-[var(--accent)]',
                )}
              >
                {tile.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tile.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[var(--surface)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="relative flex h-full flex-col justify-end p-3">
                  <p className="text-[14px] font-semibold text-white">
                    {muscleLabel(tile.id, locale)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </BottomSheet>

      <BottomSheet
        open={equipmentSheetOpen}
        onClose={() => setEquipmentSheetOpen(false)}
        title={locale === 'vi' ? 'Loại dụng cụ' : 'Equipment type'}
      >
        <ul className="space-y-2">
          <li>
            <button
              type="button"
              onClick={() => {
                setEquipment(null);
                setVisibleCount(PAGE);
                setEquipmentSheetOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-[var(--radius-xl)] px-4 py-3.5 text-left shadow-[var(--shadow-sm)] active:scale-[0.985]',
                !equipment
                  ? 'bg-[var(--accent-mist)] ring-2 ring-[var(--accent)]/25'
                  : 'bg-[var(--surface)]',
              )}
            >
              <span className="text-[15px] font-semibold text-[var(--black)]">
                {t('anyType')}
              </span>
              {!equipment ? (
                <span className="text-[13px] font-semibold text-[var(--accent)]">✓</span>
              ) : null}
            </button>
          </li>
          {equipmentFilters.map((item) => {
            const active = equipment === item;
            return (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => {
                    setEquipment(item);
                    setVisibleCount(PAGE);
                    setEquipmentSheetOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-[var(--radius-xl)] px-4 py-3.5 text-left capitalize shadow-[var(--shadow-sm)] active:scale-[0.985]',
                    active
                      ? 'bg-[var(--accent-mist)] ring-2 ring-[var(--accent)]/25'
                      : 'bg-[var(--surface)]',
                  )}
                >
                  <span className="text-[15px] font-semibold text-[var(--black)]">{item}</span>
                  {active ? (
                    <span className="text-[13px] font-semibold text-[var(--accent)]">✓</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </div>
  );
}
