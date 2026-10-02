"use client";

import React, { useState } from "react";
import { eventService } from "@/services/eventService";

interface EventCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle?: string;
  onCleanupSuccess?: () => void;
}

export default function EventCleanupModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  onCleanupSuccess,
}: EventCleanupModalProps) {
  const [clearing, setClearing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClearData = async () => {
    setErrorMessage(null);
    setClearing(true);
    try {
      const res = await eventService.cleanupEventData(eventId);
      if (res.success) {
        setClearing(false);
        if (onCleanupSuccess) {
          onCleanupSuccess();
        } else {
          onClose();
        }
      } else {
        setErrorMessage(res.message || res.error || "Failed to clear event operational data.");
        setClearing(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during cleanup.");
      setClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-overlay">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-modal">
        {/* Top Decorative Banner */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400 block">
                Event Completed
              </span>
              <h3 className="text-sm font-bold text-white truncate max-w-[280px]">
                {eventTitle || "Event Operations"}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={clearing}
            className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs text-gray-700">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
            <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              This event has ended.
            </h4>
            <p className="text-amber-800 leading-relaxed">
              Would you like to clear its completed operational data?
            </p>
          </div>

          <p className="text-gray-500 leading-normal">
            Clearing operational data will permanently delete event-specific invitees, invitations, sessions, check-in logs, and staff assignments for this event.
          </p>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-[11px] text-gray-600 space-y-1">
            <div className="font-bold text-gray-800 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              User Preservation Guarantee:
            </div>
            <p>
              Global ADMIN, ORGANIZER, and SYSTEM_USER user accounts will <strong className="text-gray-900">NOT</strong> be deleted. The Event reference document remains intact for historical records.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={clearing}
            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Keep Data
          </button>
          <button
            type="button"
            onClick={handleClearData}
            disabled={clearing}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-md transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {clearing && (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{clearing ? "Clearing event data..." : "Clear Event Data"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
