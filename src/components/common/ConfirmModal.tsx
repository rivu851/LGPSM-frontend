"use client";

import AlertIcon from "@/components/common/AlertIcon";
import React, { useEffect, useId, useRef, useState } from "react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** show "no" as a button beside the confirm button (the close icon is always there too) */
  cancelButton?: boolean;
  // "danger" for destructive actions (delete, discard, clear): red confirm button and warning icon
  tone?: "danger" | "default";
  onResolve: (confirmed: boolean) => void;
}

const EXIT_MS = 200;

// In-app replacement for window.confirm(). Escape and a click on the backdrop cancel; focus starts on
// "Cancel" so a stray Enter never confirms a destructive action; Tab stays inside the dialog.
export default function ConfirmModal({
  isOpen,
  title = "Are you sure?",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  cancelButton = false,
  tone = "default",
  onResolve,
}: ConfirmModalProps) {
  const [closing, setClosing] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const titleId = useId();
  const messageId = useId();

  const resolve = (confirmed: boolean) => {
    if (closing) return;
    setClosing(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = setTimeout(() => {
      setClosing(false);
      onResolve(confirmed);
    }, reduced ? 0 : EXIT_MS);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        resolve(false);
      } else if (e.key === "Tab") {
        // Two focusable buttons: keep focus cycling between them
        const first = cancelRef.current;
        const last = confirmRef.current;
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // resolve only reads the latest `closing`/`onResolve`; re-binding on every change keeps it current
  });

  if (!isOpen) return null;

  const danger = tone === "danger";

  return (
    <div
      className={`fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4 font-sans confirm-modal-overlay ${closing ? "is-closing" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) resolve(false);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className={`bg-white rounded-xl border border-gray-100 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 relative confirm-modal-panel ${closing ? "is-closing" : ""}`}
      >
        {/* closing the window is the same as answering no: the close icon replaces a Cancel button */}
        <button
          ref={cancelRef}
          type="button"
          onClick={() => resolve(false)}
          aria-label={cancelText}
          title={cancelText}
          className="absolute right-3 top-3 size-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer focus-visible:outline-2 focus-visible:outline-black"
        >
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <AlertIcon kind={danger ? "warning" : "question"} />

        <h3 id={titleId} className="text-base font-bold text-gray-900">{title}</h3>
        <p id={messageId} className="text-xs text-gray-600 leading-relaxed font-medium px-2 whitespace-pre-line">{message}</p>

        <div className="pt-2 flex items-center gap-3">
          {cancelButton && (
            <button
              type="button"
              onClick={() => resolve(false)}
              className="w-full py-2.5 font-bold text-xs rounded-md bg-white border border-[#DDD] text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              {cancelText}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            onClick={() => resolve(true)}
            className={`w-full py-2.5 font-bold text-xs rounded-md text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 ${
              danger ? "bg-rose-600 hover:bg-rose-700 focus-visible:outline-rose-600" : "bg-[#C65318] hover:bg-[#A83800] focus-visible:outline-[#FF5B22]"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
