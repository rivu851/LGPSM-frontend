import { apiClient, ApiResponse } from "./apiClient";
import { tokenStorage } from "./tokenStorage";

export interface SendInvitationsPayload {
  inviteeIds: string[];
  channel?: "EMAIL" | "SMS" | "WHATSAPP";
}

export interface ResendInvitationsPayload {
  invitationIds: string[];
  channel?: "EMAIL" | "SMS" | "WHATSAPP";
}

export interface SendResult {
  inviteeId: string;
  status: "SENT" | "PENDING" | "FAILED";
  failureReason?: string;
}

export interface ResendResult {
  invitationId: string;
  status: "SENT" | "PENDING" | "FAILED";
  failureReason?: string;
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
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  status: "SENT" | "PENDING" | "FAILED";
  failureReason?: string;
  sentAt?: string;
  createdAt?: string;
}

export interface GetInvitationsResponse {
  invitations: InvitationData[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PublicInvitationData {
  event: {
    title: string;
    description?: string;
    format?: string;
    location?: string | { address?: string };
    schedule?: {
      start?: string;
      end?: string;
    };
  };
  invitee: {
    name: string;
    rsvpStatus: "PENDING" | "ACCEPTED" | "DECLINED";
    dietaryPreference?: string;
  };
}

export interface RsvpPayload {
  rsvpStatus: "ACCEPTED" | "DECLINED";
  dietaryPreference?: string;
}

export const invitationService = {
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
   * Get invitation history for an event
   * GET /api/v1/events/:eventId/invitations
   */
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
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://lgpsm-backend.onrender.com";
    const token = tokenStorage.getAccessToken();
    const url = inviteeId
      ? `${API_BASE_URL}/api/v1/events/${eventId}/invitations/preview?inviteeId=${inviteeId}`
      : `${API_BASE_URL}/api/v1/events/${eventId}/invitations/preview`;
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
    return res.blob();
  },
};
