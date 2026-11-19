// The Events page filters. Each filter narrows the list on its own and any combination narrows it further.
export interface FilterableEvent {
  id: string;
  name: string;
  organizer: string;
  displayId: string;
  category: string;
  categoryId: string;
  start?: string;
  status: string;
  /** where the event is in time (or Cancelled) */
  phase: string;
  sessionsCount?: number;
}

export interface EventFilterValues {
  name: string;
  organizer: string;
  category: string;
  sessions: string;
  status: string;
  from: string;
  to: string;
}

/** "Invitation not sent" is an upcoming event whose invitations have not gone out; every other status is where the event is in time */
export const matchesStatus = (r: FilterableEvent, wanted: string) => (wanted === "Invitation not sent" ? r.status === "Invitation not sent" : r.phase === wanted);

export function matchesEventFilters(r: FilterableEvent, f: EventFilterValues, term: string, sessionCount?: number): boolean {
  const has = (value: string, needle: string) => value.toLowerCase().includes(needle.trim().toLowerCase());
  if (term && ![r.name, r.organizer, r.displayId, r.category].some((v) => has(v, term))) return false;
  if (f.name && !has(r.name, f.name)) return false;
  if (f.organizer && !has(r.organizer, f.organizer)) return false;
  if (f.category && r.categoryId !== f.category) return false;
  if (f.status && !matchesStatus(r, f.status)) return false;
  const count = sessionCount ?? r.sessionsCount;
  if (f.sessions && count !== undefined) {
    if (f.sessions === "0" && count !== 0) return false;
    if (f.sessions === "1" && count !== 1) return false;
    if (f.sessions === "2-5" && (count < 2 || count > 5)) return false;
    if (f.sessions === "6+" && count < 6) return false;
  }
  const start = r.start ? new Date(r.start) : null;
  if (f.from && (!start || start < new Date(`${f.from}T00:00:00`))) return false;
  if (f.to && (!start || start > new Date(`${f.to}T23:59:59.999`))) return false;
  return true;
}
