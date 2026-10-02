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

  // 2. Trigger GSAP Smooth Reveal Animations on Route Change
  useEffect(() => {
    const mainEl = document.querySelector<HTMLElement>("[data-page-reveal]");
    if (!mainEl) return;

    mainEl.scrollTop = 0;

    const ctx = gsap.context(() => {
      // Animate the page container itself for a full-page entrance on every navigation
      gsap.fromTo(
        mainEl,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.42,
          ease: "power2.out",
          clearProps: "all",
        }
      );

      // Stagger-reveal key content blocks for depth — runs in parallel with the container fade
      const staggerTargets = mainEl.querySelectorAll(
        "h1, h2, h3, " +
        "table, " +
        ".grid > div, " +
        "[data-reveal], " +
        "section, " +
        "form > div, " +
        "[class*='rounded'] > [class*='border'], " +
        ".card"
      );

      if (staggerTargets.length > 0 && staggerTargets.length <= 40) {
        gsap.fromTo(
          staggerTargets,
          { opacity: 0, y: 6 },
          {
            opacity: 1,
            y: 0,
            duration: 0.3,
            stagger: 0.025,
            ease: "power2.out",
            delay: 0.08,
            clearProps: "all",
          }
        );
      }
    });

    return () => ctx.revert();
  }, [pathname]);

  return <>{children}</>;
}
