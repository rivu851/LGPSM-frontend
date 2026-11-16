"use client";

import React, { useEffect, useState } from "react";
import PopupMessage from "@/components/common/PopupMessage";
import ModalClose from "@/components/common/ModalClose";
import { CancelEventResult, CancellationPreview, eventService } from "@/services/eventService";
import { previewLines } from "@/utils/cancellationSummary";

interface EventCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle?: string;
  onCancelled: (result: CancelEventResult) => void;
}

const REASON_MAX = 500;

/** Cancelling is permanent: the dialog says exactly what changes, who will be told, and asks for an explicit confirmation. */
export default function EventCancelModal({ isOpen, onClose, eventId, eventTitle, onCancelled }: EventCancelModalProps) {
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    eventService.getCancellationPreview(eventId)
      .then((res) => { if (!live) return; if (res.success && res.data) setPreview(res.data); else setPreviewFailed(true); })
      .catch(() => { if (live) setPreviewFailed(true); });
    return () => { live = false; };
  }, [isOpen, eventId]);

  if (!isOpen) return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await eventService.cancelEvent(eventId, reason);
      if (res.success && res.data) onCancelled(res.data);
      else setError(res.message || "Could not cancel the event.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel the event.");
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="cancel-event-title">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-6 space-y-4 my-auto relative">
        <ModalClose onClick={onClose} disabled={busy} />
        <h3 id="cancel-event-title" className="pr-8 text-base font-medium text-gray-900">Cancel event</h3>
        <p className="text-sm text-[#4B4F52] break-words">Cancel “{eventTitle || "this event"}”? <strong className="font-medium text-gray-900">This is permanent.</strong></p>

        <ul className="text-sm text-[#4B4F52] list-disc pl-5 space-y-1.5">
          <li>The event becomes <strong className="font-medium text-gray-900">cancelled</strong> and cannot be reinstated. To hold it anyway, create a new event and invite guests again.</li>
          <li>Every QR access pass for this event stops working straight away.</li>
          <li>No new invitations can be sent, and guests can no longer accept, decline or change their preferences.</li>
          <li>Attendance already recorded, RSVPs, invitation history, reports and the activity log are kept.</li>
        </ul>

        <div className="rounded-md border border-[#E0E0E0] bg-[#FAFAFA] p-3 text-sm text-[#4B4F52] space-y-1">
          <p className="font-medium text-gray-900">Who will be told</p>
          {preview ? previewLines(preview).map((line) => <p key={line}>{line}</p>) : previewFailed ? <p>We could not load the list of guests to notify. Cancelling will still notify everyone who was sent an invitation.</p> : <p>Checking…</p>}
        </div>

        <label className="block text-sm">
          <span className="block text-gray-900 font-medium mb-1">Reason <span className="font-normal text-[#6B6B6B]">(optional, shown to invited guests)</span></span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
            rows={3}
            disabled={busy}
            className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:border-black resize-none"
            placeholder="For example: the venue is no longer available"
          />
          <span className="block text-right text-xs text-[#6B6B6B]">{reason.length}/{REASON_MAX}</span>
        </label>

        <PopupMessage message={error} />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={submit} disabled={busy} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm font-medium cursor-pointer disabled:opacity-50">{busy ? "Cancelling…" : "Cancel event permanently"}</button>
        </div>
      </div>
    </div>
  );
}
