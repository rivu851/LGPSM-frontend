// Masks a raw backend ObjectId for display — shows the last 4 hex digits with a readable prefix.
// The full ID is still used in URLs and API calls; this is display-only.

export function formatEventId(id: string | undefined | null): string {
  if (!id) return "—";
  return `EVT_${String(id).slice(-4).toUpperCase()}`;
}

// An organizer's ID: ORG_ followed by the last 8 characters of their account id, e.g. ORG_9E8D0088. Long enough that two organizers
// never share one. It is shown in the organizer's own profile and on the Reports action log, and cannot be edited.
export function formatOrganizerId(id: string | undefined | null): string {
  if (!id) return "—";
  return `ORG_${String(id).slice(-8).toUpperCase()}`;
}

export function formatUserId(id: string | undefined | null): string {
  if (!id) return "—";
  return `USR_${String(id).slice(-4).toUpperCase()}`;
}
