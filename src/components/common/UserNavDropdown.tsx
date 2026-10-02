"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginRedirectPath } from "@/components/auth/authPortal";
import { useAuth } from "@/context/AuthContext";
import CheckInModal from "@/components/common/CheckInModal";

export default function UserNavDropdown() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = user?.fullName || user?.email || "Account Name";
  const avatarUrl = (user as any)?.avatarUrl || null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleProfileClick = () => {
    setIsOpen(false);
    router.push("/settings/account");
  };

  const handleLogoutClick = async () => {
    setIsOpen(false);
    await logout();
    router.push(loginRedirectPath());
  };

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={() => setIsCheckInOpen(true)}
          aria-label="Scan QR Pass"
          title="Scan QR Pass"
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-[#FF5B22] hover:bg-[#E04B16] text-white rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <span className="hidden sm:inline">Scan QR Pass</span>
        </button>

        <div className="relative inline-block text-left" ref={dropdownRef}>
          {/* Avatar Pill Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Account menu"
            className="flex items-center gap-2 bg-[#F1F3F6] hover:bg-[#E4E7EC] px-2 sm:px-3 py-1.5 rounded-full cursor-pointer transition-all duration-150 focus:outline-none select-none"
          >
            <div className="w-7 h-7 rounded-full bg-gray-400 text-white flex items-center justify-center font-semibold text-xs overflow-hidden shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            <span className="hidden sm:inline text-xs font-semibold text-gray-800 max-w-[140px] truncate">
              {displayName}
            </span>

            <svg
              className={`w-3.5 h-3.5 text-gray-500 transform transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1.5 z-50 animate-menu">
              {/* User Email & Role Header inside Dropdown */}
              <div className="px-4 py-2 border-b border-gray-100">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-gray-900 truncate">{displayName}</p>
                  {user?.role && (
                    <span className="text-[9px] font-bold text-[#FF5B22] bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded uppercase shrink-0">
                      {user.role}
                    </span>
                  )}
                </div>
                {user?.email && (
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">{user.email}</p>
                )}
              </div>

              {/* Menu Items */}
              <div className="py-1">
                {/* Profile */}
                <button
                  type="button"
                  onClick={handleProfileClick}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#FF5B22] flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Profile</span>
                </button>

                {/* Logout */}
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
      />
    </>
  );
}
