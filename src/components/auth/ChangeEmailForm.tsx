"use client";

import React, { useState } from "react";
import { authService } from "@/services/authService";
import { AuthAlert, PasswordInput, Spinner, authInputClass, authLabelClass } from "@/components/auth/AuthLayouts";

/**
 * "Change email address" on the 6-digit code page: the person typed their address wrongly, so the code never arrived.
 * The pending sign-up moves to the corrected address and the new code is sent there. The password from step 1 proves the
 * request is theirs; the sign-up page already has it, the standalone verify page asks for it.
 */
export default function ChangeEmailForm({ currentEmail, knownPassword, onChanged, onCancel }: {
  currentEmail: string;
  /** the password typed in step 1, when this page still has it */
  knownPassword?: string;
  onChanged: (newEmail: string) => void;
  onCancel: () => void;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const wanted = newEmail.trim();
    if (wanted.toLowerCase() === currentEmail.trim().toLowerCase()) { setError("Enter a different email address."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await authService.changePendingEmail(currentEmail, wanted, knownPassword || password);
      if (res.success) onChanged(res.data?.email || wanted.toLowerCase());
      else setError(res.message || "Could not change the email address. Please try again.");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left">
      <p className="text-sm font-medium text-[#2D3748]">Where should we send the code?</p>
      {error && <AuthAlert tone="error">{error}</AuthAlert>}
      <div>
        <label htmlFor="change-email-new" className={authLabelClass}>Correct email address</label>
        <input id="change-email-new" type="email" required autoFocus autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} disabled={busy} placeholder="you@company.com" className={authInputClass} />
      </div>
      {!knownPassword && (
        <div>
          <label htmlFor="change-email-password" className={authLabelClass}>Your password</label>
          <PasswordInput id="change-email-password" value={password} onChange={setPassword} placeholder="The password you chose when signing up" autoComplete="current-password" disabled={busy} />
        </div>
      )}
      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={busy || !newEmail.trim() || (!knownPassword && !password)} className="inline-flex items-center gap-2 rounded-full bg-[#FF651D] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#C44200] disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <><Spinner /> Sending...</> : "Send code to this address"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="text-sm font-medium text-gray-600 underline hover:text-gray-900">Cancel</button>
      </div>
    </form>
  );
}
