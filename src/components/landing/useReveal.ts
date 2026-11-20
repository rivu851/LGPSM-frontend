"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { onIntroDone } from "./introGate";

export type RevealVariant = "up" | "left" | "right" | "pop";

/**
 * The scroll reveal of the public pages as a hook, for elements that already carry their own ref and classes: pass the returned ref as `ref`,
 * spread `style` onto the element and put `className` in front of its own classes. Same motion as <Reveal> (see "Landing page motion" in globals.scss).
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(variant: RevealVariant = "up", delay = 0) {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
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

  const style: CSSProperties | undefined = delay ? { transitionDelay: `${delay}ms` } : undefined;
  return [ref, { style, className: `reveal reveal-${variant}${shown ? " is-in" : ""}` }] as const;
}
