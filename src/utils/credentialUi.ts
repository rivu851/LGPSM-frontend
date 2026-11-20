// Wording and rules for the access-pass controls. The server enforces every rule; these keep the UI honest and quick.
// Access pass status is its own concept: it is never merged with message delivery or RSVP, and "Replaced" is a historical
// state only (a guest with a newer pass is Active).

import type { CredentialHistoryRow, CredentialStatus, NoticeChannelState, ReasonCategory } from "@/services/credentialService";

export const NOTE_MAX = 500;

export const REASONS: { value: ReasonCategory; label: string }[] = [
  { value: "LOST_OR_COMPROMISED", label: "Lost or compromised pass" },
  { value: "FORWARDED_OR_SHARED", label: "Pass forwarded or shared" },
  { value: "DUPLICATE_OR_INCORRECT", label: "Duplicate or incorrectly issued pass" },
  { value: "ACCESS_WITHDRAWN", label: "Access withdrawn" },
  { value: "ATTENDEE_REQUESTED_REPLACEMENT", label: "Attendee requested replacement" },
  { value: "OTHER", label: "Other" },
];

export const reasonLabel = (value?: string) => REASONS.find((r) => r.value === value)?.label ?? "—";

/** "Access withdrawn" is a reason to take access away, never to issue a new pass. */
export const reasonsFor = (action: "REVOKE" | "REPLACE") => (action === "REPLACE" ? REASONS.filter((r) => r.value !== "ACCESS_WITHDRAWN") : REASONS);

/** Category mandatory; explanation optional, except for Other. Returns field errors. */
export function validatePassForm(action: "REVOKE" | "REPLACE", form: { category: string; note: string }): { category?: string; note?: string } {
  const errors: { category?: string; note?: string } = {};
  if (!reasonsFor(action).some((r) => r.value === form.category)) errors.category = "Choose a reason.";
  const note = form.note.trim();
  if (form.category === "OTHER" && !note) errors.note = "Explain the reason when you choose Other.";
  else if (note.length > NOTE_MAX) errors.note = `Keep the explanation under ${NOTE_MAX} characters.`;
  return errors;
}

export const STATUS_PILL: Record<CredentialStatus, { label: string; cls: string }> = {
  ACTIVE: { label: "Active", cls: "bg-[#C0FFD5] text-[#1A9242]" },
  REVOKED: { label: "Revoked", cls: "bg-[#FDE2E1] text-[#B42318]" },
  EXPIRED: { label: "Expired", cls: "bg-[#EDEDED] text-[#6E6E6E]" },
  NOT_ISSUED: { label: "Not issued", cls: "bg-[#F4F4F4] text-[#828282]" },
};

export type PassAvailability = { allowed: boolean; why?: string; needsReview?: boolean };

interface PassInvitee { credentialStatus?: CredentialStatus; credentialRevocation?: { category?: string } | null }

/** Whether the row menu offers an action. `eventStatus` is the event's status. */
export function revokeAvailability(i: PassInvitee, eventStatus?: string): PassAvailability {
  if (eventStatus && eventStatus !== "PUBLISHED") return { allowed: false, why: "Access passes can only be changed while the event is published." };
  if (i.credentialStatus === "NOT_ISSUED" || !i.credentialStatus) return { allowed: false, why: "This guest has no access pass yet." };
  if (i.credentialStatus === "REVOKED") return { allowed: false, why: "This pass is already revoked." };
  return { allowed: true };
}

export function replaceAvailability(i: PassInvitee, eventStatus?: string): PassAvailability {
  if (eventStatus && eventStatus !== "PUBLISHED") return { allowed: false, why: "Access passes can only be changed while the event is published." };
  if (i.credentialStatus === "NOT_ISSUED" || !i.credentialStatus) return { allowed: false, why: "This guest has no access pass yet." };
  if (i.credentialStatus === "EXPIRED") return { allowed: false, why: "The admission window has closed, so a new pass would not work either." };
  if (i.credentialStatus === "REVOKED") {
    const category = i.credentialRevocation?.category;
    if (category === "ACCESS_WITHDRAWN") return { allowed: false, why: "Access was withdrawn, so this pass cannot be replaced from here." };
    if (category === "OTHER") return { allowed: true, needsReview: true };
  }
  return { allowed: true };
}

export function historyTitle(row: Pick<CredentialHistoryRow, "type" | "version" | "previousVersion" | "source">): string {
  if (row.type === "REVOKED") return `Pass ${row.version} revoked`;
  if (row.type === "ISSUED") return `Pass ${row.version} issued`;
  if (row.type === "ACTIVATED") return `Pass ${row.version} activated (now the current pass)`;
  if (row.type === "EXPIRED") return `Pass ${row.version} expired`;
  const how = row.source === "RESEND" ? "re-sent with a new pass" : "replaced";
  return `Pass ${row.previousVersion ?? row.version - 1} ${how} → pass ${row.version} (Active)`;
}

/** What happened to the guest message for a credential change. "accepted" = the provider took it; delivery is never confirmed. */
export function noticeText(label: string, c?: NoticeChannelState): string | null {
  if (!c || c.status === "NOT_USED") return null;
  switch (c.status) {
    case "PENDING": case "SENDING": return `${label}: waiting`;
    case "SENT": return `${label}: accepted by the provider`;
    case "UNAVAILABLE": return `${label}: not sent — ${c.failureReason || "channel unavailable"}`;
    case "FAILED": return `${label}: failed — ${c.failureReason || "the provider refused it"}`;
    case "UNKNOWN": return `${label}: outcome unknown — it may already have been sent`;
    default: return null;
  }
}

export const hasUnsent = (rows: CredentialHistoryRow[]) => rows.some((r) => [r.notice?.email, r.notice?.whatsapp].some((c) => c && (c.status === "FAILED" || c.status === "UNAVAILABLE")));
export const hasUnknown = (rows: CredentialHistoryRow[]) => rows.some((r) => [r.notice?.email, r.notice?.whatsapp].some((c) => c?.status === "UNKNOWN"));

const EXPIRY_TEXT: Record<string, string> = {
  EVENT_CANCELLED: "The event was cancelled",
  EVENT_COMPLETED: "The event was completed or closed",
  ADMISSION_CLOSED: "The admission window closed",
};

/** The "reason" cell of a history row: a chosen reason for revoke/replace, the event's state for an expiry. */
export function historyReason(row: Pick<CredentialHistoryRow, "type" | "reasonCategory">): string {
  if (row.type === "EXPIRED") return EXPIRY_TEXT[row.reasonCategory as string] ?? "The event no longer admits guests";
  return row.reasonCategory ? reasonLabel(row.reasonCategory) : "—";
}

/** A short, non-secret reference to a pass, so rows about the same pass can be told apart. */
export const passRef = (credentialId?: string): string | null => (credentialId ? `#${credentialId.slice(-6)}` : null);
