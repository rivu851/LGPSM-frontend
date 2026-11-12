"use client";

import React, { useRef } from "react";
import Icon from "@/components/icons/Icon";

// The date field of the Billing frames (217:24385, filter popover and Download Statement dialog): a white 47px box, 12px grey
// placeholder ("From", "To", "Select Date") and the design's calendar glyph. The picker itself is the browser's date picker, opened
// from anywhere on the box, so the keyboard and screen readers get a real date control.
export default function BillingDateField({ value, onChange, placeholder, label, min, max }: { value: string; onChange: (iso: string) => void; placeholder: string; label: string; min?: string; max?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const open = () => {
    try { input.current?.showPicker?.(); } catch { input.current?.focus(); }
  };
  return (
    <div onClick={open} className="relative bg-white border border-[#E0E0E0] rounded-md h-[47px] px-4 flex items-center gap-2.5 cursor-pointer focus-within:border-[#FF651D]">
      <span className={`flex-1 min-w-0 truncate text-xs font-medium ${value ? "text-[#15191C]" : "text-[#6B6B6B]"}`}>{value ? formatDay(value) : placeholder}</span>
      <Icon name="billing/calendar" width={20} height={20} className="text-[#4B4F52] opacity-60" />
      <input
        ref={input}
        type="date"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
        tabIndex={0}
      />
    </div>
  );
}

/** "2026-01-04" -> "4 Jan, 2026" (the list uses the same style), without a timezone shift. */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).replace(/^(\d+ \w+) /, "$1, ");
}
