"use client";

import React, { useEffect, useRef, useState } from "react";
import PopupMessage from "@/components/common/PopupMessage";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

interface GoogleIdentity {
  accounts: { id: { initialize: (config: object) => void; renderButton: (el: HTMLElement, options: object) => void } };
}
declare global {
  interface Window { google?: GoogleIdentity }
}

let scriptPromise: Promise<void> | null = null;
function loadGoogleScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => { scriptPromise = null; reject(new Error("Google's sign-in could not be loaded")); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.5-5.8c-2.1 1.4-4.8 2.3-8.1 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

/**
 * "Continue with Google" for organizers (sign-in and sign-up). Google draws its own button; `onCredential` receives the signed ID token,
 * which the server verifies. Until a client id is configured (NEXT_PUBLIC_GOOGLE_CLIENT_ID) the button is drawn the same way and says
 * that Google sign-in is not set up yet when it is pressed.
 */
export default function GoogleAuthButton({ mode, onCredential, disabled = false, orBelow = false }: { mode: "signin" | "signup"; onCredential: (credential: string) => void | Promise<void>; disabled?: boolean; /** the "or" line goes under the button instead of above it (the button sits above a form) */ orBelow?: boolean }) {
  const slot = useRef<HTMLDivElement>(null);
  const latest = useRef(onCredential);
  useEffect(() => { latest.current = onCredential; });
  const [problem, setProblem] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !slot.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response: { credential?: string }) => { if (response.credential) void latest.current(response.credential); },
          ux_mode: "popup",
          auto_select: false,
        });
        slot.current.replaceChildren();
        window.google.accounts.id.renderButton(slot.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: mode === "signup" ? "signup_with" : "signin_with",
          logo_alignment: "left",
          width: Math.min(400, Math.max(200, slot.current.parentElement?.clientWidth || 320)),
        });
        setReady(true);
      })
      .catch((e: Error) => { if (!cancelled) setProblem(e.message); });
    return () => { cancelled = true; };
  }, [mode]);

  const or = (
    <div className="flex items-center gap-3 text-xs text-[#6B6B6B]" aria-hidden>
      <span className="h-px flex-1 bg-[#E0E0E0]" />or<span className="h-px flex-1 bg-[#E0E0E0]" />
    </div>
  );
  return (
    <div className={orBelow ? "mb-6" : "my-5"}>
      {!orBelow && or}
      <div className={`${orBelow ? "mb-4" : "mt-4"} flex justify-center ${disabled ? "pointer-events-none opacity-60" : ""}`}>
        {CLIENT_ID ? (
          <div className="min-h-[44px] flex flex-col items-center justify-center">
            {/* Google's script owns everything inside this empty div: React never renders children into it, so the two cannot fight over its nodes */}
            <div ref={slot} aria-label={mode === "signup" ? "Sign up with Google" : "Sign in with Google"} />
            {!ready && !problem && <span className="text-xs text-[#6B6B6B]">Loading Google…</span>}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setProblem("Google sign-in is not set up yet. Please use your email and password for now.")}
            className="w-full max-w-[400px] h-[44px] inline-flex items-center justify-center gap-3 border border-[#DADCE0] rounded-md bg-white text-sm font-medium text-[#3C4043] hover:bg-[#F8F9FA] cursor-pointer"
          >
            <GoogleIcon />
            {mode === "signup" ? "Sign up with Google" : "Sign in with Google"}
          </button>
        )}
      </div>
      {orBelow && or}
      <PopupMessage message={problem} title="Google sign-in" />
    </div>
  );
}
