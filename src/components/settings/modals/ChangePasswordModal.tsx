"use client";

import React, { useState } from "react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (oldPass: string, newPass: string) => Promise<boolean | void>;
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  onUpdate,
}: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const success = await onUpdate(oldPassword, newPassword);
      if (success !== false) {
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-overlay">
      <div className="w-full max-w-[488px] bg-white rounded-lg shadow-xl overflow-y-auto animate-modal max-h-[calc(100dvh-2rem)]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E0E0E0]">
          <h3 className="text-base font-medium text-[#15191C]">Change Password</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="pt-6 space-y-4">
          {error && (
            <div className="mx-6 p-3 bg-red-50 text-red-600 rounded-md text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#15191C] mb-2 px-6">Old Password</label>
            <div className="relative">
              <input
                type={visiblePasswords.old ? "text" : "password"}
                placeholder="••••••••••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="mx-6 w-[calc(100%-48px)] h-[47px] px-4 pr-12 text-sm border border-[#E0E0E0] rounded-md bg-[#FAFAFA] focus:outline-none focus:border-[#FF651D]"
                required
              />
              <button
                type="button"
                onClick={() => setVisiblePasswords((current) => ({ ...current, old: !current.old }))}
                aria-label={visiblePasswords.old ? "Hide old password" : "Show old password"}
                aria-pressed={visiblePasswords.old}
                className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  {visiblePasswords.old ? (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      <circle cx="12" cy="12" r="3" strokeWidth={2} />
                    </>
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M10.584 10.587a2 2 0 002.829 2.829" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.88 5.09A10.94 10.94 0 0112 4.9c4.478 0 8.268 2.943 9.542 7a10.96 10.96 0 01-3.04 4.44M6.61 6.61A10.96 10.96 0 002.458 12c.5 1.59 1.47 2.99 2.75 4.04A10.93 10.93 0 0012 19.1c1.23 0 2.4-.2 3.48-.57" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#15191C] mb-2 px-6">New Password</label>
            <div className="relative">
              <input
                type={visiblePasswords.new ? "text" : "password"}
                placeholder="••••••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mx-6 w-[calc(100%-48px)] h-[47px] px-4 pr-12 text-sm border border-[#E0E0E0] rounded-md bg-[#FAFAFA] focus:outline-none focus:border-[#FF651D]"
                required
              />
              <button
                type="button"
                onClick={() => setVisiblePasswords((current) => ({ ...current, new: !current.new }))}
                aria-label={visiblePasswords.new ? "Hide new password" : "Show new password"}
                aria-pressed={visiblePasswords.new}
                className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  {visiblePasswords.new ? (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      <circle cx="12" cy="12" r="3" strokeWidth={2} />
                    </>
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M10.584 10.587a2 2 0 002.829 2.829" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.88 5.09A10.94 10.94 0 0112 4.9c4.478 0 8.268 2.943 9.542 7a10.96 10.96 0 01-3.04 4.44M6.61 6.61A10.96 10.96 0 002.458 12c.5 1.59 1.47 2.99 2.75 4.04A10.93 10.93 0 0012 19.1c1.23 0 2.4-.2 3.48-.57" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#15191C] mb-2 px-6">Confirm New Password</label>
            <div className="relative">
              <input
                type={visiblePasswords.confirm ? "text" : "password"}
                placeholder="••••••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mx-6 w-[calc(100%-48px)] h-[47px] px-4 pr-12 text-sm border border-[#E0E0E0] rounded-md bg-[#FAFAFA] focus:outline-none focus:border-[#FF651D]"
                required
              />
              <button
                type="button"
                onClick={() => setVisiblePasswords((current) => ({ ...current, confirm: !current.confirm }))}
                aria-label={visiblePasswords.confirm ? "Hide confirm password" : "Show confirm password"}
                aria-pressed={visiblePasswords.confirm}
                className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  {visiblePasswords.confirm ? (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      <circle cx="12" cy="12" r="3" strokeWidth={2} />
                    </>
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M10.584 10.587a2 2 0 002.829 2.829" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.88 5.09A10.94 10.94 0 0112 4.9c4.478 0 8.268 2.943 9.542 7a10.96 10.96 0 01-3.04 4.44M6.61 6.61A10.96 10.96 0 002.458 12c.5 1.59 1.47 2.99 2.75 4.04A10.93 10.93 0 0012 19.1c1.23 0 2.4-.2 3.48-.57" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-4 py-4 mt-6 border-t border-[#E0E0E0]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-[11px] text-base font-semibold text-black bg-white border border-[#DDD] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-[11px] text-base font-semibold text-white bg-[#FF651D] rounded-lg hover:bg-[#E5520F] transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
