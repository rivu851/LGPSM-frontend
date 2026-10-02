"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

// Auth screens follow Login-Signup-Flow/02-Login.pdf & 03-Register.pdf (1440-wide frame):
// left = orange sunburst panel (666px) with a 739px-tall rounded photo card, vertically centred, that
// overhangs 71px into the white; right = 440px form column starting 190px past the panel, top-aligned at 80px.
export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#15191C] flex font-[family-name:var(--font-inter)]">
      <aside className="hidden lg:block relative shrink-0 w-[46.25%] bg-[#FF651D]">
        <Image src="/images/auth/auth-sunburst.svg" alt="" fill priority sizes="47vw" className="object-cover" />
        <div className="absolute z-20 left-[12.61%] right-[-10.66%] top-1/2 -translate-y-1/2 h-[min(739px,calc(100%-48px))] rounded-[20px] overflow-hidden">
          <Image src="/images/auth/Auth.png" alt="" fill priority sizes="46vw" className="object-cover object-center" />
        </div>
      </aside>
      <main className="flex-1 min-w-0 relative z-0 px-4 sm:px-8 lg:px-0 pt-10 lg:pt-20 pb-12">
        <div className="w-full max-w-[440px] mx-auto lg:mx-0 lg:ml-[min(24.55%,calc(100%-464px))]">{children}</div>
      </main>
    </div>
  );
}

export function AuthLogo() {
  return (
    <Link href="/" className="inline-block">
      <Image src="/images/branding/lgpsm-logo.svg" alt="LGPSM" width={202} height={34} priority className="h-[34px] w-auto" />
    </Link>
  );
}

export function BackLink({ href, label = "Back to Home", onClick }: { href?: string; label?: string; onClick?: () => void }) {
  const inner = (
    <span className="inline-flex items-center gap-2 text-sm leading-6 font-semibold text-[#15191C] hover:text-[#FF651D] transition-colors cursor-pointer">
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
      <p className="mt-[9px] text-sm leading-5 text-[#828282]">{subtitle}</p>
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
  "w-full h-[41px] bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2";

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
        className="absolute right-4 text-[#ACACAC] hover:text-gray-600 cursor-pointer"
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

// Google button styled per design (02-Login.pdf). It initiates Google Identity Services only when a
// client id is configured; otherwise it tells the user instead of faking a sign-in.
export function GoogleButton({ onToken, disabled }: { onToken: (idToken: string) => void; disabled?: boolean }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const [note, setNote] = React.useState<string | null>(null);

  const handleClick = () => {
    if (!clientId) {
      setNote("Google sign-in isn't configured yet. Please use email and password.");
      return;
    }
    const google = (window as unknown as { google?: { accounts?: { id?: { initialize: (c: object) => void; prompt: () => void } } } }).google;
    if (!google?.accounts?.id) {
      setNote("Google sign-in is still loading. Please try again in a moment.");
      return;
    }
    google.accounts.id.initialize({ client_id: clientId, callback: (res: { credential?: string }) => res.credential && onToken(res.credential) });
    google.accounts.id.prompt();
  };

  React.useEffect(() => {
    if (!clientId || document.getElementById("google-gsi")) return;
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.id = "google-gsi";
    document.head.appendChild(s);
  }, [clientId]);

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="w-full h-[47px] bg-[#FAFAFA] border border-[#E0E0E0] rounded-lg flex items-center justify-center gap-2.5 text-xs font-medium text-black hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60"
      >
        <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        Sign in with Google
      </button>
      {note && <p className="mt-1.5 text-xs text-[#828282]">{note}</p>}
    </div>
  );
}

export function OrDivider() {
  return <div className="mt-2 mb-[15px] text-center text-xs leading-4 font-medium text-[#15191C]">OR</div>;
}
