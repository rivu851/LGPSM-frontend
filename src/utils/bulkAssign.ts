// Selection-based staff assignment on User Management. The server decides who may be assigned to what (own staff, own events,
// active accounts, not a cancelled event); this only keeps the toolbar and the result messages honest.

import { isAssignableEvent } from "./assignableEvent.ts";

export interface AssignableEvent { id: string; name: string; status?: string; end?: unknown }

/** Events staff can still be assigned to: not cancelled, not completed, and whose end time has not passed. */
export function assignableEvents<T extends AssignableEvent>(events: T[]): T[] {
  return events.filter(isAssignableEvent);
}

export function selectionLabel(count: number): string {
  return `${count} ${count === 1 ? "user" : "users"} selected`;
}

/** Only ids that are still in the visible list can be assigned (a stale selection after a search or a reload is dropped). */
export function eligibleSelection(selectedIds: string[], visibleIds: string[]): string[] {
  const visible = new Set(visibleIds);
  return [...new Set(selectedIds)].filter((id) => visible.has(id));
}

export interface AssignFailure { name: string; message: string }

/** One sentence for the outcome of assigning `total` users: all saved, some saved, or none. */
export function describeAssignResult(total: number, failures: AssignFailure[]): { kind: "success" | "partial" | "failure"; message: string } {
  const saved = total - failures.length;
  const detail = failures.map((f) => `${f.name}: ${f.message}`).join("; ");
  if (failures.length === 0) return { kind: "success", message: `${total === 1 ? "1 user was" : `${total} users were`} assigned.` };
  if (saved === 0) return { kind: "failure", message: `No one was assigned. ${detail}` };
  return { kind: "partial", message: `${saved} of ${total} users were assigned. Not assigned — ${detail}` };
}
