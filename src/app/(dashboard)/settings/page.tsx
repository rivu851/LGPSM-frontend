"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import BrandLoader from "@/components/common/BrandLoader";
import TemplateSettingsPage from "./template/page";

// /settings opens the first settings page the role can use. Template Settings are for administrators; an organizer who landed here used
// to get that form with a save that could only be refused.
export default function SettingsRootPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "ADMIN";
  useEffect(() => {
    if (user && !isAdmin) router.replace("/settings/account");
  }, [user, isAdmin, router]);
  return isAdmin ? <TemplateSettingsPage /> : <BrandLoader />;
}
