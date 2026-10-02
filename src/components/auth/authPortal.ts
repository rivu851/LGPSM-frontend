export type PortalMode = "admin" | "organizer" | "system_user";

export interface ParsedPortal {
  mode: PortalMode;
  mobileOnly: boolean;
}

export function parsePortalMode(raw: string | null | undefined, fallback: PortalMode = "organizer"): ParsedPortal {
  switch (raw) {
    case "admin":
      return { mode: "admin", mobileOnly: false };
    case "organizer":
    case "user": // legacy alias
      return { mode: "organizer", mobileOnly: false };
    case "system_user":
    case "assigned_user":
      return { mode: "system_user", mobileOnly: false };
    case "app":
      return { mode: "system_user", mobileOnly: true };
    default:
      return { mode: fallback, mobileOnly: false };
  }
}

export function portalRole(mode: PortalMode): "ADMIN" | "ORGANIZER" | "SYSTEM_USER" {
  if (mode === "admin") return "ADMIN";
  if (mode === "system_user") return "SYSTEM_USER";
  return "ORGANIZER";
}

export const signinHref = (mode: PortalMode) => `/signin?mode=${mode}`;

// The portal a user last signed in through is remembered in a cookie so every redirect to the
// login screen (logout, expired session, protected-route guard) returns them to the same portal.
export const PORTAL_COOKIE = "lgpsm_portal";

export function portalForRole(role: string | undefined | null): PortalMode {
  if (role === "ADMIN") return "admin";
  if (role === "SYSTEM_USER") return "system_user";
  return "organizer";
}

export function rememberPortal(role: string | undefined | null) {
  if (typeof document === "undefined") return;
  document.cookie = `${PORTAL_COOKIE}=${portalForRole(role)}; path=/; max-age=31536000; samesite=lax`;
}

export function rememberedPortal(): PortalMode | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${PORTAL_COOKIE}=(admin|organizer|system_user)`));
  return (match?.[1] as PortalMode) || null;
}

// Login URL for redirects; `from` is kept so the user returns to where they were
export function loginRedirectPath(from?: string): string {
  const params = new URLSearchParams({ mode: rememberedPortal() || "admin" });
  if (from && isSafeReturnPath(from)) params.set("from", from);
  return `/signin?${params.toString()}`;
}

export function isSafeReturnPath(path: string | null | undefined): path is string {
  return !!path && path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/signin");
}
export const forgotPasswordHref = (mode: PortalMode) => `/forgot-password?mode=${mode}`;

export const MOBILE_ONLY_NOTICE =
  "Assigned users sign in through the LGPSM mobile app. Ask your event organizer for access details.";
