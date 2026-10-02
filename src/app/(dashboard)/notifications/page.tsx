"use client";

import React, { useCallback, useEffect, useState } from "react";
import NotificationCard, { NotificationCardData } from "@/components/notifications/NotificationCard";
import UserNavDropdown from "@/components/common/UserNavDropdown";
import {
  notificationService,
  notifyNotificationsChanged,
  NotificationItem as RealNotification,
} from "@/services/notificationService";

const PAGE_SIZE = 20;

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} | ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`;
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const seconds = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function toCard(n: RealNotification): NotificationCardData {
  return {
    id: n._id,
    type: n.type || "System Notice",
    title: n.title || "Notification",
    message: n.message || "",
    timestamp: n.createdAt ? formatTimestamp(n.createdAt) : "",
    timeAgo: n.createdAt ? timeAgo(n.createdAt) : undefined,
    unread: !n.isRead,
  };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationCardData[]>([]);
  // Unread total comes from the backend (covers notifications beyond the loaded pages)
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const loadPage = useCallback(async (targetPage: number) => {
    const res = await notificationService.getUserNotifications(false, targetPage, PAGE_SIZE);
    if (!res.success || !Array.isArray(res.data)) {
      setErrorFeedback(res.message || "Failed to load notifications.");
      return false;
    }
    const cards = res.data.map(toCard);
    setNotifications((prev) => (targetPage === 1 ? cards : [...prev, ...cards.filter((c) => !prev.some((p) => p.id === c.id))]));
    setUnreadCount(res.meta?.unreadCount ?? 0);
    setTotalPages(res.meta?.totalPages || 1);
    setPage(targetPage);
    return true;
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setErrorFeedback(null);
    await loadPage(1);
    setLoading(false);
  }, [loadPage]);

  useEffect(() => {
    let cancelled = false;
    notificationService.getUserNotifications(false, 1, PAGE_SIZE).then((res) => {
      if (cancelled) return;
      if (res.success && Array.isArray(res.data)) {
        setNotifications(res.data.map(toCard));
        setUnreadCount(res.meta?.unreadCount ?? 0);
        setTotalPages(res.meta?.totalPages || 1);
        setPage(1);
      } else {
        setErrorFeedback(res.message || "Failed to load notifications.");
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadPage(page + 1);
    setLoadingMore(false);
  };

  const handleMarkAllRead = async () => {
    const res = await notificationService.markAllAsRead();
    if (!res.success) {
      setErrorFeedback(res.message || "Failed to mark notifications as read.");
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setUnreadCount(0);
    notifyNotificationsChanged();
  };

  const handleMarkSingleRead = async (id: string) => {
    const res = await notificationService.markAsRead(id);
    if (!res.success) {
      setErrorFeedback(res.message || "Failed to mark notification as read.");
      return;
    }
    // Reflect the persisted backend state
    const updated = res.data ? toCard(res.data) : null;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: updated ? updated.unread : false } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    notifyNotificationsChanged();
  };

  const handleClearSingleNotification = async (id: string) => {
    const res = await notificationService.deleteNotification(id);
    if (!res.success) {
      setErrorFeedback(res.message || "Failed to clear notification.");
      return;
    }
    const removed = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (removed?.unread) setUnreadCount((c) => Math.max(0, c - 1));
    notifyNotificationsChanged();
  };

  const handleClearAllNotifications = async () => {
    if (notifications.length === 0) return;
    if (!confirm("Are you sure you want to clear all notifications?")) return;
    const res = await notificationService.clearAllNotifications();
    if (!res.success) {
      setErrorFeedback(res.message || "Failed to clear all notifications.");
      return;
    }
    setNotifications([]);
    setUnreadCount(0);
    setTotalPages(1);
    notifyNotificationsChanged();
  };

  return (
    <div className="w-full min-h-full bg-white font-sans text-gray-900">
      {/* Header */}
      <header className="min-h-20 py-3 bg-white border-b border-gray-200 px-4 sm:px-8 flex items-center justify-between gap-3 sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <svg className="w-7 h-7 text-[#FF5B22] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#FF5B22] text-white font-semibold">
                  {unreadCount} unread
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-500 truncate">System Activity Alerts & Updates</p>
          </div>
        </div>
        <UserNavDropdown />
      </header>

      {/* Content */}
      <main className="p-4 sm:p-6 md:p-8 max-w-5xl w-full mx-auto space-y-4 pb-24">
        {notifications.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You're all caught up."}
            </p>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
              <button
                type="button"
                onClick={handleClearAllNotifications}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold rounded-md transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Clear all</span>
              </button>
            </div>
          </div>
        )}

        {errorFeedback && (
          <div role="alert" className="p-4 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
            <span className="break-words min-w-0">{errorFeedback}</span>
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={reload} className="font-semibold underline cursor-pointer">Retry</button>
              <button onClick={() => setErrorFeedback(null)} aria-label="Dismiss" className="font-bold cursor-pointer">✕</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <div className="w-6 h-6 border-2 border-[#FF5B22] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((item) => (
              <NotificationCard
                key={item.id}
                notification={item}
                onClear={handleClearSingleNotification}
                onMarkRead={handleMarkSingleRead}
              />
            ))}
            {page < totalPages && (
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 rounded-md cursor-pointer disabled:opacity-60"
                >
                  {loadingMore ? "Loading..." : "Load older notifications"}
                </button>
              </div>
            )}
          </div>
        ) : !errorFeedback ? (
          <div className="py-20 text-center text-gray-500 text-xs border border-gray-200 rounded-lg bg-gray-50/50 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="font-medium text-gray-600">No notifications yet.</p>
            <p className="text-[11px] text-gray-400">You&apos;re all caught up.</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
