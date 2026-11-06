"use client";

import React, { useEffect, useRef } from "react";
import animationData from "./animations/send-success.json";

/**
 * The success tick, played once with Lottie (the light player: no expressions and no eval, so it runs under the site's
 * content security policy). People who ask for less motion see the finished tick straight away.
 */
export default function SuccessAnimation({ size = 120 }: { size?: number }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let destroyed = false;
    let instance: { destroy: () => void; goToAndStop: (v: number, isFrame?: boolean) => void } | null = null;
    import("lottie-web/build/player/lottie_light").then((mod) => {
      if (destroyed || !host.current) return;
      const lottie = (mod as unknown as { default: { loadAnimation: (o: object) => typeof instance } }).default;
      const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      instance = lottie.loadAnimation({ container: host.current, renderer: "svg", loop: false, autoplay: !reduce, animationData });
      if (reduce) instance?.goToAndStop((animationData as { op: number }).op - 1, true);
    });
    return () => { destroyed = true; instance?.destroy(); };
  }, []);
  return <div ref={host} aria-hidden style={{ width: size, height: size }} className="mx-auto" />;
}
