import { apiClient, ApiResponse } from "./apiClient";

export interface DashboardStats {
  totalEvents: number;
  totalInvitees: number;
  totalCheckIns: number;
  rsvpSummary: {
    ACCEPTED: number;
    DECLINED: number;
    PENDING: number;
  };
}

export interface EventReportData {
  event: {
    id: string;
    title: string;
    schedule: { start: string; end: string };
    format: string;
  };
  attendanceRate: string;
  totalInvitees: number;
  totalCheckIns: number;
  uniqueAttendees?: number;
  totalSessions?: number;
  totalSystemUsers?: number;
  rsvpSummary: { ACCEPTED: number; DECLINED: number; PENDING: number };
  deliverySummary: { SENT: number; PENDING: number; FAILED: number };
  checkInMethods: { QR: number; MANUAL: number };
  sessionReports: {
    sessionId: string;
    name: string;
    checkInCount: number;
    attendeeCount?: number;
    invitedCount?: number;
    checkInsToday?: number;
    systemUsers?: number;
    accessControl?: string;
    schedule: { start: string; end: string };
  }[];
}

export const reportService = {
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return apiClient<DashboardStats>("/api/v1/reports/dashboard", { method: "GET" }, true);
  },

  async getEventReport(eventId: string): Promise<ApiResponse<EventReportData>> {
    return apiClient<EventReportData>(`/api/v1/reports/events/${eventId}`, { method: "GET" }, true);
  },
};
