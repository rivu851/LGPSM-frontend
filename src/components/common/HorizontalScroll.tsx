"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

// Horizontal scroller with an always-visible track (Figma: 7px #E3E3E3 rounded bar).
// Native scrollbars are overlay/auto-hiding on many systems, so the bar is drawn explicitly and kept
// in sync with the scroll position. It only appears when the content is wider than the container.
// A drag that starts on the scroll bar and ends somewhere else still makes the browser fire a click, on whatever element contains
// both ends: often a card that opens a page when clicked. That click is not wanted, so the first one after a real drag is swallowed.
function swallowNextClick() {
  const stop = (e: MouseEvent) => { e.stopPropagation(); e.preventDefault(); };
  window.addEventListener("click", stop, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 400);
}

export default function HorizontalScroll({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ ratio: 1, offset: 0 });
  const drag = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const ratio = el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1;
    const max = el.scrollWidth - el.clientWidth;
    setMetrics({ ratio: Math.min(1, ratio), offset: max > 0 ? el.scrollLeft / max : 0 });
  }, []);

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [measure]);

  const scrollToTrackX = (clientX: number) => {
    const el = scroller.current;
    const t = track.current;
    if (!el || !t) return;
    const rect = t.getBoundingClientRect();
    const pos = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    el.scrollLeft = pos * el.scrollWidth - el.clientWidth / 2;
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const el = scroller.current;
      const t = track.current;
      if (!drag.current || !el || !t) return;
      const delta = (e.clientX - drag.current.startX) / t.clientWidth;
      if (Math.abs(e.clientX - drag.current.startX) > 3) drag.current.moved = true;
      el.scrollLeft = drag.current.startScroll + delta * el.scrollWidth;
    };
    const up = () => {
      if (drag.current?.moved) swallowNextClick();
      drag.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const overflowing = metrics.ratio < 0.999;
  const thumbWidth = `${Math.max(12, metrics.ratio * 100)}%`;
  const thumbLeft = `${metrics.offset * (100 - Math.max(12, metrics.ratio * 100))}%`;

  return (
    <div className={className}>
      <div ref={scroller} onScroll={measure} className="overflow-x-auto no-scrollbar" tabIndex={overflowing ? 0 : undefined}>
        {children}
      </div>
      {overflowing && (
        <div
          ref={track}
          data-testid="hscroll-track"
          // the bar is a control: clicking it never counts as a click on whatever contains it
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            if (e.target === track.current) scrollToTrackX(e.clientX);
          }}
          className="relative mt-2 h-[7px] rounded-full bg-[#E3E3E3] cursor-pointer"
        >
          <div
            onPointerDown={(e) => {
              e.preventDefault();
              drag.current = { startX: e.clientX, startScroll: scroller.current?.scrollLeft || 0, moved: false };
            }}
            className="absolute top-0 h-full rounded-full bg-[#B5B5B5] hover:bg-[#9A9A9A] cursor-grab active:cursor-grabbing"
            style={{ width: thumbWidth, left: thumbLeft }}
          />
        </div>
      )}
    </div>
  );
}
