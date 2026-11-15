"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * A device emulator for the card preview. Each device has its real screen size in CSS px, its own look (the bezel, the camera cut-out,
 * the home button or home bar, the side buttons) and is drawn at one common scale, so a tablet really is bigger than a phone, unless
 * the panel is too small for it, in which case every device shrinks by the same step to fit. What is inside the screen never changes
 * the device.
 */
export type DeviceKind = "island" | "notch" | "punch" | "home-button" | "tablet" | "tablet-home" | "fold";

export interface DeviceSpec {
  label: string;
  group: string;
  w: number;
  h: number;
  kind: DeviceKind;
  /** the body's colour */
  body?: string;
}

export const DEVICES: Record<string, DeviceSpec> = {
  "iphone-se": { label: "iPhone SE (3rd gen)", group: "Apple", w: 375, h: 667, kind: "home-button", body: "#17181A" },
  "iphone-8-plus": { label: "iPhone 8 Plus", group: "Apple", w: 414, h: 736, kind: "home-button", body: "#1C1C1E" },
  "iphone-12-mini": { label: "iPhone 12 mini", group: "Apple", w: 360, h: 780, kind: "notch", body: "#2B2D30" },
  "iphone-13": { label: "iPhone 13 / 14", group: "Apple", w: 390, h: 844, kind: "notch", body: "#2B2D30" },
  "iphone-14-pro": { label: "iPhone 14 Pro", group: "Apple", w: 393, h: 852, kind: "island", body: "#3A3A3C" },
  "iphone-15": { label: "iPhone 15 / 16", group: "Apple", w: 393, h: 852, kind: "island", body: "#1C1C1E" },
  "iphone-16-pro": { label: "iPhone 16 Pro", group: "Apple", w: 402, h: 874, kind: "island", body: "#2E2C29" },
  "iphone-15-plus": { label: "iPhone 15 Plus / 16 Plus", group: "Apple", w: 430, h: 932, kind: "island", body: "#1C1C1E" },
  "iphone-16-pro-max": { label: "iPhone 16 Pro Max", group: "Apple", w: 440, h: 956, kind: "island", body: "#2E2C29" },
  "pixel-7": { label: "Pixel 7", group: "Google", w: 412, h: 915, kind: "punch", body: "#1F2326" },
  "pixel-8": { label: "Pixel 8", group: "Google", w: 412, h: 915, kind: "punch", body: "#1F2326" },
  "pixel-8-pro": { label: "Pixel 8 Pro", group: "Google", w: 448, h: 998, kind: "punch", body: "#1F2326" },
  "pixel-9-pro-xl": { label: "Pixel 9 Pro XL", group: "Google", w: 448, h: 998, kind: "punch", body: "#2A2F33" },
  "galaxy-s23": { label: "Galaxy S23", group: "Samsung", w: 360, h: 780, kind: "punch", body: "#222" },
  "galaxy-s24": { label: "Galaxy S24", group: "Samsung", w: 360, h: 780, kind: "punch", body: "#222" },
  "galaxy-s24-ultra": { label: "Galaxy S24 Ultra", group: "Samsung", w: 412, h: 915, kind: "punch", body: "#3A3A3C" },
  "galaxy-a54": { label: "Galaxy A54", group: "Samsung", w: 360, h: 800, kind: "punch", body: "#222" },
  "galaxy-z-flip": { label: "Galaxy Z Flip", group: "Samsung", w: 412, h: 914, kind: "punch", body: "#1F1B2E" },
  "galaxy-z-fold": { label: "Galaxy Z Fold (open)", group: "Samsung", w: 673, h: 841, kind: "fold", body: "#222" },
  "oneplus-12": { label: "OnePlus 12", group: "Android", w: 412, h: 919, kind: "punch", body: "#1B2A26" },
  "android-small": { label: "Small Android (320 × 568)", group: "Android", w: 320, h: 568, kind: "home-button", body: "#222" },
  "ipad-mini": { label: "iPad mini", group: "Tablets", w: 744, h: 1133, kind: "tablet", body: "#1B1C1E" },
  "ipad-air": { label: "iPad Air 11\"", group: "Tablets", w: 820, h: 1180, kind: "tablet", body: "#1B1C1E" },
  "ipad-pro-11": { label: "iPad Pro 11\"", group: "Tablets", w: 834, h: 1194, kind: "tablet", body: "#2B2D30" },
  "ipad-10": { label: "iPad (10th gen)", group: "Tablets", w: 820, h: 1180, kind: "tablet-home", body: "#17181A" },
  "galaxy-tab-s9": { label: "Galaxy Tab S9", group: "Tablets", w: 800, h: 1280, kind: "tablet", body: "#2B2D30" },
};
export const DEFAULT_DEVICE = "iphone-15";

