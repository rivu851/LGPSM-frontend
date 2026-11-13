/**
 * Single conversion boundary for date/time values across the frontend.
 *
 * Date/Time Conversion Rules:
 * - Storage & Payload Contract: Form state, draft storage, and API request/response payloads
 *   ALWAYS use UTC ISO-8601 strings (e.g. `2026-10-15T18:30:00.000Z`).
 * - UI Presentation: `formatDateTime`, `formatCompactDateTime`, and `formatTime` format UTC ISO
 *   strings into the user's browser local time zone for human presentation.
 * - Form Pickers: Local HTML `<input type="datetime-local">` controls bind to local time strings,
 *   which are parsed and converted to UTC ISO strings before updating form draft state or sending payloads to the backend API.
 */

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


// ---- Display of dates in the Indian format (en-IN), "12 Nov 2026". formatDateTime and formatCompactDateTime above stay as they are.
export const DISPLAY_LOCALE = "en-IN";
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * "12 Nov 2026". A date with no time (`2026-11-12`, what a date input holds) is a calendar day, not an instant: it is shown as that
 * day whatever the time zone, never moved to the day before or after. A full timestamp is shown in the browser's own time zone, as
 * everywhere else in the web app (see the rules at the top of this file).
 */
export function formatDate(value: string | Date | null | undefined, fallback = ""): string {
  if (!value) return fallback;
  let date: Date | null;
  if (typeof value === "string" && DATE_ONLY.test(value)) {
    const [, y, m, d] = DATE_ONLY.exec(value)!;
    date = new Date(Number(y), Number(m) - 1, Number(d));
    if (date.getMonth() !== Number(m) - 1) return fallback; // 2026-02-31 is not a day
  } else {
    date = value instanceof Date ? value : parseIso(value);
  }
  if (!date || isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(DISPLAY_LOCALE, { day: "numeric", month: "short", year: "numeric" });
}

/** "12 Nov" (a recent date without its year). */
export function formatDayMonth(value: string | Date | null | undefined, fallback = ""): string {
  const date = value instanceof Date ? value : parseIso(value as string | null | undefined);
  if (!date || isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(DISPLAY_LOCALE, { day: "numeric", month: "short" });
}

/** "12 Nov 2026 | 09:42 am": a date and time on one line (lists, logs). */
export function formatDateAndTime(value: string | Date | null | undefined, fallback = ""): string {
  const date = value instanceof Date ? value : parseIso(value as string | null | undefined);
  if (!date || isNaN(date.getTime())) return fallback;
  const time = date.toLocaleTimeString(DISPLAY_LOCALE, { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${formatDate(date)} | ${time}`;
}
