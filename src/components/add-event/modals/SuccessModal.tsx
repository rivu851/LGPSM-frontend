"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SuccessModal({ isOpen, onClose }: SuccessModalProps) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && overlayRef.current && modalRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
        gsap.fromTo(
          modalRef.current,
          { scale: 0.75, opacity: 0, y: 20 },
          { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: "back.out(1.4)" }
        );
      });
      return () => ctx.revert();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNavigate = () => {
    onClose();
    router.push("/events");
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-md border border-gray-200 shadow-2xl max-w-md w-full p-8 text-center overflow-hidden my-auto relative"
      >
        {/* Solid Green Checkmark Circle matching exact screenshot */}
        <div className="w-14 h-14 bg-[#10B981] text-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-xs">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
          Event Creation Successful!
        </h3>

        {/* Description Text */}
        <p className="text-xs text-gray-500 leading-relaxed mb-6 max-w-[290px] mx-auto font-medium">
          Kindly proceed with sending the invitations from the &lsquo;Event Management&rsquo; details page or the &lsquo;Invitees Management&rsquo; page.
        </p>

        {/* Action Button */}
        <button
          onClick={handleNavigate}
          className="w-full py-3 px-6 bg-[#C65318] hover:bg-[#A83800] active:bg-[#C93B0A] text-white font-bold text-xs sm:text-sm rounded-lg transition-all shadow-xs cursor-pointer"
        >
          Go to your Invitees Management
        </button>
      </div>
    </div>
  );
}
