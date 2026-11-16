import { apiClient, ApiResponse } from "./apiClient";
import { tokenStorage, UserData } from "./tokenStorage";

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
  invitationChannel?: "EMAIL" | "WHATSAPP" | "BOTH";
  // Individual, or an organization (then its name is required)
  organizationType?: "INDIVIDUAL" | "ORGANIZATION";
  organizationName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  role?: string;
}

export interface AuthResponseData {
  user?: UserData;
  accessToken?: string;
  refreshToken?: string;
  pendingVerification?: boolean;
  email?: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<ApiResponse<AuthResponseData>> {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const response = await apiClient<AuthResponseData>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ ...payload, email: normalizedEmail }),
    });

    if (response.success && response.data) {
      const { user, accessToken, refreshToken } = response.data;
      if (user) tokenStorage.setUser(user);
      if (accessToken) tokenStorage.setAccessToken(accessToken);
      if (refreshToken) tokenStorage.setRefreshToken(refreshToken);
    }

    return response;
  },

  async verifyEmail(email: string, code: string): Promise<ApiResponse<{ verified: boolean }>> {
    return apiClient<{ verified: boolean }>("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
  },

  /** "Change email address" on the code page: moves the pending sign-up to the corrected address and sends the new code there */
  async changePendingEmail(email: string, newEmail: string, password: string): Promise<ApiResponse<{ email: string }>> {
    return apiClient<{ email: string }>("/api/auth/change-pending-email", {
      method: "POST",
      body: JSON.stringify({ email, newEmail, password }),
    });
  },

  async resendVerificationCode(email: string): Promise<ApiResponse<{ sent: boolean }>> {
    return apiClient<{ sent: boolean }>("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
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

  /** "Sign in with Google" (organizers): the credential is Google's signed ID token; the server verifies it and signs the organizer in or creates the account */
  async googleSignIn(credential: string): Promise<ApiResponse<AuthResponseData & { isNewUser?: boolean }>> {
    const response = await apiClient<AuthResponseData & { isNewUser?: boolean }>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
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
