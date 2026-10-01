"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  AuthAlert,
  AuthCardLayout,
  AuthSplitLayout,
  PasswordInput,
  PortalTabs,
  Spinner,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from "@/components/auth/AuthLayouts";
import { MOBILE_ONLY_NOTICE, PortalMode, forgotPasswordHref, isSafeReturnPath, parsePortalMode } from "@/components/auth/authPortal";

function SigninContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const initial = parsePortalMode(searchParams.get("mode"));
  const [mode, setMode] = useState<PortalMode>(initial.mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const switchMode = (next: PortalMode) => {
    setMode(next);
    setErrorMessage("");
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", next);
    router.replace(`/signin?${params.toString()}`, { scroll: false });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const res = await login({ email, password, role: mode === "admin" ? "ADMIN" : "ORGANIZER" });
      if (res.success) {
        const from = searchParams.get("from");
        if (isSafeReturnPath(from)) {
          router.push(from);
        } else {
          sessionStorage.setItem("show_dashboard_popup", "true");
          router.push("/dashboard");
        }
      } else {
        setErrorMessage(res.message || "Invalid credentials. Please check your email and password.");
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const form = (
    <>
      {initial.mobileOnly && <AuthAlert tone="info">{MOBILE_ONLY_NOTICE}</AuthAlert>}
      {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="signin-email" className={authLabelClass}>
            Email Address<span className="text-[#FF651D]">*</span>
          </label>
          <input
            id="signin-email"
            type="email"
            required
            autoComplete="email"
            placeholder="hello@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className={authInputClass}
          />
        </div>
        <div>
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
        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-gray-500">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 accent-[#FF651D] cursor-pointer"
            />
            Remember me
          </label>
          <Link href={forgotPasswordHref(mode)} className="font-medium text-gray-900 underline underline-offset-2 hover:text-[#FF651D]">
            Forgot Password?
          </Link>
        </div>
        <button type="submit" disabled={isSubmitting} className={`${authPrimaryButtonClass} mt-2`}>
          {isSubmitting ? (
            <>
              <Spinner /> Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </>
  );

  if (mode === "admin") {
    return (
      <AuthCardLayout top={<PortalTabs mode={mode} onChange={switchMode} />}>
        <div className="text-center mb-6 space-y-1">
          <h1 className="text-xl font-medium text-black">Super Admin Log In</h1>
          <p className="text-sm text-[#828282]">Welcome back! Login to Dashboard</p>
        </div>
        {form}
      </AuthCardLayout>
    );
  }

  return (
    <AuthSplitLayout top={<PortalTabs mode={mode} onChange={switchMode} />}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight mb-1.5">Organizer Sign In</h1>
        <p className="text-sm text-gray-500">Welcome back! Login to manage your events and invitations</p>
      </div>
      {form}
      <p className="text-center pt-8 text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-[#FF651D] font-semibold hover:underline">
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
