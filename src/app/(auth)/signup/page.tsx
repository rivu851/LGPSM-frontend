"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
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
import { signinHref } from "@/components/auth/authPortal";
import { INPUT_PLACEHOLDERS } from "@/constants/placeholders";
import { ERROR_MESSAGES } from "@/constants/errorMessages";

// Only organizers can self-register; admin accounts are provisioned and assigned users are created by organizers.
export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
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
        sessionStorage.setItem("show_dashboard_popup", "true");
        setSuccessMessage("Account created successfully! Redirecting...");
        router.push("/dashboard");
      } else {
        setErrorMessage(res.message || "Registration failed. Please check your inputs.");
      }
    } catch {
      setErrorMessage(ERROR_MESSAGES.network.genericFailure);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout>
      <div className="mb-8 lg:mb-[45px] h-[34px]">
        <AuthLogo />
      </div>
      <div className="mb-10 lg:mb-[76px]">
        <BackLink href="/" label="Back to Home" />
      </div>

      <AuthHeading title="Create your account" subtitle="Register here and start sending invitations digitally" />

      {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}
      {successMessage && <AuthAlert tone="success">{successMessage}</AuthAlert>}

      <form onSubmit={handleSubmit} className={authFieldStackClass}>
        <div>
          <label htmlFor="signup-name" className={authLabelClass}>
            Full Name<span className="text-[#FF651D]">*</span>
          </label>
          <input id="signup-name" type="text" required minLength={2} autoComplete="name" placeholder={INPUT_PLACEHOLDERS.auth.name}
            value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isSubmitting} className={authInputClass} />
        </div>
        <div>
          <label htmlFor="signup-email" className={authLabelClass}>
            Email Address<span className="text-[#FF651D]">*</span>
          </label>
          <input id="signup-email" type="email" required autoComplete="email" placeholder={INPUT_PLACEHOLDERS.auth.email}
            value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} className={authInputClass} />
        </div>
        <div>
          <label htmlFor="signup-phone" className={authLabelClass}>
            Phone no<span className="text-[#FF651D]">*</span>
          </label>
          <input id="signup-phone" type="tel" required autoComplete="tel" placeholder={INPUT_PLACEHOLDERS.auth.phone}
            value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSubmitting} className={authInputClass} />
        </div>
        <div>
          <label htmlFor="signup-password" className={authLabelClass}>
            Password<span className="text-[#FF651D]">*</span>
          </label>
          <PasswordInput id="signup-password" value={password} onChange={setPassword} placeholder={INPUT_PLACEHOLDERS.auth.password}
            autoComplete="new-password" disabled={isSubmitting} />
        </div>
        <div>
          <label htmlFor="signup-confirm" className={authLabelClass}>
            Confirm Password<span className="text-[#FF651D]">*</span>
          </label>
          <PasswordInput id="signup-confirm" value={confirmPassword} onChange={setConfirmPassword} placeholder={INPUT_PLACEHOLDERS.auth.confirmPassword}
            autoComplete="new-password" disabled={isSubmitting} />
        </div>
        <button type="submit" disabled={isSubmitting} className={`${authPrimaryButtonClass} !mt-7`}>
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
        <Link href={signinHref("organizer")} className="text-[#B83D00] font-medium underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
