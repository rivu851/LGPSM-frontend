"use client";

import { createPortal } from "react-dom";
import AlertIcon from "@/components/common/AlertIcon";
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

export interface RemovalDetails {
  reason: string;
  email: boolean;
  whatsapp: boolean;
}

interface DeleteInviteeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the reason and where to send it. The modal stays open (and busy) until the returned promise settles. */
  onConfirm: (details: RemovalDetails) => void | Promise<void>;
  /** How many invitees are being removed (1 when omitted) */
  count?: number;
  /** Which message channels start ticked (the page's channel choice, or the channels the invitee was invited through) */
  defaultChannels?: { email: boolean; whatsapp: boolean };
  /** A reason and a message are only for guests who were sent an invitation. For guests who were not, this is a plain "are you sure" (false). */
  askReason?: boolean;
}

// The form is mounted only while the window is open, so it always starts empty
export default function DeleteInviteeModal(props: DeleteInviteeModalProps) {
  return props.isOpen ? <DeleteInviteeForm {...props} /> : null;
}

function DeleteInviteeForm({
  isOpen,
  onClose,
  onConfirm,
  count = 1,
  defaultChannels = { email: true, whatsapp: false },
  askReason = true,
}: DeleteInviteeModalProps) {
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState(defaultChannels.email);
  const [whatsapp, setWhatsapp] = useState(defaultChannels.whatsapp);
  const [busy, setBusy] = useState(false);
  const many = count > 1;
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && overlayRef.current && modalRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
        gsap.fromTo(
          modalRef.current,
          { scale: 0.8, opacity: 0, y: 15 },
          { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.2)" }
        );
      });
      return () => ctx.revert();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // drawn on the page itself (not inside the form's layout), so the dim layer and the window cover the whole screen
  return typeof document === "undefined" ? null : createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-md border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col my-auto text-center relative"
      >
        {/* Modal Header (Image #3) */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between text-left">
          <h2 className="text-base font-bold text-gray-900">Delete Invitees</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-600 transition-colors p-1 rounded-md cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center">
          {/* Warning Triangle Icon */}
          <AlertIcon kind="warning" className="w-14 h-14 mb-4" />

          <h3 className="text-lg font-bold text-gray-900 mb-2">Warning</h3>
          <p className="text-xs text-gray-600 leading-relaxed max-w-sm mb-4">
            {askReason
              ? <>Are you sure you want to delete the records of {many ? `these ${count} invitees` : "this invitee"}? All the details of {many ? "these invitees" : "this invitee"} will become invalid once deleted, and any invitation or access pass they were sent stops working.</>
              : <>Do you want to delete {many ? `these ${count} invitees` : "this invitee"}? Are you sure?</>}
          </p>

          {askReason && <div className="w-full text-left">
            <label htmlFor="remove-reason" className="block text-xs font-semibold text-gray-800 mb-1">Reason <span className="text-[#C65318]">*</span></label>
            <textarea
              id="remove-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={many ? "Why are these invitees being removed? This message is sent to them." : "Why is this invitee being removed? This message is sent to them."}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-[#C65318] resize-none"
            />
            <p className="mt-3 mb-1 text-xs font-semibold text-gray-800">Send this message by</p>
            <div className="flex items-center gap-5 text-xs text-gray-700">
              <label className="inline-flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="accent-[#C65318]" />Email</label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} className="accent-[#C65318]" />WhatsApp</label>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">Tick both to send it on both. Leave both unticked to remove without sending a message.</p>
          </div>}

          <div className="flex flex-col items-stretch gap-3 w-full mt-5">
            <button
              onClick={onClose}
              disabled={busy}
              className="w-full px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              No, Cancel
            </button>
            <button
              disabled={busy || (askReason && reason.trim().length === 0)}
              onClick={async () => {
                setBusy(true);
                try { await onConfirm(askReason ? { reason: reason.trim(), email, whatsapp } : { reason: "", email: false, whatsapp: false }); } finally { setBusy(false); }
                onClose();
              }}
              className="w-full px-6 py-2.5 bg-[#C65318] hover:bg-[#A83800] text-white font-bold text-xs rounded-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
