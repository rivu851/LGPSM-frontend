"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";

// Auth screens follow Login-Signup-Flow/02-Login.pdf & 03-Register.pdf (1440-wide frame):
// left = orange sunburst panel (666px) with a 739px-tall rounded photo card, vertically centred, that
// overhangs 71px into the white; right = 440px form column starting 190px past the panel, top-aligned at 80px.
// aside gets z-10 so the card (right-[-10.66%]) overhangs on top of the white main panel.
export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  const [cardLoaded, setCardLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const form = formRef.current;
    if (!card || !form) return;
    // Card slides in from the left (horizontal)
    gsap.fromTo(card,
      { x: -90, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.05 }
    );
    // Form slides up from below (vertical)
    gsap.fromTo(form,
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.65, ease: "power2.out", delay: 0.18 }
    );
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#15191C] flex font-[family-name:var(--font-inter)]">
      {/* z-10 so the card's right-[-10.66%] overhang renders on top of the white main panel */}
      <aside className="hidden lg:block relative z-10 shrink-0 w-[46.25%] bg-[#FF651D]">
        <Image src="/images/auth/auth-sunburst.svg" alt="" fill sizes="47vw" className="object-cover" priority />
        <div
          ref={cardRef}
          className="absolute z-20 left-[12.61%] right-[-10.66%] top-1/2 -translate-y-1/2 h-[min(739px,calc(100%-48px))] rounded-[20px] overflow-hidden shadow-2xl"
        >
          <div
            aria-hidden
            className={`absolute inset-0 auth-card-shimmer rounded-[20px] transition-opacity duration-500 ${
              cardLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          />
          <Image
            src="/images/auth/Auth.webp"
            alt=""
            fill
            sizes="46vw"
            // The main visual of the sign-in / sign-up screen, so it is the LCP image on desktop: fetch it now
            // instead of waiting for lazy loading to decide
            loading="eager"
            fetchPriority="high"
            className={`object-cover object-center transition-opacity duration-700 ease-out ${
              cardLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setCardLoaded(true)}
          />
        </div>
      </aside>
      <main className="flex-1 min-w-0 relative z-0 px-4 sm:px-8 lg:px-0 pt-10 lg:pt-20 pb-12">
        <div ref={formRef} className="w-full max-w-[440px] mx-auto lg:mx-0 lg:ml-[min(24.55%,calc(100%-464px))]">
          {children}
        </div>
      </main>
    </div>
  );
}

// Admin login: centered white card on a light gray page — no left panel, no Google button.
export function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    // Card scales + slides up from below (vertical entrance)
    gsap.fromTo(cardRef.current,
      { y: 32, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" }
    );
  }, []);

  return (
    <div
      className="min-h-screen bg-[#F5F5F5] flex items-center justify-center font-[family-name:var(--font-inter)] p-4"
    >
      <main
        ref={cardRef}
        className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_4px_32px_rgba(0,0,0,0.09)] px-8 sm:px-10 py-10"
      >
        {children}
      </main>
    </div>
  );
}

export function AuthLogo() {
  return (
    <Link href="/" className="inline-block">
      <Image src="/images/branding/lgpsm-logo.svg" alt="LGPSM" width={202} height={34} priority fetchPriority="high" className="h-[34px] w-auto" />
    </Link>
  );
}

// Server-rendered placeholder for auth pages whose body reads the URL query on the client. Without it
// the HTML is blank until JavaScript loads, so the brand logo (the LCP element) now paints immediately.
export function AuthLoadingShell() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <AuthLogo />
    </div>
  );
}

export function BackLink({ href, label = "Back to Home", onClick }: { href?: string; label?: string; onClick?: () => void }) {
  const inner = (
    <span className="inline-flex items-center gap-2 text-sm leading-6 font-semibold text-[#15191C] hover:text-[#A83800] transition-colors cursor-pointer">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      {label}
    </span>
  );
  return onClick ? (
    <button type="button" onClick={onClick}>{inner}</button>
  ) : (
    <Link href={href || "/"}>{inner}</Link>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-[35px]">
      <h1 className="text-[22px] leading-7 font-medium text-black">{title}</h1>
      <p className="mt-[9px] text-sm leading-5 text-[#5C5C5C]">{subtitle}</p>
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
    <div role={tone === "error" ? "alert" : "status"} className={`mb-4 p-3 border rounded-lg text-sm ${styles}`}>
      {children}
    </div>
  );
}

export const authInputClass =
  "w-full h-[47px] px-4 bg-[#FAFAFA] border border-[#E0E0E0] rounded-lg text-[13px] text-[#15191C] placeholder:text-xs placeholder:text-[#6E6E6E] focus:outline-none focus:border-[#FF651D] transition-colors disabled:opacity-60";

export const authLabelClass = "block text-sm leading-5 font-medium text-[#15191C] mb-2";

// Vertical rhythm between stacked fields (label top to label top = 87px in the design).
export const authFieldStackClass = "space-y-3";

export const authPrimaryButtonClass =
  "w-full h-[41px] bg-[#c65318] hover:bg-[#A83800] text-white text-base font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2";

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
        className="absolute right-3 p-1 text-[#6B6B6B] hover:text-gray-800 cursor-pointer"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          {!visible ? (
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
