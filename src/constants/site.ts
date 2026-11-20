// Canonical public origin used for metadata, canonical URLs, robots and the sitemap.
// Defaults to the current production deployment; set NEXT_PUBLIC_SITE_URL if the domain changes.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://lgpsm-frontend.vercel.app").replace(/\/+$/, "");

export const SITE_NAME = "EventQRapp";

export const SITE_DESCRIPTION =
  "Design, customize, and share stunning QR-based invitations for events and celebrations all in one simple platform.";

// Public, indexable pages (also drives the sitemap). Forgot-password, verify-email and invitation links
// are intentionally excluded and marked noindex.
export const PUBLIC_ROUTES = ["/", "/features", "/pricing", "/contact", "/signup", "/signin"] as const;
