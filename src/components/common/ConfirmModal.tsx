"use client";

import React, { useEffect, useId, useRef, useState } from "react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
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
        className={`bg-white rounded-xl border border-gray-100 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 confirm-modal-panel ${closing ? "is-closing" : ""}`}
      >
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-2xs ${
            danger ? "bg-rose-100 text-rose-600" : "bg-orange-100 text-[#FF5B22]"
          }`}
        >
          {danger ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        <h3 id={titleId} className="text-base font-bold text-gray-900">{title}</h3>
        <p id={messageId} className="text-xs text-gray-600 leading-relaxed font-medium px-2 whitespace-pre-line">{message}</p>

        <div className="pt-2 flex items-center gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => resolve(false)}
            className="flex-1 py-2.5 font-bold text-xs rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5B22]"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => resolve(true)}
            className={`flex-1 py-2.5 font-bold text-xs rounded-md text-white shadow-2xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 ${
              danger ? "bg-rose-600 hover:bg-rose-700 focus-visible:outline-rose-600" : "bg-[#FF5B22] hover:bg-[#E04B16] focus-visible:outline-[#FF5B22]"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
