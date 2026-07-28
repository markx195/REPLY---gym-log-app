'use client';

import { useEffect, useMemo, useState } from 'react';
import { BottomSheet, Button, HScroll } from '@/components/ui';
import { CustomListBuilder } from '@/components/workout/custom-list-builder';
import { toneStyles } from '@/data/workouts';
import { cn } from '@/lib/cn';
import type { CustomWorkout } from '@/lib/custom-workouts-store';
import {
  estimateCustomDurationMin,
  customFocusLabel,
  customTone,
  toRecommendableId,
} from '@/lib/custom-workouts-store';
import { translate, type Locale } from '@/lib/i18n';
import {
  getDailyRecommendation,
  type Recommendable,
} from '@/lib/recommendation-engine';
import type { HistorySession } from '@/data/history';
import type { UserPreferences } from '@/lib/preferences-store';
import {
  formatDraftSavedAgo,
  type WorkoutDraft,
} from '@/lib/workout-draft-store';

function greeting(locale: Locale) {
  const hour = new Date().getHours();
  if (locale === 'vi') {
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 17) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

type HomeScreenProps = {
  onStartWorkout: (workoutId: string) => void;
  streak: number;
  history: HistorySession[];
  preferences: UserPreferences;
  customWorkouts: CustomWorkout[];
  onSaveCustomWorkout: (list: CustomWorkout) => void;
  onDeleteCustomWorkout: (id: string) => void;
  draft: WorkoutDraft | null;
  onResumeDraft: () => void;
  onDiscardDraft: () => void;
};

export function HomeScreen({
  onStartWorkout,
  streak,
  history,
  preferences,
  customWorkouts,
  onSaveCustomWorkout,
  onDeleteCustomWorkout,
  draft,
  onResumeDraft,
  onDiscardDraft,
}: HomeScreenProps) {
  const locale = preferences.locale;
  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);

  const baseRec = useMemo(
    () => getDailyRecommendation(history, preferences, customWorkouts),
    [history, preferences, customWorkouts],
  );

  const [pickOverride, setPickOverride] = useState<Recommendable | null>(null);
  const [listsOpen, setListsOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<CustomWorkout | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [savedAgo, setSavedAgo] = useState(() =>
    draft ? formatDraftSavedAgo(draft.savedAt, locale) : '',
  );

  useEffect(() => {
    setPickOverride(null);
  }, [baseRec.pick.id, preferences.locale, customWorkouts.length]);

  useEffect(() => {
    if (!draft) {
      setSavedAgo('');
      return;
    }
    const tick = () => setSavedAgo(formatDraftSavedAgo(draft.savedAt, locale));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [draft, locale]);

  const pick = pickOverride ?? baseRec.pick;
  const reason =
    pickOverride && pickOverride.id !== baseRec.pick.id
      ? locale === 'vi'
        ? 'Lựa chọn khác trong xếp hạng hôm nay.'
        : 'Another strong pick for today.'
      : baseRec.reason;

  const tone = toneStyles[pick.tone];
  const isInk = pick.tone === 'ink';

  const topPicks = baseRec.ranked.slice(0, 3);

  const openCreate = () => {
    setEditing(null);
    setListsOpen(false);
    setBuilderOpen(true);
  };

  const openEdit = (list: CustomWorkout) => {
    setEditing(list);
    setListsOpen(false);
    setBuilderOpen(true);
  };

  return (
    <>
      <div className="relative space-y-6 fade-in">
        <div
          className="ambient-blob -right-16 top-8 h-48 w-48 bg-[var(--accent)]/15"
          aria-hidden
        />

        <header className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-[var(--text-sm)] font-semibold text-[var(--ink-soft)]">
              {greeting(locale)}
            </p>
            <h1 className="mt-1 text-[44px] font-semibold leading-none tracking-[var(--tracking-tight)] text-[var(--black)]">
              REPLY
            </h1>
          </div>
          <div className="mb-1 rounded-[var(--radius-lg)] bg-[var(--white)] px-3.5 py-2.5 text-center shadow-[var(--shadow-md)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
              {t('streak')}
            </p>
            <p className="text-[22px] font-semibold tabular-nums text-[var(--accent)]">
              {streak}
            </p>
          </div>
        </header>



        {draft ? (
          <section className="rounded-[var(--radius-xl)] bg-[var(--accent-mist)] px-4 py-3 shadow-[var(--shadow-sm)]">
            <p className="text-[14px] font-semibold text-[var(--black)]">
              {locale === 'vi' ? 'Bạn có buổi tập đang dang dở' : 'You have an unfinished workout'}
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--ink-soft)]">
              {draft.session.title}
              {savedAgo ? ` · ${savedAgo}` : ''}
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={onResumeDraft}>
                {locale === 'vi' ? 'Tiếp tục' : 'Resume'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setDiscardOpen(true)}>
                {locale === 'vi' ? 'Bỏ bản nháp' : 'Discard'}
              </Button>
            </div>
          </section>
        ) : null}

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[var(--ink-soft)]">{t('forYou')}</p>
          </div>
          <HScroll contentClassName="gap-2">
            {topPicks.map((item) => {
              const active = item.id === pick.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPickOverride(item)}
                  className={cn(
                    'w-[170px] shrink-0 rounded-[16px] border px-3.5 py-3 text-left transition-all',
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-mist)] shadow-[var(--shadow-sm)]'
                      : 'border-transparent bg-[var(--white)] shadow-[var(--shadow-sm)]',
                  )}
                >
                  <p className="line-clamp-1 text-[14px] font-semibold text-[var(--black)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-[var(--ink-soft)]">
                    {item.durationMin} {t('min')} · {item.focus}
                  </p>
                </button>
              );
            })}
          </HScroll>
        </section>

        {/* One hero composition */}
        <button
          type="button"
          onClick={() => onStartWorkout(pick.id)}
          className="group relative w-full overflow-hidden rounded-[var(--radius-2xl)] text-left shadow-[var(--shadow-lg)] transition-transform duration-200 active:scale-[0.985]"
        >
          <div className={cn('absolute inset-0 bg-gradient-to-br', tone.wash)} aria-hidden />
          <div
            className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/35 blur-2xl"
            aria-hidden
          />
          <div className="relative flex min-h-[280px] flex-col justify-between p-6">
            <div className="flex items-start justify-between gap-3">
              <span
                className={cn(
                  'rounded-full px-3 py-1.5 text-[var(--text-xs)] font-semibold uppercase tracking-[0.12em]',
                  isInk ? 'bg-white/15 text-white/80' : 'bg-white/70 text-[var(--accent)]',
                )}
              >
                {pick.source === 'custom' ? t('yourList') : t('today')}
              </span>
              <span
                className={cn(
                  'rounded-full px-3 py-1.5 text-[var(--text-sm)] font-semibold',
                  isInk ? 'bg-white/15 text-white' : 'bg-white/80 text-[var(--black)]',
                )}
              >
                {pick.durationMin} {t('min')}
              </span>
            </div>

            <div className="space-y-3 pt-8">
              <div className={cn('h-1.5 w-10 rounded-full', tone.mark)} />
              <h2
                className={cn(
                  'max-w-[16ch] text-[34px] font-semibold leading-[1.05] tracking-[var(--tracking-snug)]',
                  isInk ? 'text-white' : 'text-[var(--black)]',
                )}
              >
                {pick.title}
              </h2>
              <p
                className={cn(
                  'max-w-[22rem] text-[15px] font-medium leading-snug',
                  isInk ? 'text-white/70' : 'text-[var(--ink-soft)]',
                )}
              >
                {reason}
              </p>
              <p
                className={cn(
                  'text-[13px] font-medium',
                  isInk ? 'text-white/55' : 'text-[var(--muted)]',
                )}
              >
                {pick.focus} · {pick.exercises} {locale === 'vi' ? 'bài' : 'moves'}
              </p>
            </div>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" fullWidth onClick={() => onStartWorkout(pick.id)}>
            {t('startToday')}
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={() => setListsOpen(true)}>
            {t('myLists')}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setListsOpen(true)}
          className="flex w-full items-center justify-between rounded-[var(--radius-xl)] bg-[var(--white)] px-4 py-3.5 text-left shadow-[var(--shadow-md)] active:scale-[0.99]"
        >
          <div>
            <p className="text-[15px] font-semibold text-[var(--black)]">{t('myLists')}</p>
            <p className="mt-0.5 text-[12px] font-medium text-[var(--ink-soft)]">
              {customWorkouts.length === 0
                ? t('createFirstList')
                : t('listsCount', { count: customWorkouts.length })}
            </p>
          </div>
          <span className="text-[13px] font-semibold text-[var(--accent)]">{t('open')}</span>
        </button>

        {customWorkouts.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-[var(--text-xl)] font-semibold text-[var(--black)]">
              {t('myLists')}
            </h2>
            <ul className="space-y-2">
              {customWorkouts.slice(0, 4).map((list) => {
                const listTone = toneStyles[customTone(list)];
                return (
                  <li key={list.id}>
                    <button
                      type="button"
                      onClick={() => onStartWorkout(toRecommendableId(list.id))}
                      className="flex w-full items-center gap-3 overflow-hidden rounded-[var(--radius-xl)] bg-[var(--white)] text-left shadow-[var(--shadow-md)] active:scale-[0.99]"
                    >
                      <div className={cn('h-16 w-16 shrink-0 bg-gradient-to-br', listTone.wash)} />
                      <div className="min-w-0 flex-1 py-2 pr-3">
                        <p className="truncate text-[15px] font-semibold text-[var(--black)]">
                          {list.title}
                        </p>
                        <p className="text-[12px] font-medium text-[var(--ink-soft)]">
                          {customFocusLabel(list, locale)} · {estimateCustomDurationMin(list)}{' '}
                          {t('min')}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      <BottomSheet open={listsOpen} onClose={() => setListsOpen(false)} title={t('myLists')}>
        <div className="space-y-3">
          <Button fullWidth size="lg" onClick={openCreate}>
            {t('createList')}
          </Button>
          {customWorkouts.length === 0 ? (
            <p className="text-[14px] font-medium text-[var(--ink-soft)]">
              {t('createFirstListHint')}
            </p>
          ) : (
            <ul className="space-y-2">
              {customWorkouts.map((list) => (
                <li
                  key={list.id}
                  className="rounded-[var(--radius-lg)] bg-[var(--surface)] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[var(--black)]">
                        {list.title}
                      </p>
                      <p className="mt-0.5 text-[12px] font-medium text-[var(--ink-soft)]">
                        {list.exerciseIds.length} · {estimateCustomDurationMin(list)} {t('min')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartWorkout(toRecommendableId(list.id))}
                      className="shrink-0 text-[13px] font-semibold text-[var(--accent)]"
                    >
                      {t('start')}
                    </button>
                  </div>
                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => openEdit(list)}
                      className="text-[12px] font-semibold text-[var(--ink-soft)]"
                    >
                      {t('edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCustomWorkout(list.id)}
                      className="text-[12px] font-semibold text-red-500"
                    >
                      {t('delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </BottomSheet>

      <CustomListBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        locale={locale}
        initial={editing}
        onSave={onSaveCustomWorkout}
      />

      <BottomSheet
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title={locale === 'vi' ? 'Bỏ bản nháp?' : 'Discard draft?'}
      >
        <div className="space-y-4">
          <p className="text-[15px] text-[var(--muted)]">
            {locale === 'vi'
              ? `Xóa buổi dang dở “${draft?.session.title ?? ''}”. Không thể hoàn tác.`
              : `This removes your unfinished “${draft?.session.title ?? ''}” workout. This can’t be undone.`}
          </p>
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              onDiscardDraft();
              setDiscardOpen(false);
            }}
          >
            {locale === 'vi' ? 'Bỏ bản nháp' : 'Discard draft'}
          </Button>
          <Button variant="secondary" fullWidth size="lg" onClick={() => setDiscardOpen(false)}>
            {locale === 'vi' ? 'Hủy' : 'Cancel'}
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
