import { listAllPages } from "./listAll";
import { apiClient, ApiResponse } from "./apiClient";

export interface SessionAccessItem {
  sessionId: string;
  allowed: boolean;
}

export interface InviteeData {
  _id?: string;
  id?: string;
  eventId: string;
  name: string;
  email?: string;
  mobile?: string;
  company?: string;
  /** e.g. "Employee ID: 4521" */
  professionalIdentity?: string;
  dietaryPreference?: string;
  dietarySelections?: { title: string; value: string }[];
  category?: string;
  qrCode?: string;
  registrationStatus?: "pending" | "confirmed" | "checked_in" | "cancelled";
  sessionAccess?: SessionAccessItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInviteePayload {
  name: string;
  email?: string;
  mobile?: string;
  company?: string;
  companyName?: string;
  professionalIdentity?: string;
  secondaryIdentity?: string;
  category?: string;
  dietaryPreference?: string;
  dietarySelections?: { title: string; value: string }[];
  rsvpStatus?: "PENDING" | "ACCEPTED" | "DECLINED";
  sessionAccess?: SessionAccessItem[];
}

export interface BulkSessionAccessPayload {
  inviteeIds: string[];
  sessionAccess: SessionAccessItem[];
}

export type ImportMode = "REPLACE" | "APPEND";

export interface InviteeSetInfo {
  /** "legacy" is the list of guests added by hand or before lists were tracked */
  id: string;
  name: string;
  source: "EXCEL" | "MANUAL";
  /** The session the list was uploaded for; null for the whole event */
  sessionId?: string | null;
  mode: ImportMode;
  createdAt: string | null;
  uploadedBy: { id: string; name: string; role: string } | null;
  importedCount: number | null;
  /** When the first and the latest invitation from this list were handed over (null when none was sent) */
  firstSentAt?: string | null;
  lastSentAt?: string | null;
  /** Active guests now in the list */
  total: number;
  sent: number;
  notSent: number;
  /** Alias of notSent (older responses) */
  unsent: number;
  failed: number;
  /** Delivery attempted, outcome never settled: not failed, not "never invited" */
  unknown: number;
  rsvp: number;
  checkedIn: number;
  setAside: number;
  /** Decided by the server */
  locked: boolean;
  lockReasons: { sentGuests: number; answeredRsvp: number; checkedIn: number } | null;
  replaceableGuests: number;
}

export type DeliveryState = "NOT_SENT" | "SENT" | "FAILED" | "UNKNOWN";

export interface InviteeSetMember {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  company?: string | null;
  delivery: DeliveryState;
  rsvpStatus: "PENDING" | "ACCEPTED" | "DECLINED";
  checkedIn: boolean;
}

export interface SetAsideGuest {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  fromSet: { id: string; name: string };
  setAsideAt: string;
  reason: string | null;
  reasonText: string | null;
  replacedBy: { id: string; name: string } | null;
  setAsideBy: { id: string; name: string; role: string } | null;
}

export interface RestoreGuestResult {
  id: string;
  status: "RESTORED" | "ALREADY_ACTIVE" | "DUPLICATE_ACTIVE" | "NOT_FOUND";
  conflictsWith?: { id: string; name: string; matchedOn: "email" | "mobile" };
}

export interface RestoreResult {
  restored: number;
  alreadyActive: number;
  refused: number;
  notFound: number;
  results: RestoreGuestResult[];
}

/** What an import would do, worked out by the server from the same checks as the real import; nothing is written */
export interface ImportPreview {
  totalRows: number;
  validNew: number;
  duplicateRows: number;
  matchedExistingGuests: number;
  /** Of the matched guests, how many were already invited (or sit in a list that was sent) */
  alreadyInvited?: number;
  existingActive: number;
  lockedGuestsKept: number;
  /** Of those, guests who were actually invited / not yet invited but in an already-sent (locked) list */
  lockedInvitedKept?: number;
  lockedNotInvitedKept?: number;
  failedKept: number;
  unknownKept: number;
  wouldSetAside: number;
  preservedSets: number;
  rejectedRows: number;
  errors: { row: number; error: string }[];
}

export interface ImportExcelResult {
  dryRun?: boolean;
  preview?: ImportPreview;
  totalRows: number;
  imported: number;
  updated?: number;
  // Not-yet-invited invitees of an earlier list that this upload replaced (archived, never deleted)
  removed?: number;
  /** Guests whose delivery failed or never settled: kept, never set aside */
  failedKept?: number;
  unknownKept?: number;
  archived?: number;
  /** Rows that matched a guest who has already been invited: they are not imported again */
  alreadyInvited?: number;
  /** Lists an invitation was already sent from; kept whole */
  preservedSets?: number;
  setId?: string | null;
  mode?: ImportMode;
  rejected: number;
  duplicateCount: number;
  /** Rows that matched an existing guest whose differing details were kept */
  notices?: { row: number; message: string }[];
  errors?: { row: number; error: string }[];
}

export const inviteeService = {
  /**
   * Create invitee
   * POST /api/v1/events/:eventId/invitees
   */
  async createInvitee(eventId: string, payload: CreateInviteePayload): Promise<ApiResponse<InviteeData>> {
    return apiClient<InviteeData>(`/api/v1/events/${eventId}/invitees`, {
      method: "POST",
      body: JSON.stringify(payload),
    }, true);
  },

  /**
   * List invitees for event
   * GET /api/v1/events/:eventId/invitees
   */
  async getInvitees(eventId: string, options: { page?: number; limit?: number } = {}): Promise<ApiResponse<InviteeData[]>> {
    const onePage = (page: number, limit: number) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      return apiClient<InviteeData[]>(`/api/v1/events/${eventId}/invitees?${params}`, { method: "GET" }, true);
    };
    // No page asked for: the whole list (screens that filter, count and select in the browser need every guest)
    if (options.page === undefined && options.limit === undefined) return listAllPages((page) => onePage(page, 100));
    return onePage(options.page ?? 1, options.limit ?? 100);
  },

