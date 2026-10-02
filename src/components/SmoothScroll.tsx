"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Refs to items created inside the deferred callback so cleanup can reach them
    let lenis: Lenis | null = null;
    let rafCallback: ((time: number) => void) | null = null;

    const initLenis = () => {
      lenis = new Lenis({
        duration: 0.9,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.8,
      });

      lenis.on("scroll", ScrollTrigger.update);

      rafCallback = (time: number) => lenis!.raf(time * 1000);
      gsap.ticker.add(rafCallback);
      gsap.ticker.lagSmoothing(0);

      // Measure all trigger positions now that everything is loaded and painted
      ScrollTrigger.refresh();
    };

    // Defer Lenis + GSAP ticker start until after window.load + one RAF.
    // During load the browser is busy (JS parse, image decode, 9+ useEffect calls)
    // and every RAF frame exceeds 16ms. Starting Lenis here causes those dropped
    // frames to show as scroll lag. After load the page is idle → instant 60fps.
    const start = () => requestAnimationFrame(initLenis);

    if (document.readyState === "complete") {
      start();
    } else {
      window.addEventListener("load", start, { once: true });
    }

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("load", start);
      window.removeEventListener("resize", onResize);
      if (rafCallback) gsap.ticker.remove(rafCallback);
      if (lenis) lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
