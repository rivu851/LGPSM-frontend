import { apiClient, ApiResponse } from "./apiClient";

export interface AuditLogItem {
  _id: string;
  actorId: { _id: string; fullName: string; email: string; role: string } | string;
  actorType: "ADMIN" | "ORGANIZER" | "SYSTEM_USER";
  eventId?: { _id: string; title: string } | string;
  action: string;
  entityType?: string;
  entityId?: string;
  status: "SUCCESS" | "FAILED";
  metadata?: Record<string, any>;
  createdAt: string;
}

export const auditLogService = {
  async getAuditLogs(params?: {
    eventId?: string;
    actorId?: string;
    action?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<AuditLogItem[]> & { meta?: { total: number; page: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params?.eventId) query.append("eventId", params.eventId);
    if (params?.actorId) query.append("actorId", params.actorId);
    if (params?.action) query.append("action", params.action);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : "";
    return apiClient<AuditLogItem[]>(`/api/v1/audit-logs${queryString}`, { method: "GET" }, true) as Promise<ApiResponse<AuditLogItem[]> & { meta?: { total: number; page: number; totalPages: number } }>;
  },
};
