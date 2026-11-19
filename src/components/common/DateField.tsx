"use client";

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A date field with its own calendar (not the browser's): the same look everywhere, month and year pickers, "Today" and "Clear", days outside
// the allowed range greyed out, and the days between a "From" and a "To" shaded. The value is "YYYY-MM-DD" (empty = no date).

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (v?: string): { y: number; m: number; d: number } | null => {
  const hit = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
  return hit ? { y: +hit[1], m: +hit[2] - 1, d: +hit[3] } : null;
};
const todayIso = () => { const t = new Date(); return iso(t.getFullYear(), t.getMonth(), t.getDate()); };
const show = (v: string) => { const p = parse(v); return p ? `${p.d} ${MONTHS[p.m].slice(0, 3)}, ${p.y}` : ""; };

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** shown while empty, and used as the field's name for screen readers ("From", "To") */
  placeholder: string;
  min?: string;
  max?: string;
  /** shade the days between two dates (the other end of a From/To pair) */
  rangeFrom?: string;
  rangeTo?: string;
  title?: string;
  className?: string;
  disabled?: boolean;
  /** a shorter field (36px) for tight toolbars */
  compact?: boolean;
}

export default function DateField({ value, onChange, placeholder, min, max, rangeFrom, rangeTo, title, className = "", disabled = false, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<{ y: number; m: number }>(() => { const p = parse(value) ?? parse(todayIso())!; return { y: p.y, m: p.m }; });
  const [mode, setMode] = useState<"days" | "months">("days");
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  const openPanel = () => {
    if (disabled) return;
    const p = parse(value) ?? parse(todayIso())!;
    setView({ y: p.y, m: p.m });
    setMode("days");
    setOpen(true);
  };
  const close = useCallback((refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus(); }, []);

  // placed under the field (above it when there is no room), kept on screen
  useLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return;
    const t = trigger.current.getBoundingClientRect();
    const w = panel.current.offsetWidth;
    const h = panel.current.offsetHeight;
    const left = Math.max(8, Math.min(t.left, window.innerWidth - w - 8));
    const top = t.bottom + 6 + h > window.innerHeight - 8 && t.top - h - 6 > 8 ? t.top - h - 6 : t.bottom + 6;
    setPos({ left, top });
  }, [open, view, mode]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panel.current?.contains(e.target as Node) || trigger.current?.contains(e.target as Node)) return;
      close(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    const onScroll = (e: Event) => { if (!panel.current?.contains(e.target as Node)) close(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", () => close(false), { once: true });
    window.addEventListener("scroll", onScroll, true);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey, true); window.removeEventListener("scroll", onScroll, true); };
  }, [open, close]);

  const first = new Date(view.y, view.m, 1).getDay();
  const count = new Date(view.y, view.m + 1, 0).getDate();
  const cells: Array<number | null> = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const outside = (d: number) => { const v = iso(view.y, view.m, d); return (!!min && v < min) || (!!max && v > max); };
  const move = (delta: number) => setView((v) => { const n = v.m + delta; return { y: v.y + Math.floor(n / 12), m: ((n % 12) + 12) % 12 }; });
  const pick = (v: string) => { onChange(v); close(); };
  const today = todayIso();
  const lo = rangeFrom && rangeTo ? (rangeFrom <= rangeTo ? rangeFrom : rangeTo) : "";
  const hi = rangeFrom && rangeTo ? (rangeFrom <= rangeTo ? rangeTo : rangeFrom) : "";
  const years = Array.from({ length: 16 }, (_, i) => view.y - 8 + i);

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          ref={trigger}
          type="button"
          onClick={() => (open ? close(false) : openPanel())}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          aria-label={value ? `${placeholder}: ${show(value)}` : placeholder}
          title={title}
          className={`w-full ${compact ? "h-9 bg-white" : "h-[47px] bg-[#FAFAFA]"} flex items-center gap-2 pl-3 ${value ? "pr-9" : "pr-3"} border border-[#E0E0E0] rounded-md text-xs font-medium text-left cursor-pointer hover:border-[#BDBDBD] focus:outline-none focus-visible:border-black disabled:opacity-60 disabled:cursor-not-allowed ${open ? "!border-black" : ""}`}
        >
          <span className={`flex-1 min-w-0 truncate ${value ? "text-[#15191C]" : "text-[#6B6B6B]"}`}>{value ? show(value) : placeholder}</span>
          <svg className="size-[18px] shrink-0 text-[#4B4F52] opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
        </button>
        {value && !disabled && (
          <button type="button" onClick={() => onChange("")} aria-label={`Clear ${placeholder} date`} className="absolute right-8 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-full text-[#4B4F52] hover:bg-gray-200 cursor-pointer">
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={panel}
          id={id}
          role="dialog"
          aria-label={`Choose ${placeholder} date`}
          className="fixed z-[200] w-[292px] rounded-xl border border-[#E0E0E0] bg-white p-3 shadow-2xl"
          style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, visibility: pos ? "visible" : "hidden" }}
        >
          <div className="flex items-center justify-between pb-2">
            <button type="button" onClick={() => (mode === "months" ? setView((v) => ({ ...v, y: v.y - 16 })) : move(-1))} aria-label={mode === "months" ? "Earlier years" : "Previous month"} className="size-8 flex items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button type="button" onClick={() => setMode((m) => (m === "days" ? "months" : "days"))} aria-live="polite" className="px-3 py-1.5 rounded-md text-sm font-semibold text-[#15191C] hover:bg-gray-100 cursor-pointer inline-flex items-center gap-1.5">
              {mode === "days" ? `${MONTHS[view.m]} ${view.y}` : `${years[0]} – ${years[years.length - 1]}`}
              <svg className={`size-3.5 transition-transform ${mode === "months" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <button type="button" onClick={() => (mode === "months" ? setView((v) => ({ ...v, y: v.y + 16 })) : move(1))} aria-label={mode === "months" ? "Later years" : "Next month"} className="size-8 flex items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {mode === "days" ? (
            <>
              <div className="grid grid-cols-7 text-center text-[11px] font-medium text-[#6B6B6B] pb-1">{WEEK.map((d) => <span key={d} className="py-1">{d}</span>)}</div>
              <div className="grid grid-cols-7 gap-y-0.5" role="grid">
                {cells.map((d, i) => {
                  if (d === null) return <span key={`b${i}`} />;
                  const v = iso(view.y, view.m, d);
                  const selected = v === value;
                  const off = outside(d);
                  const inRange = !!lo && v > lo && v < hi;
                  return (
                    <button
                      key={v}
                      type="button"
                      disabled={off}
                      onClick={() => pick(v)}
                      aria-label={show(v)}
                      aria-pressed={selected}
                      aria-current={v === today ? "date" : undefined}
                      className={`h-9 text-sm rounded-md cursor-pointer disabled:cursor-not-allowed disabled:text-[#C9C9C9] ${
                        selected ? "bg-[#C65318] text-white font-semibold" : inRange ? "bg-[#FFF1EA] text-[#15191C] rounded-none hover:bg-[#FFE3D7]" : "text-[#15191C] hover:bg-gray-100"
                      } ${v === today && !selected ? "ring-1 ring-inset ring-[#C65318] font-semibold" : ""}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div>
              <div className="grid grid-cols-4 gap-1 pb-2">
                {years.map((y) => (
                  <button key={y} type="button" onClick={() => setView((v) => ({ ...v, y }))} className={`h-8 text-xs rounded-md cursor-pointer ${y === view.y ? "bg-[#C65318] text-white font-semibold" : "hover:bg-gray-100 text-[#15191C]"}`}>{y}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1 border-t border-[#EEE] pt-2">
                {MONTHS.map((name, m) => (
                  <button key={name} type="button" onClick={() => { setView((v) => ({ ...v, m })); setMode("days"); }} className={`h-9 text-sm rounded-md cursor-pointer ${m === view.m ? "bg-[#FFF1EA] text-[#C44200] font-semibold" : "hover:bg-gray-100 text-[#15191C]"}`}>{name.slice(0, 3)}</button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-[#EEE] flex items-center justify-between">
            <button type="button" onClick={() => pick("")} disabled={!value} className="px-2 py-1 text-xs font-semibold text-[#6B6B6B] hover:text-black disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">Clear</button>
            <button type="button" onClick={() => { if (!((min && today < min) || (max && today > max))) pick(today); }} disabled={(!!min && today < min) || (!!max && today > max)} className="px-2 py-1 text-xs font-semibold text-[#C44200] hover:underline disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">Today</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
