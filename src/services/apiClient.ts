import { tokenStorage } from "./tokenStorage";
import { loginRedirectPath } from "@/components/auth/authPortal";
import { refreshOutcome, type RefreshOutcome } from "./refreshOutcome";
import { ACCOUNT_INACTIVE_CODE, ACCOUNT_INACTIVE_MESSAGE, ACCOUNT_INACTIVE_NOTICE, isAccountInactiveResponse } from "./accountInactive";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://lgpsm-backend.onrender.com";
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

export interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  /** Machine-readable reason some endpoints add to error responses (e.g. QR check-in rejections) */
  code?: string;
  /** Validation issues (zod) some endpoints return with a 400, e.g. `{ path: ["body", "email"], message }` */
  details?: unknown;
  /**
   * HTTP status of a failed request (0 when the request never reached the server). Only set on
   * failures, so callers can tell e.g. rate limiting (429) from a validation error (400).
   */
  status?: number;
}

interface RawResponseBody {
  message?: string;
  error?: string | unknown;
  errors?: Record<string, { _errors?: string[] }>;
  [key: string]: unknown;
}

let isRefreshing = false;

interface RefreshResult {
  outcome: RefreshOutcome;
  token: string | null;
}

const SERVER_UNAVAILABLE_MESSAGE = "The server could not be reached. Your work is safe; please try again in a moment.";

let refreshSubscribers: ((result: RefreshResult) => void)[] = [];

function subscribeTokenRefresh(cb: (result: RefreshResult) => void) {
  refreshSubscribers.push(cb);
}

// Always settle queued requests, including when the refresh failed,
// otherwise they would wait forever and leave screens stuck on a spinner.
function onRefreshed(result: RefreshResult) {
  refreshSubscribers.forEach((cb) => cb(result));
  refreshSubscribers = [];
}

async function exchangeRefreshToken(expiredAccessToken: string | null): Promise<RefreshResult> {
  // Another tab may have renewed the session while this one waited for its turn: the tokens in storage are already new
  const storedAccessToken = tokenStorage.getAccessToken();
  if (storedAccessToken && storedAccessToken !== expiredAccessToken) return { outcome: "ok", token: storedAccessToken };

  const currentRefreshToken = tokenStorage.getRefreshToken();
  if (!currentRefreshToken) {
    tokenStorage.clearTokens();
    return { outcome: "ended", token: null };
  }

  let status: number | null = null;
  let data: ApiResponse<{ accessToken?: string; refreshToken?: string }> = {};
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    });
    status = res.status;
    data = await res.json().catch(() => ({}));
  } catch {
    return { outcome: "unavailable", token: null };
  }

  const outcome = refreshOutcome(status, !!data.data?.accessToken);
  if (outcome === "ok") {
    const newAccessToken = data.data!.accessToken!;
    tokenStorage.setAccessToken(newAccessToken);
    tokenStorage.setRefreshToken(data.data?.refreshToken || currentRefreshToken);
    return { outcome, token: newAccessToken };
  }
  if (outcome === "ended") tokenStorage.clearTokens();
  return { outcome, token: null };
}

// A refresh token works once and every tab shares one, so tabs take turns (where the browser supports it)
async function performTokenRefresh(expiredAccessToken: string | null): Promise<RefreshResult> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks) return locks.request("lgpsm-token-refresh", () => exchangeRefreshToken(expiredAccessToken));
  return exchangeRefreshToken(expiredAccessToken);
}

// Identical GETs that are already on their way are shared: several parts of a page (the page itself, the tab strip, the page
// title) often ask for the same event, sessions or categories at the same moment. Only requests in flight are shared, nothing
// is cached, so a later call always fetches fresh data. Each extra caller gets its own copy of the result.
const inflightGets = new Map<string, Promise<ApiResponse<unknown>>>();

function endSessionAccountInactive() {
  tokenStorage.clearTokens();
  if (typeof window !== "undefined" && !window.location.pathname.includes("/signin")) {
    const target = new URL(loginRedirectPath(), window.location.origin);
    target.searchParams.set("notice", ACCOUNT_INACTIVE_NOTICE);
    window.location.href = target.pathname + target.search;
  }
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth: boolean = false
): Promise<ApiResponse<T>> {
  const method = (options.method || "GET").toUpperCase();
  if (method !== "GET" || options.body || options.signal) return requestApi<T>(endpoint, options, requiresAuth);
  const key = `${requiresAuth ? tokenStorage.getAccessToken() || "" : "public"} ${endpoint}`;
  const pending = inflightGets.get(key);
  if (pending) return structuredClone(await pending) as ApiResponse<T>;
  const request = requestApi<T>(endpoint, options, requiresAuth).finally(() => inflightGets.delete(key));
  inflightGets.set(key, request as Promise<ApiResponse<unknown>>);
  return request;
}

async function requestApi<T = unknown>(
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
    const accessTokenUsed = headers["Authorization"]?.replace(/^Bearer /, "") ?? null;
    let response = await fetch(url, config);

    // Single-flight refresh token interceptor on 401
    if (response.status === 401 && requiresAuth) {
      if (!isRefreshing) {
        isRefreshing = true;
        const refreshed = await performTokenRefresh(accessTokenUsed);
        isRefreshing = false;
        onRefreshed(refreshed);

        if (refreshed.token) {
          // Retry original request once
          headers["Authorization"] = `Bearer ${refreshed.token}`;
          response = await fetch(url, { ...config, headers });
        } else if (refreshed.outcome === "unavailable") {
          return { success: false, message: SERVER_UNAVAILABLE_MESSAGE, status: 0 };
        } else {
          if (typeof window !== "undefined" && !window.location.pathname.includes("/signin")) {
            window.location.href = loginRedirectPath(window.location.pathname + window.location.search);
          }
          return { success: false, message: "Session expired. Please log in again." };
        }
      } else {
        // Queue pending request until refresh finishes
        const refreshed = await new Promise<RefreshResult>((resolve) => {
          subscribeTokenRefresh(resolve);
        });

        if (refreshed.token) {
          headers["Authorization"] = `Bearer ${refreshed.token}`;
          response = await fetch(url, { ...config, headers });
        } else if (refreshed.outcome === "unavailable") {
          return { success: false, message: SERVER_UNAVAILABLE_MESSAGE, status: 0 };
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
      // The account was switched off while it was in use: every request will fail from now on, so end the session with an explanation
      // instead of leaving a page that can only show errors. Other 403s (not allowed to do this one thing) are not this.
      if (requiresAuth && isAccountInactiveResponse(response.status, data as { code?: unknown; message?: unknown })) {
        endSessionAccountInactive();
        return { success: false, message: ACCOUNT_INACTIVE_MESSAGE, code: ACCOUNT_INACTIVE_CODE, status: 403 };
      }
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
        status: response.status,
      };
    }

    return data as ApiResponse<T>;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Network error. Please check backend server connection.";
    return {
      success: false,
      message: errorMessage,
      status: 0,
    };
  }
}
