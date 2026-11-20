"use client";

import React, { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import PhoneInput from "@/components/common/PhoneInput";
import PopupMessage from "@/components/common/PopupMessage";
import { profileCompleteness } from "@/utils/profileCompleteness";

const field = "w-full h-[47px] px-4 bg-white border border-[#E0E0E0] rounded-md text-[13px] text-[#15191C] placeholder:text-[#6B6B6B] focus:outline-none focus:border-black";

/**
 * Shown on the dashboard to an organizer who signed up with Google and whose profile is not complete yet (Google gives only a name
 * and an email). It cannot be closed until the required details are filled in; the percentage shows how far along the
 * profile is, and follows what is being typed. The only other way out is signing out.
 */
export default function CompleteProfileModal() {
  const { user, updateProfile, logout } = useAuth();
  const saved = useMemo(() => profileCompleteness(user), [user]);
  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [type, setType] = useState<"INDIVIDUAL" | "ORGANIZATION" | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only for organizers who signed up with Google (which gives just a name and an email). Everyone else already gave these details.
  if (!user || user.role !== "ORGANIZER" || user.authProvider !== "GOOGLE" || saved.complete) return null;

  const current = {
    fullName: name ?? user.fullName ?? "",
    phone: phone ?? user.phone ?? "",
    type: type ?? ((user.profile?.organizationType as "INDIVIDUAL" | "ORGANIZATION" | undefined) || null),
    orgName: orgName ?? (user.profile?.organizationName as string | undefined) ?? "",
  };
  const live = profileCompleteness({
    fullName: current.fullName,
    email: user.email,
    phone: current.phone,
    profile: { organizationType: current.type, organizationName: current.orgName },
  });
  const bad = (key: string) => showErrors && live.missing.some((m) => m.key === key);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (!live.complete || !current.type) return;
    setSaving(true);
    const merged: Record<string, unknown> = { ...(user.profile || {}), organizationType: current.type };
    if (current.type === "ORGANIZATION") merged.organizationName = current.orgName.trim();
    else delete merged.organizationName;
    const res = await updateProfile({ fullName: current.fullName.trim(), phone: current.phone, profile: merged });
    setSaving(false);
    if (!res.success) setError(res.message || "Your details could not be saved. Please try again.");
  };

  return (
    <div className="fixed inset-0 z-[9990] bg-black/60 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="complete-profile-title">
      <form onSubmit={save} noValidate className="bg-white rounded-xl shadow-2xl w-full max-w-md my-auto p-6 space-y-5">
        <div>
          <h2 id="complete-profile-title" className="text-lg font-semibold text-[#15191C]">Complete your profile</h2>
          <p className="text-sm text-[#4B4F52] mt-1">Welcome{user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}! A few details are needed before you can create events.</p>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-medium text-[#15191C] mb-1.5">
            <span>Profile completion</span>
            <span aria-live="polite">{live.percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#EDEDED] overflow-hidden" role="progressbar" aria-valuenow={live.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion">
            <div className={`h-full rounded-full transition-all ${live.complete ? "bg-[#1A9242]" : "bg-[#1F65FF]"}`} style={{ width: `${live.percent}%` }} />
          </div>
          {live.missing.length > 0 && <p className="mt-1.5 text-xs text-[#6B6B6B]">Still needed: {live.missing.map((m) => m.label.toLowerCase()).join(", ")}.</p>}
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-[#15191C] mb-2">You are signing up as<span className="text-red-500 ml-0.5">*</span></legend>
          <div className="flex gap-3">
            {([["INDIVIDUAL", "Individual"], ["ORGANIZATION", "Organization"]] as const).map(([value, label]) => (
              <label key={value} className={`flex-1 flex items-center gap-2 h-[47px] px-3 rounded-md border text-sm cursor-pointer ${current.type === value ? "border-black bg-[#F4F5F8] font-semibold" : bad("organizationType") ? "!border-rose-500" : "border-[#E0E0E0]"}`}>
                <input type="radio" name="org-type" className="accent-black" checked={current.type === value} onChange={() => setType(value)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="cp-name" className="block text-sm font-medium text-[#15191C] mb-1.5">{current.type === "ORGANIZATION" ? "Contact person name" : "Full name"}<span className="text-red-500 ml-0.5">*</span></label>
          <input id="cp-name" value={current.fullName} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" className={`${field} ${bad("fullName") ? "!border-rose-500" : ""}`} />
        </div>

        {current.type === "ORGANIZATION" && (
          <div>
            <label htmlFor="cp-org" className="block text-sm font-medium text-[#15191C] mb-1.5">Organization name<span className="text-red-500 ml-0.5">*</span></label>
            <input id="cp-org" value={current.orgName} onChange={(e) => setOrgName(e.target.value)} maxLength={150} className={`${field} ${bad("organizationName") ? "!border-rose-500" : ""}`} />
          </div>
        )}

        <div>
          <label htmlFor="cp-phone" className="block text-sm font-medium text-[#15191C] mb-1.5">Phone number<span className="text-red-500 ml-0.5">*</span></label>
          <PhoneInput id="cp-phone" value={current.phone} onValueChange={setPhone} placeholder="10-digit phone number" className={`${field} ${bad("phone") ? "!border-rose-500" : ""}`} />
        </div>

        <div>
          <label htmlFor="cp-email" className="block text-sm font-medium text-[#15191C] mb-1.5">Email address</label>
          <input id="cp-email" value={user.email} readOnly disabled className={`${field} bg-[#F4F5F8] text-[#6B6B6B]`} />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <button type="button" onClick={() => void logout()} className="text-sm text-[#4B4F52] underline hover:text-black cursor-pointer">Sign out</button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#1F65FF] hover:bg-[#1A56DB] text-white text-sm font-semibold rounded-md cursor-pointer disabled:opacity-60">
            {saving ? "Saving…" : "Save and continue"}
          </button>
        </div>
        <PopupMessage message={error} onClose={() => setError(null)} />
      </form>
    </div>
  );
}
