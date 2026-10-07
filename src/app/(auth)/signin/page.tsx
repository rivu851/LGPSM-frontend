"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  AdminAuthLayout,
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

function RoleTabs({ currentMode, onSelect }: { currentMode: PortalMode; onSelect: (m: PortalMode) => void }) {
  const tabs: { mode: PortalMode; label: string }[] = [
    { mode: "organizer", label: "Organizer" },
    { mode: "admin", label: "Super Admin" },
    { mode: "system_user", label: "System User" },
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
  const { login, loginWithGoogle } = useAuth();

  const initial = parsePortalMode(searchParams.get("mode"));
  const mode: PortalMode = initial.mode;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleModeChange = (newMode: PortalMode) => {
    setErrorMessage("");
    const from = searchParams.get("from");
    const params = new URLSearchParams({ mode: newMode });
    if (from && isSafeReturnPath(from)) params.set("from", from);
    router.push(`/signin?${params.toString()}`);
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

  const sharedForm = (
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
        {isSubmitting ? <><Spinner /> Signing in...</> : "Sign in"}
      </button>
    </form>
  );

  return (
    <AuthSplitLayout>
      <div className="mb-6 lg:mb-[35px] h-[34px]">
        <AuthLogo />
      </div>
      <div className="mb-6 lg:mb-[45px]">
        <BackLink href="/" label="Back to Home" />
      </div>

      <RoleTabs currentMode={mode} onSelect={handleModeChange} />

      {mode === "admin" && (
        <>
          <AuthHeading title="Super Admin Log In" subtitle="Welcome back! Login to Super Admin Dashboard" />
          {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}
          {sharedForm}
          <p className="text-center mt-6 text-xs leading-5 text-gray-500">
            Super Admin credentials are provisioned by system administration.
          </p>
        </>
      )}

      {mode === "system_user" && (
        <>
          <AuthHeading title="System User Access" subtitle="On-ground staff & mobile app check-in access" />
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 leading-relaxed space-y-2">
            <p className="font-semibold text-amber-950">Mobile App Check-in Access</p>
            <p>{MOBILE_ONLY_NOTICE}</p>
          </div>
        </>
      )}

      {mode === "organizer" && (
        <>
          <AuthHeading title="Organizer Sign In" subtitle="Welcome back! Login to Organizer Portal" />
          {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}
          <GoogleButton onToken={handleGoogle} disabled={isSubmitting} />
          <OrDivider />
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

export default function SigninPage() {
  return (
    <Suspense fallback={null}>
      <SigninContent />
    </Suspense>
  );
}
