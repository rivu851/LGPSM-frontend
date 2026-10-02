import { tokenStorage } from "./tokenStorage";
import { loginRedirectPath } from "@/components/auth/authPortal";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://lgpsm-backend.onrender.com";
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

export interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  /** Machine-readable reason some endpoints add to error responses (e.g. QR check-in rejections) */
  code?: string;
}

interface RawResponseBody {
  message?: string;
  error?: string | unknown;
  errors?: Record<string, { _errors?: string[] }>;
  [key: string]: unknown;
}

let isRefreshing = false;
let refreshSubscribers: ((newToken: string | null) => void)[] = [];

function subscribeTokenRefresh(cb: (newToken: string | null) => void) {
  refreshSubscribers.push(cb);
}

// Always settle queued requests, including when the refresh failed (null),
// otherwise they would wait forever and leave screens stuck on a spinner.
function onRefreshed(newToken: string | null) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

async function performTokenRefresh(): Promise<string | null> {
  const currentRefreshToken = tokenStorage.getRefreshToken();
  if (!currentRefreshToken) {
    tokenStorage.clearTokens();
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    });

    const data: ApiResponse<{ accessToken?: string; refreshToken?: string }> = await res.json();
    if (res.ok && data.success && data.data?.accessToken) {
      const newAccessToken = data.data.accessToken;
      const newRefreshToken = data.data.refreshToken || currentRefreshToken;

      tokenStorage.setAccessToken(newAccessToken);
      tokenStorage.setRefreshToken(newRefreshToken);

      return newAccessToken;
    } else {
      tokenStorage.clearTokens();
      return null;
    }
  } catch {
    tokenStorage.clearTokens();
    return null;
  }
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth: boolean = false
): Promise<ApiResponse<T>> {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${normalizedEndpoint}`;

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = tokenStorage.getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(url, config);

    // Single-flight refresh token interceptor on 401
    if (response.status === 401 && requiresAuth) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newAccessToken = await performTokenRefresh();
        isRefreshing = false;
        onRefreshed(newAccessToken);

        if (newAccessToken) {
          // Retry original request once
          headers["Authorization"] = `Bearer ${newAccessToken}`;
          response = await fetch(url, { ...config, headers });
        } else {
          if (typeof window !== "undefined" && !window.location.pathname.includes("/signin")) {
            window.location.href = loginRedirectPath(window.location.pathname + window.location.search);
          }
          return { success: false, message: "Session expired. Please log in again." };
        }
      } else {
        // Queue pending request until refresh finishes
        const newToken = await new Promise<string | null>((resolve) => {
          subscribeTokenRefresh((token) => resolve(token));
        });

        if (newToken) {
          headers["Authorization"] = `Bearer ${newToken}`;
          response = await fetch(url, { ...config, headers });
        } else {
          return { success: false, message: "Session expired. Please log in again." };
        }
      }
    }

    let data: RawResponseBody = {};
    try {
      data = (await response.json()) as RawResponseBody;
    } catch {
      data = {};
    }

    if (!response.ok) {
      let errorMessage = data.message || (typeof data.error === "string" ? data.error : undefined);

      if (response.status === 403 && !data.message) {
        errorMessage = "You do not have permission to perform this action.";
      }

      if (!errorMessage && data.errors && typeof data.errors === "object") {
        const errorMessages: string[] = [];
        Object.keys(data.errors).forEach((key) => {
          const fieldErr = data.errors?.[key];
          if (fieldErr?._errors && Array.isArray(fieldErr._errors) && fieldErr._errors.length > 0) {
            errorMessages.push(fieldErr._errors.join(", "));
          }
        });
        if (errorMessages.length > 0) {
          errorMessage = errorMessages.join(". ");
        }
      }

      return {
        success: false,
        message: errorMessage || `Request failed with status ${response.status}`,
        ...(data as ApiResponse<T>),
      };
    }

    return data as ApiResponse<T>;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Network error. Please check backend server connection.";
    return {
      success: false,
      message: errorMessage,
    };
  }
}
