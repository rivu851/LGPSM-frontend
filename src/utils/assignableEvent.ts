// Staff can only be assigned to an event that is still taking place. The server refuses a cancelled event and a closed (completed) one,
// so offering them just sends the organizer down a path that can only end in an error.
export interface EventWithStatus { id: string; title: string; status?: string }

export function isAssignableEvent(event: { status?: string }): boolean {
  const status = String(event.status ?? "").toUpperCase();
  return status !== "CANCELLED" && status !== "COMPLETED";
}

/** The event to preselect: the current choice while it is still open, the only open event if there is exactly one, otherwise none (the person chooses). */
export function defaultAssignableEventId(events: EventWithStatus[], current: string): string {
  const open = events.filter(isAssignableEvent);
  if (open.some((e) => e.id === current)) return current;
  return open.length === 1 ? open[0].id : "";
}
