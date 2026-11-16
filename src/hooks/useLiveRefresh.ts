"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps a screen current without anyone pressing refresh: `refresh` runs every `everyMs` while the tab is visible, as soon as the tab
 * is shown again or the window regains focus, and when another part of the app announces a change (`lgpsm-db-update`). Nothing runs
 * while the tab is hidden, and a refresh that is still running is never started twice. `refresh` should update quietly (no skeleton).
 */
export function useLiveRefresh(refresh: () => void | Promise<unknown>, everyMs = 20_000, enabled = true) {
  const latest = useRef(refresh);
  useEffect(() => { latest.current = refresh; });
  useEffect(() => {
    if (!enabled) return;
    let running = false;
    const run = async () => {
      if (running || document.hidden) return;
      running = true;
      try { await latest.current(); } catch { /* the next tick tries again */ } finally { running = false; }
    };
    const timer = window.setInterval(() => void run(), everyMs);
    const onVisible = () => { if (!document.hidden) void run(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("lgpsm-db-update", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("lgpsm-db-update", onVisible);
    };
  }, [everyMs, enabled]);
}
