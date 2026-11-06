"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { notificationService, onNotificationsChanged } from "@/services/notificationService";

/** Unread notifications for the signed-in user (from the backend's meta.unreadCount), refreshed on navigation and whenever notifications change. */
export function useUnreadNotifications(): number {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
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
  return unreadCount;
}
