"use client";

import PhoneInput from "@/components/common/PhoneInput";
import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";

interface InviteeRow {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface EditInviteeModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitee: InviteeRow | null;
  onSave: (updated: InviteeRow) => void;
}

export default function EditInviteeModal({
  isOpen,
  onClose,
  invitee,
  onSave,
}: EditInviteeModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (invitee) {
      setName(invitee.name);
      setEmail(invitee.email);
      setPhone(invitee.phone);
    }
  }, [invitee]);

  useEffect(() => {
    if (isOpen && overlayRef.current && modalRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
        gsap.fromTo(
          modalRef.current,
          { scale: 0.8, opacity: 0, y: 15 },
          { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.2)" }
        );
      });
      return () => ctx.revert();
    }
  }, [isOpen]);

  if (!isOpen || !invitee) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...invitee, name, email, phone });
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-md border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col my-auto"
      >
        {/* Modal Header (Image #2) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">Edit Row</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-600 transition-colors p-1 rounded-md cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Name<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-gray-200 rounded-md text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#FF5B22] focus:border-[#FF5B22]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Email<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-gray-200 rounded-md text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#FF5B22] focus:border-[#FF5B22]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Mobile Phone Number<span className="text-red-500 ml-0.5">*</span>
            </label>
            <PhoneInput
              required
              value={phone}
              onValueChange={(v) => setPhone(v)}
              className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-gray-200 rounded-md text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#FF5B22] focus:border-[#FF5B22]"
            />
          </div>

          {/* Footer Actions (Image #2) */}
          <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-xs rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#C65318] hover:bg-[#A83800] text-white font-bold text-xs rounded-md transition-all shadow-xs cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
