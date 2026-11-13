"use client";

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
}

export default function CustomAlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
  buttonText = "Okay",
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
        {/* Top Icon Badge */}
        {type === "success" && (
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-2xs">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {type === "error" && (
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-2xs">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}

        {type === "warning" && (
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-2xs">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        )}

        {type === "info" && (
          <div className="w-12 h-12 bg-orange-100 text-[#C44200] rounded-full flex items-center justify-center mx-auto shadow-2xs">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}

        {/* Title */}
        <h3 className="text-base font-bold text-gray-900">{title || defaultTitle}</h3>

        {/* Message */}
        <p className="text-xs text-gray-600 leading-relaxed font-medium px-2">{message}</p>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
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
      </div>
    </div>
  );
}
