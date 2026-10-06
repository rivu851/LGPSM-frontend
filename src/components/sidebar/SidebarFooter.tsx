"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { notificationService, onNotificationsChanged } from "@/services/notificationService";
import NavIcon from "./NavIcon";

interface SidebarFooterProps {
  activeItem?: string;
  onNavigate?: () => void;
}

// Figma sidebar footer has no logout entry (logout lives in the header's user-nav dropdown) —
// this only renders Notification, to avoid a logout control duplicated in two places.
export default function SidebarFooter({ activeItem, onNavigate }: SidebarFooterProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
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
    </div>
  );
}
