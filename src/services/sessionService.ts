import { apiClient, ApiResponse } from "./apiClient";

export interface SessionData {
  _id?: string;
  id?: string;
  eventId: string;
  name: string;
  schedule?: { start: string; end: string };
  validateAgainstOtherSessions?: boolean;
  description?: string;
  speaker?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  maxAttendees?: number;
  accessControl?: string;
  inviteeSource?: "NEW_LIST" | "COPY_SESSION";
  sourceSessionId?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Mirrors backend session.validator.ts; schedule values are ISO strings
export interface SessionRequest {
  name: string;
  schedule: { start: string; end: string };
  accessControl?: "NO_RESTRICTION" | "ONLY_ONCE";
  validateAgainstOtherSessions?: boolean;
  inviteeSource?: "NEW_LIST" | "COPY_SESSION";
  sourceSessionId?: string | null;
}

export const sessionService = {
  /**
   * Create a session for an event
   * POST /api/v1/events/:eventId/sessions
   */
  async createSession(eventId: string, payload: SessionRequest): Promise<ApiResponse<SessionData>> {
    return apiClient<SessionData>(`/api/v1/events/${eventId}/sessions`, {
      method: "POST",
      body: JSON.stringify(payload),
    }, true);
  },

  /**
   * List sessions for an event
   * GET /api/v1/events/:eventId/sessions
   */
  async getSessions(eventId: string): Promise<ApiResponse<SessionData[]>> {
    // Backend pages at 10 by default; callers render the full list
    return apiClient<SessionData[]>(`/api/v1/events/${eventId}/sessions?limit=100`, {
      method: "GET",
    }, true);
  },

  /**
   * Get session by ID
   * GET /api/v1/sessions/:sessionId
   */
  async getSession(sessionId: string): Promise<ApiResponse<SessionData>> {
    return apiClient<SessionData>(`/api/v1/sessions/${sessionId}`, {
      method: "GET",
    }, true);
  },

  /**
   * Update session
   * PATCH /api/v1/sessions/:sessionId
   */
  async updateSession(sessionId: string, payload: Partial<SessionRequest>): Promise<ApiResponse<SessionData>> {
    return apiClient<SessionData>(`/api/v1/sessions/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }, true);
  },

  /**
   * Delete / deactivate session
   * DELETE /api/v1/sessions/:sessionId
   */
  async deleteSession(sessionId: string): Promise<ApiResponse> {
    return apiClient(`/api/v1/sessions/${sessionId}`, {
      method: "DELETE",
    }, true);
  },
};
