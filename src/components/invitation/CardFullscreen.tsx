"use client";

import { useEffect, useRef } from "react";

interface Props {
  src: string;
  alt: string;
  onClose: () => void;
}

/**
 * The guest's card shown as large as the screen allows, on a plain white surround, so the QR code is big, sharp and
 * has the quiet border scanners need. The screen is kept awake while it is open (a dimming phone at the gate is the
 * usual reason a scan fails). Esc, the Close button or a tap on the card closes it.
 */
export default function CardFullscreen({ src, alt, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    // Ask the browser for true full screen where it exists (hides the address bar); the overlay works without it
    try { void document.documentElement.requestFullscreen?.().catch(() => undefined); } catch { /* not supported, e.g. iPhone Safari */ }

    // keep the screen from dimming while the card is up; it is released automatically when the page is hidden, so ask again on return
    let lock: { release: () => Promise<void> } | null = null;
    const keepAwake = async () => {
      try {
        lock = (await (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen")) ?? null;
      } catch { /* refused or unsupported: the card still works */ }
    };
    void keepAwake();
    const onVisible = () => { if (document.visibilityState === "visible") void keepAwake(); };
    document.addEventListener("visibilitychange", onVisible);

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    // leaving browser full screen with its own gesture also closes the overlay
    const onFsChange = () => { if (!document.fullscreenElement) onClose(); };
    document.addEventListener("fullscreenchange", onFsChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFsChange);
      void lock?.release().catch(() => undefined);
      try { if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); } catch { /* already out */ }
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Your card, full screen" className="fixed inset-0 z-[100] flex flex-col bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-black/10">
        <p className="text-sm text-gray-600">Hold your screen steady and raise the brightness for the scan.</p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          Close
        </button>
      </div>
      {/* the card takes all the room left, never cropped and never stretched */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-3" onClick={onClose}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="max-h-full max-w-full object-contain select-none" draggable={false} />
      </div>
    </div>
  );
}
