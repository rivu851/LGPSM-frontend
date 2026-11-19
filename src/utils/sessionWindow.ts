// (self-contained so it can be tested on its own) the same "26 Sep 2026, 10:30 AM" wording the rest of the app uses
const parseIso = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};
const formatDateTime = (value: string | null | undefined, fallback = ""): string => {
  const date = parseIso(value);
  return date ? date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : fallback;
};

/**
 * A session has to happen while its event does: it cannot open before the event begins, nor close after the event ends.
 * Returns a plain-language sentence for the first thing wrong, or null when the time is fine. `field` is the time being set.
 */
export function sessionTimeProblem(opts: { field: "start" | "end"; value: string; start?: string | null; end?: string | null; eventStart?: string | null; eventEnd?: string | null }): string | null {
  const when = parseIso(opts.value);
  const evStart = parseIso(opts.eventStart);
  const evEnd = parseIso(opts.eventEnd);
  if (!when) return null;
  const eventStartText = formatDateTime(opts.eventStart, "");
  const eventEndText = formatDateTime(opts.eventEnd, "");
  const word = opts.field === "start" ? "start" : "end";
  if (evStart && when < evStart) {
    return `The session cannot ${word} before the event begins. The event starts on ${eventStartText}, so please choose a ${word} time on or after that.`;
  }
  if (evEnd && when > evEnd) {
    return `The session cannot ${word} after the event ends. The event ends on ${eventEndText}, so please choose a ${word} time on or before that.`;
  }
  if (opts.field === "end") {
    const start = parseIso(opts.start);
    if (start && when <= start) return `The session end must be after its start (${formatDateTime(opts.start, "")}). Please choose a later end time.`;
  }
  return null;
}

/** Sessions that fall outside their event's dates, for when the event's own dates change afterwards */
export function sessionsOutsideEvent<T extends { name: string; start: string; end: string }>(sessions: T[], eventStart?: string | null, eventEnd?: string | null): T[] {
  const evStart = parseIso(eventStart);
  const evEnd = parseIso(eventEnd);
  return sessions.filter((s) => {
    const a = parseIso(s.start);
    const b = parseIso(s.end);
    return (!!evStart && ((a && a < evStart) || (b && b < evStart))) || (!!evEnd && ((a && a > evEnd) || (b && b > evEnd)));
  });
}
