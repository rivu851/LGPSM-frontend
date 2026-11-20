"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import PopupMessage from "@/components/common/PopupMessage";
import CustomDropdown from "@/components/common/CustomDropdown";
import ModalClose from "@/components/common/ModalClose";
import { templateService, type TextZone, type TextZoneRole } from "@/services/templateService";
import { resolveImageUrl } from "@/utils/mediaUrl";

const ROLES: { value: TextZoneRole; label: string; wording: boolean }[] = [
  { value: "title", label: "Event name", wording: true },
  { value: "dateTime", label: "Date and time", wording: true },
  { value: "venue", label: "Venue", wording: true },
  { value: "qr", label: "QR code", wording: false },
  { value: "inviteeName", label: "Guest name", wording: false },
  { value: "inviteeMeta", label: "Guest details", wording: false },
];
const FONTS = ["Inter", "Manrope", "Playfair Display", "Ancizar Serif", "Alexandria", "Alkatra", "Alex Brush", "Birthstone"];
const labelOf = (r: TextZoneRole) => ROLES.find((x) => x.value === r)!.label;

interface Props {
  templateId: string;
  /** the editor opens with a message when the wording was looked for just now */
  intro?: { detected: boolean; reason?: string } | null;
  onClose: (changed: boolean) => void;
}

/**
 * Where the design's own wording is. The app tries to find the event name, the date and time and the venue in the picture by itself; this
 * window shows what it found, and lets the person fix it or mark the areas by hand. Each area is painted out of the picture from the
 * background around it and the event's own text is written there, so the design keeps its background exactly.
 */
