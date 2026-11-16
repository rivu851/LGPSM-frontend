import type { CheckInRecord } from "@/services/checkInService";

// The event page "Access Logs" panel lists GUEST ENTRY activity (Figma 426:2): who came in, when, in which session, admitted by whom.
// General audit actions are a different thing and are not shown here. Check-out is not implemented, so the exit time is always
// "—": no time is ever invented.

export interface AccessLogRow {
  id: string;
  guest: string;
  mobile: string;
  session: string;
  entryAt: string;
  exitAt: string | null;
  staff: string;
}

export const EXIT_NOT_RECORDED = "Check-out is not recorded yet, so there is no exit time.";

export function toAccessLogRow(r: CheckInRecord): AccessLogRow {
  const by = typeof r.checkedInBy === "object" && r.checkedInBy ? r.checkedInBy.fullName || r.checkedInBy.email || "" : "";
  return {
    id: r._id,
    guest: r.invitee?.name || "Guest",
    mobile: r.invitee?.mobile || "—",
    session: r.session?.name || "Whole event",
    entryAt: r.checkInAt,
    // a real exit time would come from a recorded check-out; none exists today
    exitAt: ((r as unknown as { checkOutAt?: string | null }).checkOutAt) || null,
    staff: by || "—",
  };
}
