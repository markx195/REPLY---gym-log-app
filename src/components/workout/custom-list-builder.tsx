'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BottomSheet, Button, SearchBar } from '@/components/ui';
import { searchExercises, getExerciseById } from '@/data/exercises/catalog';
import { cn } from '@/lib/cn';
import {
  createCustomWorkout,
  type CustomWorkout,
} from '@/lib/custom-workouts-store';
import { translate, type Locale } from '@/lib/i18n';

const PAGE_SIZE = 24;

type CustomListBuilderProps = {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  initial?: CustomWorkout | null;
  onSave: (list: CustomWorkout) => void;
};

export function CustomListBuilder({
  open,
  onClose,
  locale,
  initial,
  onSave,
}: CustomListBuilderProps) {
  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);

  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [exerciseIds, setExerciseIds] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? '');
    setQuery('');
    setExerciseIds(initial?.exerciseIds ?? []);
    setVisibleCount(PAGE_SIZE);
    setError(null);
  }, [open, initial]);

  const result = useMemo(
    () => searchExercises(query, { limit: visibleCount }),
    [query, visibleCount],
  );

  const results = useMemo(
    () => result.items,
    [result],
  );

  const loadMore = () => {
    setVisibleCount((current) => {
      if (current >= result.total) return current;
      return Math.min(current + PAGE_SIZE, result.total);
    });
  };

  const selected = exerciseIds
    .map((id) => getExerciseById(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const toggle = (id: string) => {
    setError(null);
    setExerciseIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const save = () => {
    if (exerciseIds.length === 0) {
      setError(locale === 'vi' ? 'Thêm ít nhất 1 bài tập.' : 'Add at least one exercise.');
      return;
    }
    const list = createCustomWorkout({
      id: initial?.id,
      title: title.trim() || (locale === 'vi' ? 'List của tôi' : 'My list'),
      exerciseIds,
      targetSets: initial?.targetSets ?? 3,
      targetReps: initial?.targetReps ?? 10,
    });
    if (initial) {
      list.createdAt = initial.createdAt;
      list.updatedAt = Date.now();
    }
    onSave(list);
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={initial ? t('editList') : t('createList')}
    >
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-[12px] font-semibold text-[var(--ink-soft)]">
            {t('listName')}
          </span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={locale === 'vi' ? 'VD: Push nhà mình' : 'e.g. My push day'}
            className="h-[var(--control-h)] w-full rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--white)] px-4 text-[16px] text-[var(--black)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          />
        </label>

        {selected.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[12px] font-semibold text-[var(--ink-soft)]">
              {t('exercisesCount', { count: selected.length })}
            </p>
            <ul className="space-y-1.5">
              {selected.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 rounded-[14px] bg-[var(--surface)] px-3 py-2"
                >
                  <span className="w-5 text-[12px] font-semibold tabular-nums text-[var(--muted)]">
                    {index + 1}
                  </span>
                  <span className="flex-1 truncate text-[14px] font-semibold text-[var(--black)]">
                    {item.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className="text-[12px] font-semibold text-[var(--accent)]"
                  >
                    {t('remove')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <SearchBar
          value={query}
          onChange={(value) => {
            setQuery(value);
            setVisibleCount(PAGE_SIZE);
          }}
          placeholder={t('searchExercises')}
        />

        <ul
          ref={listRef}
          onScroll={(event) => {
            if (visibleCount >= result.total) return;
            const node = event.currentTarget;
            const nearBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 80;
            if (nearBottom) loadMore();
          }}
          className="max-h-[42dvh] space-y-1.5 overflow-y-auto"
        >
          {results.map((item) => {
            const on = exerciseIds.includes(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors',
                    on
                      ? 'bg-[var(--accent-mist)] ring-1 ring-[var(--accent)]'
                      : 'bg-[var(--surface)]',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      className="h-10 w-10 rounded-[10px] object-cover bg-[var(--white)]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-[10px] bg-[var(--white)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-[var(--black)]">
                      {item.name}
                    </p>
                    <p className="truncate text-[11px] font-medium text-[var(--ink-soft)]">
                      {item.primaryMuscles[0]} · {item.equipment}
                    </p>
                  </div>
                  <span className="text-[12px] font-semibold text-[var(--accent)]">
                    {on ? t('added') : t('add')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {visibleCount < result.total ? (
          <p className="text-center text-[12px] font-medium text-[var(--muted-light)]">
            {locale === 'vi' ? 'Kéo xuống để tải thêm bài tập…' : 'Scroll down to load more exercises…'}
          </p>
        ) : null}

        {error ? (
          <p className="text-[13px] font-medium text-red-500">{error}</p>
        ) : null}

        <Button fullWidth size="lg" onClick={save}>
          {t('saveList')}
        </Button>
      </div>
    </BottomSheet>
  );
}
