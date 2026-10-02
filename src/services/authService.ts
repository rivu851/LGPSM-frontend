import { apiClient, ApiResponse } from "./apiClient";
import { tokenStorage, UserData } from "./tokenStorage";

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  role?: string;
}

export interface AuthResponseData {
  user: UserData;
  accessToken?: string;
  refreshToken?: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<ApiResponse<AuthResponseData>> {
    const response = await apiClient<AuthResponseData>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (response.success && response.data) {
      const { user, accessToken, refreshToken } = response.data;
      if (user) tokenStorage.setUser(user);
      if (accessToken) tokenStorage.setAccessToken(accessToken);
      if (refreshToken) tokenStorage.setRefreshToken(refreshToken);
    }

    return response;
  },

  async login(payload: LoginPayload): Promise<ApiResponse<AuthResponseData>> {
    const response = await apiClient<AuthResponseData>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (response.success && response.data) {
      const { user, accessToken, refreshToken } = response.data;
      if (user) tokenStorage.setUser(user);
      if (accessToken) tokenStorage.setAccessToken(accessToken);
      if (refreshToken) tokenStorage.setRefreshToken(refreshToken);
    }

    return response;
  },

  async googleLogin(idToken: string): Promise<ApiResponse<AuthResponseData>> {
    const response = await apiClient<AuthResponseData>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ token: idToken }),
    });
    if (response.success && response.data) {
      const { user, accessToken, refreshToken } = response.data;
      if (user) tokenStorage.setUser(user);
      if (accessToken) tokenStorage.setAccessToken(accessToken);
      if (refreshToken) tokenStorage.setRefreshToken(refreshToken);
    }
    return response;
  },

  async logout(): Promise<ApiResponse> {
    const refreshToken = tokenStorage.getRefreshToken();
    let response: ApiResponse = { success: true };

    if (refreshToken) {
      response = await apiClient("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    }

    tokenStorage.clearTokens();
    return response;
  },

  async forgotPassword(email: string): Promise<ApiResponse> {
    return apiClient("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    return apiClient("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  },
};
