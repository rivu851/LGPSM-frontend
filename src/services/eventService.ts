/**
 * API service for event creation, updates, listing, and media presigns.
 *
 * Integration Contract:
 * - Authentication: All write operations and organizer event queries require authenticated sessions (`requiresAuth = true`).
 * - Payload Contract: Dates (`schedule.start`, `schedule.end`, `rsvp.acceptanceLastDate`) are sent as UTC ISO-8601 strings.
 * - Rate Locking: New event creation triggers backend price rate locking for the event.
 */

import { apiClient, ApiResponse } from "./apiClient";

// ─────────────────────────────────────────────
// Event API Types
// ─────────────────────────────────────────────

export interface EventData {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  schedule?: {
    start: string;
    end: string;
  };
  rsvpDeadline?: string;
  location?: string | { address?: string };
  venueDetails?: string;
  maxAttendees?: number;
  isPublic?: boolean;
  status?: "draft" | "published" | "cancelled" | "completed" | "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  operationalDataCleared?: boolean;
  organizerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventsListData {
  events: EventData[];
  total?: number;
  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────────
// Media Presign Types (S3 — isolated until configured)
// ─────────────────────────────────────────────

export interface PresignPayload {
  fileName: string;
  fileType: string;
  folder?: string;
}

export interface PresignData {
  uploadUrl: string;
  fileKey: string;
  publicUrl?: string;
}

// ─────────────────────────────────────────────
// Request shapes (mirror backend validators in event.validator.ts; dates are ISO strings)
// ─────────────────────────────────────────────

interface EventRequestBase {
  title: string;
  description?: string;
  categoryId?: string;
  subcategoryId?: string;
  contactNumber?: string;
  location?: { address?: string };
  schedule: { start: string; end: string };
  rsvp?: {
    enabled: boolean;
    acceptanceLastDate?: string;
    allowAllInvited: boolean;
    allowNotResponded: boolean;
    allowDeclined: boolean;
  };
  attendeeSettings?: { thresholdLimit?: number };
  dietaryPreference?: { enabled: boolean; title?: string; options?: unknown[] };
  templateId?: string;
  media?: { logoKey?: string };
}

export interface CreateEventRequest extends EventRequestBase {
  format?: "PHYSICAL" | "VIRTUAL";
}

export type UpdateEventRequest = Partial<EventRequestBase> & {
  status?: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
};

export const eventService = {
  /**
   * Create a new event
   * POST /api/v1/events
   */
  async createEvent(payload: CreateEventRequest): Promise<ApiResponse<EventData>> {
    return apiClient<EventData>("/api/v1/events", {
      method: "POST",
      body: JSON.stringify(payload),
    }, true);
  },

  /**
   * Get all events for the authenticated organizer
   * GET /api/v1/events
   */
  async getEvents(params?: { page?: number; limit?: number; organizerId?: string }): Promise<ApiResponse<EventsListData>> {
    // Backend defaults to 10 per page; callers here render full lists/dropdowns
    const effectiveParams = { limit: 100, ...(params || {}) };
    const queryString = effectiveParams
      ? `?${new URLSearchParams(
          Object.fromEntries(
            Object.entries(effectiveParams)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)])
          )
        ).toString()}`
      : "";
    return apiClient<EventsListData>(`/api/v1/events${queryString}`, {
      method: "GET",
    }, true);
  },

  /**
   * Get a single event by ID
   * GET /api/v1/events/:eventId
   */
  async getEvent(eventId: string): Promise<ApiResponse<EventData>> {
    return apiClient<EventData>(`/api/v1/events/${eventId}`, {
      method: "GET",
    }, true);
  },

  /**
   * Update an existing event
   * PATCH /api/v1/events/:eventId
   */
  async updateEvent(eventId: string, payload: UpdateEventRequest): Promise<ApiResponse<EventData>> {
    return apiClient<EventData>(`/api/v1/events/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }, true);
  },

  /**
   * Delete an event
   * DELETE /api/v1/events/:eventId
   */
  async deleteEvent(eventId: string): Promise<ApiResponse> {
    return apiClient(`/api/v1/events/${eventId}`, {
      method: "DELETE",
    }, true);
  },

  /**
   * Perform operational data cleanup for a completed event (ADMIN ONLY)
   * POST /api/v1/events/:eventId/cleanup
   */
  async cleanupEventData(eventId: string): Promise<ApiResponse<EventData>> {
    return apiClient<EventData>(`/api/v1/events/${eventId}/cleanup`, {
      method: "POST",
    }, true);
  },

  /**
   * Get presigned URL for media upload
   * POST /api/v1/media/presign
   */
  async presignMedia(payload: PresignPayload): Promise<ApiResponse<PresignData>> {
    return apiClient<PresignData>("/api/v1/media/presign", {
      method: "POST",
      body: JSON.stringify(payload),
    }, true);
  },
};
