'use client';

import { useRef } from 'react';
import { cn } from '@/lib/cn';

type HScrollProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

/** Horizontal rail that works with touch swipe AND mouse drag on desktop. */
export function HScroll({ children, className, contentClassName }: HScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    active: boolean;
    startX: number;
    scrollLeft: number;
    moved: boolean;
    pointerId: number | null;
  }>({ active: false, startX: 0, scrollLeft: 0, moved: false, pointerId: null });

  return (
    <div
      ref={ref}
      className={cn(
        '-mx-5 overflow-x-auto overflow-y-hidden px-5 pb-1 hide-scrollbar',
        'touch-pan-x cursor-grab active:cursor-grabbing select-none',
        className,
      )}
      style={{ WebkitOverflowScrolling: 'touch' }}
      onPointerDown={(event) => {
        // Only drag from empty track / padding — never steal button clicks.
        const target = event.target as HTMLElement;
        if (target.closest('button, a, input, [role="button"]')) return;
        if (event.pointerType !== 'mouse') return;
        const el = ref.current;
        if (!el) return;
        drag.current = {
          active: true,
          startX: event.clientX,
          scrollLeft: el.scrollLeft,
          moved: false,
          pointerId: event.pointerId,
        };
        el.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!drag.current.active || event.pointerType !== 'mouse') return;
        const el = ref.current;
        if (!el) return;
        const dx = event.clientX - drag.current.startX;
        if (Math.abs(dx) > 6) drag.current.moved = true;
        el.scrollLeft = drag.current.scrollLeft - dx;
      }}
      onPointerUp={() => {
        drag.current.active = false;
        drag.current.pointerId = null;
      }}
      onPointerCancel={() => {
        drag.current.active = false;
        drag.current.pointerId = null;
      }}
    >
      <div className={cn('flex w-max gap-3', contentClassName)}>{children}</div>
    </div>
  );
}