const BEZEL: Record<DeviceKind, number> = { island: 11, notch: 12, punch: 9, "home-button": 14, tablet: 16, "tablet-home": 22, fold: 12 };
const RADIUS: Record<DeviceKind, number> = { island: 54, notch: 46, punch: 40, "home-button": 34, tablet: 30, "tablet-home": 26, fold: 24 };
const STATUS_H: Record<DeviceKind, number> = { island: 54, notch: 48, punch: 38, "home-button": 20, tablet: 24, "tablet-home": 20, fold: 36 };

const MAX_SCALE = 0.62; // phones at about this size; larger devices shrink by the same step only when the panel is too small
const MAX_HEIGHT = 560;

function darker(hex: string, by = 0.35) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.round(v * (1 - by)));
  return `rgb(${f((n >> 16) & 255)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

export default function DeviceFrame({ deviceKey, label, children }: { deviceKey: string; label: string; children: React.ReactNode }) {
  const d = DEVICES[deviceKey] ?? DEVICES[DEFAULT_DEVICE];
  const holder = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(300);
  useEffect(() => {
    const el = holder.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setRoom(el.clientWidth || 300));
    ro.observe(el);
    setRoom(el.clientWidth || 300);
    return () => ro.disconnect();
  }, []);

  const bezel = BEZEL[d.kind];
  const body = d.body ?? "#1C1C1E";
  const extraH = d.kind === "home-button" ? 118 : d.kind === "tablet-home" ? 78 : bezel * 2; // top + bottom bezel, in device px
  const scale = Math.min(MAX_SCALE, (room - 8) / (d.w + bezel * 2), MAX_HEIGHT / (d.h + extraH));
  const sw = d.w * scale;
  const sh = d.h * scale;
  const b = bezel * scale;
  // devices with a home button have deep bezels above and below the screen
  const hb = d.kind === "home-button" || d.kind === "tablet-home";
  const topB = hb ? (d.kind === "home-button" ? 52 : 34) * scale : b;
  const botB = hb ? (d.kind === "home-button" ? 66 : 44) * scale : b;
  const r = RADIUS[d.kind] * scale;
  const status = STATUS_H[d.kind] * scale;
  const phoneLike = d.kind !== "tablet" && d.kind !== "tablet-home";
  const bottomBar = d.kind === "home-button" || d.kind === "tablet-home" ? 0 : 14 * scale;
  // the card sits in the safe area: below the status bar, above the home bar
  const safeBottom = d.kind === "home-button" ? 4 * scale : bottomBar + 4 * scale;
  const button = (side: "left" | "right", top: number, h: number) => (
    <span aria-hidden className="absolute rounded-sm" style={{ [side]: -2.5 * scale - 0.5, top: top * scale, width: 3 * scale + 1, height: h * scale, background: darker(body, 0.25) }} />
  );

  return (
    <div ref={holder} className="w-full flex justify-center">
      <div
        className="relative shrink-0 shadow-xl"
        style={{ width: sw + b * 2, height: sh + topB + botB, borderRadius: r + b, background: body, boxShadow: `inset 0 0 0 ${Math.max(1, scale * 2)}px ${darker(body, 0.45)}, 0 12px 28px rgba(0,0,0,.28)` }}
        role="img"
        aria-label={label}
      >
        {/* side buttons */}
        {phoneLike && d.kind !== "home-button" && (<>{button("left", 120, 26)}{button("left", 170, 52)}{button("left", 236, 52)}{button("right", 190, 80)}</>)}
        {d.kind === "home-button" && (<>{button("left", 90, 24)}{button("left", 130, 40)}{button("right", 110, 60)}</>)}
        {!phoneLike && <>{button("right", 70, 40)}{button("right", 120, 28)}</>}

        <div className="absolute overflow-hidden bg-[#EFEFEF]" style={{ left: b, top: topB, width: sw, height: sh, borderRadius: hb ? 6 * scale : r, boxShadow: `0 0 0 ${Math.max(2, 4 * scale)}px #000` /* the black glass edge around every screen */ }}>
          {/* what is on the screen: the card, fitted completely inside the safe area */}
          <div className="absolute inset-x-0 flex items-center justify-center" style={{ top: status, bottom: safeBottom, padding: Math.max(3, 6 * scale) }}>
            {children}
          </div>

          {/* status bar */}
          <div aria-hidden className="absolute inset-x-0 top-0 flex items-center justify-between pointer-events-none text-[#15191C]" style={{ height: status, padding: `0 ${Math.max(8, 22 * scale)}px`, fontSize: Math.max(7, 14 * scale), fontWeight: 600 }}>
            <span>9:41</span>
            <span className="flex items-center gap-1" style={{ opacity: 0.85 }}>
              <svg width={Math.max(9, 17 * scale)} height={Math.max(7, 11 * scale)} viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx=".6" /><rect x="4.5" y="5" width="3" height="6" rx=".6" /><rect x="9" y="2.5" width="3" height="8.5" rx=".6" /><rect x="13.5" y="0" width="3" height="11" rx=".6" /></svg>
              <svg width={Math.max(14, 26 * scale)} height={Math.max(7, 12 * scale)} viewBox="0 0 26 12" fill="none" stroke="currentColor"><rect x=".5" y=".5" width="21" height="11" rx="3" opacity=".5" /><rect x="2" y="2" width="16" height="8" rx="1.8" fill="currentColor" stroke="none" /><rect x="23" y="4" width="2" height="4" rx="1" fill="currentColor" stroke="none" opacity=".5" /></svg>
            </span>
          </div>

          {/* camera cut-out */}
          {d.kind === "island" && <span aria-hidden className="absolute left-1/2 -translate-x-1/2 bg-black rounded-full" style={{ top: 11 * scale, width: 118 * scale, height: 34 * scale }} />}
          {d.kind === "notch" && <span aria-hidden className="absolute left-1/2 -translate-x-1/2 bg-black" style={{ top: 0, width: 160 * scale, height: 30 * scale, borderRadius: `0 0 ${18 * scale}px ${18 * scale}px` }} />}
          {(d.kind === "punch" || d.kind === "fold") && <span aria-hidden className="absolute left-1/2 -translate-x-1/2 bg-black rounded-full" style={{ top: 12 * scale, width: 15 * scale, height: 15 * scale }} />}
          {(d.kind === "tablet" || d.kind === "tablet-home") && <span aria-hidden className="absolute left-1/2 -translate-x-1/2 bg-black/80 rounded-full" style={{ top: 7 * scale, width: 7 * scale, height: 7 * scale }} />}

          {/* home bar */}
          {bottomBar > 0 && <span aria-hidden className="absolute left-1/2 -translate-x-1/2 bg-black/70 rounded-full" style={{ bottom: 5 * scale, width: 130 * scale, height: Math.max(3, 5 * scale) }} />}
        </div>

        {/* a home button below the screen */}
        {(d.kind === "home-button" || d.kind === "tablet-home") && (
          <span aria-hidden className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{ bottom: (botB - (d.kind === "home-button" ? 30 : 34) * scale) / 2, width: (d.kind === "home-button" ? 30 : 34) * scale, height: (d.kind === "home-button" ? 30 : 34) * scale, boxShadow: `inset 0 0 0 ${Math.max(1, 1.5 * scale)}px ${darker(body, 0.5)}` }} />
        )}
      </div>
    </div>
  );
}
