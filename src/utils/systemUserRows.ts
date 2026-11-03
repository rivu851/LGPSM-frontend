// Shapes and helpers shared by the staff pages. They live here, not in a page file: Next.js only allows a page to export the page itself.

export interface AssignedSession {
  id: string;
  name: string;
  time?: string;
}

export interface AssignedEventCard {
  id: string;
  eventName: string;
  dateStr?: string;
  assignedBy?: string;
  assignedAt?: string;
  sessions: AssignedSession[];
}

export interface SystemUserRow {
  id: string; // User ID
  name: string;
  email: string;
  phone: string;
  role: string;
  assignments: {
    assignmentId: string;
    eventId: string;
    eventName: string;
    dateStr?: string;
    assignedBy?: string;
    assignedAt?: string;
    sessions: { id: string; name: string; time?: string }[];
  }[];
  assignedEvents?: AssignedEventCard[];
}

export const getAssignedCountText = (assignments: SystemUserRow["assignments"] = []): string => {
  const eventCount = assignments.length;
  let sessionCount = 0;
  // an assignment with no sessions listed covers every session of its event
  let allSessionEvents = 0;
  assignments.forEach((a) => {
    if (a.sessions?.length) sessionCount += a.sessions.length;
    else allSessionEvents += 1;
  });

  const eventLabel = eventCount === 1 ? "1 Event" : `${eventCount} Events`;
  const counted = sessionCount === 1 ? "1 Session" : `${sessionCount} Sessions`;
  const sessionLabel = allSessionEvents === 0 ? counted : sessionCount === 0 ? "All Sessions" : `${counted} + All Sessions`;
  return `${eventLabel} & ${sessionLabel}`;
};

/** The assign-users page lists by session: everyone on the event, one session's staff, or every system user (to assign new people). */
export const USERS_ON_EVENT = "assigned";
export const ALL_SYSTEM_USERS = "all";

export function filterSystemUsers<T extends Pick<SystemUserRow, "assignments">>(users: T[], eventId: string, filter: string): T[] {
  if (filter === ALL_SYSTEM_USERS) return users;
  const onEvent = (u: T) => u.assignments.find((a) => a.eventId === eventId);
  if (filter === USERS_ON_EVENT) return users.filter((u) => !!onEvent(u));
  // an assignment with no sessions listed covers the whole event, so that person can also work this session
  return users.filter((u) => {
    const a = onEvent(u);
    return !!a && (a.sessions.length === 0 || a.sessions.some((s) => s.id === filter));
  });
}
