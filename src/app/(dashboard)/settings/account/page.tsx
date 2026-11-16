"use client";

import { formatOrganizerId } from "@/utils/formatId";
import PopupMessage from "@/components/common/PopupMessage";
import OrganisationDetailsForm from "@/components/settings/OrganisationDetailsForm";
import PageHeader from "@/components/common/PageHeader";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import ChangePasswordModal from "@/components/settings/modals/ChangePasswordModal";
import AvatarSection from "@/components/settings/AvatarSection";

import { userService } from "@/services/userService";
import { useAlert } from "@/context/AlertContext";


export default function AccountSettingsPage() {
  const { user, updateProfile } = useAuth();
  const { showAlert } = useAlert();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  // (email is displayed read-only; the profile API does not change it)
  const [password, setPassword] = useState("••••••••••••••••");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    (user as any)?.avatarUrl || null
  );
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [avatarNotice, setAvatarNotice] = useState(false);
  const [editing, setEditing] = useState(false);
  const isOrganizer = user?.role === "ORGANIZER";
  const field = "w-full h-[47px] px-4 bg-white border border-[#E0E0E0] rounded-md text-[13px] text-[#15191C] focus:outline-none focus:border-black";

  useEffect(() => {
    if (user?.fullName) setFullName(user.fullName);
    if (user?.email) setEmail(user.email);
    if ((user as any)?.avatarUrl) setAvatarUrl((user as any).avatarUrl);
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    // Only the name is editable through the profile API; email changes are not supported there
    const res = await updateProfile({
      fullName: fullName.trim(),
    });
    if (!res.success) {
      setErrorMessage(res.message || "Failed to update profile.");
      return;
    }
    setSavedMessage(true);
    setEditing(false);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const handleUpdatePassword = async (oldPass: string, newPass: string): Promise<boolean> => {
    setErrorMessage("");
    const res = await userService.changePassword(oldPass, newPass);
    if (res.success) {
      setPassword("••••••••••••••••");
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
      return true;
    }
    const message = res.message || "Failed to update password.";
    if (res.status === 401 || /password|credential|authentication/i.test(message)) {
      showAlert(message, "error", "Incorrect password");
    } else {
      setErrorMessage(message);
    }
    return false;
  };

  const displayName = fullName || user?.fullName || user?.email || "Account Name";

  return (
    <div className="w-full min-h-full bg-white font-sans text-gray-900 select-none">
      {/* Header */}
      <PageHeader title="Account Settings" />

      {/* Figma 2171:1911 "My Profile" (default) and 2171:2034 "Edit Profile": full-width grey card, 154px photo */}
      <div className="px-4 sm:px-6 pt-10 pb-24 w-full space-y-6">
        <h2 className="text-xl font-medium text-black">{editing ? "Edit Profile" : "My Profile"}</h2>

        <PopupMessage message={savedMessage ? "Account details updated successfully!" : null} type="success" onClose={() => setSavedMessage(false)} />
        <PopupMessage message={errorMessage} onClose={() => setErrorMessage("")} />

        {!editing ? (
          <section className="bg-[#F8F8F8] border border-[#E5E5E5] rounded-lg p-8 flex flex-col sm:flex-row items-start sm:items-center gap-10" aria-label="My profile">
            <span className="relative size-[154px] shrink-0 rounded-full overflow-hidden bg-[#D9D9D9] flex items-center justify-center">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local preview or stored avatar URL
                <img src={avatarUrl} alt="Profile photo" className="w-full h-full object-cover" />
              ) : (
                <Image src="/images/header/avatar-user.svg" alt="" width={68} height={68} />
              )}
            </span>
            <div className="min-w-0 space-y-1.5">
              <p className="text-[32px] leading-tight font-medium text-black break-words">{displayName}</p>
              <p className="text-xl text-black break-all">{email}</p>
              {isOrganizer && user?._id && <p className="text-base text-[#4B4F52]">Organizer ID: <span className="font-medium text-black">{formatOrganizerId(user._id)}</span></p>}
              <button type="button" onClick={() => setEditing(true)} className="mt-4 px-6 py-[11px] bg-[#C65318] hover:bg-[#A83800] rounded-lg text-base font-semibold text-white cursor-pointer">
                Edit Profile
              </button>
            </div>
          </section>
        ) : (
          <form onSubmit={handleSave} className="bg-[#F8F8F8] border border-[#E5E5E5] rounded-lg p-8 flex flex-col md:flex-row items-start gap-10">
            <AvatarSection
              avatarUrl={avatarUrl}
              onAvatarChange={(newUrl) => {
                // No media storage is configured, so the photo is only previewed locally
                setAvatarUrl(newUrl);
                setAvatarNotice(Boolean(newUrl));
              }}
            />
            <div className="flex-1 min-w-0 w-full space-y-4">
              <p className="text-[32px] leading-tight font-medium text-black break-words">{displayName}</p>
              {avatarNotice && (
                <p className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Profile photo is shown for this session only - photo storage is not configured yet.
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                {/* Not in the frame, but renaming the account is an existing feature */}
                <div>
                  <label htmlFor="account-name" className="block text-sm font-medium text-[#15191C] mb-2">Account Name</label>
                  <input id="account-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={field} />
                </div>
                {/* the organizer's ID: shown for reference, never editable */}
                {isOrganizer && user?._id && (
                  <div>
                    <label htmlFor="account-organizer-id" className="block text-sm font-medium text-[#15191C] mb-2">Organizer ID</label>
                    <input id="account-organizer-id" type="text" value={formatOrganizerId(user._id)} readOnly title="Your organizer ID cannot be changed" className={`${field} text-[#6B6B6B] cursor-not-allowed`} />
                  </div>
                )}
                <div>
                  <label htmlFor="account-email" className="block text-sm font-medium text-[#15191C] mb-2">Email</label>
                  <input id="account-email" type="email" value={email} readOnly title="Email changes are not supported yet" className={`${field} text-[#6B6B6B] cursor-not-allowed`} />
                </div>
                <div>
                  <label htmlFor="account-password" className="block text-sm font-medium text-[#15191C] mb-2">Password</label>
                  <div className="relative">
                    <input id="account-password" type="password" value={password} readOnly className={`${field} pr-36`} />
                    <button type="button" onClick={() => setIsPasswordModalOpen(true)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-[#C44200] hover:underline cursor-pointer">
                      Change password
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="px-6 py-[11px] bg-[#C65318] hover:bg-[#A83800] rounded-lg text-base font-semibold text-white cursor-pointer">Save</button>
                <button type="button" onClick={() => { setEditing(false); setFullName(user?.fullName || ""); }} className="px-6 py-[11px] bg-white border border-[#E0E0E0] hover:bg-gray-50 rounded-lg text-base font-semibold text-[#15191C] cursor-pointer">Cancel</button>
              </div>
            </div>
          </form>
        )}

        {isOrganizer && !editing && <OrganisationDetailsForm />}
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onUpdate={handleUpdatePassword}
      />
    </div>
  );
}
