"use client";

import React from "react";
import Link from "next/link";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import NavIcon from "./NavIcon";

interface SidebarFooterProps {
  activeItem?: string;
  onNavigate?: () => void;
}

// Figma sidebar footer has no logout entry (logout lives in the header's user-nav dropdown) —
// this only renders Notification, to avoid a logout control duplicated in two places.
export default function SidebarFooter({ activeItem, onNavigate }: SidebarFooterProps) {
  const unreadCount = useUnreadNotifications();

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
            className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#C65318] text-white text-[11px] font-semibold flex items-center justify-center"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
    </div>
  );
}
