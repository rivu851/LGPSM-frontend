"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import {
  AuthAlert,
  AuthHeading,
  AuthLogo,
  AuthSplitLayout,
  BackLink,
  PasswordInput,
  Spinner,
  authInputClass,
  authFieldStackClass,
  authLabelClass,
  authPrimaryButtonClass,
} from "@/components/auth/AuthLayouts";
import { usePageTitle } from "@/context/PageTitleContext";
import { signinHref } from "@/components/auth/authPortal";
import { INPUT_PLACEHOLDERS } from "@/constants/placeholders";
import { ERROR_MESSAGES } from "@/constants/errorMessages";

type SignupStep = "details" | "verify";

// Only organizers can self-register; admin accounts are provisioned and assigned users are created by organizers.
export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();

  // Step state
  const [step, setStep] = useState<SignupStep>(() => {
    if (typeof window === "undefined") return "details";
    const pending = sessionStorage.getItem("lgpsm_pending_verification_email");
    return pending ? "verify" : "details";
  });

  // Step 1: Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    // the "Sign Up Free" forms on the marketing pages pass the address along
    return sessionStorage.getItem("lgpsm_pending_verification_email") || "";
  });
  // The "Sign Up Free" forms on the marketing pages pass the address along. Read after mounting: during an in-app navigation the
  // browser's address is only updated once the page has rendered.
  useEffect(() => {
    const passedAlong = new URLSearchParams(window.location.search).get("email");
    if (passedAlong) void Promise.resolve().then(() => setEmail((current) => current || passedAlong));
  }, []);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  usePageTitle(step === "verify" ? "Verify Email" : "Create Account");

  // Step 2: Verification state
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [expirySeconds, setExpirySeconds] = useState(600); // 10 minutes
  const [resendCooldown, setResendCooldown] = useState(60); // 60 seconds

  // Feedback messages
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Verification: 10-minute countdown
  useEffect(() => {
    if (step !== "verify" || expirySeconds <= 0) return;
    const interval = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, expirySeconds]);

  // Verification: 60-second resend cooldown
  useEffect(() => {
    if (step !== "verify" || resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, resendCooldown]);

  // Auto-focus first digit input when entering verification step
  useEffect(() => {
    if (step === "verify") {
      setTimeout(() => {
        digitRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Step 1: Submit account details
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setErrorMessage(ERROR_MESSAGES.auth.passwordsDoNotMatch);
      return;
    }
    if (password.length < 8) {
      setErrorMessage(ERROR_MESSAGES.auth.passwordTooShort);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role: "ORGANIZER",
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });

      if (res.success) {
        const verifiedEmail = res.data?.email || email.trim();
        sessionStorage.setItem("lgpsm_pending_verification_email", verifiedEmail);
        setEmail(verifiedEmail);
        setDigits(["", "", "", "", "", ""]);
        setExpirySeconds(600);
        setResendCooldown(60);
        setErrorMessage("");
        setSuccessMessage(`A 6-digit verification code has been sent to ${verifiedEmail}`);
        setStep("verify");
      } else {
        setErrorMessage(res.message || "Registration failed. Please check your inputs.");
      }
    } catch {
      setErrorMessage(ERROR_MESSAGES.network.genericFailure);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Digit inputs handlers
  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }

    const digit = cleaned.slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    // Auto-advance to next input
    if (index < 5 && digit) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      digitRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const next = [...digits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || "";
    }
    setDigits(next);

    const focusIdx = Math.min(pasted.length, 5);
    digitRefs.current[focusIdx]?.focus();
  };

  // Step 2: Verify code
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const code = digits.join("");
    if (code.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the verification code.");
      return;
    }
    if (!email) {
      setErrorMessage("Missing email address. Please return to edit your details.");
      return;
    }
    if (expirySeconds <= 0) {
      setErrorMessage("Verification code has expired. Please request a new code.");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await authService.verifyEmail(email, code);
      if (res.success) {
        sessionStorage.removeItem("lgpsm_pending_verification_email");
        sessionStorage.setItem("lgpsm_new_account_popup_pending", "true");
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
      setIsVerifying(false);
    }
  };

  // Step 2: Resend code
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
        digitRefs.current[0]?.focus();
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

      {step === "details" ? (
        <>
          <div className="mb-10 lg:mb-[76px]">
            <BackLink href="/" label="Back to Home" />
          </div>

          <AuthHeading
            title="Create your account"
            subtitle="Register here and start sending invitations digitally"
          />

          {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}
          {successMessage && <AuthAlert tone="success">{successMessage}</AuthAlert>}

          <form onSubmit={handleRegisterSubmit} className={authFieldStackClass}>
            <div>
              <label htmlFor="signup-name" className={authLabelClass}>
                Full Name<span className="text-[#FF651D]">*</span>
              </label>
              <input
                id="signup-name"
                type="text"
                required
                minLength={2}
                autoComplete="name"
                placeholder={INPUT_PLACEHOLDERS.auth.name}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting}
                className={authInputClass}
              />
            </div>
            <div>
              <label htmlFor="signup-email" className={authLabelClass}>
                Email Address<span className="text-[#FF651D]">*</span>
              </label>
              <input
                id="signup-email"
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
            <div>
              <label htmlFor="signup-phone" className={authLabelClass}>
                Phone no<span className="text-[#FF651D]">*</span>
              </label>
              <input
                id="signup-phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder={INPUT_PLACEHOLDERS.auth.phone}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSubmitting}
                className={authInputClass}
              />
            </div>
            <div>
              <label htmlFor="signup-password" className={authLabelClass}>
                Password<span className="text-[#FF651D]">*</span>
              </label>
              <PasswordInput
                id="signup-password"
                value={password}
                onChange={setPassword}
                placeholder={INPUT_PLACEHOLDERS.auth.password}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="signup-confirm" className={authLabelClass}>
                Confirm Password<span className="text-[#FF651D]">*</span>
              </label>
              <PasswordInput
                id="signup-confirm"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={INPUT_PLACEHOLDERS.auth.confirmPassword}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`${authPrimaryButtonClass} !mt-7`}
            >
              {isSubmitting ? (
                <>
                  <Spinner /> Creating Account...
                </>
              ) : (
                "Register"
              )}
            </button>
          </form>

          <p className="text-center mt-[37px] text-sm leading-5 text-[#4A5568]">
            Already registered?{" "}
            <Link
              href={signinHref("organizer")}
              className="text-[#B83D00] font-medium underline underline-offset-2"
            >
              Sign in
            </Link>
          </p>
        </>
      ) : (
        <>
          <div className="mb-10 lg:mb-[60px]">
            <BackLink
              onClick={() => {
                setStep("details");
                setErrorMessage("");
                setSuccessMessage("");
              }}
              label="Back to Details"
            />
          </div>

          <AuthHeading
            title="Verify your email"
            subtitle={
              email
                ? `Enter the 6-digit code sent to ${email}`
                : "Enter the 6-digit verification code sent to your email"
            }
          />

          {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}
          {successMessage && <AuthAlert tone="success">{successMessage}</AuthAlert>}

          <form onSubmit={handleVerifySubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#15191C] mb-3">
                Enter 6-digit verification code
              </label>
              <div
                className="flex items-center justify-between gap-2 sm:gap-3"
                onPaste={handlePaste}
              >
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      digitRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    disabled={isVerifying}
                    className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold font-mono rounded-xl border-2 transition-all shadow-sm ${
                      digit
                        ? "border-[#FF651D] bg-white text-gray-950"
                        : "border-gray-200 bg-[#FAFAFA] text-gray-900"
                    } focus:bg-white focus:border-[#FF651D] focus:ring-2 focus:ring-[#FF651D]/20 focus:outline-none`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Code expires in:{" "}
                <strong
                  className={
                    expirySeconds <= 60
                      ? "text-red-500 font-mono font-semibold"
                      : "text-gray-800 font-mono font-semibold"
                  }
                >
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
              disabled={isVerifying || digits.join("").length !== 6 || expirySeconds <= 0}
              className={`${authPrimaryButtonClass} !mt-7`}
            >
              {isVerifying ? (
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
                setStep("details");
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="text-[#FF651D] underline font-medium hover:text-[#C44200]"
            >
              change email address
            </button>
          </div>

          <p className="text-center mt-6 text-sm leading-5 text-[#4A5568]">
            Already registered?{" "}
            <Link
              href={signinHref("organizer")}
              className="text-[#B83D00] font-medium underline underline-offset-2"
            >
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthSplitLayout>
  );
}