export default function TextAreasEditor({ templateId, intro, onClose }: Props) {
  const [zones, setZones] = useState<TextZone[]>([]);
  const [canvas, setCanvas] = useState<{ width: number; height: number } | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | "save" | "detect">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(intro ? (intro.detected ? "The wording in your design was found. Check each area, then save." : `${intro.reason || "The wording could not be found."} Mark the areas yourself below.`) : null);
  const [changed, setChanged] = useState(false);
  // an organizer's own design is the card as it is: only the places for the QR code and the guest's details are set; an admin's also has the event's wording
  const [dynamic, setDynamic] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ index: number; mode: "move" | "size"; px: number; py: number; start: TextZone } | null>(null);

  const load = useCallback(async () => {
    const res = await templateService.getTextZones(templateId);
    if (res.success && res.data) { setZones(res.data.zones); setCanvas(res.data.canvas ?? null); setImageKey(res.data.imageKey ?? null); setDynamic(res.data.dynamic !== false); }
    else setError(res.message || "The text areas could not be loaded.");
    setLoading(false);
  }, [templateId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads once when the window opens
  useEffect(() => { void load(); }, [load]);

  const scale = () => (canvas && stage.current ? stage.current.getBoundingClientRect().width / canvas.width : 1);
  const update = (i: number, patch: Partial<TextZone>) => { setZones((zs) => zs.map((z, k) => (k === i ? { ...z, ...patch } : z))); setChanged(true); };

  const begin = (i: number, mode: "move" | "size", e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(i);
    drag.current = { index: i, mode, px: e.clientX, py: e.clientY, start: zones[i] };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !canvas) return;
    const k = scale();
    const dx = (e.clientX - d.px) / k, dy = (e.clientY - d.py) / k;
    if (d.mode === "move") update(d.index, { x: Math.round(Math.min(Math.max(0, d.start.x + dx), canvas.width - d.start.w)), y: Math.round(Math.min(Math.max(0, d.start.y + dy), canvas.height - d.start.h)) });
    else if (d.start.role === "qr") { const side = Math.round(Math.min(Math.max(60, d.start.w + Math.max(dx, dy)), canvas.width - d.start.x, canvas.height - d.start.y)); update(d.index, { w: side, h: side }); }
    else update(d.index, { w: Math.round(Math.min(Math.max(20, d.start.w + dx), canvas.width - d.start.x)), h: Math.round(Math.min(Math.max(16, d.start.h + dy), canvas.height - d.start.y)) });
  };
  const end = () => { drag.current = null; };

  const add = (role: TextZoneRole) => {
    if (!canvas || zones.some((z) => z.role === role)) return;
    const h = role === "title" ? 0.08 : 0.04;
    const y = role === "title" ? 0.42 : role === "dateTime" ? 0.62 : role === "venue" ? 0.72 : role === "inviteeName" ? 0.82 : 0.87;
    const side = Math.round(canvas.width * 0.27);
    setZones((zs) => [...zs, role === "qr"
      ? { role, x: Math.round((canvas.width - side) / 2), y: Math.round(canvas.height * 0.6), w: side, h: side, lines: 1, color: "#000000", fontFamily: "Inter", fontWeight: 400, align: "center" }
      : { role, x: Math.round(canvas.width * 0.1), y: Math.round(canvas.height * y), w: Math.round(canvas.width * 0.8), h: Math.round(canvas.height * h), lines: 1, color: "#222222", fontFamily: role === "title" ? "Playfair Display" : "Inter", fontWeight: role === "title" ? 700 : 500, align: "center" }]);
    setSelected(zones.length);
    setChanged(true);
  };
  const remove = (i: number) => { setZones((zs) => zs.filter((_, k) => k !== i)); setSelected(null); setChanged(true); };

  const save = async () => {
    setBusy("save");
    setError(null);
    const res = await templateService.saveTextZones(templateId, zones);
    setBusy(null);
    if (res.success) onClose(true);
    else setError(res.message || "The text areas could not be saved. Please try again.");
  };
  const detect = async () => {
    setBusy("detect");
    setError(null);
    const res = await templateService.detectText(templateId);
    setBusy(null);
    if (!res.success || !res.data) return setError(res.message || "The picture could not be read. Please try again.");
    await load();
    setChanged(true);
    setNotice(res.data.detected ? "The wording in your design was found again. Check each area, then save." : `${res.data.reason || "The wording could not be found."} Mark the areas yourself.`);
  };

  const sel = selected !== null ? zones[selected] : null;
  const src = resolveImageUrl(imageKey);
  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="areas-title">
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[94vh] overflow-y-auto">
        <ModalClose onClick={() => onClose(changed)} />
        <div className="px-6 pt-5 pb-3 pr-14">
          <h2 id="areas-title" className="text-base font-medium text-gray-900">Where the event&apos;s details go on your design</h2>
          <p className="mt-1 text-sm text-[#4B4F52]">Drag a box over the event name, the date and time, and the venue written in your picture. Each event&apos;s own details are written there in the same place, and the picture around them stays as it is.</p>
        </div>
        {notice && <p role="status" className="mx-6 mb-2 rounded-md bg-[#EAF1FF] border border-[#D6E4FF] px-3 py-2 text-sm text-[#0F3A99]">{notice}</p>}
        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-[minmax(0,320px)_1fr] gap-6 items-start">
          <div>
            {loading || !canvas ? <div className="aspect-[9/16] rounded-md bg-[#F4F5F8] animate-pulse" /> : (
              <div ref={stage} className="relative w-full overflow-hidden rounded-md border border-[#E0E0E0] bg-[#F4F5F8] touch-none select-none" style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerDown={() => setSelected(null)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {src && <img src={src} alt="Your design" draggable={false} className="absolute inset-0 size-full object-cover pointer-events-none" />}
                {zones.map((z, i) => (
                  <div
                    key={i}
                    onPointerDown={(e) => begin(i, "move", e)}
                    className={`absolute cursor-move border-2 ${selected === i ? "border-[#1F65FF] bg-[#1F65FF]/15" : "border-[#2563EB] bg-[#2563EB]/10"}`}
                    style={{ left: `${(z.x / canvas.width) * 100}%`, top: `${(z.y / canvas.height) * 100}%`, width: `${(z.w / canvas.width) * 100}%`, height: `${(z.h / canvas.height) * 100}%` }}
                  >
                    <span className="absolute -top-5 left-0 text-[10px] font-semibold bg-white/90 text-[#15191C] px-1 rounded">{labelOf(z.role)}</span>
                    <span onPointerDown={(e) => begin(i, "size", e)} className="absolute -right-1.5 -bottom-1.5 size-3.5 rounded-sm bg-white border-2 border-[#1F65FF] cursor-nwse-resize" aria-hidden />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 min-w-0">
            <div className="flex flex-wrap gap-2">
              {ROLES.filter((r) => dynamic || !r.wording).map((r) => (
                <button key={r.value} type="button" disabled={zones.some((z) => z.role === r.value) || loading} onClick={() => add(r.value)} className="px-3 py-1.5 text-xs font-semibold rounded-md border border-[#DDD] hover:bg-gray-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">+ {r.label}</button>
              ))}
              <button type="button" onClick={detect} disabled={busy !== null || loading} className="px-3 py-1.5 text-xs font-semibold rounded-md border border-[#1F65FF] text-[#1F65FF] hover:bg-[#EAF1FF] cursor-pointer disabled:opacity-60">{busy === "detect" ? "Looking…" : "Find the wording again"}</button>
            </div>

            {zones.length === 0 && !loading && <p className="text-sm text-[#6B6B6B]">No areas yet. {dynamic ? "Add the event name, the date and time and the venue, then drag each box over the wording in your picture." : "Add the QR code, then drag it to the place your design has for it."}</p>}
            <p className="text-xs text-[#6B6B6B]">{dynamic ? "The guest's name and details are only added if you mark a place for them: nothing is put on top of your artwork." : "Nothing is put on top of your artwork except the QR code (and the guest's name only where you mark a place for it)."}</p>

            {sel && selected !== null && (
              <div className="rounded-md border border-[#E0E0E0] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#15191C]">{labelOf(sel.role)}</h3>
                  <button type="button" onClick={() => remove(selected)} className="text-xs font-semibold text-[#D92D20] hover:underline cursor-pointer">Remove this area</button>
                </div>
                {sel.role === "qr" ? <p className="text-xs text-[#6B6B6B]">{sel.frame ? "The code sits in your design's own QR box." : "The code is printed straight on the picture at this spot."} Drag it to move it; drag the corner to resize it (it stays square).</p> : (
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-medium text-[#4B4F52]">Font
                    <CustomDropdown value={sel.fontFamily} onChange={(v) => update(selected, { fontFamily: v })} options={FONTS.map((f) => ({ value: f, label: f }))} ariaLabel="Font" compact />
                  </label>
                  <label className="text-xs font-medium text-[#4B4F52]">Weight
                    <CustomDropdown value={String(sel.fontWeight)} onChange={(v) => update(selected, { fontWeight: Number(v) as TextZone["fontWeight"] })} options={[{ value: "400", label: "Regular" }, { value: "500", label: "Medium" }, { value: "600", label: "Semibold" }, { value: "700", label: "Bold" }]} ariaLabel="Weight" compact />
                  </label>
                  <label className="text-xs font-medium text-[#4B4F52]">Alignment
                    <CustomDropdown value={sel.align} onChange={(v) => update(selected, { align: v as TextZone["align"] })} options={[{ value: "left", label: "Left" }, { value: "center", label: "Centre" }, { value: "right", label: "Right" }]} ariaLabel="Alignment" compact />
                  </label>
                  <label className="text-xs font-medium text-[#4B4F52]">Lines it can use
                    <input type="number" min={1} max={4} value={sel.lines} onChange={(e) => update(selected, { lines: Math.max(1, Math.min(4, Number(e.target.value) || 1)) })} className="mt-1 w-full h-[40px] px-3 border border-[#E0E0E0] rounded-md text-sm" />
                  </label>
                  <label className="text-xs font-medium text-[#4B4F52] col-span-2 flex items-center gap-3">Text colour
                    <input type="color" value={sel.color} onChange={(e) => update(selected, { color: e.target.value })} className="h-9 w-14 p-0.5 border border-[#E0E0E0] rounded-md cursor-pointer" aria-label="Text colour" />
                    <span className="text-xs text-[#6B6B6B]">{sel.color.toUpperCase()}</span>
                  </label>
                </div>)}
              </div>
            )}

            <PopupMessage message={error} onClose={() => setError(null)} />
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => onClose(changed)} disabled={busy !== null} className="px-5 py-2.5 border border-[#DDD] rounded-md text-sm font-semibold hover:bg-gray-50 cursor-pointer disabled:opacity-60">Close</button>
              <button type="button" onClick={save} disabled={busy !== null || loading} className="px-6 py-2.5 bg-[#1F65FF] hover:bg-[#1A56DB] text-white text-sm font-medium rounded-md cursor-pointer disabled:opacity-60">{busy === "save" ? "Saving…" : "Save areas"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
