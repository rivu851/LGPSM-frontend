// Wording and small decisions for the "Invitee Lists" modal, kept apart from the component so they can be tested.
// The server decides whether a list is Locked; nothing here recomputes it.

export const canManageInviteeLists = (role?: string | null): boolean => role === "ORGANIZER" || role === "ADMIN";

export const howAdded = (set: { source: string; mode: string }): string =>
  set.source === "MANUAL" ? "Added by hand / earlier uploads" : set.mode === "REPLACE" ? "Replaced list" : "Added to list";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Why the list is Open or Locked, in words the organizer can act on. */
export function stateExplanation(set: { locked: boolean; lockReasons: { sentGuests: number; answeredRsvp: number; checkedIn: number } | null; failed: number; unknown: number; replaceableGuests: number }): string {
  if (set.locked && set.lockReasons) {
    const parts = [
      set.lockReasons.sentGuests ? plural(set.lockReasons.sentGuests, "invitation sent", "invitations sent") : "",
      set.lockReasons.answeredRsvp ? plural(set.lockReasons.answeredRsvp, "RSVP answered", "RSVPs answered") : "",
      set.lockReasons.checkedIn ? plural(set.lockReasons.checkedIn, "guest checked in", "guests checked in") : "",
    ].filter(Boolean);
    return `Locked: ${parts.join(", ")}. The whole list is kept as it is, including guests who have not been sent anything yet.`;
  }
  const notes = [
    set.failed ? `${plural(set.failed, "guest has a failed send", "guests have failed sends")} (kept, can be retried)` : "",
    set.unknown ? `${plural(set.unknown, "guest has an unresolved delivery", "guests have unresolved deliveries")} (kept; they may have received it)` : "",
  ].filter(Boolean);
  const base = "Open: no invitation has been sent successfully from this list, nobody has answered and nobody has checked in.";
  const replace = set.replaceableGuests ? ` A Replace can set aside ${plural(set.replaceableGuests, "guest who was never invited", "guests who were never invited")}.` : "";
  return base + (notes.length ? ` ${notes.join("; ")}.` : "") + replace;
}

export type RestoreOutcome = { tone: "success" | "warning" | "error"; message: string; conflicts: string[] };

const matchedOn = (m: "email" | "mobile") => (m === "email" ? "email address" : "mobile number");

/** One line for the whole restore, plus one line per refused guest naming who they clash with. */
export function restoreOutcome(res: { restored: number; alreadyActive: number; refused: number; notFound: number; results: Array<{ id: string; status: string; conflictsWith?: { name: string; matchedOn: "email" | "mobile" } }> }, nameOf: (id: string) => string): RestoreOutcome {
  const conflicts = res.results
    .filter((r) => r.status === "DUPLICATE_ACTIVE" && r.conflictsWith)
    .map((r) => `${nameOf(r.id)} was not restored: ${r.conflictsWith!.name} on the active list has the same ${matchedOn(r.conflictsWith!.matchedOn)}. Edit or remove that guest first, then restore again.`);
  const parts = [
    res.restored ? `${plural(res.restored, "guest restored", "guests restored")} as Not sent (no invitation was sent and no access pass was created)` : "",
    res.alreadyActive ? `${plural(res.alreadyActive, "guest was", "guests were")} already active` : "",
    res.refused ? `${plural(res.refused, "guest", "guests")} could not be restored` : "",
    res.notFound ? `${plural(res.notFound, "guest was", "guests were")} not found` : "",
  ].filter(Boolean);
  return { tone: res.refused || res.notFound ? (res.restored ? "warning" : "error") : "success", message: parts.join("; ") + ".", conflicts };
}

export const DELIVERY_LABEL: Record<string, string> = { NOT_SENT: "Not sent", SENT: "Sent", FAILED: "Sending failed", UNKNOWN: "Outcome unknown" };

/** Maps an API refusal to the sentence shown to the organizer. */
export function restoreErrorMessage(message?: string): string {
  return message || "The guests could not be restored. Nothing was changed.";
}

// ---- Replace / Append preview ----

