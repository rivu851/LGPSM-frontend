export function parseEventDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  if (typeof dateStr !== "string") return null;

  const str = dateStr.trim();
  if (!str || str === "TBD") return null;

  // Direct Date parse attempt first if ISO format or standard date format
  const directDate = new Date(str);
  if (!isNaN(directDate.getTime()) && !/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(str)) {
    return directDate;
  }

  // Handle DD/MM/YY or DD/MM/YYYY with optional time like "23/09/26 03.00 PM" or "23/09/2026 03:00 PM"
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2})[.:](\d{2})(?:\s+(AM|PM))?)?/i);
  if (match) {
    const [, dayStr, monthStr, yearStr, hourStr, minStr, ampm] = match;
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    let year = parseInt(yearStr, 10);
    if (year < 100) year += 2000;

    let hour = hourStr ? parseInt(hourStr, 10) : 0;
    const min = minStr ? parseInt(minStr, 10) : 0;
    if (ampm) {
      const upper = ampm.toUpperCase();
      if (upper === "PM" && hour < 12) hour += 12;
      if (upper === "AM" && hour === 12) hour = 0;
    }

    const parsed = new Date(year, month, day, hour, min);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Fallback to direct Date parse
  if (!isNaN(directDate.getTime())) {
    return directDate;
  }

  return null;
}

export type EventStatusType = "Upcoming" | "Ongoing" | "Completed";

export function getDynamicEventStatus(
  startDateStr?: any,
  endDateStr?: any,
  fallbackStatus?: string
): EventStatusType {
  const startDate = parseEventDate(startDateStr);
  const endDate = parseEventDate(endDateStr);
  const now = new Date();

  if (startDate && endDate) {
    if (now < startDate) return "Upcoming";
    if (now >= startDate && now <= endDate) return "Ongoing";
    if (now > endDate) return "Completed";
  } else if (startDate) {
    if (now < startDate) return "Upcoming";
    const isSameDay =
      now.getFullYear() === startDate.getFullYear() &&
      now.getMonth() === startDate.getMonth() &&
      now.getDate() === startDate.getDate();
    if (isSameDay) return "Ongoing";
    return "Completed";
  } else if (endDate) {
    if (now <= endDate) return "Ongoing";
    return "Completed";
  }

  if (fallbackStatus === "Completed" || fallbackStatus === "Ongoing" || fallbackStatus === "Upcoming") {
    return fallbackStatus;
  }

  return "Upcoming";
}

/**
 * What a list shows for an event: what happened to it comes first (closed early, or cancelled), and only an event still running is judged
 * by its dates. A closed event must never read "Ongoing" just because its end time has not come yet.
 */
export function eventDisplayStatus(event: { status?: string; schedule?: { start?: unknown; end?: unknown } | null }): EventStatusType | "Cancelled" {
  if (event.status === "CANCELLED") return "Cancelled";
  if (event.status === "COMPLETED") return "Completed";
  return getDynamicEventStatus(event.schedule?.start, event.schedule?.end, "Upcoming");
}

/** A closed or cancelled event is a record: its guests, sessions and staff no longer change (the server enforces this). */
export const isHistoricalEvent = (status?: string): boolean => status === "COMPLETED" || status === "CANCELLED";

/** No new pass is issued once an event is over: the server refuses to send for it. */
export function eventCanIssuePasses(event?: { status?: string; schedule?: { end?: unknown } | null; admission?: { closesAt?: unknown } | null } | null): boolean {
  if (!event || isHistoricalEvent(event.status)) return false;
  const closes = parseEventDate(event.admission?.closesAt) ?? parseEventDate(event.schedule?.end);
  return !closes || closes.getTime() > Date.now();
}

/**
 * An event's contact number as guests see it, the same as on their card. The Add Event form shows a fixed +91 in front of the field and
 * stores only what was typed: "9007000891" -> "+91 90070 00891". A number typed with its own "+" is left as typed.
 */
export function contactWithCountryCode(raw?: string): string {
  const typed = (raw || "").trim().replace(/\s+/g, " ");
  if (!typed || typed.startsWith("+")) return typed;
  let digits = typed.replace(/\D/g, "");
  if (!digits) return typed;
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : `+91 ${digits}`;
}

export function formatPhoneNumber(phone?: string): string {
  if (!phone || typeof phone !== "string") return "";

  const trimmed = phone.trim();
  if (!trimmed) return "";

  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;

  // Handle leading zero (e.g. 09903107102 -> 9903107102)
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // 10 digits (Standard Indian mobile number without country code) -> +91 XXXXX XXXXX
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  // 12 digits starting with 91 (India with country code 91) -> +91 XXXXX XXXXX
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  // 11 digits starting with 1 (US / Canada) -> +1 XXX XXX XXXX
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  // Generic formatting for other international country codes
  if (digits.length > 10) {
    const ccLen = digits.length - 10;
    const cc = digits.slice(0, ccLen);
    const rest = digits.slice(ccLen);
    return `+${cc} ${rest.slice(0, 5)} ${rest.slice(5)}`;
  }

  return trimmed.startsWith("+") ? trimmed : `+${digits}`;
}

export function isValidEmail(email?: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
}

export function isValidMobile(mobile?: string): boolean {
  if (!mobile || typeof mobile !== "string") return false;
  const trimmed = mobile.trim();
  if (!trimmed) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

