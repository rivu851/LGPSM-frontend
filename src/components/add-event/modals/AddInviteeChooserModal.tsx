"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useOverlayClose } from "@/hooks/useOverlayClose";
import CustomDropdown from "@/components/common/CustomDropdown";

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
        className="bg-white rounded-lg border border-gray-200 shadow-2xl w-full max-w-lg overflow-y-auto max-h-[calc(100dvh-2rem)]"
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
            className="text-gray-500 hover:text-gray-600 transition-colors p-1 rounded-md cursor-pointer"
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
              <span className="block text-sm font-medium text-gray-900 mb-1.5">Add to session</span>
              <CustomDropdown
                portal
                ariaLabel="Add to session"
                value={sessionId}
                onChange={onSessionChange}
                options={sessionOptions.length === 1 ? [{ value: "", label: sessionOptions[0].name }] : [{ value: "", label: "All sessions (the whole event)" }, ...sessionOptions.map((s) => ({ value: s.id, label: s.name }))]}
              />
              <p className="mt-1 text-xs text-gray-500">Choose a session when it has its own invitee list. The guests you add can then enter that session.</p>
            </div>
          )}
          <p className="text-sm text-gray-500 mb-4">
            How would you like to add invitees?
          </p>

          {/* the two ways side by side, in one row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Upload Excel option */}
          <button
            type="button"
            onClick={() => { onClose(); onChooseExcel(); }}
            className="w-full h-full flex flex-col items-start gap-3 px-4 py-4 rounded-lg border border-gray-200 hover:bg-[#EEF3FF] transition-all text-left cursor-pointer"
          >
            <span className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-md bg-[#E8F5EE] flex items-center justify-center">
              {/* Microsoft Excel mark in its own greens */}
              <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden>
                <path fill="#21A366" d="M14 2l6 6v12a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2h6z" />
                <path fill="#107C41" d="M14 2l6 6h-4a2 2 0 01-2-2V2z" />
                <rect x="1" y="7" width="12" height="12" rx="1.5" fill="#185C37" />
                <path fill="#fff" d="M4.2 9.5h1.9l1 1.8 1-1.8h1.9L8.1 13l2 3.5H8.2l-1.1-2-1.1 2H4.1L6.1 13l-1.9-3.5z" />
              </svg>
            </span>
            <span>
              <span className="block text-sm font-semibold text-gray-900">
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
            className="w-full h-full flex flex-col items-start gap-3 px-4 py-4 rounded-lg border border-gray-200 hover:bg-[#EEF3FF] transition-all text-left cursor-pointer"
          >
            <span className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center">
              {/* Standard profile glyph in neutral grey */}
              <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="8" r="4" fill="#5F6368" />
                <path fill="#5F6368" d="M4 20a8 8 0 0116 0v1H4v-1z" />
              </svg>
            </span>
            <span>
              <span className="block text-sm font-semibold text-gray-900">
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
    </div>
  );
}