  /**
   * Get invitee by ID
   * GET /api/v1/invitees/:inviteeId
   */
  async getInvitee(inviteeId: string): Promise<ApiResponse<InviteeData>> {
    return apiClient<InviteeData>(`/api/v1/invitees/${inviteeId}`, {
      method: "GET",
    }, true);
  },

  /**
   * Update invitee
   * PATCH /api/v1/invitees/:inviteeId
   */
  async updateInvitee(inviteeId: string, payload: Partial<CreateInviteePayload>): Promise<ApiResponse<InviteeData>> {
    return apiClient<InviteeData>(`/api/v1/invitees/${inviteeId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }, true);
  },

  /**
   * Delete invitee
   * DELETE /api/v1/invitees/:inviteeId
   */
  async deleteInvitee(inviteeId: string): Promise<ApiResponse> {
    return apiClient(`/api/v1/invitees/${inviteeId}`, {
      method: "DELETE",
    }, true);
  },

  /**
   * Import invitees from Excel file (.xlsx / .xls)
   * POST /api/v1/events/:eventId/invitees/import
   */
  // The latest upload replaces the not-yet-invited list (for the event, or for one session when sessionId is given)
  async getInviteeSets(eventId: string): Promise<ApiResponse<{ sets: InviteeSetInfo[]; hasSent: boolean; archivedCount: number }>> {
    return apiClient(`/api/v1/events/${eventId}/invitees/sets`, { method: "GET" }, true);
  },

  /** Deletes all of the event's invitee lists, only while nothing has been sent (the card's guest details changed after the Excel sample was downloaded) */
  async clearUnusedLists(eventId: string): Promise<ApiResponse<{ deletedInvitees: number; deletedLists: number }>> {
    return apiClient(`/api/v1/events/${eventId}/invitees/sets/clear`, { method: "POST" }, true);
  },

  /** One page (50) of the guests in a list; setId "all" covers every list. `q` searches name, email, mobile and company on the server. */
  async getSetMembers(eventId: string, setId: string, page = 1, q = ""): Promise<ApiResponse<{ members: InviteeSetMember[]; total: number; page: number; limit: number }>> {
    return apiClient(`/api/v1/events/${eventId}/invitees/sets/${setId}/members?page=${page}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`, { method: "GET" }, true);
  },

  async getSetAside(eventId: string, opts: { q?: string; page?: number } = {}): Promise<ApiResponse<{ guests: SetAsideGuest[]; total: number; page: number; limit: number; restorable: boolean; notRestorableReason: string | null }>> {
    const params = new URLSearchParams({ page: String(opts.page ?? 1) });
    if (opts.q?.trim()) params.set("q", opts.q.trim());
    return apiClient(`/api/v1/events/${eventId}/invitees/set-aside?${params}`, { method: "GET" }, true);
  },

  async restoreSetAside(eventId: string, inviteeIds: string[]): Promise<ApiResponse<RestoreResult>> {
    return apiClient(`/api/v1/events/${eventId}/invitees/set-aside/restore`, { method: "POST", body: JSON.stringify({ inviteeIds }) }, true);
  },

  async importExcel(eventId: string, file: File, sessionId?: string, mode: ImportMode = "REPLACE", options: { dryRun?: boolean } = {}): Promise<ApiResponse<ImportExcelResult>> {
    const formData = new FormData();
    formData.append("mode", mode);
    if (options.dryRun) formData.append("dryRun", "true");
    if (sessionId) formData.append("sessionId", sessionId);
    formData.append("file", file);

    return apiClient<ImportExcelResult>(
      `/api/v1/events/${eventId}/invitees/import`,
      {
        method: "POST",
        body: formData,
      },
      true
    );
  },

  /**
   * Update single invitee session access
   * PUT /api/v1/invitees/:inviteeId/session-access
   */
  async updateSessionAccess(
    inviteeId: string,
    sessionAccess: SessionAccessItem[]
  ): Promise<ApiResponse<InviteeData>> {
    return apiClient<InviteeData>(
      `/api/v1/invitees/${inviteeId}/session-access`,
      {
        method: "PUT",
        body: JSON.stringify({ sessionAccess }),
      },
      true
    );
  },

  /**
   * Bulk update session access for multiple invitees
   * PUT /api/v1/events/:eventId/invitees/session-access/bulk
   */
  async bulkUpdateSessionAccess(
    eventId: string,
    payload: BulkSessionAccessPayload
  ): Promise<ApiResponse<{ updatedCount: number }>> {
    return apiClient<{ updatedCount: number }>(
      `/api/v1/events/${eventId}/invitees/session-access/bulk`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      true
    );
  },
};
