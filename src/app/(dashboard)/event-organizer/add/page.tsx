"use client";

import { limitPhone } from "@/utils/phoneInput";
import type { InvitationChannel } from "@/utils/invitationChannel";
// import { INVITATION_CHANNEL_OPTIONS } from "@/utils/invitationChannel"; (invitation channel field hidden for now)
// import CustomDropdown from "@/components/common/CustomDropdown"; (only used by the hidden invitation channel field)
import PasswordField from "@/components/common/PasswordField";
import PageHeader from "@/components/common/PageHeader";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { userService } from '@/services/userService';
import { ACCEPTED_IMAGE_TYPES, mediaService } from '@/services/mediaService';
import DashedBorder from "@/components/common/DashedBorder";

export default function AddEventOrganizerPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    organizationName: "",
    email: "",
    phone: "",
    password: "",
    invitationChannel: "BOTH" as InvitationChannel,
  });
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [logoFile, setLogoFile] = useState<{ name: string; url: string; file: File } | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoSelect = (file: File) => {
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoFile({ name: file.name, url, file });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setIsSuccess(false);

    // The logo is stored first: an organizer is only created with the logo that was chosen, never silently without it
    let logoKey: string | undefined;
    if (logoFile) {
      const upload = await mediaService.uploadImage(logoFile.file, 'ORGANIZATION_LOGO');
      if (!upload.success || !upload.data?.key) {
        setIsSubmitting(false);
        setError(upload.message || 'The logo could not be uploaded, so the organizer was not created.');
        return;
      }
      logoKey = upload.data.key;
    }

    const res = await userService.createUser({
      // The API requires fullName for the user account; use the organization name as
      // the account's displayed name and store it in the dedicated organization field.
      fullName: formData.organizationName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || undefined,
      password: formData.password,
      role: 'ORGANIZER',
      profile: { organizationName: formData.organizationName.trim(), ...(logoKey ? { logoKey } : {}) },
    });

    setIsSubmitting(false);
    if (!res.success) {
      setError(res.message || 'Failed to create organizer.');
      return;
    }

    setIsSuccess(true);
    setTimeout(() => {
      router.push('/event-organizer');
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <PageHeader title="Add Event Organizer" />

        {/* Form Container */}
        <div className="px-4 sm:px-6 pt-[30px] pb-8 w-full space-y-6">
          <form onSubmit={handleSubmit} className="bg-white border border-[#E0E0E0] rounded-lg p-5 md:p-6 space-y-5">
            <h2 className="text-xl font-medium text-[#15191C]">Event Organizer</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-5">
              {/* Organization Name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#15191C]">
                  Organisation Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Type Organisation Name"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  className="w-full h-[47px] px-3.5 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#15191C]">
                  Email Address<span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Type Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-[47px] px-3.5 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#15191C]">
                  Phone Number<span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  placeholder="Type Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: limitPhone(e.target.value) })}
                  className="w-full h-[47px] px-3.5 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-5">
              {/* Temporary Password (the organizer signs in with this) */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#15191C]">
                  Temporary Password<span className="text-red-500">*</span>
                </label>
                <PasswordField
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full h-[47px] px-3.5 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              {/* Invitation channel: hidden until the client confirms what it should be. Uncomment to bring it back.
              {/ * How this organizer will send invitations (the same choice organizers make at signup) * /}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#15191C]">Invitation channel<span className="text-red-500">*</span></label>
                <CustomDropdown value={formData.invitationChannel} onChange={(v) => setFormData({ ...formData, invitationChannel: v as InvitationChannel })} options={INVITATION_CHANNEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} ariaLabel="Invitation channel" />
              </div>
              */}

              {/* Organizer Logo Box */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#15191C]">Organizer Logo</label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoSelect(file);
                  }}
                />

                {logoFile ? (
                  <div className="p-3 border border-emerald-200 rounded-md bg-emerald-50/50 flex items-center justify-between min-h-[110px]">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {logoFile.url.startsWith("blob:") || logoFile.url.startsWith("data:") ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden relative shrink-0 border border-emerald-300">
                          <img src={logoFile.url} alt="Logo preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <svg className="w-6 h-6 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                      <span className="text-xs font-semibold text-emerald-900 truncate max-w-[150px]">
                        {logoFile.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLogoFile(null)}
                      aria-label="Remove logo"
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="group relative rounded-md p-6 bg-white hover:bg-gray-50 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[110px] select-none"
                  >
                    <DashedBorder width={1} className="text-gray-300 group-hover:text-[#FF5B22]" />
                    <span className="text-[11px] text-gray-400 max-w-[200px] leading-tight">
                      Drag and drop a photo here or <span className="text-[#FF5B22] font-semibold underline">click to open file</span>
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1">JPG, PNG or WEBP, up to 5 MB</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add Organizer'}
              </button>
            </div>
          </form>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-md text-xs font-semibold text-center animate-fadeIn">
              {error}
            </div>
          )}

          {isSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-semibold text-center animate-fadeIn">
              Organizer added successfully! Redirecting to list...
            </div>
          )}
        </div>
    </div>
  );
}
