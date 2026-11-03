// The "Add to session" choice when adding invitees. Every session of the event can be chosen. A session that "keeps the same
// invitees as" another has no list of its own: guests added to it belong to the session that owns the list, so choosing it is
// labelled with that and resolves to the owner's id when saving (the server refuses an upload into such a session, and a guest's
// access is always checked against the list owner). With one session or none there is nothing to choose, so no field is shown.

export interface PickableSession {
  _id?: string;
  name: string;
  inviteeSource?: string;
  sourceSessionId?: string | { _id?: string } | null;
}

export interface SessionPickOption {
  /** The session the organizer chose */
  id: string;
  /** What the dropdown shows; says so when the session shares another session's guest list */
  name: string;
  /** The session that owns the guest list (the same as `id` unless the session shares another's list): what is sent to the server */
  listId: string;
}

/** Sessions that keep their own invitee list */
export const ownListSessions = <T extends PickableSession>(sessions: T[]): T[] => sessions.filter((s) => s.inviteeSource !== "COPY_SESSION");

const idOf = (v: PickableSession["sourceSessionId"]): string => (v && typeof v === "object" ? String(v._id ?? "") : v ? String(v) : "");

/** The choices for the "Add to session" field; empty when the event has fewer than two sessions */
export function sessionPickOptionsFor(sessions: PickableSession[]): SessionPickOption[] {
  if (sessions.length < 2) return [];
  const byId = new Map(sessions.map((s) => [String(s._id), s]));
  return sessions.map((s) => {
    const id = String(s._id);
    const sourceId = s.inviteeSource === "COPY_SESSION" ? idOf(s.sourceSessionId) : "";
    const source = sourceId ? byId.get(sourceId) : undefined;
    return source
      ? { id, name: `${s.name} (same guest list as ${source.name})`, listId: sourceId }
      : { id, name: s.name, listId: id };
  });
}

/** The list-owning session for a chosen session id ("" stays "": the whole event) */
export function listIdFor(options: SessionPickOption[], chosenId: string): string {
  return options.find((o) => o.id === chosenId)?.listId ?? chosenId;
}
