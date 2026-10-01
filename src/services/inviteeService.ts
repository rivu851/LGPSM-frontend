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
  designation?: string;
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
  designation?: string;
  category?: string;
  dietaryPreference?: string;
  rsvpStatus?: "PENDING" | "ACCEPTED" | "DECLINED";
  sessionAccess?: SessionAccessItem[];
}

export interface BulkSessionAccessPayload {
  inviteeIds: string[];
  sessionAccess: SessionAccessItem[];
}

export interface ImportExcelResult {
  totalRows: number;
  imported: number;
  updated?: number;
  // Not-yet-invited invitees dropped because the new file replaced them
  removed?: number;
  rejected: number;
  duplicateCount: number;
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
  async getInvitees(eventId: string): Promise<ApiResponse<InviteeData[]>> {
    return apiClient<InviteeData[]>(`/api/v1/events/${eventId}/invitees?limit=1000`, {
      method: "GET",
    }, true);
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
  async importExcel(eventId: string, file: File, sessionId?: string): Promise<ApiResponse<ImportExcelResult>> {
    const formData = new FormData();
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
