"use client";

import React from "react";
import DateField from "@/components/common/DateField";

// The date field of the Billing frames (filter popover and Download Statement dialog): the app's own calendar, with the field's
// placeholder ("From", "To", "Select Date") shown while it is empty.
export default function BillingDateField({ value, onChange, placeholder, label, min, max }: { value: string; onChange: (iso: string) => void; placeholder: string; label: string; min?: string; max?: string }) {
  return <DateField value={value} onChange={onChange} placeholder={placeholder} title={label} min={min} max={max} />;
}

/** "2026-01-04" -> "4 Jan, 2026" (the list uses the same style), without a timezone shift. */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).replace(/^(\d+ \w+) /, "$1, ");
}
