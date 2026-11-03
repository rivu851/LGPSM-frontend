"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export default function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const pathname = usePathname();

  // 1. Auto-hiding scrollbar: mark only the element being scrolled. The page-level scrollbar is
  // hidden in CSS, so window scrolls need no work at all.
  useEffect(() => {
    let active: Element | null = null;
    let scrollTimeout: ReturnType<typeof setTimeout> | undefined;

    const handleScroll = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Element) || target === document.documentElement) return;

      if (active !== target) {
        active?.classList.remove("is-scrolling");
        active = target;
        target.classList.add("is-scrolling");
      }

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        active?.classList.remove("is-scrolling");
        active = null;
      }, 900);
    };

    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });

    return () => {
      clearTimeout(scrollTimeout);
      active?.classList.remove("is-scrolling");
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, []);

  // 2. A short entrance on route change. It must never hold content back: the page is already visible at the start, the
  // fade is quick, and nothing is staggered (a staggered reveal of dozens of blocks kept the last ones hidden for over a second
  // after every click, before the page data had even arrived). Skipped entirely for people who prefer reduced motion.
  useEffect(() => {
    const mainEl = document.querySelector<HTMLElement>("[data-page-reveal]");
    if (!mainEl) return;

    mainEl.scrollTop = 0;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        mainEl,
        { opacity: 0.6, y: 4 },
        { opacity: 1, y: 0, duration: 0.16, ease: "power1.out", clearProps: "all" }
      );
    });

    return () => ctx.revert();
  }, [pathname]);

  return <>{children}</>;
}
