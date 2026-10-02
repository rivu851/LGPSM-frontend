"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { invitationService } from "@/services/invitationService";

interface CardPreviewModalProps {
  eventId: string;
  inviteeId?: string;
  inviteeName?: string;
  onClose: () => void;
}

// Shows the card exactly as the backend renders it for email/WhatsApp (one source of truth)
export default function CardPreviewModal({ eventId, inviteeId, inviteeName, onClose }: CardPreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<"ISSUED" | "SAMPLE" | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    invitationService
      .previewCard(eventId, inviteeId)
      .then(({ blob, qr: qrKind }) => {
        if (cancelled) return;
        setQr(qrKind);
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e: Error) => !cancelled && setError(e.message || "The card preview could not be generated."));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [eventId, inviteeId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="card-preview-title">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[94vh]">
        <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 id="card-preview-title" className="text-base font-medium text-gray-900">Invitation Card Preview</h2>
            <p className="text-xs text-[#828282] truncate">{inviteeName ? `As sent to ${inviteeName}` : "Sample guest"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-[#F4F5F8] flex items-center justify-center min-h-[300px]">
          {error ? (
            <p role="alert" className="text-sm text-rose-600 text-center">{error}</p>
          ) : url ? (
            <div className="relative w-full aspect-[2/3]">
              <Image src={url} alt="Invitation card" fill unoptimized className="object-contain" />
            </div>
          ) : (
            <p className="text-sm text-[#828282]">Generating preview...</p>
          )}
        </div>
        {url && qr && (
          <p className={`px-5 py-2.5 text-xs border-t ${qr === "ISSUED" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-amber-50 border-amber-100 text-amber-800"}`}>
            {qr === "ISSUED"
              ? "This QR is the guest's current check-in pass. Sending the invitation again replaces it."
              : "Sample QR only — it cannot be used for check-in. Send the invitation to issue this guest a real pass."}
          </p>
        )}
        <div className="px-5 py-3 border-t border-[#E5E5E5] flex justify-end gap-3">
          {url && (
            <a href={url} download={`Invitation_${(inviteeName || "guest").replace(/\s+/g, "_")}.png`} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-800 hover:bg-gray-50">
              Download
            </a>
          )}
          <button type="button" onClick={onClose} className="px-4 py-2 bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-medium rounded-md cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
