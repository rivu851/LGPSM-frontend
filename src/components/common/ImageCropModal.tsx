"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const OUTPUT_MAX = 1024; // the cropped picture is saved at this size at most (never enlarged beyond what the original holds)

interface Props {
  file: File;
  onCancel: () => void;
  /** The cropped, square picture (same format as the original: PNG stays PNG so a transparent logo stays transparent) */
  onConfirm: (cropped: File) => void;
  /** width ÷ height of the crop (1 = square, 9/16 = a portrait phone screen). The shape is fixed; only its size and place change. */
  aspect?: number;
  /** what the ratio is called in the words on screen, e.g. "9:16" */
  aspectLabel?: string;
}

type Handle = "move" | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
// the crop frame, in the picture's own pixels: `s` is its width, its height is s ÷ aspect
interface Box { x: number; y: number; s: number }

// pointer position in the picture's pixels (`d` screen pixels per picture pixel)
function pointerIn(getEl: () => HTMLElement | null, d: number, e: React.PointerEvent) {
  const el = getEl();
  const r = el ? el.getBoundingClientRect() : { left: 0, top: 0 };
  return { x: (e.clientX - r.left) / d, y: (e.clientY - r.top) / d };
}

/**
 * A 1:1 crop on the whole picture, like the phone's crop tool: the picture is shown complete and a square sits on it. Drag the
 * square to move it, and drag its corners or edges to make it larger or smaller. Nothing is stretched or zoomed.
 */
