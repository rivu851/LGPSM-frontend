"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/services/authService";
import {
  AuthAlert,
  AuthCardLayout,
  AuthSplitLayout,
  PasswordInput,
  Spinner,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from "@/components/auth/AuthLayouts";
import { MOBILE_ONLY_NOTICE, parsePortalMode, signinHref } from "@/components/auth/authPortal";

type ForgotStage = "request" | "sent" | "reset" | "done";

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";
  // The portal the user came from (or, for emailed links, the account's portal)
  const { mode, mobileOnly } = parsePortalMode(searchParams.get("mode"), "organizer");
  const loginHref = signinHref(mode);

  const [stage, setStage] = useState<ForgotStage>(tokenFromUrl ? "reset" : "request");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const goBack = () => {
    setErrorMessage("");
    if (stage === "sent") setStage("request");
    else if (stage === "reset" && !tokenFromUrl) setStage("sent");
    else router.push(loginHref);
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      if (res.success) setStage("sent");
      else setErrorMessage(res.message || "Failed to process request. Please try again.");
    } catch {
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (newPassword !== repeatPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (!resetToken.trim()) {
      setErrorMessage("A reset code is required. Use the link from your email.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await authService.resetPassword(resetToken.trim(), newPassword);
      if (res.success) setStage("done");
      else setErrorMessage(res.message || "Failed to reset password. The link may be invalid or expired.");
    } catch {
      setErrorMessage("An error occurred during password reset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <>
      {stage !== "done" && (
        <button
          type="button"
          onClick={goBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-[#FF651D] transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      )}

      {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}

      {stage === "request" && (
        <>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">Forgot password</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            No worries! Enter your email address below, and we&apos;ll send you a link to reset your password.
          </p>
          <form onSubmit={handleRequest} className="space-y-5">
            <div>
              <label htmlFor="forgot-email" className={authLabelClass}>
                Email Address<span className="text-[#FF651D]">*</span>
              </label>
              <input id="forgot-email" type="email" required autoComplete="email" placeholder="hello@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} className={authInputClass} />
            </div>
            <button type="submit" disabled={isSubmitting} className={authPrimaryButtonClass}>
              {isSubmitting ? (
                <>
                  <Spinner /> Submitting...
                </>
              ) : (
                "Submit"
              )}
            </button>
          </form>
        </>
      )}

      {stage === "sent" && (
        <>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">Check your email</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            If an account exists for <span className="font-medium text-gray-800 break-all">{email}</span>, we sent it a password reset
            link. The link expires in 15 minutes.
          </p>
          <button type="button" onClick={() => setStage("reset")} className={`${authPrimaryButtonClass} mb-4`}>
            I have a reset code
          </button>
          <p className="text-center text-sm text-gray-500">
            Didn&apos;t receive the email?{" "}
            <button type="button" onClick={() => setStage("request")} className="text-[#FF651D] font-semibold underline cursor-pointer">
              Send again
            </button>
          </p>
        </>
      )}

      {stage === "reset" && (
        <>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">Create a new password</h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">Enter your new password below to complete the reset.</p>
          <form onSubmit={handleReset} className="space-y-4">
            {!tokenFromUrl && (
              <div>
                <label htmlFor="reset-token" className={authLabelClass}>
                  Reset Code<span className="text-[#FF651D]">*</span>
                </label>
                <input id="reset-token" type="text" required placeholder="Paste the code from your email"
                  value={resetToken} onChange={(e) => setResetToken(e.target.value)} disabled={isSubmitting} className={authInputClass} />
              </div>
            )}
            <div>
              <label htmlFor="reset-new" className={authLabelClass}>
                New Password<span className="text-[#FF651D]">*</span>
              </label>
              <PasswordInput id="reset-new" value={newPassword} onChange={setNewPassword} placeholder="Type your new password"
                autoComplete="new-password" disabled={isSubmitting} />
            </div>
            <div>
              <label htmlFor="reset-repeat" className={authLabelClass}>
                Repeat New Password<span className="text-[#FF651D]">*</span>
              </label>
              <PasswordInput id="reset-repeat" value={repeatPassword} onChange={setRepeatPassword} placeholder="Repeat your password"
                autoComplete="new-password" disabled={isSubmitting} />
            </div>
            <button type="submit" disabled={isSubmitting} className={`${authPrimaryButtonClass} mt-2`}>
              {isSubmitting ? (
                <>
                  <Spinner /> Resetting...
                </>
              ) : (
                "Submit"
              )}
            </button>
          </form>
        </>
      )}

      {stage === "done" && (
        <>
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">Your password has been reset</h1>
          {mobileOnly ? (
            <p className="text-sm text-gray-500 leading-relaxed">{MOBILE_ONLY_NOTICE.replace(" Ask your event organizer for access details.", "")}</p>
          ) : (
            <>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">You can now log in with your new password.</p>
              <Link href={loginHref} className={authPrimaryButtonClass}>
                Back to login
              </Link>
            </>
          )}
        </>
      )}
    </>
  );

  return mode === "admin" ? <AuthCardLayout>{content}</AuthCardLayout> : <AuthSplitLayout>{content}</AuthSplitLayout>;
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
