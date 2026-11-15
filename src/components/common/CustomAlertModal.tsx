"use client";

import AlertIcon from "@/components/common/AlertIcon";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";

export type AlertType = "success" | "error" | "warning" | "info";

export interface CustomAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: AlertType;
  buttonText?: string;
  /** What the button does besides closing the window (for example "Try again") */
  onAction?: () => void;
}

export default function CustomAlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
  buttonText,
  onAction,
}: CustomAlertModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && overlayRef.current && modalRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        gsap.fromTo(
          modalRef.current,
          { scale: 0.9, opacity: 0, y: 10 },
          { scale: 1, opacity: 1, y: 0, duration: 0.25, ease: "back.out(1.4)" }
        );
      });
      return () => ctx.revert();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const defaultTitle =
    type === "success"
      ? "Success"
      : type === "error"
      ? "Error"
      : type === "warning"
      ? "Attention"
      : "Notification";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans select-none"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl border border-gray-100 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 overflow-y-auto relative max-h-[calc(100dvh-2rem)]"
      >
        <button type="button" onClick={onClose} aria-label="Close" title="Close" className="absolute right-3 top-3 size-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer">
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <AlertIcon kind={type === "success" ? "success" : type === "error" ? "error" : type === "warning" ? "warning" : "info"} />

        {/* Title */}
        <h3 className="text-base font-bold text-gray-900">{title || defaultTitle}</h3>

        {/* Message */}
        <p className="text-xs text-gray-600 leading-relaxed font-medium px-2 whitespace-pre-line break-words">{message}</p>

        {/* An action button only when the message asks for one (the close icon dismisses it) */}
        {buttonText && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => { onAction?.(); onClose(); }}
            className={`w-full py-2.5 font-bold text-xs rounded-md transition-colors cursor-pointer shadow-2xs text-white ${
              type === "success"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : type === "error"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-[#C65318] hover:bg-[#A83800]"
            }`}
          >
            {buttonText}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
