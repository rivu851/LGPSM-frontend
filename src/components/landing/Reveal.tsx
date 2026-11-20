"use client";

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import { onIntroDone } from "./introGate";

type Variant = "up" | "left" | "right" | "pop";

/**
 * Brings its content in once, as it scrolls into view: a short fade with a small shift (see "Landing page motion" in globals.scss).
 * `variant` picks the direction; `delay` (ms) staggers neighbouring items. Pass the element's own classes as `className`, so a grid
 * item or a card does not need an extra wrapper.
 */
export default function Reveal({ children, variant = "up", delay = 0, className = "", style: extra, role, as: Tag = "div" }: { children: ReactNode; variant?: Variant; delay?: number; className?: string; style?: CSSProperties; role?: string; as?: ElementType }) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // no observer available: show it on the next frame (reduced-motion visitors are handled in the stylesheet, which shows everything)
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }
    let io: IntersectionObserver | null = null;
    // wait out the landing page's opening animation (if it is playing), so the first screen is seen animating, not already finished
    const stopWaiting = onIntroDone(() => {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setShown(true);
            io?.disconnect();
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
      );
      io.observe(el);
    });
    return () => { stopWaiting(); io?.disconnect(); };
  }, []);

  const style: CSSProperties | undefined = delay || extra ? { ...extra, ...(delay ? { transitionDelay: `${delay}ms` } : {}) } : undefined;
  return (
    <Tag ref={ref} role={role} style={style} className={`reveal reveal-${variant}${shown ? " is-in" : ""}${className ? ` ${className}` : ""}`}>
      {children}
    </Tag>
  );
}
