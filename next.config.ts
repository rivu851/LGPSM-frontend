import type { NextConfig } from "next";

// Authenticated app sections and personal invitation links must never be indexed. This complements
// robots.txt (crawl guidance only) and the middleware/auth checks (the actual access control).
const PRIVATE_SECTIONS =
  "(dashboard|events|user-management|event-organizer|earnings|reports|settings|templates|notification|notifications|billing|invitation)";

// The only remote image origin the app serves from is the backend (uploaded media). Every dynamic
// next/image in the app is `unoptimized`, so the image optimizer never needs to proxy arbitrary hosts;
// a wildcard here would let it fetch any URL (SSRF/bandwidth-abuse surface), so keep this allowlist tight.
const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://lgpsm-backend-vzuz.onrender.com";
const apiHost = new URL(apiUrl).hostname;
const apiOrigin = new URL(apiUrl).origin;

// Enforced now: directives that cannot break page rendering but close clickjacking, <base> hijack,
// plugin and cross-site form-post vectors.
const ENFORCED_CSP = "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'";

// Full policy, delivered report-only until it has been exercised against every authenticated screen on
// staging. Next.js emits inline bootstrap scripts, so 'unsafe-inline' is required until nonces are adopted;
// even so it blocks loading script, frames and connections from origins the app does not use.
const REPORT_ONLY_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${apiOrigin} https://tile.openstreetmap.org`,
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} https://nominatim.openstreetmap.org`,
  "frame-src 'none'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    // AVIF is noticeably smaller than WebP for photos; the browser picks what it supports
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: apiHost,
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: ENFORCED_CSP },
          { key: "Content-Security-Policy-Report-Only", value: REPORT_ONLY_CSP },
          { key: "Permissions-Policy", value: "microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      {
        source: `/${PRIVATE_SECTIONS}/:path*`,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      // The files in public/ keep the same names when they change, so they cannot be cached forever; a week, then reuse
      // while the fresh copy is fetched in the background. Without this, browsers re-check each one on every visit.
      {
        source: "/(images|icons|fonts)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/pages/:path*",
        destination: "/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
