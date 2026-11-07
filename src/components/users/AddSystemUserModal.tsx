"use client";

import React, { useState } from "react";
import PhoneInput from "@/components/common/PhoneInput";
import PasswordField from "@/components/common/PasswordField";
import CustomDropdown from "@/components/common/CustomDropdown";
import { userService } from "@/services/userService";
import type { UserData } from "@/services/tokenStorage";

interface Props {
  /** Admins add a system user for one organizer: the Organizer field is shown and must be chosen */
  isAdmin: boolean;
  organizers?: UserData[];
  /** Pre-selected organizer (the one already chosen on the page, or the event's own organizer) */
  initialOrganizerId?: string;
  /** The organizer cannot be changed here (opened from an event: it is that event's organizer) */
  lockOrganizer?: boolean;
  onClose: () => void;
  /** Called with the new account and the organizer it was added for */
  onCreated: (user: UserData, organizerId: string) => void | Promise<void>;
}

const organizerLabel = (o: UserData) => `${(o.profile?.organizationName as string) || o.fullName}${(o.profile?.organizationName as string) ? ` · ${o.fullName}` : ""}`;

/** The "Add User" form, used by the Add User page and by All Users, so a system user can be added from either without leaving the page. */
export default function AddSystemUserModal({ isAdmin, organizers = [], initialOrganizerId = "", lockOrganizer = false, onClose, onCreated }: Props) {
  const [organizerId, setOrganizerId] = useState(initialOrganizerId);
  const [form, setForm] = useState({ userName: "", contactNo: "", email: "", password: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const missingOrganizer = isAdmin && !organizerId;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (missingOrganizer) { setFormError("Select the organizer this user is being added for."); return; }
    if (!form.userName.trim()) return;
    setIsSubmitting(true);
    setFormError(null);
    const res = await userService.createUser({
      fullName: form.userName.trim(),
      email: form.email.trim(),
      phone: form.contactNo.trim() || undefined,
      password: form.password,
      role: "SYSTEM_USER",
      ...(isAdmin ? { organizerId } : {}),
    });
    setIsSubmitting(false);
    if (!res.success || !res.data) { setFormError(res.message || "Failed to create user."); return; }
    await onCreated(res.data, organizerId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-overlay" role="dialog" aria-modal="true" aria-labelledby="add-user-title">
      <div className="bg-white rounded-lg shadow-2xl max-w-[486px] w-full overflow-y-auto animate-modal max-h-[calc(100dvh-2rem)]">
        <div className="px-6 py-5 border-b border-[#E0E0E0] flex items-center justify-between">
          <h3 id="add-user-title" className="text-base font-medium text-[#15191C]">Add User</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} noValidate={false} className="px-6 pt-5 space-y-5">
          {/* Admins: which organizer the new system user belongs to (required) */}
          {isAdmin && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#15191C]">Organizer<span className="text-[#FF651D] ml-0.5">*</span></label>
              <CustomDropdown
                portal
                value={organizerId}
                onChange={(v) => { setOrganizerId(v); setFormError(null); }}
                options={organizers.map((o) => ({ value: o._id, label: organizerLabel(o) }))}
                placeholder="Select an organizer"
                ariaLabel="Organizer this user is added for"
                disabled={lockOrganizer}
                invalid={!!formError && missingOrganizer}
                emptyMessage="No organizers yet"
              />
              <p className="text-xs text-[#828282]">{lockOrganizer ? "This event's organizer." : "The user is added to this organizer's system users."}</p>
            </div>
          )}

              {/* User Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#15191C]">
                  User Name<span className="text-[#FF651D] ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter User Name"
                  value={form.userName}
                  onChange={(e) => setForm({ ...form, userName: e.target.value })}
                  className="w-full min-h-[47px] px-3.5 py-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D] transition-colors"
                />
              </div>

              {/* Contact No */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#15191C]">
                  Contact No<span className="text-[#FF651D] ml-0.5">*</span>
                </label>
                <PhoneInput
                  required
                  placeholder="Enter Contact No"
                  value={form.contactNo}
                  onValueChange={(v) => setForm({ ...form, contactNo: v })}
                  className="w-full min-h-[47px] px-3.5 py-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D] transition-colors"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#15191C]">
                  Email<span className="text-[#FF651D] ml-0.5">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Enter Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full min-h-[47px] px-3.5 py-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D] transition-colors"
                />
              </div>

              {/* Temporary Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#15191C]">
                  Temporary Password<span className="text-[#FF651D] ml-0.5">*</span>
                </label>
                <PasswordField
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full min-h-[47px] px-3.5 py-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D] transition-colors"
                />
              </div>

              {formError && (
                <p role="alert" className="text-xs font-medium text-rose-600 break-words">{formError}</p>
              )}

              <div className="-mx-6 mt-6 px-6 py-4 border-t border-[#E0E0E0] flex items-center justify-end gap-3">
                <button type="button" onClick={onClose} className="px-6 py-[11px] bg-white border border-[#E0E0E0] hover:bg-gray-50 text-[#15191C] text-base font-semibold rounded-lg transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting || missingOrganizer} title={missingOrganizer ? "Select an organizer first" : undefined} className="px-6 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? "Adding..." : "Add"}
                </button>
              </div>
        </form>
      </div>
    </div>
  );
}
