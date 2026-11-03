import { apiClient, ApiResponse } from "./apiClient";

export interface AssignmentData {
  _id: string;
  userId: {
    _id: string;
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  } | string;
  eventId: {
    _id: string;
    title?: string;
    status?: string;
    format?: string;
    location?: string;
    schedule?: any;
  } | string;
  sessionIds: ({
    _id: string;
    name?: string;
    schedule?: any;
  } | string)[];
  assignedBy?: {
    _id: string;
    fullName?: string;
    email?: string;
  } | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAssignmentPayload {
  userId: string;
  sessionIds: string[];
}

export interface UpdateAssignmentPayload {
  sessionIds: string[];
}

export const assignmentService = {
  /**
   * Create assignment for an event
   * POST /api/v1/events/:eventId/assignments
   */
  async createAssignment(
    eventId: string,
    payload: CreateAssignmentPayload
  ): Promise<ApiResponse<AssignmentData>> {
    return apiClient<AssignmentData>(
      `/api/v1/events/${eventId}/assignments`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  /**
   * Get assignments for an event
   * GET /api/v1/events/:eventId/assignments
   */
  async getAssignmentsByEvent(eventId: string): Promise<ApiResponse<AssignmentData[]>> {
    return apiClient<AssignmentData[]>(
      `/api/v1/events/${eventId}/assignments`,
      {
        method: "GET",
      },
      true
    );
  },

  /** Staff already assigned to another event of the same organizer that runs at the same time as this one */
  async getOverlaps(eventId: string): Promise<ApiResponse<{ userId: string; eventId: string; title: string; start: string; end: string }[]>> {
    return apiClient(`/api/v1/events/${eventId}/assignments/overlaps`, { method: "GET" }, true);
  },

  /** Alias for getAssignmentsByEvent */
  async getEventAssignments(eventId: string): Promise<ApiResponse<AssignmentData[]>> {
    return this.getAssignmentsByEvent(eventId);
  },

  /**
   * Get my assignments (for logged in system user)
   * GET /api/v1/users/me/assignments
   */
  async getMyAssignments(): Promise<ApiResponse<AssignmentData[]>> {
    return apiClient<AssignmentData[]>(
      `/api/v1/users/me/assignments`,
      {
        method: "GET",
      },
      true
    );
  },

  /**
   * Update assignment (update assigned sessions)
   * PATCH /api/v1/assignments/:assignmentId
   */
  async updateAssignment(
    assignmentId: string,
    payload: UpdateAssignmentPayload
  ): Promise<ApiResponse<AssignmentData>> {
    return apiClient<AssignmentData>(
      `/api/v1/assignments/${assignmentId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  /**
   * Create the assignment, or update the sessions of the user's existing assignment for this event
   */
  async saveAssignment(
    eventId: string,
    userId: string,
    sessionIds: string[],
    existingAssignmentId?: string
  ): Promise<ApiResponse<AssignmentData>> {
    return existingAssignmentId
      ? this.updateAssignment(existingAssignmentId, { sessionIds })
      : this.createAssignment(eventId, { userId, sessionIds });
  },

  /**
   * Delete assignment (unassign)
   * DELETE /api/v1/assignments/:assignmentId
   */
  async deleteAssignment(assignmentId: string): Promise<ApiResponse<{ assignmentId: string; deleted: boolean }>> {
    return apiClient<{ assignmentId: string; deleted: boolean }>(
      `/api/v1/assignments/${assignmentId}`,
      {
        method: "DELETE",
      },
      true
    );
  },
};
