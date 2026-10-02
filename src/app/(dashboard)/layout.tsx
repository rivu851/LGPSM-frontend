"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { loginRedirectPath } from "@/components/auth/authPortal";
import { canAccessRoute } from "@/components/sidebar/navConfig";
import { tokenStorage } from "@/services/tokenStorage";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const isSystemUser = user?.role === "SYSTEM_USER";
  const allowed = !!user && !isSystemUser && canAccessRoute(user.role, pathname);

  // The client router does not run in a document restored from the back/forward cache, so leave with
  // a full navigation when such a page comes back without a session
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted && !tokenStorage.getAccessToken()) {
        window.location.replace(loginRedirectPath(window.location.pathname));
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(loginRedirectPath(pathname || undefined));
      return;
    }
    // Assigned users work only in the mobile app; end any web session they still hold
    if (isSystemUser) {
      logout().then(() => router.replace("/signin?mode=app"));
      return;
    }
    if (user && !canAccessRoute(user.role, pathname)) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, isSystemUser, user, pathname, router, logout]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F8]">
        <div className="flex items-center gap-3 text-gray-600 text-sm font-semibold font-[family-name:var(--font-space-grotesk)]">
          <svg className="animate-spin h-5 w-5 text-[#FF5B22]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Verifying authorization...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Do not mount (and fetch data for) a page the role cannot use while the redirect happens
  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F8] text-xs font-semibold text-gray-500">
        Redirecting...
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#F8F9FA] overflow-hidden font-sans">
      <Sidebar />
      <main data-page-reveal className="flex-1 overflow-y-auto min-w-0 flex flex-col bg-white">
        {children}
      </main>
    </div>
  );
}
