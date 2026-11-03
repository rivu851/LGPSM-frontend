"use client";

import React from "react";

export interface NotificationCardData {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  timeAgo?: string;
  // Mirrors the backend `isRead` flag (unread === !isRead)
  unread?: boolean;
}

interface NotificationCardProps {
  notification: NotificationCardData;
  onClear?: (id: string) => void;
  onMarkRead?: (id: string) => void;
}

export default function NotificationCard({ notification, onClear, onMarkRead }: NotificationCardProps) {
  const unread = !!notification.unread;

  // Opening an unread notification marks it as read (like most notification centres)
  const handleOpen = () => {
    if (unread && onMarkRead) onMarkRead(notification.id);
  };

  const [day, time] = notification.timestamp.split(" | ");

  // Figma notification card (222:34653 / 2092:1257): bordered panel, 16px title, grey 12px body, "date | time".
  // Unread cards stay white with a dot; read ones take the design's grey fill. Mark read and clear stay available.
  return (
    <div
      onClick={handleOpen}
      className={`rounded-md border border-[#E0E0E0] px-5 pt-[22px] pb-5 flex gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B22]/40 ${
        unread ? "bg-white cursor-pointer hover:border-[#FFB08A]" : "bg-[#F8F8F8]"
      }`}
    >
      <div className="flex-1 min-w-0">
        <h2 className="flex items-center gap-2 text-base font-medium text-[#15191C] break-words">
          {unread && <><span aria-hidden className="size-2 rounded-full bg-[#FF651D] shrink-0" /><span className="sr-only">Unread: </span></>}
          {notification.title}
        </h2>
        <p className="mt-3 text-xs text-[#828282] leading-[1.25] break-words">{notification.message}</p>
        {notification.timestamp && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-[#A0A0A0]" title={notification.timeAgo}>
            <span>{day}</span>
            {time && <><span aria-hidden className="w-px h-3 bg-[#A0A0A0]" /><span>{time}</span></>}
          </p>
        )}
      </div>

      <div className="flex items-start gap-1 shrink-0">
        {unread && onMarkRead && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id); }}
            className="text-[11px] font-semibold text-[#E04B16] hover:bg-orange-50 px-2 py-1 rounded cursor-pointer whitespace-nowrap"
            title="Mark as read"
          >
            Mark read
          </button>
        )}
        {onClear && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(notification.id); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
            title="Clear notification"
            aria-label="Clear notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
