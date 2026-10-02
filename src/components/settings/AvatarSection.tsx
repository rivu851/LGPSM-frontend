"use client";

import React, { useState, useRef, useEffect } from "react";
import CameraCaptureModal from "./modals/CameraCaptureModal";

interface AvatarSectionProps {
  avatarUrl: string | null;
  onAvatarChange: (newUrl: string | null) => void;
}

export default function AvatarSection({
  avatarUrl,
  onAvatarChange,
}: AvatarSectionProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onAvatarChange(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    setIsMenuOpen(false);
  };

  const handleTakeCameraPhoto = () => {
    setIsMenuOpen(false);
    setIsCameraModalOpen(true);
  };

  const handleUploadPhoto = () => {
    setIsMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = () => {
    setIsMenuOpen(false);
    onAvatarChange(null);
  };

  return (
    <div className="relative inline-block select-none" ref={containerRef}>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Avatar Trigger Button */}
      <div
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="relative w-32 h-32 rounded-full overflow-hidden shrink-0 border-2 border-gray-200 bg-gray-100 flex items-center justify-center cursor-pointer group shadow-sm transition-all hover:border-[#FF5B22]"
        title="Click to change profile photo"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile Avatar"
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          /* Default Profile Icon */
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        )}

        {/* Hover Camera Icon Badge Overlay */}
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-[10px] font-semibold mt-1">Edit Photo</span>
        </div>
      </div>

      {/* Dropdown Options Box */}
      {isMenuOpen && (
        <div className="absolute left-0 mt-2 w-52 bg-white rounded-md border border-gray-200 shadow-xl z-40 py-1.5 animate-menu text-xs font-semibold text-gray-700 divide-y divide-gray-100">
          <div className="py-1">
            {/* 1. Take a Photo */}
            <button
              type="button"
              onClick={handleTakeCameraPhoto}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-orange-50 hover:text-[#FF5B22] transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 text-gray-500 group-hover:text-[#FF5B22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Take a photo</span>
            </button>

            {/* 2. Upload a Photo */}
            <button
              type="button"
              onClick={handleUploadPhoto}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-orange-50 hover:text-[#FF5B22] transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Upload a photo</span>
            </button>
          </div>

          {/* 3. Remove Photo */}
          {avatarUrl && (
            <div className="py-1">
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Remove photo</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(dataUrl) => onAvatarChange(dataUrl)}
      />
    </div>
  );
}
