"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/icons/Icon";

interface SendWarningModalProps {
  eventId: string;
  eventTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const secondary = "inline-flex items-center justify-center px-6 py-[11px] bg-[#E6EAED] hover:bg-[#DCE1E5] rounded-lg text-base font-semibold text-[#595D60] cursor-pointer";

/**
 * Shown before an event's first invitations go out (Figma 2001:2443): sending locks the event, so the organiser gets a
 * last chance to edit it or change its card design.
 */
export default function SendWarningModal({ eventId, eventTitle, onCancel, onConfirm }: SendWarningModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="send-warning-title">
      <div className="w-full max-w-[648px] bg-white border border-[#E5E5E5] rounded-lg overflow-y-auto max-h-[calc(100dvh-2rem)]">
        <div className="flex items-end gap-5 px-6 py-5 border-b border-[#E0E0E0]">
          <p className="flex-1 min-w-0 text-base font-medium text-[#15191C] break-words">Send Invitations for {eventTitle}</p>
          <button type="button" onClick={onCancel} aria-label="Close" className="shrink-0 cursor-pointer">
            <Icon name="events/close" width={16} height={16} />
          </button>
        </div>
        <div className="flex flex-col items-center gap-6 px-6 py-[60px] text-center">
          <Icon name="events/warning" width={34} height={32} />
          <div className="flex flex-col gap-2 max-w-[442px] font-medium">
            <h2 id="send-warning-title" className="text-[26px] text-[#15191C]">Warning</h2>
            <p className="text-base text-[#15191C]/80">
              Once you start sending the invitations, you will not be able to edit this event any further. Do you want to start sending your invitations now?
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 p-4 border-t border-[#E5E5E5]">
          <Link href={`/events/${eventId}/edit`} className={secondary}>Edit Event</Link>
          {/* The template is chosen from the card preview on the edit form's first step */}
          <Link href={`/events/${eventId}/edit`} className={secondary}>Change Template</Link>
          <button type="button" onClick={onCancel} className={secondary}>I’ll do later</button>
          <button type="button" onClick={onConfirm} autoFocus className="inline-flex items-center justify-center px-6 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] rounded-lg text-base font-semibold text-white cursor-pointer">
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
