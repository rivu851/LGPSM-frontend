"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  AuthAlert,
  AuthSplitLayout,
  PasswordInput,
  Spinner,
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from "@/components/auth/AuthLayouts";
import { signinHref } from "@/components/auth/authPortal";

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
      setErrorMessage("Passwords do not match. Please try again.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
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
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout>
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight mb-1">Create your account</h1>
        <p className="text-sm text-gray-500">Register as an organizer and start sending invitations digitally</p>
      </div>
      {errorMessage && <AuthAlert tone="error">{errorMessage}</AuthAlert>}
      {successMessage && <AuthAlert tone="success">{successMessage}</AuthAlert>}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label htmlFor="signup-name" className={authLabelClass}>
            Full Name<span className="text-[#FF651D]">*</span>
          </label>
          <input id="signup-name" type="text" required minLength={2} autoComplete="name" placeholder="Enter your name"
            value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isSubmitting} className={authInputClass} />
        </div>
        <div>
          <label htmlFor="signup-email" className={authLabelClass}>
            Email Address<span className="text-[#FF651D]">*</span>
          </label>
          <input id="signup-email" type="email" required autoComplete="email" placeholder="hello@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} className={authInputClass} />
        </div>
        <div>
          <label htmlFor="signup-phone" className={authLabelClass}>
            Phone no<span className="text-gray-400 font-normal ml-1">(optional)</span>
          </label>
          <input id="signup-phone" type="tel" autoComplete="tel" placeholder="Enter phone number"
            value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSubmitting} className={authInputClass} />
        </div>
        <div>
          <label htmlFor="signup-password" className={authLabelClass}>
            Password<span className="text-[#FF651D]">*</span>
          </label>
          <PasswordInput id="signup-password" value={password} onChange={setPassword} placeholder="Type your password"
            autoComplete="new-password" disabled={isSubmitting} />
        </div>
        <div>
          <label htmlFor="signup-confirm" className={authLabelClass}>
            Confirm Password<span className="text-[#FF651D]">*</span>
          </label>
          <PasswordInput id="signup-confirm" value={confirmPassword} onChange={setConfirmPassword} placeholder="Type password again"
            autoComplete="new-password" disabled={isSubmitting} />
        </div>
        <button type="submit" disabled={isSubmitting} className={`${authPrimaryButtonClass} mt-3`}>
          {isSubmitting ? (
            <>
              <Spinner /> Creating Account...
            </>
          ) : (
            "Register"
          )}
        </button>
      </form>
      <p className="text-center pt-5 text-sm text-gray-500">
        Already registered?{" "}
        <Link href={signinHref("organizer")} className="text-[#FF651D] font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
