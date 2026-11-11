import { mapWithConcurrency } from "@/utils/mapWithConcurrency";
import { apiClient, ApiResponse, API_BASE_URL } from "./apiClient";
import { tokenStorage } from "./tokenStorage";

export interface SendInvitationsPayload {
  inviteeIds: string[];
  channel?: "EMAIL" | "SMS" | "WHATSAPP" | "BOTH";
}

export interface ResendInvitationsPayload {
  invitationIds: string[];
  channel?: "EMAIL" | "SMS" | "WHATSAPP" | "BOTH";
}

export interface SendResult {
  inviteeId: string;
  status: "SENT" | "PENDING" | "FAILED";
  failureReason?: string;
  emailStatus?: "SENT" | "FAILED" | "PENDING";
  whatsappStatus?: "SENT" | "FAILED" | "PENDING";
}

export interface ResendResult {
  invitationId: string;
  status: "SENT" | "PENDING" | "FAILED";
  failureReason?: string;
  emailStatus?: "SENT" | "FAILED" | "PENDING";
  whatsappStatus?: "SENT" | "FAILED" | "PENDING";
}

export interface InvitationData {
  _id: string;
  eventId: string;
  inviteeId: {
    _id: string;
    name: string;
    email?: string;
    mobile?: string;
    invitationStatus?: string;
    rsvpStatus?: string;
  } | string;
  channel: "EMAIL" | "SMS" | "WHATSAPP" | "BOTH";
  status: "SENT" | "PENDING" | "FAILED";
  failureReason?: string;
  sentAt?: string;
  createdAt?: string;
  // Set once the delivery history was cleared; the record is kept so Resend still works
  clearedAt?: string;
}

