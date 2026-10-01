// Single conversion boundary for date/time values.
// Form state and API payloads always use ISO-8601 strings (UTC instants);
// user-facing text is produced only by the formatters below, in the browser's local time zone.

export function parseIso(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

export function isValidIso(value: string | null | undefined): value is string {
  return parseIso(value) !== null;
}

// "26 Sep 2026, 10:30 AM"
export function formatDateTime(value: string | null | undefined, fallback = ""): string {
  const date = parseIso(value);
  if (!date) return fallback;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Compact table format used by the Figma lists: "25/12/25 11:00 AM"
export function formatCompactDateTime(value: string | null | undefined, fallback = ""): string {
  const date = parseIso(value);
  if (!date) return fallback;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  const h = date.getHours();
  const hh = String(h % 12 || 12).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${min} ${h >= 12 ? "PM" : "AM"}`;
}

// "10:30 AM"
export function formatTime(value: string | null | undefined, fallback = ""): string {
  const date = parseIso(value);
  if (!date) return fallback;
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function addHours(value: string, hours: number): string {
  const date = parseIso(value) ?? new Date();
  return new Date(date.getTime() + hours * 3600 * 1000).toISOString();
}

// Next whole hour from now, a sensible default for a new event
export function nextWholeHourIso(from: Date = new Date()): string {
  const date = new Date(from.getTime());
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return date.toISOString();
}

// True when `end` is strictly after `start` (both must be valid)
export function isAfter(end: string | null | undefined, start: string | null | undefined): boolean {
  const e = parseIso(end);
  const s = parseIso(start);
  return !!e && !!s && e.getTime() > s.getTime();
}