export interface PreviewLike {
  totalRows: number; validNew: number; duplicateRows: number; matchedExistingGuests: number; existingActive: number;
  lockedGuestsKept: number; lockedInvitedKept?: number; lockedNotInvitedKept?: number; failedKept: number; unknownKept: number; wouldSetAside: number; rejectedRows: number;
  errors: { row: number; error: string }[];
}

const guests = (n: number) => `${n} ${n === 1 ? "guest" : "guests"}`;

/** The lines shown under each choice in the Replace / Append dialog. */
export function previewLines(p: PreviewLike, mode: "REPLACE" | "APPEND"): string[] {
  const out = [`${guests(p.validNew)} will be added`];
  if (p.matchedExistingGuests || p.duplicateRows) {
    const parts = [p.matchedExistingGuests ? `${p.matchedExistingGuests} already on the list` : "", p.duplicateRows ? `${p.duplicateRows} repeated in the file` : ""].filter(Boolean);
    out.push(`${parts.join(", ")} (not added again)`);
  }
  if (p.rejectedRows - p.duplicateRows > 0) out.push(`${p.rejectedRows - p.duplicateRows} ${p.rejectedRows - p.duplicateRows === 1 ? "row has" : "rows have"} a problem and will be skipped`);
  if (mode === "REPLACE") {
    out.push(p.wouldSetAside ? `${guests(p.wouldSetAside)} ${p.wouldSetAside === 1 ? "who was" : "who were"} never invited will be set aside` : "No one will be set aside");
    if (p.lockedInvitedKept !== undefined) {
      // already-invited guests and the not-yet-invited guests of a sent list are different people: say so, so the numbers match the header
      if (p.lockedInvitedKept) out.push(`${guests(p.lockedInvitedKept)} already invited stay${p.lockedInvitedKept === 1 ? "s" : ""} exactly as ${p.lockedInvitedKept === 1 ? "it is" : "they are"}`);
      if (p.lockedNotInvitedKept) out.push(`${guests(p.lockedNotInvitedKept)} not yet invited in an already-sent list also stay${p.lockedNotInvitedKept === 1 ? "s" : ""} (a sent list is kept whole)`);
    } else if (p.lockedGuestsKept) out.push(`${guests(p.lockedGuestsKept)} in already-sent lists ${p.lockedGuestsKept === 1 ? "stays" : "stay"} exactly as ${p.lockedGuestsKept === 1 ? "it is" : "they are"}`);
    if (p.failedKept) out.push(`${guests(p.failedKept)} with a failed send ${p.failedKept === 1 ? "stays" : "stay"} and can be retried`);
    if (p.unknownKept) out.push(`${guests(p.unknownKept)} with an unresolved delivery ${p.unknownKept === 1 ? "stays" : "stay"} (${p.unknownKept === 1 ? "they may" : "they may"} have received it)`);
  } else {
    out.push(`All ${p.existingActive} current ${p.existingActive === 1 ? "guest stays" : "guests stay"}`);
  }
  return out;
}

/** The preview is a forecast: the real import checks again. When the two differ, say so plainly. */
export function previewDiscrepancy(p: PreviewLike | null | undefined, actual: { imported: number; archived?: number }): string | null {
  if (!p) return null;
  const diffs: string[] = [];
  if (actual.imported !== p.validNew) diffs.push(`${guests(actual.imported)} added (previewed ${p.validNew})`);
  if ((actual.archived ?? 0) !== p.wouldSetAside) diffs.push(`${guests(actual.archived ?? 0)} set aside (previewed ${p.wouldSetAside})`);
  return diffs.length ? `The list changed while you were deciding, so the result differs from the preview: ${diffs.join("; ")}. Guests who were invited in the meantime are always kept.` : null;
}

/** True when the file holds nobody new and every guest in it has already been invited: the same list uploaded again after it was sent */
export function alreadyUploadedAndSent(p: Pick<PreviewLike, "validNew" | "matchedExistingGuests"> & { alreadyInvited?: number } | null | undefined): boolean {
  return !!p && p.validNew === 0 && p.matchedExistingGuests > 0 && (p.alreadyInvited ?? 0) >= p.matchedExistingGuests;
}

/** A list is named after the file it came from; show that name without the spreadsheet extension */
export const listDisplayName = (name: string): string => name.replace(/\.(xlsx|xls|csv)$/i, "").trim() || name;
