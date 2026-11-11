// The From / To dates of a list filter (<input type="date"> values, "YYYY-MM-DD"). They are calendar days in the viewer's own time
// zone, the same one event times are shown in, and both ends are included: an event at 11:30 PM on the "To" day is still on that day.
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The first instant of a chosen day; NaN when no valid day is chosen (a half-typed date has no value, so it is no limit) */
export const startOfDayMs = (day: string): number => (DAY.test(day) ? new Date(`${day}T00:00:00`).getTime() : NaN);
/** The last instant of a chosen day (to the millisecond); NaN when no valid day is chosen */
export const endOfDayMs = (day: string): number => (DAY.test(day) ? new Date(`${day}T23:59:59.999`).getTime() : NaN);

/** Does something that starts at `startIso` fall on or between the chosen days? An empty end is open. Nothing without a start date matches a range. */
export function startsWithin(startIso: string | Date | null | undefined, from: string, to: string): boolean {
  const lo = startOfDayMs(from);
  const hi = endOfDayMs(to);
  const t = startIso ? new Date(startIso).getTime() : NaN;
  if (Number.isNaN(t)) return Number.isNaN(lo) && Number.isNaN(hi);
  if (!Number.isNaN(lo) && t < lo) return false;
  if (!Number.isNaN(hi) && t > hi) return false;
  return true;
}

/**
 * Keeps the two days consistent after one of them changes: the end can never be before the start. Whichever was just changed wins,
 * and the other follows it (choosing a From after the To moves the To there; choosing a To before the From moves the From there).
 */
export function settleRange(range: { from: string; to: string }, changed: "from" | "to"): { from: string; to: string } {
  const { from, to } = range;
  if (DAY.test(from) && DAY.test(to) && from > to) return changed === "from" ? { from, to: from } : { from: to, to };
  return { from, to };
}
