"use client";

import PhoneInput from "@/components/common/PhoneInput";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const field = "w-full h-[47px] px-4 bg-white border border-[#E0E0E0] rounded-md text-[13px] text-[#15191C] focus:outline-none focus:border-[#FF651D]";
const label = "block text-sm font-medium text-[#15191C] mb-2";

type Org = { name: string; phone: string; email: string; website: string; address: string };

const fromUser = (user: unknown): Org => {
  const profile = ((user as { profile?: { organization?: Partial<Org>; organizationName?: string } } | null)?.profile) || {};
  const o = profile.organization || {};
  return { name: profile.organizationName || o.name || "", phone: o.phone || "", email: o.email || "", website: o.website || "", address: o.address || "" };
};

/**
 * The organiser's organisation details as a self-contained form: the same fields on My Profile and in Settings, each
 * saving through the profile API on its own. Only organisers see it.
 */
export default function OrganisationDetailsForm() {
  const { user, updateProfile } = useAuth();
  // what the organiser has typed on top of the saved details; empty means "as saved"
  const [edits, setEdits] = useState<Partial<Org>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (user?.role !== "ORGANIZER") return null;

  const saved = fromUser(user);
  const org: Org = { ...saved, ...edits };
  const dirty = (Object.keys(org) as (keyof Org)[]).some((k) => org[k] !== saved[k]);
  const set = (k: keyof Org) => (e: React.ChangeEvent<HTMLInputElement>) => { setEdits((o) => ({ ...o, [k]: e.target.value })); setMessage(null); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org.name.trim()) {
      setMessage({ type: "error", text: "Organisation name is required." });
      return;
    }
    setSaving(true);
    const res = await updateProfile({ organization: { name: org.name.trim(), phone: org.phone.trim(), email: org.email.trim(), address: org.address.trim(), website: org.website.trim() } });
    setSaving(false);
    if (res.success) setEdits({});
    setMessage(res.success ? { type: "success", text: "Organisation details updated." } : { type: "error", text: res.message || "Could not update the organisation details." });
  };

  return (
    <section className="border border-[#E5E5E5] bg-[#F8F8F8] rounded-lg p-6 sm:p-8" aria-label="Organisation details">
      <h2 className="text-xl font-medium text-black mb-1">Organisation Details</h2>
      <p className="text-xs text-[#828282] mb-5">Shown on your account. Only the organisation name is required.</p>
      {message && (
        <div role={message.type === "error" ? "alert" : "status"} className={`mb-4 p-3 rounded-md border text-xs font-semibold ${message.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
          {message.text}
        </div>
      )}
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
          <div>
            <label htmlFor="org-name" className={label}>Organisation name <span className="text-rose-600">*</span></label>
            <input id="org-name" value={org.name} onChange={set("name")} maxLength={150} className={field} />
          </div>
          <div>
            <label htmlFor="org-phone" className={label}>Organisation phone <span className="text-[#828282] font-normal text-xs ml-1">(optional)</span></label>
            <PhoneInput id="org-phone" value={org.phone} onValueChange={(v) => { setEdits((o) => ({ ...o, phone: v })); setMessage(null); }} className={field} />
          </div>
          <div>
            <label htmlFor="org-email" className={label}>Organisation email <span className="text-[#828282] font-normal text-xs ml-1">(optional)</span></label>
            <input id="org-email" type="email" value={org.email} onChange={set("email")} maxLength={150} className={field} />
          </div>
          <div>
            <label htmlFor="org-website" className={label}>Website <span className="text-[#828282] font-normal text-xs ml-1">(optional)</span></label>
            <input id="org-website" value={org.website} onChange={set("website")} placeholder="https://" maxLength={200} className={field} />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="org-address" className={label}>Address <span className="text-[#828282] font-normal text-xs ml-1">(optional)</span></label>
            <input id="org-address" value={org.address} onChange={set("address")} maxLength={300} className={field} />
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving || !dirty} className="px-6 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] rounded-lg text-base font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? "Saving..." : "Save"}
          </button>
          {dirty && !saving && (
            <button type="button" onClick={() => { setEdits({}); setMessage(null); }} className="px-6 py-[11px] bg-white border border-[#E0E0E0] hover:bg-gray-50 rounded-lg text-base font-semibold text-[#15191C] cursor-pointer">Cancel</button>
          )}
        </div>
      </form>
    </section>
  );
}
