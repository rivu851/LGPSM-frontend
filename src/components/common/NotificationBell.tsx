"use client";

import Link from "next/link";
import NavIcon from "@/components/sidebar/NavIcon";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

/** Bell in the top right of every page header: opens the notifications page, with the unread count on it. */
export default function NotificationBell() {
  const unread = useUnreadNotifications();
  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";
  return (
    <Link href="/notification" aria-label={label} title={label} className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[#15191C] hover:bg-gray-100 transition-colors">
      <NavIcon name="notifications" className="size-6" />
      {unread > 0 && (
        <span aria-hidden className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C65318] text-white text-[10px] font-semibold flex items-center justify-center">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
