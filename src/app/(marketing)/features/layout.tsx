import type { Metadata } from "next";
import { publicPageMetadata } from "@/utils/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Features",
  description:
    "Secured access, session-wise control, real-time reporting and system user registration — explore what EventQRapp offers for QR-based event invitations.",
  path: "/features",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