export interface GetInvitationsResponse {
  invitations: InvitationData[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PublicInvitationData {
  /** Colours/character of the guest's invitation design; absent on older API versions */
  /** The guest's current pass; REPLACED = this link is an old, superseded one (only the event title and guest name are sent) */
  credential?: { status: "ACTIVE" | "REVOKED" | "EXPIRED" | "NOT_ISSUED" | "REPLACED" };
  /** false when the organizer chose not to print the QR on the cards: the page shows the entry QR on its own */
  cardShowsQr?: boolean;
  theme?: { design?: string; background?: string; primary?: string; accent?: string; ink?: string; heading?: "serif" | "sans" };
  event: {
    title: string;
    description?: string;
    format?: string;
    status?: string;
    /** Present only when the event was cancelled */
    cancellation?: { cancelledAt?: string | null; reason?: string | null } | null;
    contactNumber?: string;
    organizerName?: string;
    location?: string | { address?: string; addressDetails?: string };
    schedule?: {
      start?: string;
      end?: string;
    };
    timeZone?: string;
    /** When guests can be checked in (defaults to the schedule) */
    admission?: { opensAt?: string | null; closesAt?: string | null } | null;
    sessions?: Array<{
      name: string;
      start?: string;
      end?: string;
    }>;
    /** Whether guests can answer; older API responses omit it (treated as on) */
    rsvp?: { enabled: boolean; closesAt: string | null };
    dietaryPreference?: {
      enabled?: boolean;
      title?: string;
      options?: Array<string | { title?: string; options?: unknown[] }>;
    };
  };
  invitee: {
    name: string;
    rsvpStatus: "PENDING" | "ACCEPTED" | "DECLINED";
    dietaryPreference?: string;
    dietarySelections?: Array<{ title: string; value: string }>;
  };
}

export interface DietarySelection {
  title: string;
  value: string;
}

export interface RsvpPayload {
  rsvpStatus: "ACCEPTED" | "DECLINED";
  dietarySelections?: DietarySelection[];
}

export const invitationService = {
  publicInvitationQrUrl(token: string): string {
    return `${API_BASE_URL}/api/v1/public/invitations/${encodeURIComponent(token)}/qr`;
  },

  publicInvitationCardUrl(token: string): string {
    return `${API_BASE_URL}/api/v1/public/invitations/${encodeURIComponent(token)}/card`;
  },

  /**
   * Send invitations to selected invitees
   * POST /api/v1/events/:eventId/invitations/send
   */
  async sendInvitations(
    eventId: string,
    payload: SendInvitationsPayload
  ): Promise<ApiResponse<{ message?: string; results?: SendResult[] }>> {
    return apiClient<{ message?: string; results?: SendResult[] }>(
      `/api/v1/events/${eventId}/invitations/send`,
      {
        method: "POST",
        body: JSON.stringify({
          channel: "EMAIL",
          ...payload,
        }),
      },
      true
    );
  },

  /**
   * Resend invitations
   * POST /api/v1/events/:eventId/invitations/resend
   */
  async resendInvitations(
    eventId: string,
    payload: ResendInvitationsPayload
  ): Promise<ApiResponse<{ message?: string; results?: ResendResult[] }>> {
    return apiClient<{ message?: string; results?: ResendResult[] }>(
      `/api/v1/events/${eventId}/invitations/resend`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  /**
   * Hide the delivery history of an event (records are kept; Resend keeps working)
   * DELETE /api/v1/events/:eventId/invitations/history
   */
  async clearHistory(eventId: string): Promise<ApiResponse<{ cleared: number }>> {
    return apiClient<{ cleared: number }>(`/api/v1/events/${eventId}/invitations/history`, { method: "DELETE" }, true);
  },

  /**
   * Get invitation history for an event
   * GET /api/v1/events/:eventId/invitations
   */
  /** Every delivery record of an event. Resend works from these ids, so a record left out would be a guest who cannot be re-sent to. */
  async getAllInvitations(eventId: string): Promise<ApiResponse<GetInvitationsResponse>> {
    const first = await this.getInvitations(eventId, 1, 200);
    if (!first.success || !first.data) return first;
    const pages = first.data.totalPages ?? 1;
    if (pages <= 1) return first;
    const rest = await mapWithConcurrency(Array.from({ length: pages - 1 }, (_, i) => i + 2), 4, (page) => this.getInvitations(eventId, page, 200));
    const failed = rest.find((r) => !r.success || !r.data);
    if (failed) return { success: false, message: failed.message || "The delivery history could not be loaded.", status: failed.status };
    return { ...first, data: { ...first.data, invitations: [...first.data.invitations, ...rest.flatMap((r) => r.data!.invitations)] } };
  },

  async getInvitations(
    eventId: string,
    page = 1,
    limit = 50
  ): Promise<ApiResponse<GetInvitationsResponse>> {
    const res = await apiClient<GetInvitationsResponse>(
      `/api/v1/events/${eventId}/invitations?page=${page}&limit=${limit}`,
      {
        method: "GET",
      },
      true
    );
    // This endpoint returns { invitations, total, page, totalPages } without the usual envelope
    const raw = res as ApiResponse<GetInvitationsResponse> & Partial<GetInvitationsResponse>;
    if (raw.success === undefined && Array.isArray(raw.invitations)) {
      return {
        success: true,
        data: {
          invitations: raw.invitations,
          total: raw.total ?? raw.invitations.length,
          page: raw.page ?? page,
          totalPages: raw.totalPages ?? 1,
        },
      };
    }
    return res;
  },

  /**
   * Get public invitation by token (Unauthenticated)
   * GET /api/v1/public/invitations/:token
   */
  async getPublicInvitation(token: string): Promise<ApiResponse<{ data?: PublicInvitationData } | PublicInvitationData>> {
    return apiClient(`/api/v1/public/invitations/${token}`, {
      method: "GET",
    }, false);
  },

  /**
   * Submit RSVP for public invitation token (Unauthenticated)
   * POST /api/v1/public/invitations/:token/rsvp
   */
  /** Food choice for an event without RSVP (every question is required) */
  async submitFood(token: string, dietarySelections: DietarySelection[]): Promise<ApiResponse> {
    return apiClient(`/api/v1/public/invitations/${token}/food`, {
      method: "POST",
      body: JSON.stringify({ dietarySelections }),
    }, false);
  },

  async submitRsvp(token: string, payload: RsvpPayload): Promise<ApiResponse> {
    return apiClient(`/api/v1/public/invitations/${token}/rsvp`, {
      method: "POST",
      body: JSON.stringify(payload),
    }, false);
  },

  /**
   * Download / preview rendered invitation card PNG for a specific invitee
   * GET /api/v1/events/:eventId/invitations/preview?inviteeId=:inviteeId
   */
  async previewCardPNG(eventId: string, inviteeId?: string): Promise<Blob> {
    return (await this.previewCard(eventId, inviteeId)).blob;
  },

  /**
   * Same card plus whether its QR is the guest's issued check-in pass ("ISSUED") or a
   * placeholder for a guest who has not been sent an invitation yet ("SAMPLE").
   */
  async previewCard(eventId: string, inviteeId?: string, options: { width?: number } = {}): Promise<{ blob: Blob; qr: "ISSUED" | "SAMPLE" }> {
    const token = tokenStorage.getAccessToken();
    // `width` asks for a small WebP copy for on-screen use (a few KB-100 instead of the ~1.4 MB full-size PNG). Leave it out
    // when the full card is needed, e.g. a guest's real pass.
    const params = new URLSearchParams();
    if (inviteeId) params.set("inviteeId", inviteeId);
    if (options.width) { params.set("width", String(options.width)); params.set("format", "webp"); }
    const query = params.toString();
    const url = `${API_BASE_URL}/api/v1/events/${eventId}/invitations/preview${query ? `?${query}` : ""}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let message = "Failed to fetch invitation card preview";
      try {
        const body = await res.json();
        if (body?.message) message = body.message;
      } catch {
        // non-JSON error body
      }
      throw new Error(message);
    }
    const qr = res.headers.get("X-Invitation-Qr") === "ISSUED" ? "ISSUED" : "SAMPLE";
    return { blob: await res.blob(), qr };
  },
};
