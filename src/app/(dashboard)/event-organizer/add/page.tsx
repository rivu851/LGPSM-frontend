"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { userService } from '@/services/userService';
import UserNavDropdown from "@/components/common/UserNavDropdown";

export default function AddEventOrganizerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    organizerName: "",
    password: "",
  });
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [logoFile, setLogoFile] = useState<{ name: string; url: string } | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoSelect = (file: File) => {
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoFile({ name: file.name, url });
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

    const res = await userService.createUser({
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || undefined,
      password: formData.password,
      role: 'ORGANIZER',
      ...(formData.organizerName.trim() ? { profile: { organizationName: formData.organizerName.trim() } } : {}),
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
        <header className="h-20 bg-white border-b border-gray-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <svg className="w-7 h-7 text-[#FF5B22] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
            </svg>
            <h1 className="text-sm sm:text-xl font-bold text-gray-900 truncate">Add Event Organizer</h1>
          </div>
          <UserNavDropdown />
        </header>

        {/* Form Container */}
        <main className="p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6">
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-md p-6 md:p-8 shadow-2xs space-y-6">
            <h2 className="text-lg font-bold text-gray-900">Event Organizer</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Full Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Type Name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Email Address<span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Type Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Phone Number<span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Type Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Organizer Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Organizer Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Type Name"
                  value={formData.organizerName}
                  onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              {/* Temporary Password (the organizer signs in with this) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Temporary Password<span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              {/* Organizer Logo Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">Organizer Logo</label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*,.pdf"
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
                    className="border border-dashed border-gray-300 hover:border-[#FF5B22] rounded-md p-6 bg-white hover:bg-gray-50 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[110px] select-none"
                  >
                    <span className="text-[11px] text-gray-400 max-w-[200px] leading-tight">
                      Drag and drop a photo here or <span className="text-[#FF5B22] font-semibold underline">click to open file</span>
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1">Preview only - logo storage is not configured yet</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#FF5B22] hover:bg-[#E04B16] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
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
        </main>
    </div>
  );
}
