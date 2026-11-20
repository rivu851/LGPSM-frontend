import type { Metadata } from "next";
import { publicPageMetadata } from "@/utils/seo";

// Sign-in is a public entry point people search for by brand name, so it stays indexable. Query
// variants (?mode=..., ?from=...) all canonicalize to /signin.
export const metadata: Metadata = publicPageMetadata({
  title: "Sign in",
  description: "Sign in to your EventQRapp account to manage events, invitees and QR-based digital invitations.",
  path: "/signin",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
