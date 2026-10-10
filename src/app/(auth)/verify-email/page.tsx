"use client";

import React, { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/services/authService";
import {
  AuthAlert,
  AuthHeading,
  AuthLogo,
  AuthSplitLayout,
  BackLink,
  Spinner,
  authPrimaryButtonClass,
} from "@/components/auth/AuthLayouts";
import { signinHref } from "@/components/auth/authPortal";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return (
      searchParams.get("email") ||
      sessionStorage.getItem("lgpsm_pending_verification_email") ||
      ""
    );
  });
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // 10-minute expiry countdown (600 seconds)
  const [expirySeconds, setExpirySeconds] = useState(600);
  // 60-second resend cooldown
  const [resendCooldown, setResendCooldown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Expiry timer
  useEffect(() => {
    if (expirySeconds <= 0) return;
    const interval = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [expirySeconds]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Focus the first input box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      setDigits(nextDigits);
      return;
    }

    const digit = cleaned.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    setDigits(nextDigits);

    // Auto-advance to next input
    if (index < 5 && digit) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const nextDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pasted[i] || "";
    }
    setDigits(nextDigits);

    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const code = digits.join("");
    if (code.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the verification code.");
      return;
    }

    if (!email) {
      setErrorMessage("Missing email address. Please return to sign in or sign up.");
      return;
    }

    if (expirySeconds <= 0) {
      setErrorMessage("Verification code has expired. Please request a new code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.verifyEmail(email, code);
      if (res.success) {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("lgpsm_pending_verification_email");
        }
        setSuccessMessage("Email verified successfully! Redirecting to sign in...");
        setTimeout(() => {
          router.push(signinHref("organizer") + (signinHref("organizer").includes("?") ? "&" : "?") + "verified=true");
        }, 1200);
      } else {
        setErrorMessage(res.message || "Invalid verification code. Please try again.");
      }
    } catch {
      setErrorMessage("Network error. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending || !email) return;

    setErrorMessage("");
    setSuccessMessage("");
    setIsResending(true);

    try {
      const res = await authService.resendVerificationCode(email);
      if (res.success) {
        setSuccessMessage("A fresh verification code has been sent to your email.");
        setDigits(["", "", "", "", "", ""]);
        setExpirySeconds(600);
        setResendCooldown(60);
        inputRefs.current[0]?.focus();
      } else {
        setErrorMessage(res.message || "Failed to resend code. Please try again.");
      }
    } catch {
      setErrorMessage("Network error. Please try again later.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthSplitLayout>
      <div className="mb-8 lg:mb-[45px] h-[34px]">
        <AuthLogo />
      </div>
      <div className="mb-10 lg:mb-[60px]">
        <BackLink href={signinHref("organizer")} label="Back to Sign In" />
      </div>

      <AuthHeading
        title="Verify your email"
        subtitle={
          email
            ? `We sent a 6-digit code to ${email}`
            : "Enter the 6-digit code sent to your email"
        }
      />

      {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}
      {successMessage && <AuthAlert tone="success">{successMessage}</AuthAlert>}

      <form onSubmit={handleVerify} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[#15191C] mb-3">
            Enter 6-digit verification code
          </label>
          <div className="flex items-center justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={isSubmitting}
                className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 bg-[#FAFAFA] text-[#15191C] focus:bg-white focus:border-[#FF651D] focus:outline-none transition-all shadow-sm"
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Code expires in:{" "}
            <strong className={expirySeconds <= 60 ? "text-red-500" : "text-gray-800"}>
              {formatTime(expirySeconds)}
            </strong>
          </span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || isResending || !email}
            className={`font-semibold transition-colors ${
              resendCooldown > 0 || isResending || !email
                ? "text-gray-400 cursor-not-allowed"
                : "text-[#FF651D] hover:underline cursor-pointer"
            }`}
          >
            {isResending ? (
              "Sending..."
            ) : resendCooldown > 0 ? (
              `Resend code (${resendCooldown}s)`
            ) : (
              "Resend code"
            )}
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || digits.join("").length !== 6}
          className={`${authPrimaryButtonClass} !mt-7`}
        >
          {isSubmitting ? (
            <>
              <Spinner /> Verifying...
            </>
          ) : (
            "Verify & Continue"
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-500">
        Didn&apos;t receive the email? Check your spam/junk folder or{" "}
        <button
          type="button"
          onClick={() => {
            const newEmail = window.prompt("Enter your registration email:", email);
            if (newEmail && newEmail.trim()) {
              setEmail(newEmail.trim());
              sessionStorage.setItem("lgpsm_pending_verification_email", newEmail.trim());
            }
          }}
          className="text-[#FF651D] underline font-medium hover:text-[#C44200]"
        >
          change email address
        </button>
      </div>
    </AuthSplitLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
