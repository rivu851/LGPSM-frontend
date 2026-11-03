/**
 * API service for event creation, updates, listing, and media presigns.
 *
 * Integration Contract:
 * - Authentication: All write operations and organizer event queries require authenticated sessions (`requiresAuth = true`).
 * - Payload Contract: Dates (`schedule.start`, `schedule.end`, `rsvp.acceptanceLastDate`) are sent as UTC ISO-8601 strings.
 * - Rate Locking: New event creation triggers backend price rate locking for the event.
 */

import { listAllPages } from "./listAll";
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
  admission?: { opensAt?: string | null; closesAt?: string | null };
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

export interface CancelEventResult {
  eventId: string;
  status: string;
  cancelledAt?: string;
  alreadyCancelled?: boolean;
  notices?: { eligible: number; created: number };
}

export interface CancellationPreview {
  invitedGuests: number;
  byChannel: { email: number; whatsapp: number; unknownChannel: number };
  notInvited: number;
  whatsappNoticesAvailable: boolean;
}

export type NoticeCounts = Record<"PENDING" | "SENDING" | "SENT" | "FAILED" | "UNAVAILABLE" | "UNKNOWN", number>;
export interface CancellationNotices {
  cancelledAt?: string;
  reason?: string;
  guests: number;
  channels: { email: NoticeCounts; whatsapp: NoticeCounts };
  problems: { inviteeId: string; name?: string; channel: "email" | "whatsapp"; status: "FAILED" | "UNAVAILABLE" | "UNKNOWN"; reason?: string; attempts?: number }[];
  note?: string;
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
  location?: { address?: string; coordinates?: [number, number] };
  schedule: { start: string; end: string };
  /** Check-in window; a null side follows the event's start/end */
  admission?: { opensAt: string | null; closesAt: string | null };
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
  organizerId?: string;
  organizerIds?: string[];
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
    const onePage = (query: Record<string, unknown>) => {
      const queryString = new URLSearchParams(
        Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
      ).toString();
      return apiClient<EventsListData>(`/api/v1/events?${queryString}`, { method: "GET" }, true);
    };
    if (params?.page !== undefined) return onePage({ limit: 100, ...params });
    // Callers here render full lists and dropdowns, so every page is fetched
    return listAllPages<unknown>((page) => onePage({ limit: 100, ...params, page }) as unknown as Promise<ApiResponse<unknown[]>>) as unknown as Promise<ApiResponse<EventsListData>>;
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
   * The three totals on an event's tab strip (sessions, invitees, assigned staff) in one request.
   * GET /api/v1/events/:eventId/counts
   */
  async getEventCounts(eventId: string): Promise<ApiResponse<{ sessions: number; invitees: number; assignments: number }>> {
    return apiClient<{ sessions: number; invitees: number; assignments: number }>(`/api/v1/events/${eventId}/counts`, {
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
   * Change only the check-in window (allowed after invitations were sent). A null side returns to its default.
   * PATCH /api/v1/events/:eventId/admission
   */
  async updateAdmission(eventId: string, admission: { opensAt?: string | null; closesAt?: string | null }): Promise<ApiResponse<EventData>> {
    return apiClient<EventData>(`/api/v1/events/${eventId}/admission`, {
      method: "PATCH",
      body: JSON.stringify(admission),
    }, true);
  },

  /**
   * Cancel an event. Terminal: there is no reinstate. Previously invited guests are queued to be told.
   * POST /api/v1/events/:eventId/cancel
   */
  async cancelEvent(eventId: string, reason?: string): Promise<ApiResponse<CancelEventResult>> {
    return apiClient<CancelEventResult>(`/api/v1/events/${eventId}/cancel`, {
      method: "POST",
      body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {}),
    }, true);
  },

  /** Who would be told if the event were cancelled now (GET /events/:id/cancellation/preview) */
  async getCancellationPreview(eventId: string): Promise<ApiResponse<CancellationPreview>> {
    return apiClient<CancellationPreview>(`/api/v1/events/${eventId}/cancellation/preview`, { method: "GET" }, true);
  },

  /** What happened to the cancellation notices (GET /events/:id/cancellation/notices) */
  async getCancellationNotices(eventId: string): Promise<ApiResponse<CancellationNotices>> {
    return apiClient<CancellationNotices>(`/api/v1/events/${eventId}/cancellation/notices`, { method: "GET" }, true);
  },

  /** Retry failed / unavailable notices; messages already sent are never repeated */
  async retryCancellationNotices(eventId: string, opts: { includeUnknown?: boolean } = {}): Promise<ApiResponse<CancellationNotices>> {
    // includeUnknown also retries messages whose earlier attempt may have gone out (a duplicate is possible): explicit opt-in only
    return apiClient<CancellationNotices>(`/api/v1/events/${eventId}/cancellation/notices/retry`, { method: "POST", body: JSON.stringify(opts.includeUnknown ? { includeUnknown: true } : {}) }, true);
  },

  /**
   * Close (complete) an event. Nothing is deleted: guests, invitations, RSVPs, check-ins and reports are kept.
   * POST /api/v1/events/:eventId/close
   */
  async closeEvent(eventId: string): Promise<ApiResponse<EventData>> {
    return apiClient<EventData>(`/api/v1/events/${eventId}/close`, {
      method: "POST",
    }, true);
  },

  /**
   * PERMANENTLY delete the operational data of a closed event (ADMIN ONLY, irreversible).
   * The event title must be retyped as confirmation.
   * POST /api/v1/events/:eventId/cleanup
   */
  async cleanupEventData(eventId: string, confirmTitle: string): Promise<ApiResponse<EventData>> {
    return apiClient<EventData>(`/api/v1/events/${eventId}/cleanup`, {
      method: "POST",
      body: JSON.stringify({ confirmTitle }),
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
