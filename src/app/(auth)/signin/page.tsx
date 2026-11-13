"use client";

import React, { Suspense, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/context/AlertContext";
import {
  AdminAuthLayout,
  AuthAlert,
  AuthHeading,
  AuthLoadingShell,
  AuthLogo,
  AuthSplitLayout,
  BackLink,
  PasswordInput,
  Spinner,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from "@/components/auth/AuthLayouts";
import {
  PortalMode,
  forgotPasswordHref,
  isSafeReturnPath,
  clearExplicitLogout,
  parsePortalMode,
  portalRole,
} from "@/components/auth/authPortal";
import { INPUT_PLACEHOLDERS } from "@/constants/placeholders";
import { ERROR_MESSAGES } from "@/constants/errorMessages";
import { canAccessRoute } from "@/components/sidebar/navConfig";
import { applyRememberChoice, forgetRememberedEmail, readRememberedEmail } from "@/utils/rememberedLogin";
import { createPortal } from "react-dom";
import BrandLoader from "@/components/common/BrandLoader";

const subscribeToStorage = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

function RoleTabs({ currentMode, onSelect }: { currentMode: PortalMode; onSelect: (m: PortalMode) => void }) {
  const tabs: { mode: PortalMode; label: string }[] = [
    { mode: "organizer", label: "Organizer" },
    { mode: "admin", label: "Super Admin" },
  ];

  return (
    <div className="mb-6 p-1 bg-gray-100/90 rounded-xl flex items-center justify-between gap-1 text-xs font-semibold">
      {tabs.map((tab) => {
        const isActive = currentMode === tab.mode;
        return (
          <button
            key={tab.mode}
            type="button"
            onClick={() => onSelect(tab.mode)}
            className={`flex-1 py-2 px-1 sm:px-2 text-center rounded-lg transition-all cursor-pointer ${
              isActive
                ? "bg-white text-[#C44200] shadow-sm font-bold border border-gray-200/60"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function SigninContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { showAlert } = useAlert();

  const initial = parsePortalMode(searchParams.get("mode"));
  const mode: PortalMode = initial.mode;
  // The remembered email is read from localStorage without an effect: the server render sees "" and the
  // browser sees the saved value, which useSyncExternalStore reconciles without a hydration mismatch.
  const remembered = useSyncExternalStore(subscribeToStorage, () => readRememberedEmail(localStorage, mode), () => "");
  const [typedEmail, setTypedEmail] = useState<string | null>(null);
  const email = typedEmail ?? remembered;
  const [password, setPassword] = useState("");
  const [rememberChoice, setRememberChoice] = useState<boolean | null>(null);
  const rememberMe = rememberChoice ?? remembered !== "";
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Set once a sign-in succeeds and never reset: the page is on its way out, so the loader covers the wait for the dashboard
  const [entering, setEntering] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleModeChange = (newMode: PortalMode) => {
    setErrorMessage("");
    const from = searchParams.get("from");
    const params = new URLSearchParams({ mode: newMode });
    if (from && isSafeReturnPath(from)) params.set("from", from);
    router.push(`/signin?${params.toString()}`);
  };

  const onSuccess = (role?: string) => {
    setEntering(true);
    // Tells the dashboard to open behind the same loader, so the hand-off from sign-in is one continuous animation
    try { sessionStorage.setItem("lgpsm_signing_in", "1"); } catch { /* storage blocked: the loader just ends with the page change */ }
    clearExplicitLogout();
    const newAccountPending = sessionStorage.getItem("lgpsm_new_account_popup_pending") === "true";
    if (newAccountPending) {
      sessionStorage.removeItem("lgpsm_new_account_popup_pending");
      sessionStorage.setItem("show_dashboard_popup", "true");
    } else {
      // Clear any stale flag left by an earlier session: returning accounts never see onboarding again.
      sessionStorage.removeItem("show_dashboard_popup");
    }
    const from = searchParams.get("from");
    // Return to the earlier page only when this account may open it; otherwise (for example a different role
    // signing in after someone else's session ended) start from the dashboard
    if (isSafeReturnPath(from) && canAccessRoute(role, from.split("?")[0])) {
      router.push(from);
    } else {
      router.push("/dashboard");
    }
  };

  const isVerifiedParam = searchParams.get("verified") === "true";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const res = await login({ email, password, role: portalRole(mode) });
      if (res.success) {
        // Only a confirmed sign-in is remembered, so a mistyped address is never saved
        applyRememberChoice(localStorage, mode, email, rememberMe);
        onSuccess(res.data?.user?.role);
      } else if (res.message === "EMAIL_NOT_VERIFIED" || res.message?.includes("EMAIL_NOT_VERIFIED")) {
        sessionStorage.setItem("lgpsm_pending_verification_email", email.trim());
        router.push("/verify-email");
      } else {
        showAlert(res.message || ERROR_MESSAGES.auth.incorrectPassword, "error", "Incorrect password");
      }
    } catch {
      setErrorMessage(ERROR_MESSAGES.network.genericFailure);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sharedForm = (
    <form onSubmit={handleSubmit}>
      {/* Portalled to <body>: the auth card is animated, which would otherwise trap a fixed overlay inside it */}
      {entering && createPortal(<div className="fixed inset-0 z-[100]"><BrandLoader label="Signing in" /></div>, document.body)}
      <div>
        <label htmlFor="signin-email" className={authLabelClass}>
          Email Address<span className="text-[#FF651D]">*</span>
        </label>
        <input
          id="signin-email"
          type="email"
          required
          autoComplete="email"
          placeholder={INPUT_PLACEHOLDERS.auth.email}
          value={email}
          onChange={(e) => setTypedEmail(e.target.value)}
          disabled={isSubmitting}
          className={authInputClass}
        />
      </div>
      <div className="mt-3">
        <label htmlFor="signin-password" className={authLabelClass}>
          Password<span className="text-[#FF651D]">*</span>
        </label>
        <PasswordInput
          id="signin-password"
          value={password}
          onChange={setPassword}
          placeholder="Type your password"
          autoComplete="current-password"
          disabled={isSubmitting}
        />
      </div>
      <div className="mt-[14px] flex items-center justify-between gap-3 text-xs leading-4">
        <label className="flex items-center gap-2 cursor-pointer text-[#4A5568]">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => {
              setRememberChoice(e.target.checked);
              if (!e.target.checked) {
                // Forget the saved address right away, not only at the next successful sign-in; otherwise leaving the
                // page (or a failed attempt) keeps it saved and the box comes back ticked. Keep what is on screen.
                setTypedEmail(email);
                forgetRememberedEmail(localStorage, mode);
              }
            }}
            className="w-4 h-4 rounded border-[#CFD9E0] cursor-pointer check-orange"
          />
          Remember me
        </label>
        <Link href={forgotPasswordHref(mode)} className="font-medium text-[#15191C] underline underline-offset-2 hover:text-[#FF651D]">
          Forgot Password?
        </Link>
      </div>
      <button type="submit" disabled={isSubmitting} className={`${authPrimaryButtonClass} mt-7`}>
        {isSubmitting ? <><Spinner /> Signing in...</> : "Sign in"}
      </button>
    </form>
  );

  if (mode === "admin") {
    return (
      <AdminAuthLayout>
        <div className="flex justify-center mb-6">
          <AuthLogo />
        </div>
        <RoleTabs currentMode={mode} onSelect={handleModeChange} />
        <div className="mb-6 text-center">
          <h1 className="text-[22px] leading-7 font-semibold text-black">Super Admin Log In</h1>
          <p className="mt-2 text-sm leading-5 text-[#5C5C5C]">Welcome back! Login to Dashboard</p>
        </div>
        {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}
        {sharedForm}
      </AdminAuthLayout>
    );
  }

  return (
    <AuthSplitLayout>
      <div className="mb-6 lg:mb-[35px] h-[34px]">
        <AuthLogo />
      </div>
      <div className="mb-6 lg:mb-[45px]">
        <BackLink href="/" label="Back to Home" />
      </div>

      <RoleTabs currentMode={mode} onSelect={handleModeChange} />

      {mode === "organizer" && (
        <>
          <AuthHeading title="Organizer Sign In" subtitle="Welcome back! Login to Organizer Portal" />
          {searchParams.get("notice") === "mobile-only" && (
            <AuthAlert tone="info">On-ground staff sign in through the LGPSM mobile app. Organizers can sign in here.</AuthAlert>
          )}
          {isVerifiedParam && <AuthAlert tone="success">Email verified successfully! Please sign in to access your dashboard.</AuthAlert>}
          {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}
          {sharedForm}
          <p className="text-center mt-[37px] text-sm leading-5 text-[#4A5568]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#C44200] font-bold underline underline-offset-2 hover:text-[#A83800]">
              Sign Up Free (Organizer)
            </Link>
          </p>
        </>
      )}
    </AuthSplitLayout>
  );
}

// The form is keyed by the portal in the URL: switching tab, or pressing Back from one tab to the other, mounts a fresh form,
// so an email, password or error from the other portal can never carry over (they are different sign-ins).
function PortalSignin() {
  const mode = parsePortalMode(useSearchParams().get("mode")).mode;
  return <SigninContent key={mode} />;
}

export default function SigninPage() {
  return (
    <Suspense fallback={<AuthLoadingShell />}>
      <PortalSignin />
    </Suspense>
  );
}
