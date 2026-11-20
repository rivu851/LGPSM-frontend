import type { Metadata } from "next";
import { publicPageMetadata } from "@/utils/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Contact",
  description: "Get in touch with the EventQRapp team about QR-based digital invitations and event management.",
  path: "/contact",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
