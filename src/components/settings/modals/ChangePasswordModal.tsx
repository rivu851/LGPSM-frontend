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
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
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
            <input
              type="password"
              placeholder="••••••••••••••••"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="mx-6 w-[calc(100%-48px)] h-[47px] px-4 text-sm border border-[#E0E0E0] rounded-md bg-[#FAFAFA] focus:outline-none focus:border-[#FF651D]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#15191C] mb-2 px-6">New Password</label>
            <input
              type="password"
              placeholder="••••••••••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mx-6 w-[calc(100%-48px)] h-[47px] px-4 text-sm border border-[#E0E0E0] rounded-md bg-[#FAFAFA] focus:outline-none focus:border-[#FF651D]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#15191C] mb-2 px-6">Confirm New Password</label>
            <input
              type="password"
              placeholder="••••••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mx-6 w-[calc(100%-48px)] h-[47px] px-4 text-sm border border-[#E0E0E0] rounded-md bg-[#FAFAFA] focus:outline-none focus:border-[#FF651D]"
              required
            />
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
