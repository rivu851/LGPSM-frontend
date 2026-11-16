"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { notificationService, onNotificationsChanged } from "@/services/notificationService";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";

/**
 * Unread notifications for the signed-in user (from the backend's meta.unreadCount): refreshed on navigation, whenever notifications
 * change, and every half minute while the tab is open, so a new notification shows up without reloading.
 */
export function useUnreadNotifications(): number {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const refresh = useCallback(async () => {
    const res = await notificationService.getUserNotifications(true, 1, 1);
    if (!alive.current) return;
    const count = res.meta?.unreadCount;
    if (res.success && typeof count === "number") setUnreadCount(count);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refresh();
    return onNotificationsChanged(() => void refresh());
  }, [isAuthenticated, pathname, refresh]);

  useLiveRefresh(refresh, 30_000, isAuthenticated);
  return unreadCount;
}
