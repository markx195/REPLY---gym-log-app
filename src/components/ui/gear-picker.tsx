'use client';

import { cn } from '@/lib/cn';
import {
  gearCatalog,
  gearGroupLabels,
  gearPresetIds,
  type GearItem,
} from '@/data/exercises/gear-catalog';
import {
  gearPresetLabels,
  type GearPreset,
  type Locale,
} from '@/lib/preferences-store';

type GearPickerProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  locale: Locale;
};

const groups: GearItem['group'][] = [
  'free-weights',
  'machines',
  'cables',
  'body',
  'accessories',
];

export function GearPicker({ selectedIds, onChange, locale }: GearPickerProps) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter((item) => item !== id);
      onChange(next.length > 0 ? next : ['body-only']);
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const applyPreset = (preset: GearPreset) => {
    onChange([...gearPresetIds[preset]]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(gearPresetLabels) as GearPreset[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => applyPreset(key)}
            className="rounded-full bg-[var(--surface)] px-3.5 py-2 text-[13px] font-semibold text-[var(--black)]"
          >
            {gearPresetLabels[key][locale]}
          </button>
        ))}
      </div>

      {groups.map((group) => {
        const items = gearCatalog.filter((item) => item.group === group);
        if (items.length === 0) return null;
        return (
          <section key={group} className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-soft)]">
              {gearGroupLabels[group][locale]}
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {items.map((item) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item.id)}
                    className={cn(
                      'rounded-[18px] border-2 p-1 text-left shadow-[var(--shadow-sm)] transition-all active:scale-[0.98]',
                      selected
                        ? 'border-[var(--accent)] bg-[var(--accent-mist)]'
                        : 'border-transparent bg-[var(--white)]',
                    )}
                  >
                    <div className="overflow-hidden rounded-[12px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt=""
                        className="h-[72px] w-full object-cover bg-[var(--surface)]"
                        loading="lazy"
                      />
                    </div>
                    <div className="px-1.5 py-2">
                      <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-[var(--black)]">
                        {item.name[locale]}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-[var(--accent)]">
                        {selected ? (locale === 'vi' ? 'Đã chọn' : 'Selected') : (locale === 'vi' ? 'Chọn' : 'Select')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
