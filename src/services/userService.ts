import { listAllPages } from "./listAll";
import { apiClient, ApiResponse } from "./apiClient";
import { UserData, tokenStorage } from "./tokenStorage";

// Fields accepted by PATCH /api/users/profile
export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  profile?: Record<string, unknown>;
  organization?: { name: string; phone?: string; email?: string; address?: string; website?: string };
}

export const userService = {
  async getProfile(): Promise<ApiResponse<UserData>> {
    const response = await apiClient<UserData>("/api/users/profile", { method: "GET" }, true);
    if (response.success && response.data) {
      tokenStorage.setUser(response.data);
    }
    return response;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<ApiResponse<UserData>> {
    const response = await apiClient<UserData>(
      "/api/users/profile",
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      true
    );

    if (response.success && response.data) {
      tokenStorage.setUser(response.data);
    }
    return response;
  },

  /**
   * Change own password (verifies the current password)
   * PATCH /api/users/me/password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ updated: boolean }>> {
    return apiClient<{ updated: boolean }>(
      "/api/users/me/password",
      {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      },
      true
    );
  },

  /**
   * Create sub-user (ADMIN / ORGANIZER requirement)
   * POST /api/users/
   */
  async createUser(payload: {
    fullName: string;
    email: string;
    password?: string;
    role?: "ADMIN" | "ORGANIZER" | "SYSTEM_USER";
    phone?: string;
    profile?: { organizationName?: string; organizationType?: "INDIVIDUAL" | "ORGANIZATION"; logoKey?: string; invitationChannel?: "EMAIL" | "WHATSAPP" | "BOTH" };
    /** Admin only: the organizer the new staff account is added for */
    organizerId?: string;
  }): Promise<ApiResponse<UserData>> {
    return apiClient<UserData>(
      "/api/users/",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  /** `organizerId` (admin only) narrows the list to the staff of that one organizer */
  async getUsers(role?: string, organizerId?: string, options: { includeInactive?: boolean } = {}): Promise<ApiResponse<UserData[]>> {
    return listAllPages((page) => {
      const params = new URLSearchParams({ page: String(page), limit: "100" });
      if (role) params.set("role", role);
      if (organizerId) params.set("organizerId", organizerId);
      // admins only: deactivated accounts as well (the server ignores it for anyone else)
      if (options.includeInactive) params.set("includeInactive", "true");
      return apiClient<UserData[]>(`/api/users?${params.toString()}`, { method: "GET" }, true);
    });
  },

  async deleteUser(userId: string): Promise<ApiResponse<any>> {
    return apiClient<any>(`/api/users/${userId}`, { method: "DELETE" }, true);
  },

  async updateUser(
    userId: string,
    payload: { fullName?: string; email?: string; phone?: string; password?: string }
  ): Promise<ApiResponse<UserData>> {
    return apiClient<UserData>(
      `/api/users/${userId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      true
    );
  },
};
