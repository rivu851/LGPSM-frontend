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

  // Admin login (Super Admin Figma frame 2021:1333): centered card, no left panel, no Google
  // button, no signup link, no cross-link to the organizer portal — a dedicated login screen.
  if (mode === "admin") {
    return (
      <AdminAuthLayout>
        <div className="flex justify-center mb-6">
          <AuthLogo />
        </div>
        <div className="mb-6 text-center">
          <h1 className="text-[22px] leading-7 font-semibold text-black">Super Admin Log In</h1>
          <p className="mt-2 text-sm leading-5 text-[#5C5C5C]">Welcome back! Login to Dashboard</p>
        </div>
        {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}
        {sharedForm}
      </AdminAuthLayout>
    );
  }

  // System users have no web portal — they sign in through the mobile app only. This mode is
  // reached only via the automatic bounce in (dashboard)/layout.tsx; there is no credential form
  // here since no web session for a system user is ever allowed to stand.
  if (mode === "system_user") {
    return (
      <AuthSplitLayout>
        <div className="mb-8 lg:mb-[45px] h-[34px]">
          <AuthLogo />
        </div>
        <div className="mb-10 lg:mb-[76px]">
          <BackLink href="/" label="Back to Home" />
        </div>
        <AuthHeading title="Mobile app only" subtitle={MOBILE_ONLY_NOTICE} />
      </AuthSplitLayout>
    );
  }

  // Organizer login (Admin Figma frame 292:680): split panel, Google button, signup link —
  // a single dedicated screen with no role-switcher tab (none exists in the Figma design).
  return (
    <AuthSplitLayout>
      <div className="mb-8 lg:mb-[45px] h-[34px]">
        <AuthLogo />
      </div>
      <div className="mb-10 lg:mb-[76px]">
        <BackLink href="/" label="Back to Home" />
      </div>

      <AuthHeading title="Sign in your account" subtitle="Welcome back! Login to Admin Dashboard" />

      {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}

      <GoogleButton onToken={handleGoogle} disabled={isSubmitting} />
      <OrDivider />

      {sharedForm}

      <p className="text-center mt-[37px] text-sm leading-5 text-[#4A5568]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-[#B83D00] font-medium underline underline-offset-2">
          Create now
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
