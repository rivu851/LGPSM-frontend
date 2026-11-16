"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { PlaceMatch, searchPlaces } from "@/utils/geocode";

export interface VenuePin { lat: number; lng: number }

interface VerifyLocationModalProps {
  /** What the organizer typed in the address field */
  address: string;
  /** The pin saved earlier, if any */
  pin: VenuePin | null;
  /** `useAddress` is the matched address when the organizer chose to replace the typed text with it */
  onConfirm: (pin: VenuePin, useAddress?: string) => void;
  onClose: () => void;
}

type Status = "searching" | "found" | "none" | "error";

// India-wide view for the first paint when nothing is known yet (the form's phone prefix is +91)
const DEFAULT_VIEW: [number, number] = [22.9, 79.6];

// "Verify" next to the event address: looks the typed address up, shows the matches on a map, and lets the organizer
// confirm one or place the pin by hand. The confirmed pin is saved with the event.
export default function VerifyLocationModal({ address, pin, onConfirm, onClose }: VerifyLocationModalProps) {
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);

  const [status, setStatus] = useState<Status>("searching");
  const [matches, setMatches] = useState<PlaceMatch[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [point, setPoint] = useState<VenuePin | null>(pin);
  const [useMatchedAddress, setUseMatchedAddress] = useState(false);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Create the map once
  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !mapEl.current) return;
      leaflet.current = L;
      const m = L.map(mapEl.current, { zoomControl: true }).setView(pin ? [pin.lat, pin.lng] : DEFAULT_VIEW, pin ? 16 : 5);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(m);
      // Clicking the map places (or moves) the pin by hand
      m.on("click", (e) => { setChosen(null); setPoint({ lat: e.latlng.lat, lng: e.latlng.lng }); });
      map.current = m;
      setReady(true);
    })();
    return () => { disposed = true; map.current?.remove(); map.current = null; marker.current = null; };
    // the map is created once; the saved pin only sets its first view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Look the typed address up
  useEffect(() => {
    const controller = new AbortController();
    searchPlaces(address, controller.signal)
      .then((rows) => {
        setMatches(rows);
        setStatus(rows.length ? "found" : "none");
        // With no pin saved yet, the best match is the starting point; a saved pin is kept
        if (rows.length && !pin) { setChosen(0); setPoint({ lat: rows[0].lat, lng: rows[0].lng }); }
      })
      .catch((e) => { if (!controller.signal.aborted) { console.error(e); setStatus("error"); } });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, attempt]);

  // Keep the marker and view in step with the chosen point
  useEffect(() => {
    const L = leaflet.current; const m = map.current;
    if (!ready || !L || !m || !point) return;
    if (!marker.current) {
      const icon = L.divIcon({
        className: "",
        html: '<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.2 0 0 7 0 15.6 0 27 16 40 16 40s16-13 16-24.4C32 7 24.8 0 16 0z" fill="#FF651D"/><circle cx="16" cy="15" r="6" fill="#fff"/></svg>',
        iconSize: [32, 40], iconAnchor: [16, 40],
      });
      marker.current = L.marker([point.lat, point.lng], { icon, draggable: true }).addTo(m);
      marker.current.on("dragend", () => { const p = marker.current!.getLatLng(); setChosen(null); setPoint({ lat: p.lat, lng: p.lng }); });
    } else {
      marker.current.setLatLng([point.lat, point.lng]);
    }
    m.setView([point.lat, point.lng], Math.max(m.getZoom(), 16));
  }, [point, ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const choose = (i: number) => { setChosen(i); setPoint({ lat: matches[i].lat, lng: matches[i].lng }); };

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-start justify-center p-4 pt-[6vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="verify-location-title">
      <div className="w-full max-w-[760px] bg-white rounded-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E0E0E0]">
          <h3 id="verify-location-title" className="text-base font-medium text-[#15191C]">Verify event address</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[#15191C] hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 pt-5 pb-6 space-y-4">
          <p className="text-sm text-[#4B4F52] break-words"><span className="font-medium text-[#15191C]">Address entered:</span> {address}</p>

          <div role="status" aria-live="polite" className="text-sm">
            {status === "searching" && <p className="text-[#6B6B6B]">Looking up this address…</p>}
            {status === "found" && <p className="text-[#0F7A33] font-medium">{matches.length === 1 ? "We found this place." : `We found ${matches.length} possible places. Pick the right one.`}</p>}
            {status === "none" && <p className="text-[#B45309]">We couldn&apos;t find this address on the map. Check the spelling, or click the map to drop the pin yourself.</p>}
            {status === "error" && (
              <p className="text-rose-600">
                The address search is not reachable right now. You can still click the map to drop the pin.{" "}
                <button type="button" onClick={() => { setStatus("searching"); setAttempt((n) => n + 1); }} className="underline font-medium cursor-pointer">Try again</button>
              </p>
            )}
          </div>

          {matches.length > 0 && (
            <ul className="space-y-1.5 max-h-[150px] overflow-y-auto" role="listbox" aria-label="Possible places">
              {matches.map((m, i) => (
                <li key={`${m.lat}-${m.lng}-${i}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={chosen === i}
                    onClick={() => choose(i)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-md border cursor-pointer ${chosen === i ? "border-[#FF651D] bg-[#FFF3EC] text-[#15191C]" : "border-[#E0E0E0] hover:bg-[#EEF3FF] text-[#4B4F52]"}`}
                  >
                    {m.label}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div ref={mapEl} className="h-[300px] w-full rounded-md border border-[#E0E0E0] overflow-hidden z-0" aria-label="Map" />
          <p className="text-xs text-[#6B6B6B]">Click the map or drag the pin to adjust the exact spot. Map data © OpenStreetMap contributors.</p>

          {chosen !== null && (
            <label className="flex items-start gap-2 text-sm text-[#4B4F52] cursor-pointer">
              <input type="checkbox" checked={useMatchedAddress} onChange={(e) => setUseMatchedAddress(e.target.checked)} className="mt-0.5 size-4 accent-[#16A34A]" />
              <span>Use the matched address for the event instead of what I typed<span className="block text-xs text-[#6B6B6B] break-words">{matches[chosen]?.label}</span></span>
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E0E0E0]">
          <button
            type="button"
            disabled={!point}
            onClick={() => point && onConfirm(point, useMatchedAddress && chosen !== null ? matches[chosen].label : undefined)}
            className="px-6 py-[11px] text-base font-semibold text-white bg-[#C65318] rounded-lg hover:bg-[#A83800] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Confirm location
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