export default function ImageCropModal({ file, onCancel, onConfirm, aspect = 1, aspectLabel = "1:1" }: Props) {
  const A = aspect;
  const outputMax = A === 1 ? OUTPUT_MAX : 1920; // the longer side, at most
  // the window is mounted afresh for each picture, so the address is made once and released as soon as the picture has loaded
  const [src] = useState(() => URL.createObjectURL(file));
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [failed, setFailed] = useState(false);
  const [room, setRoom] = useState(() => (typeof window === "undefined" ? { w: 320, h: 320 } : { w: window.innerWidth - 32, h: window.innerHeight - 190 }));
  const imgRef = useRef<HTMLImageElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ handle: Handle; px: number; py: number; start: Box } | null>(null);

  useEffect(() => {
    const fit = () => setRoom({ w: window.innerWidth - 32, h: window.innerHeight - 190 });
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // the whole picture, as large as the screen leaves room for
  const d = natural ? Math.min(room.w / natural.w, room.h / natural.h) : 1; // screen px per picture px
  const maxWidth = natural ? Math.min(natural.w, natural.h * A) : 24; // the widest frame of this shape that fits the picture
  const minSize = Math.max(24, maxWidth * 0.08);

  const place = (b: Box): Box => {
    if (!natural) return b;
    const s = Math.min(Math.max(b.s, minSize), maxWidth);
    return { s, x: Math.min(Math.max(b.x, 0), natural.w - s), y: Math.min(Math.max(b.y, 0), natural.h - s / A) };
  };

  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const w = e.currentTarget.naturalWidth;
    const h = e.currentTarget.naturalHeight;
    setNatural({ w, h });
    const s = Math.min(w, h * A) * 0.9;
    setBox({ s, x: (w - s) / 2, y: (h - s / A) / 2 });
    URL.revokeObjectURL(src);
  };

  const begin = (handle: Handle, e: React.PointerEvent) => {
    if (!box) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointerIn(() => stage.current, d, e);
    drag.current = { handle, px: p.x, py: p.y, start: box };
  };

  const move = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g || !natural) return;
    const p = pointerIn(() => stage.current, d, e);
    const { start: b, handle } = g;
    const W = natural.w;
    const H = natural.h;
    if (handle === "move") return setBox(place({ ...b, x: b.x + p.x - g.px, y: b.y + p.y - g.py }));
    const cx = b.x + b.s / 2;
    const cy = b.y + b.s / A / 2;
    const px = Math.min(Math.max(p.x, 0), W);
    const py = Math.min(Math.max(p.y, 0), H);
    // a corner keeps the opposite corner where it is
    if (handle.length === 2) {
      const west = handle.includes("w");
      const north = handle.includes("n");
      const ax = west ? b.x + b.s : b.x;
      const ay = north ? b.y + b.s / A : b.y;
      const roomX = west ? ax : W - ax;
      const roomY = north ? ay : H - ay;
      const s = Math.min(Math.max(Math.max(Math.abs(px - ax), Math.abs(py - ay) * A), minSize), Math.min(roomX, roomY * A));
      return setBox({ s, x: west ? ax - s : ax, y: north ? ay - s / A : ay });
    }
    // an edge keeps the opposite edge where it is and grows evenly along the other direction
    if (handle === "e" || handle === "w") {
      const ax = handle === "e" ? b.x : b.x + b.s;
      const roomX = handle === "e" ? W - ax : ax;
      const s = Math.min(Math.max(Math.abs(px - ax), minSize), Math.min(roomX, 2 * Math.min(cy, H - cy) * A));
      return setBox({ s, x: handle === "e" ? ax : ax - s, y: Math.min(Math.max(cy - s / A / 2, 0), H - s / A) });
    }
    const ay = handle === "s" ? b.y : b.y + b.s / A;
    const roomY = handle === "s" ? H - ay : ay;
    const s = Math.min(Math.max(Math.abs(py - ay) * A, minSize), Math.min(roomY * A, 2 * Math.min(cx, W - cx)));
    setBox({ s, y: handle === "s" ? ay : ay - s / A, x: Math.min(Math.max(cx - s / 2, 0), W - s) });
  };

  const end = () => { drag.current = null; };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return onCancel();
    if (!box || !natural) return;
    const step = Math.max(2, maxWidth * 0.01);
    const delta = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[e.key];
    if (delta) { e.preventDefault(); setBox(place({ ...box, x: box.x + delta[0], y: box.y + delta[1] })); }
    else if (e.key === "+" || e.key === "=") { const s = box.s + step * 2; setBox(place({ s, x: box.x - step, y: box.y - step })); }
    else if (e.key === "-") { const s = box.s - step * 2; setBox(place({ s, x: box.x + step, y: box.y + step })); }
  };

  const confirm = () => {
    const img = imgRef.current;
    if (!img || !natural || !box) return;
    const scale = Math.min(1, outputMax / Math.max(box.s, box.s / A)); // never enlarged beyond what the original holds
    const outW = Math.max(1, Math.round(box.s * scale));
    const outH = Math.max(1, Math.round((box.s / A) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return setFailed(true);
    ctx.drawImage(img, box.x, box.y, box.s, box.s / A, 0, 0, outW, outH);
    const type = file.type === "image/png" || file.type === "image/webp" ? file.type : "image/jpeg";
    canvas.toBlob((blob) => {
      if (!blob) return setFailed(true);
      const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
      onConfirm(new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "picture"}-${A === 1 ? "square" : "cropped"}.${ext}`, { type }));
    }, type, 0.92);
  };

  const grip = "absolute bg-white border border-black/40 shadow";
  const handles: Array<{ h: Handle; cls: string; cursor: string }> = [
    { h: "nw", cls: "-left-2 -top-2 size-4", cursor: "nwse-resize" },
    { h: "ne", cls: "-right-2 -top-2 size-4", cursor: "nesw-resize" },
    { h: "sw", cls: "-left-2 -bottom-2 size-4", cursor: "nesw-resize" },
    { h: "se", cls: "-right-2 -bottom-2 size-4", cursor: "nwse-resize" },
    { h: "n", cls: "left-1/2 -top-1.5 -translate-x-1/2 w-8 h-3 rounded-full", cursor: "ns-resize" },
    { h: "s", cls: "left-1/2 -bottom-1.5 -translate-x-1/2 w-8 h-3 rounded-full", cursor: "ns-resize" },
    { h: "w", cls: "top-1/2 -left-1.5 -translate-y-1/2 h-8 w-3 rounded-full", cursor: "ew-resize" },
    { h: "e", cls: "top-1/2 -right-1.5 -translate-y-1/2 h-8 w-3 rounded-full", cursor: "ew-resize" },
  ];

  const dialog = (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col text-white" role="dialog" aria-modal="true" aria-labelledby="crop-title" onKeyDown={onKey}>
      <div className="flex items-start justify-between gap-4 px-4 sm:px-6 py-4">
        <div>
          <h2 id="crop-title" className="text-base font-medium">Crop the picture</h2>
          <p className="text-xs text-white/70 mt-0.5">Drag the frame to move it. Drag its corners or edges to make it bigger or smaller. It is saved as {aspectLabel}, so the shape never changes.</p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Close" className="shrink-0 size-9 flex items-center justify-center rounded-full hover:bg-white/15 cursor-pointer">
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center px-4">
        <div ref={stage} className="relative select-none touch-none" style={natural ? { width: natural.w * d, height: natural.h * d } : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={src} alt="" draggable={false} onLoad={onLoad} onError={() => setFailed(true)} className="block pointer-events-none" style={natural ? { width: natural.w * d, height: natural.h * d } : { maxWidth: "100%", maxHeight: "60vh", visibility: "hidden" }} />
          {/* the part of the picture outside the square is dimmed: four panels over the picture only, so nothing else on the screen is shaded */}
          {natural && box && (
            <>
              <div aria-hidden className="pointer-events-none absolute bg-black/60" style={{ left: 0, top: 0, width: natural.w * d, height: box.y * d }} />
              <div aria-hidden className="pointer-events-none absolute bg-black/60" style={{ left: 0, top: (box.y + box.s / A) * d, width: natural.w * d, height: (natural.h - box.y - box.s / A) * d }} />
              <div aria-hidden className="pointer-events-none absolute bg-black/60" style={{ left: 0, top: box.y * d, width: box.x * d, height: (box.s / A) * d }} />
              <div aria-hidden className="pointer-events-none absolute bg-black/60" style={{ left: (box.x + box.s) * d, top: box.y * d, width: (natural.w - box.x - box.s) * d, height: (box.s / A) * d }} />
            </>
          )}
          {natural && box && (
            <div
              className="absolute outline-none cursor-move focus-visible:ring-2 focus-visible:ring-white"
              style={{ left: box.x * d, top: box.y * d, width: box.s * d, height: (box.s / A) * d, border: "2px solid #fff" }}
              tabIndex={0}
              aria-label={`Crop frame (${aspectLabel}). Use the arrow keys to move it, plus or minus to resize it.`}
              onPointerDown={(e) => begin("move", e)}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
            >
              {/* thirds, to help place the subject */}
              <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden style={{ backgroundImage: "linear-gradient(to right, transparent 33%, #fff 33%, #fff calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, #fff 66%, #fff calc(66% + 1px), transparent calc(66% + 1px)), linear-gradient(to bottom, transparent 33%, #fff 33%, #fff calc(33% + 1px), transparent calc(33% + 1px), transparent 66%, #fff 66%, #fff calc(66% + 1px), transparent calc(66% + 1px))" }} />
              {handles.map(({ h, cls, cursor }) => (
                <div key={h} className={`${grip} ${cls}`} style={{ cursor }} onPointerDown={(e) => begin(h, e)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} aria-hidden />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="px-4 sm:px-6 py-4 flex flex-col items-center gap-3">
        {failed && <p role="alert" className="text-xs font-medium text-rose-300">This picture could not be cropped. Try another image.</p>}
        <button type="button" onClick={confirm} disabled={!box || failed} className="px-8 py-2.5 bg-[#1F65FF] hover:bg-[#1A56DB] rounded-md text-sm font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">Use this crop</button>
      </div>
    </div>
  );
  // on the page itself (not inside the form's layout), so it covers the whole screen including the sidebar and header
  return typeof document === "undefined" ? null : createPortal(dialog, document.body);
}
