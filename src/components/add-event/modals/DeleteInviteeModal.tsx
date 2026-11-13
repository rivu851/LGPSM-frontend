"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";

interface DeleteInviteeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteInviteeModal({
  isOpen,
  onClose,
  onConfirm,
}: DeleteInviteeModalProps) {
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

  return (
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
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-2">Warning</h3>
          <p className="text-xs text-gray-600 leading-relaxed max-w-xs mb-6">
            Are you sure you want to delete this invitee?
            <br />
            By deleting this invitee, you won't be able to access the system.
          </p>

          {/* Footer Actions (Image #3) */}
          <div className="flex items-center justify-center gap-3 w-full">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-md transition-colors cursor-pointer"
            >
              No, Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-6 py-2.5 bg-[#C65318] hover:bg-[#A83800] text-white font-bold text-xs rounded-md shadow-xs transition-all cursor-pointer"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
