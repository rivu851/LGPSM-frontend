"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export default function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  // 1. Initialize Lenis & Auto-Hiding Scrollbar (without blocking inner container scrolling)
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 2.0,
      prevent: (node) => {
        // Prevent Lenis from hijacking wheel events inside inner overflow containers
        return !!(
          node instanceof HTMLElement &&
          node.closest &&
          (node.closest(".overflow-y-auto") ||
            node.closest("main") ||
            node.closest("aside") ||
            node.closest(".overflow-x-auto"))
        );
      },
    });

    lenisRef.current = lenis;

    const updateRaf = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateRaf);
    gsap.ticker.lagSmoothing(0);

    // Auto-hide scrollbar logic: show when scrolling any element, fade out smoothly when stopped
    let scrollTimeout: NodeJS.Timeout;

    const triggerScrollIndicator = (target?: HTMLElement | null) => {
      document.body.classList.add("is-scrolling");
      document.documentElement.classList.add("is-scrolling");

      if (target && target.classList) {
        target.classList.add("is-scrolling");
      }

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        document.body.classList.remove("is-scrolling");
        document.documentElement.classList.remove("is-scrolling");
        if (target && target.classList) {
          target.classList.remove("is-scrolling");
        }
      }, 900);
    };

    const handleWindowScroll = (e: Event) => {
      triggerScrollIndicator(e.target as HTMLElement);
    };

    const handleLenisScroll = () => {
      triggerScrollIndicator();
    };

    lenis.on("scroll", handleLenisScroll);
    window.addEventListener("scroll", handleWindowScroll, { capture: true, passive: true });

    return () => {
      clearTimeout(scrollTimeout);
      gsap.ticker.remove(updateRaf);
      window.removeEventListener("scroll", handleWindowScroll, { capture: true });
      lenis.destroy();
      lenisRef.current = null;
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
