"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { loginRedirectPath } from "@/components/auth/authPortal";
import { notificationService, onNotificationsChanged } from "@/services/notificationService";
import NavIcon from "./NavIcon";

interface SidebarFooterProps {
  activeItem?: string;
  onNavigate?: () => void;
}

export default function SidebarFooter({ activeItem, onNavigate }: SidebarFooterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Unread count comes from the backend (meta.unreadCount); refreshed on navigation and whenever notifications change
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const refresh = () => {
      notificationService.getUserNotifications(true, 1, 1).then((res) => {
        if (cancelled) return;
        const count = res.meta?.unreadCount;
        setUnreadCount(res.success && typeof count === "number" ? count : 0);
      });
    };
    refresh();
    const unsubscribe = onNotificationsChanged(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [isAuthenticated, pathname]);

  const handleLogout = async () => {
    onNavigate?.();
    await logout();
    router.push(loginRedirectPath());
  };

  const active = activeItem === "notification";

  return (
    <div className="border-t border-[#2C3237] pt-2.5 flex flex-col">
      <Link
        href="/notification"
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2 px-4 py-2 text-base font-medium transition-colors ${
          active ? "text-[#FF651D]" : "text-[#DEE2E5] hover:text-white"
        }`}
      >
        <NavIcon name="notifications" />
        <span className="flex-1">Notification</span>
        {unreadCount > 0 && (
          <span
            className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#FF651D] text-white text-[11px] font-semibold flex items-center justify-center"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-300 hover:text-red-200 cursor-pointer transition-colors"
      >
        <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Log out
      </button>
    </div>
  );
}
