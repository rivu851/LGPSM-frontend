"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import BrandLoader from "@/components/common/BrandLoader";
import { isExplicitLogout, loginRedirectPath } from "@/components/auth/authPortal";
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
  // Set by the sign-in page: hold the branded loader for a moment after signing in, as the sign-out path does
  const [welcoming, setWelcoming] = useState(() => {
    try { return typeof window !== "undefined" && sessionStorage.getItem("lgpsm_signing_in") === "1"; } catch { return false; }
  });
  useEffect(() => {
    if (!welcoming) return;
    try { sessionStorage.removeItem("lgpsm_signing_in"); } catch { /* ignore */ }
    const timer = setTimeout(() => setWelcoming(false), 900);
    return () => clearTimeout(timer);
  }, [welcoming]);
  const allowed = !!user && !isSystemUser && canAccessRoute(user.role, pathname);
  const leavingAsStaff = useRef(false);

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
    // A staff account being signed out below: its redirect carries the explanation, so this effect must not race it to the plain sign-in page
    if (!isAuthenticated && leavingAsStaff.current) return;
    if (!isAuthenticated) {
      // Drop a leftover "signed in" marker (storage cleared, session ended elsewhere) so it stops redirecting the home page here
      if (!tokenStorage.getAccessToken()) tokenStorage.clearTokens();
      // After a deliberate logout there is nothing to return to; an expired session keeps the page for the next sign-in
      router.replace(loginRedirectPath(isExplicitLogout() ? undefined : pathname || undefined));
      return;
    }
    // Assigned users work only in the mobile app; end any web session they still hold
    if (isSystemUser) {
      leavingAsStaff.current = true;
      logout().then(() => router.replace("/signin?mode=organizer&notice=mobile-only"));
      return;
    }
    if (user && !canAccessRoute(user.role, pathname)) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, isSystemUser, user, pathname, router, logout]);

  // Wordless branded loader while the session is checked (first load and after signing out)
  if (isLoading || welcoming) return <BrandLoader />;

  // Signed out (or session ended): keep the loader up until the redirect to the sign-in page lands, instead of a blank screen
  if (!isAuthenticated) {
    return <BrandLoader />;
  }

  // Do not mount (and fetch data for) a page the role cannot use while the redirect happens
  if (!allowed) {
    return <BrandLoader />;
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
