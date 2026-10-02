"use client";

import React from "react";
import Image from "next/image";

export default function DashboardPopupModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const steps = [
    {
      label: "Create an event",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 40 40" fill="none">
          <path d="M10 14V11a2 2 0 012-2h3" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M30 14V11a2 2 0 00-2-2h-3" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M10 26v3a2 2 0 002 2h3" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M30 26v3a2 2 0 01-2 2h-3" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="12" y1="20" x2="28" y2="20" stroke="#FF651D" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Add invitees to your events",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 40 40" fill="none">
          <circle cx="15" cy="14" r="4.5" stroke="#FF651D" strokeWidth="2.5" fill="none" />
          <path d="M7 30v-1.5a5.5 5.5 0 015.5-5.5h5a5.5 5.5 0 015.5 5.5V30" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="26" cy="16" r="4" stroke="#1C2228" strokeWidth="2.5" fill="none" />
          <path d="M23 30v-1a4.5 4.5 0 014.5-4.5h2a4.5 4.5 0 014.5 4.5V30" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Make payment for your invitees",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 40 40" fill="none">
          <path d="M7 14l13 9 13-9" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="7" y="14" width="26" height="17" rx="3" stroke="#1C2228" strokeWidth="2.5" />
          <path d="M20 18.5c-1.3-1.8-3.8-1.8-5.1 0-1.2 1.6-.2 3.6 1.2 4.8l3.9 3.2 3.9-3.2c1.4-1.2 2.4-3.2 1.2-4.8-1.3-1.8-3.8-1.8-5.1 0z" stroke="#FF651D" strokeWidth="2" fill="none" />
        </svg>
      ),
    },
    {
      label: "Select invitation QR Card design",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 40 40" fill="none">
          <path d="M26 9l5 5L17 28h-5v-5L26 9z" stroke="#1C2228" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M23 12l5 5" stroke="#1C2228" strokeWidth="2" />
          <path d="M14 11a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" stroke="#FF651D" strokeWidth="2.2" fill="none" />
          <path d="M14 8.5v2.5M14 20v2.5M8.5 15.5h2.5M20 15.5h2.5M10.1 11.6l1.8 1.8M16.1 17.6l1.8 1.8M10.1 19.4l1.8-1.8M16.1 13.4l1.8-1.8" stroke="#FF651D" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Send QR Invitations",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 40 40" fill="none">
          <line x1="20" y1="13" x2="13" y2="27" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="20" y1="13" x2="27" y2="27" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="13" y1="27" x2="27" y2="27" stroke="#1C2228" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="20" cy="12" r="3.5" stroke="#FF651D" strokeWidth="2.5" fill="none" />
          <circle cx="12" cy="27" r="3.5" stroke="#1C2228" strokeWidth="2.5" fill="none" />
          <circle cx="28" cy="27" r="3.5" stroke="#1C2228" strokeWidth="2.5" fill="none" />
        </svg>
      ),
    },
    {
      label: "View Reports",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 40 40" fill="none">
          <rect x="9" y="9" width="9" height="9" rx="2.5" stroke="#1C2228" strokeWidth="2.5" />
          <rect x="22" y="9" width="9" height="9" rx="2.5" stroke="#FF651D" strokeWidth="2.5" fill="none" />
          <rect x="9" y="22" width="9" height="9" rx="2.5" stroke="#FF651D" strokeWidth="2.5" fill="none" />
          <rect x="22" y="22" width="9" height="9" rx="2.5" stroke="#1C2228" strokeWidth="2.5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-modal-overlay">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col md:flex-row min-h-[420px] animate-modal-pop">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 text-white hover:bg-[#FF651D] hover:rotate-90 hover:scale-110 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md"
        >
          ✕
        </button>

        {/* Left Section */}
        <div className="flex-1 p-8 md:p-10 flex flex-col justify-center space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight animate-item-slide" style={{ animationDelay: "100ms" }}>
            Create an event
          </h2>
          <ul className="space-y-3.5">
            {steps.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center gap-3.5 text-sm font-medium text-gray-800 hover:translate-x-1.5 transition-transform duration-200 group cursor-default animate-item-slide"
                style={{ animationDelay: `${160 + idx * 55}ms` }}
              >
                <div className="w-8 h-8 rounded-lg bg-[#FFF0EB] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-xs">
                  {item.icon}
                </div>
                <span className="group-hover:text-[#FF651D] transition-colors duration-200">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Section Image */}
        <div className="hidden md:block w-1/2 relative bg-gray-900 min-h-[420px] overflow-hidden">
          <div className="absolute inset-0 animate-image-zoom">
            <Image
              src="/images/dashboard/Dashboard_Popup.webp"
              alt="Scanning QR Code"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
