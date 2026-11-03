import { listAllPages } from "./listAll";
import { apiClient, ApiResponse } from "./apiClient";

export interface ScanCheckInPayload {
  qrCode: string;
  eventId?: string;
  sessionId?: string;
}

export interface ManualCheckInPayload {
  eventId: string;
  sessionId?: string;
  inviteeId?: string;
  email?: string;
  mobile?: string;
}

export interface GetCheckInsOptions {
  sessionId?: string;
  checkInMethod?: string;
  page?: number;
  limit?: number;
}

export interface CheckInRecord {
  _id: string;
  eventId: string;
  checkInMethod: "QR" | "MANUAL";
  checkInAt: string;
  checkedInBy?: {
    _id: string;
    fullName?: string;
    email?: string;
    role?: string;
  } | string;
  invitee?: {
    _id: string;
    name?: string;
    email?: string;
    mobile?: string;
    dietaryPreference?: string;
    rsvpStatus?: string;
  } | null;
  session?: {
    _id: string;
    name?: string;
    schedule?: any;
  } | null;
}

export interface CheckInResponseData {
  _id: string;
  eventId: string;
  checkInMethod: "QR" | "MANUAL";
  checkInAt: string;
  checkedInBy: any;
  invitee: {
    _id: string;
    name: string;
    email?: string;
    mobile?: string;
    dietaryPreference?: string;
    rsvpStatus?: string;
  };
  session?: {
    _id: string;
    name: string;
    schedule?: any;
  } | null;
}

export interface GetCheckInsResponseMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const checkInService = {
  async scanCheckIn(payload: ScanCheckInPayload): Promise<ApiResponse<CheckInResponseData>> {
    return apiClient<CheckInResponseData>("/api/v1/checkins/scan", {
      method: "POST",
      body: JSON.stringify(payload),
    }, true);
  },

  async manualCheckIn(payload: ManualCheckInPayload): Promise<ApiResponse<CheckInResponseData>> {
    return apiClient<CheckInResponseData>("/api/v1/checkins/manual", {
      method: "POST",
      body: JSON.stringify(payload),
    }, true);
  },

  async getCheckIns(
    eventId: string,
    options: GetCheckInsOptions = {}
  ): Promise<ApiResponse<CheckInRecord[]> & { meta?: GetCheckInsResponseMeta }> {
    const params = new URLSearchParams();
    if (options.sessionId) params.append("sessionId", options.sessionId);
    if (options.checkInMethod) params.append("checkInMethod", options.checkInMethod);
    if (options.page) params.append("page", String(options.page));
    if (options.limit) params.append("limit", String(options.limit));

    const queryString = params.toString();
    const endpoint = `/api/v1/events/${eventId}/checkins${queryString ? `?${queryString}` : ""}`;

    return apiClient<CheckInRecord[]>(endpoint, { method: "GET" }, true);
  },

  /** Every attendance record of an event, for screens that work out each guest's check-in status in the browser. */
  async getAllCheckIns(eventId: string): Promise<ApiResponse<CheckInRecord[]>> {
    return listAllPages((page) => this.getCheckIns(eventId, { page, limit: 1000 }));
  },
};
