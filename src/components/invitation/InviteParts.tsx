"use client";

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

/** Small line icons for the access card (24 x 24, drawn with the surrounding text colour) */
const PATHS = {
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  pin: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z",
  building: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01",
  phone: "M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.2 3.6a1 1 0 01-.5 1.2l-2.1 1.05a11.04 11.04 0 005.12 5.12l1.05-2.1a1 1 0 011.2-.5l3.6 1.2a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.16 21 3 14.84 3 7V5z",
  reply: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6",
  food: "M7 3v8a2 2 0 002 2v8M11 3v6a2 2 0 01-2 2M5 3v6a2 2 0 002 2M17 21V3c-2.5 1.5-4 4.5-4 8h4",
  qr: "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z",
  clock: "M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z",
  check: "M5 13l4 4L19 7",
  info: "M12 11v5m0-8.5v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21a8 8 0 0116 0",
  shield: "M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3zm-3 9l2 2 4-4",
  sessions: "M4 6h16M4 12h10M4 18h6",
  checkCircle: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  xCircle: "M10 14l4-4m0 4l-4-4m11 2a9 9 0 11-18 0 9 9 0 0118 0z",
  send: "M5 12h14m-6-6l6 6-6 6",
  external: "M14 4h6v6m0-6L10 14M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5",
} as const;
export type IconName = keyof typeof PATHS;

export function Ico({ name, className = "size-[18px]", stroke = 2 }: { name: IconName; className?: string; stroke?: number }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}

/**
 * The small round "i": it opens a short, plain explanation of what the thing beside it is or what the guest has to do.
 * A real button (keyboard and screen reader friendly); closes on Escape or a tap outside.
 */
export function InfoHint({ title, children, align = "left" }: { title: string; children: React.ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const pop = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);
  const id = useId();
  // keep the explanation inside the card (or the screen, if narrower): measured when it opens, so it is never cut off at an edge
  useLayoutEffect(() => {
    if (!open || !pop.current) { setShift(0); return; }
    const card = box.current?.closest("[data-inv-card]")?.getBoundingClientRect();
    const left = Math.max(card?.left ?? 0, 0) + 10;
    const right = Math.min(card?.right ?? window.innerWidth, window.innerWidth) - 10;
    const r = pop.current.getBoundingClientRect();
    const natural = r.left - shift;
    setShift(natural + r.width > right ? right - (natural + r.width) : natural < left ? left - natural : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent | TouchEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("touchstart", away);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("touchstart", away); document.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <span ref={box} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`What is this? ${title}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex size-[18px] items-center justify-center rounded-full border text-[11px] font-bold leading-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--inv-accent)] ${open ? "border-[color:var(--inv-accent)] bg-[color:var(--inv-accent)] text-white" : "border-[color:var(--inv-line)] bg-white text-[color:var(--inv-accent-text)] hover:border-[color:var(--inv-accent)]"}`}
      >
        i
      </button>
      {open && (
        <span
          id={id}
          ref={pop}
          role="note"
          style={{ transform: `translateX(${shift}px)` }}
          className={`absolute top-6 z-20 w-60 rounded-2xl border border-[color:var(--inv-line)] bg-white p-3 text-left text-[12px] font-normal normal-case leading-relaxed tracking-normal text-[color:var(--inv-ink)] shadow-xl ${align === "right" ? "right-0" : "left-0"}`}
        >
          <span className="mb-0.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--inv-accent-text)]">{title}</span>
          {children}
        </span>
      )}
    </span>
  );
}

/** The label above a value in a tile */
export function TileLabel({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--inv-accent-text)]">
      <span>{children}</span>
      {hint}
    </p>
  );
}
