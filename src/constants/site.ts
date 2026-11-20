// Canonical public origin used for metadata, canonical URLs, robots and the sitemap.
// Defaults to the current production deployment; set NEXT_PUBLIC_SITE_URL if the domain changes.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://lgpsm-frontend.vercel.app").replace(/\/+$/, "");

export const SITE_NAME = "EventQRapp";

export const SITE_DESCRIPTION =
  "Design, customize, and share stunning QR-based invitations for events and celebrations all in one simple platform.";

// Public, indexable pages (also drives the sitemap). Forgot-password, verify-email and invitation links
// are intentionally excluded and marked noindex.
export const PUBLIC_ROUTES = ["/", "/contact", "/signup", "/signin"] as const;

// Shown in the landing footer. The design's address is the default; the phone number in the design is a placeholder, so none is shown until a real
// one is set. Set NEXT_PUBLIC_CONTACT_EMAIL / NEXT_PUBLIC_CONTACT_PHONE at build time to change either (an empty value hides it).
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@eventqrapp.com";
export const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "";

// The Contact page's "Contact Information" card. Details as supplied for the contact page; the website line shows this site's own address.
export const CONTACT_ADDRESS = "Hatiara, Ecopark Newtown, Kolkata 700157";
export const CONTACT_ENQUIRY_EMAIL = CONTACT_EMAIL || "hello@eventqrapp.com"; // one address everywhere: the footer and the Contact page
export const CONTACT_ENQUIRY_PHONE = "+91-8017063365";
export const CONTACT_WEBSITE = "eventqrapp.com";
