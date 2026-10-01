"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

// Organizer auth screens: the graphic fills the left side from top to bottom and stays put while
// the form column scrolls; the form itself is centred in its column.
export function AuthSplitLayout({ top, children }: { top?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex">
      <aside className="hidden lg:block lg:w-[42%] xl:w-[45%] shrink-0 lg:sticky lg:top-0 lg:h-screen bg-[#FF651D]">
        <div className="relative w-full h-full">
          <Image src="/images/auth/Auth.png" alt="" fill priority sizes="45vw" className="object-cover object-center" />
        </div>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        {top && <div className="px-4 pt-4 flex justify-center lg:justify-end">{top}</div>}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8">
          <div className="w-full max-w-[440px]">
            <Link href="/" className="inline-block mb-6">
              <Image src="/images/navbar/Nav_logo.png" alt="LGPSM" width={160} height={40} className="h-9 w-auto object-contain" />
            </Link>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

// Admin auth screens follow the Figma "Login" frame: a centred white card on a light canvas.
export function AuthCardLayout({ top, children }: { top?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 flex flex-col">
      {top && <div className="px-4 pt-4 flex justify-center">{top}</div>}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl px-6 py-8 sm:px-10 sm:py-10 w-full max-w-[440px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="text-center mb-6">
            <Link href="/" className="inline-block">
              <Image src="/images/navbar/Nav_logo.png" alt="LGPSM" width={180} height={50} priority className="h-10 w-auto mx-auto object-contain" />
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function PortalTabs({ mode, onChange }: { mode: "admin" | "organizer"; onChange: (m: "admin" | "organizer") => void }) {
  const tab = (value: "admin" | "organizer", label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => onChange(value)}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
        mode === value ? "bg-[#FF651D] text-white" : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div role="tablist" aria-label="Sign in as" className="bg-gray-100 p-1 rounded-full inline-flex items-center gap-1 border border-gray-200">
      {tab("admin", "Admin")}
      {tab("organizer", "Organizer")}
    </div>
  );
}

export function AuthAlert({ tone, children }: { tone: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "bg-red-50 border-red-200 text-red-700",
    success: "bg-emerald-50 border-emerald-200 text-emerald-700",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`mb-4 p-3 border rounded-md text-sm ${styles}`}>
      {children}
    </div>
  );
}

export const authInputClass =
  "w-full px-4 py-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#FF651D] transition-colors disabled:opacity-60";

export const authLabelClass = "block text-sm font-medium text-gray-900 mb-1.5";

export const authPrimaryButtonClass =
  "w-full py-3 bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2";

export function PasswordInput({
  value,
  onChange,
  placeholder,
  disabled,
  autoComplete,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  autoComplete?: string;
  id?: string;
}) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative flex items-center">
      <input
        id={id}
        type={visible ? "text" : "password"}
        required
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${authInputClass} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-3 text-gray-400 hover:text-gray-600 cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {visible ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.05 10.05 0 013.98-1.063c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
          ) : (
            <>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}

export function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
