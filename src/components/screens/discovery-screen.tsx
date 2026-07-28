'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { BottomSheet, Button, Card, SearchBar, WorkoutCard } from '@/components/ui';
import { HScroll } from '@/components/ui/h-scroll';
import {
  catalogStats,
  equipmentFilters,
  muscleFilters,
  searchExercises,
  type CatalogExercise,
} from '@/data/exercises/catalog';
import { moods, toneStyles, workouts, type WorkoutMood } from '@/data/workouts';
import {
  formatGearSummary,
  type UserPreferences,
} from '@/lib/preferences-store';
import { muscleLabel, translate } from '@/lib/i18n';

type DiscoveryScreenProps = {
  onStartWorkout: (workoutId: string) => void;
  favoriteIds: string[];
  onToggleFavorite: (workoutId: string) => void;
  preferences: UserPreferences;
  onEditGear?: () => void;
};

const PAGE = 20;

export function DiscoveryScreen({
  onStartWorkout,
  favoriteIds,
  onToggleFavorite,
  preferences,
  onEditGear,
}: DiscoveryScreenProps) {
  const locale = preferences.locale;
  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);

  const [query, setQuery] = useState('');
  const [activeMood, setActiveMood] = useState<WorkoutMood>('All');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [onlyMyGear, setOnlyMyGear] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [selected, setSelected] = useState<CatalogExercise | null>(null);

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
        availableGearIds: onlyMyGear ? preferences.availableGearIds : undefined,
        limit: visibleCount,
        offset: 0,
      }),
    [query, muscle, equipment, onlyMyGear, preferences.availableGearIds, visibleCount],
  );

  const collections = [
    { id: 'peak', title: locale === 'vi' ? 'Giờ cao điểm' : 'Gym peak hours', count: 4, tone: 'slate' as const },
    { id: 'travel', title: locale === 'vi' ? 'Đi du lịch' : 'Travel ready', count: 3, tone: 'mist' as const },
    { id: 'pump', title: locale === 'vi' ? 'Pump 45 phút' : '45-min pump', count: 5, tone: 'sky' as const },
  ];

  return (
    <div className="relative space-y-6 fade-in">
      <div
        className="ambient-blob -left-20 top-4 h-52 w-52 bg-[var(--blob)]/35"
        aria-hidden
      />

      <header className="relative overflow-hidden rounded-[var(--radius-2xl)] bg-gradient-to-br from-[var(--tone-sky-from)] via-[var(--tone-sky-via)] to-[var(--tone-sky-to)] p-5 shadow-[var(--shadow-md)]">
        <div
          className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--white)]/50 blur-2xl"
          aria-hidden
        />
        <p className="relative text-[var(--text-sm)] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
          {t('discover')}
        </p>
        <h1 className="relative mt-2 text-[34px] font-semibold leading-[1.05] tracking-[var(--tracking-snug)] text-[var(--black)]">
          {t('freshSessions')}
        </h1>
        <p className="relative mt-2 max-w-[20rem] text-[var(--text-md)] font-medium text-[var(--ink-soft)]">
          {t('exercisesCount', { count: stats.total })} · {t('gearLabel')}:{' '}
          {formatGearSummary(preferences.availableGearIds, locale)}
        </p>
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
                  ? 'bg-[var(--black)] text-white shadow-[var(--shadow-sm)]'
                  : 'bg-[var(--white)] text-[var(--muted)] shadow-[var(--shadow-sm)]',
              )}
            >
              {mood}
            </button>
          );
        })}
      </HScroll>

      <section className="space-y-3">
        <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
          {t('collections')}
        </h2>
        <HScroll>
          {collections.map((item) => {
            const tone = toneStyles[item.tone];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setActiveMood(
                    item.id === 'travel'
                      ? 'Travel'
                      : item.id === 'pump'
                        ? '45 min'
                        : 'All',
                  )
                }
                className={cn(
                  'relative h-[120px] w-[160px] shrink-0 overflow-hidden rounded-[var(--radius-xl)] p-4 text-left shadow-[var(--shadow-md)] active:scale-[0.98]',
                  'bg-gradient-to-br',
                  tone.wash,
                )}
              >
                <p className="relative text-[16px] font-semibold leading-snug text-[var(--black)]">
                  {item.title}
                </p>
                <p className="relative mt-auto pt-6 text-[12px] font-medium text-[var(--muted)]">
                  {item.count} workouts
                </p>
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
          <ul className="space-y-2.5">
            {filtered.map((workout) => {
              const saved = favoriteIds.includes(workout.id);
              return (
                <li key={workout.id} className="space-y-1.5">
                  <WorkoutCard
                    workout={workout}
                    onStart={() => onStartWorkout(workout.id)}
                  />
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(workout.id)}
                    className={cn(
                      'ml-1 text-[13px] font-semibold',
                      saved ? 'text-[var(--accent)]' : 'text-[var(--muted)]',
                    )}
                  >
                    {saved ? `★ ${t('saved')}` : `☆ ${t('save')}`}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
            {t('exerciseLibrary')}
          </h2>
          <span className="text-[var(--text-sm)] font-medium text-[var(--ink-soft)]">
            {exerciseResult.total}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setOnlyMyGear(true);
              setVisibleCount(PAGE);
            }}
            className={cn(
              'rounded-full px-3.5 py-2 text-[13px] font-semibold',
              onlyMyGear
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--white)] text-[var(--black)] shadow-[var(--shadow-sm)]',
            )}
          >
            {t('myGear')}
          </button>
          <button
            type="button"
            onClick={() => {
              setOnlyMyGear(false);
              setVisibleCount(PAGE);
            }}
            className={cn(
              'rounded-full px-3.5 py-2 text-[13px] font-semibold',
              !onlyMyGear
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--white)] text-[var(--black)] shadow-[var(--shadow-sm)]',
            )}
          >
            {t('allExercises')}
          </button>
          {onEditGear ? (
            <button
              type="button"
              onClick={onEditGear}
              className="rounded-full bg-[var(--white)] px-3.5 py-2 text-[13px] font-semibold text-[var(--accent)] shadow-[var(--shadow-sm)]"
            >
              {t('editGear')}
            </button>
          ) : null}
        </div>

        {/* Muscle chips — wrap so clicks always work */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setMuscle(null);
              setVisibleCount(PAGE);
            }}
            className={cn(
              'rounded-full px-3.5 py-2 text-[13px] font-semibold',
              !muscle
                ? 'bg-[var(--black)] text-white'
                : 'bg-[var(--white)] text-[var(--black)] shadow-[var(--shadow-sm)]',
            )}
          >
            {t('allMuscles')}
          </button>
          {muscleFilters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMuscle(item === muscle ? null : item);
                setVisibleCount(PAGE);
              }}
              className={cn(
                'rounded-full px-3.5 py-2 text-[13px] font-semibold',
                muscle === item
                  ? 'bg-[var(--black)] text-white'
                  : 'bg-[var(--white)] text-[var(--black)] shadow-[var(--shadow-sm)]',
              )}
            >
              {muscleLabel(item, locale)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setEquipment(null);
              setVisibleCount(PAGE);
            }}
            className={cn(
              'rounded-full px-3.5 py-2 text-[13px] font-semibold',
              !equipment
                ? 'bg-[var(--surface)] text-[var(--black)] ring-1 ring-[var(--border)]'
                : 'bg-[var(--white)] text-[var(--black)] shadow-[var(--shadow-sm)]',
            )}
          >
            {t('anyType')}
          </button>
          {equipmentFilters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setEquipment(item === equipment ? null : item);
                setVisibleCount(PAGE);
              }}
              className={cn(
                'rounded-full px-3.5 py-2 text-[13px] font-semibold capitalize',
                equipment === item
                  ? 'bg-[var(--black)] text-white'
                  : 'bg-[var(--white)] text-[var(--black)] shadow-[var(--shadow-sm)]',
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <ul className="space-y-2">
          {exerciseResult.items.map((exercise) => (
            <li key={exercise.id}>
              <button
                type="button"
                onClick={() => setSelected(exercise)}
                className="flex w-full items-center gap-3 rounded-[var(--radius-xl)] bg-[var(--white)] p-3 text-left shadow-[var(--shadow-md)] active:scale-[0.985]"
              >
                {exercise.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={exercise.image}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-[14px] object-cover bg-[var(--surface)]"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-[14px] bg-[var(--surface)]" />
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
                </div>
                <span className="shrink-0 text-[12px] font-semibold text-[var(--accent)]">
                  {t('view')}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {visibleCount < exerciseResult.total ? (
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            onClick={() => setVisibleCount((count) => count + PAGE)}
          >
            {t('showMore')} ({Math.min(PAGE, exerciseResult.total - visibleCount)})
          </Button>
        ) : null}
      </section>

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
            <Button fullWidth size="lg" onClick={() => setSelected(null)}>
              {t('close')}
            </Button>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
