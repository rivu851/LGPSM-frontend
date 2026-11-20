"use client";

export interface UserData {
  _id: string;
  fullName: string;
  email: string;
  role?: string;
  authProvider?: string;
  isActive?: boolean;
  phone?: string;
  avatarUrl?: string | null;
  profile?: { organizationName?: string; avatarKey?: string; avatarUrl?: string | null; [key: string]: unknown };
}

const ACCESS_TOKEN_KEY = "lgpsm_access_token";
const REFRESH_TOKEN_KEY = "lgpsm_refresh_token";
const USER_KEY = "lgpsm_user";
// Route-gate marker read by middleware.ts. It is only a "signed in" hint for redirecting visitors; it
// deliberately does not contain the JWT, so a cookie leak (logs, proxies, injected script reading
// document.cookie) can't be replayed against the API. Real authorization is enforced by the backend.
const SESSION_MARKER_COOKIE = "lgpsm_session";
const secureFlag = () => (window.location.protocol === "https:" ? "; Secure" : "");

export const tokenStorage = {
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setAccessToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    document.cookie = `${SESSION_MARKER_COOKIE}=1; path=/; max-age=604800; SameSite=Lax${secureFlag()}`;
    // Remove the legacy cookie that used to carry the token itself
    document.cookie = "lgpsm_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  },

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  getUser(): UserData | null {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return null;
    const data = localStorage.getItem(USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  setUser(user: UserData): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearTokens(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = `${SESSION_MARKER_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = "lgpsm_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  },
};
