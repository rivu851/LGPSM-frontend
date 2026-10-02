"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  AuthAlert,
  AuthHeading,
  AuthLogo,
  AuthSplitLayout,
  BackLink,
  GoogleButton,
  OrDivider,
  PasswordInput,
  Spinner,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from "@/components/auth/AuthLayouts";
import {
  MOBILE_ONLY_NOTICE,
  PortalMode,
  forgotPasswordHref,
  isSafeReturnPath,
  parsePortalMode,
  portalRole,
} from "@/components/auth/authPortal";
import { INPUT_PLACEHOLDERS } from "@/constants/placeholders";
import { ERROR_MESSAGES } from "@/constants/errorMessages";

const PORTAL_TABS: { mode: PortalMode; label: string }[] = [
  { mode: "admin", label: "Admin" },
  { mode: "organizer", label: "Organizer" },
  { mode: "system_user", label: "System User" },
];

function PortalTabs({ value, onChange }: { value: PortalMode; onChange: (m: PortalMode) => void }) {
  return (
    <div role="tablist" aria-label="Sign in as" className="flex mb-[35px] rounded-lg border border-[#E0E0E0] overflow-hidden bg-[#FAFAFA]">
      {PORTAL_TABS.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={value === mode}
          onClick={() => onChange(mode)}
          className={`flex-1 h-[38px] text-xs font-semibold transition-colors cursor-pointer
            ${value === mode ? "bg-[#C44200] text-white" : "text-[#5C5C5C] hover:bg-gray-100"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SigninContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithGoogle } = useAuth();

  const initial = parsePortalMode(searchParams.get("mode"));
  const [mode, setMode] = useState<PortalMode>(initial.mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleModeChange = (m: PortalMode) => {
    setMode(m);
    setErrorMessage("");
  };

  const onSuccess = () => {
    const from = searchParams.get("from");
    if (isSafeReturnPath(from)) {
      router.push(from);
    } else {
      sessionStorage.setItem("show_dashboard_popup", "true");
      router.push("/dashboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const res = await login({ email, password, role: portalRole(mode) });
      if (res.success) onSuccess();
      else setErrorMessage(res.message || ERROR_MESSAGES.auth.invalidCredentials);
    } catch {
      setErrorMessage(ERROR_MESSAGES.network.genericFailure);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async (idToken: string) => {
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const res = await loginWithGoogle(idToken);
      if (res.success) onSuccess();
      else setErrorMessage(res.message || ERROR_MESSAGES.network.genericFailure);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dashboardLabel =
    mode === "admin" ? "Admin Dashboard" : mode === "system_user" ? "your account" : "Organizer Dashboard";

  return (
    <AuthSplitLayout>
      <div className="mb-8 lg:mb-[45px] h-[34px]">
        <AuthLogo />
      </div>
      <div className="mb-10 lg:mb-[76px]">
        <BackLink href="/" label="Back to Home" />
      </div>

      <AuthHeading title="Sign in your account" subtitle={`Welcome back! Login to ${dashboardLabel}`} />

      <PortalTabs value={mode} onChange={handleModeChange} />

      {initial.mobileOnly && <AuthAlert tone="info">{MOBILE_ONLY_NOTICE}</AuthAlert>}
      {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}

      <GoogleButton onToken={handleGoogle} disabled={isSubmitting} />
      <OrDivider />

      <form onSubmit={handleSubmit}>
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
            onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-[#CFD9E0] accent-[#FF651D] cursor-pointer"
            />
            Remember me
          </label>
          <Link href={forgotPasswordHref(mode)} className="font-medium text-[#15191C] underline underline-offset-2 hover:text-[#FF651D]">
            Forgot Password?
          </Link>
        </div>
        <button type="submit" disabled={isSubmitting} className={`${authPrimaryButtonClass} mt-7`}>
          {isSubmitting ? (
            <>
              <Spinner /> Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="text-center mt-[37px] text-sm leading-5 text-[#4A5568]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-[#B83D00] font-medium underline underline-offset-2">
          Sign up
        </Link>
      </p>
    </AuthSplitLayout>
  );
}

export default function SigninPage() {
  return (
    <Suspense fallback={null}>
      <SigninContent />
    </Suspense>
  );
}
