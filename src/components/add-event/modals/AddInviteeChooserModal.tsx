"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useOverlayClose } from "@/hooks/useOverlayClose";

interface AddInviteeChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChooseExcel: () => void;
  onChooseManual: () => void;
  /** Sessions that keep their own invitee list; the choice is only offered when there is more than one */
  sessionOptions?: { id: string; name: string }[];
  sessionId?: string;
  onSessionChange?: (id: string) => void;
}

export default function AddInviteeChooserModal({
  isOpen,
  onClose,
  onChooseExcel,
  onChooseManual,
  sessionOptions = [],
  sessionId = "",
  onSessionChange,
}: AddInviteeChooserModalProps) {
  const overlayClose = useOverlayClose(onClose);
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && overlayRef.current && modalRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.22 });
        gsap.fromTo(
          modalRef.current,
          { scale: 0.85, opacity: 0, y: 16 },
          { scale: 1, opacity: 1, y: 0, duration: 0.32, ease: "back.out(1.2)" }
        );
      });
      return () => ctx.revert();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 font-sans"
      {...overlayClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg border border-gray-200 shadow-2xl w-full max-w-sm overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-invitee-chooser-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="add-invitee-chooser-title" className="text-base font-bold text-gray-900">
            Add Invitees
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3">
          {sessionOptions.length > 1 && onSessionChange && (
            <div className="mb-4">
              <label htmlFor="add-invitee-session" className="block text-sm font-medium text-gray-900 mb-1.5">Add to session</label>
              <select
                id="add-invitee-session"
                value={sessionId}
                onChange={(e) => onSessionChange(e.target.value)}
                className="w-full h-[42px] px-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-sm text-gray-900 focus:outline-none focus:border-[#FF651D]"
              >
                <option value="">All sessions (the whole event)</option>
                {sessionOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <p className="mt-1 text-xs text-gray-500">Choose a session when it has its own invitee list. The guests you add can then enter that session.</p>
            </div>
          )}
          <p className="text-sm text-gray-500 mb-4">
            How would you like to add invitees?
          </p>

          {/* Upload Excel option */}
          <button
            type="button"
            onClick={() => { onClose(); onChooseExcel(); }}
            className="w-full flex items-start gap-4 px-4 py-4 rounded-lg border border-gray-200 hover:border-[#FF651D] hover:bg-orange-50/60 transition-all group text-left cursor-pointer"
          >
            <span className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-md bg-orange-50 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
              <svg className="w-5 h-5 text-[#FF651D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            <span>
              <span className="block text-sm font-semibold text-gray-900 group-hover:text-[#E5520F]">
                Upload via Excel
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Import a bulk list from an .xlsx or .xls file
              </span>
            </span>
          </button>

          {/* Manual add option */}
          <button
            type="button"
            onClick={() => { onClose(); onChooseManual(); }}
            className="w-full flex items-start gap-4 px-4 py-4 rounded-lg border border-gray-200 hover:border-[#FF651D] hover:bg-orange-50/60 transition-all group text-left cursor-pointer"
          >
            <span className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-md bg-orange-50 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
              <svg className="w-5 h-5 text-[#FF651D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
            <span>
              <span className="block text-sm font-semibold text-gray-900 group-hover:text-[#E5520F]">
                Add Manually
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Enter one invitee's details by hand
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
