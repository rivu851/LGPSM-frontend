import type { Metadata } from "next";
import { publicPageMetadata } from "@/utils/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "Create your account",
  description: "Create an EventQRapp organizer account to design, send and manage QR-based digital invitations for your events.",
  path: "/signup",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
