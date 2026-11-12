"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { flagExplicitLogout, loginRedirectPath } from "@/components/auth/authPortal";
import { useAuth } from "@/context/AuthContext";

export default function UserNavDropdown() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = (user?.role === "ORGANIZER" ? user.profile?.organizationName : null) || user?.fullName || user?.email || "Account Name";
  const avatarUrl = user?.avatarUrl || null;

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
    flagExplicitLogout();
    await logout();
    router.replace(loginRedirectPath());
  };

  return (
    <>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="relative inline-block text-left" ref={dropdownRef}>
          {/* Flat avatar + name + chevron — Figma header has no pill background */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Account menu"
            className="flex items-center gap-2 cursor-pointer select-none focus:outline-none"
          >
            {/* Figma header (222:34645): 32px #D9D9D9 avatar with a 17px glyph, 16px medium name, 24px chevron */}
            <div className="w-8 h-8 rounded-full bg-[#D9D9D9] flex items-center justify-center overflow-hidden shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <Image src="/images/header/avatar-user.svg" alt="" width={17} height={17} />
              )}
            </div>

            <span className="hidden sm:inline text-base font-medium text-black max-w-[140px] truncate">
              {displayName}
            </span>

            <Image
              src="/images/header/chevron-down.svg"
              alt=""
              width={24}
              height={24}
              className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1.5 z-50 animate-menu">
              {/* User Email & Role Header inside Dropdown */}
              <div className="px-4 py-2 border-b border-gray-100">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-gray-900 truncate">{displayName}</p>
                  {user?.role && (
                    <span className="text-[9px] font-bold text-[#C44200] bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded uppercase shrink-0">
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
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#A83800] flex items-center gap-2.5 transition-colors cursor-pointer"
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
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
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

    </>
  );
}
