"use client";

import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useOverlayClose } from "@/hooks/useOverlayClose";
import { inviteeService, CreateInviteePayload } from "@/services/inviteeService";
import CustomDropdown, { CustomDropdownOption } from "@/components/common/CustomDropdown";
import type { InviteeFieldKey } from "@/utils/inviteeFields";

interface AddInviteeManualModalProps {
  isOpen: boolean;
  eventId: string;
  existingInvitees?: Array<{ name: string; email?: string; mobile?: string }>;
  /** The fields this event collects: the same list the Excel sample is built from (utils/inviteeFields) */
  fields?: InviteeFieldKey[];
  /** The organizer's own title for the custom detail; with one, the field is a plain box carrying that title */
  identityLabel?: string;
  /** The title of a second custom detail, when both card lines carry one */
  identity2Label?: string;
  /** Sessions that keep their own invitee list (offered only when there is more than one) */
  sessionOptions?: { id: string; name: string }[];
  sessionId?: string;
  onSessionChange?: (id: string) => void;
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:border-[#FF651D] transition-colors";

const labelClass = "block text-sm font-medium text-gray-900 mb-1";

const professionalIdentityOptions: CustomDropdownOption[] = [
  { value: "Corporate ID", label: "Corporate ID" },
  { value: "Employee ID", label: "Employee ID" },
  { value: "Student ID", label: "Student ID" },
  { value: "Professional License", label: "Professional License" },
  { value: "Other", label: "Other" },
];

export default function AddInviteeManualModal({
  isOpen,
  eventId,
  existingInvitees = [],
  fields = ["name", "email", "mobile"],
  identityLabel,
  identity2Label,
  sessionOptions = [],
  sessionId = "",
  onSessionChange,
  onClose,
  onSaved,
}: AddInviteeManualModalProps) {
  const has = (k: InviteeFieldKey) => fields.includes(k);
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [identityType, setIdentityType] = useState("");
  const [identityValue, setIdentityValue] = useState("");
  const [identity2Value, setIdentity2Value] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitInFlight = useRef(false);

  const closeModal = () => {
    setName("");
    setEmail("");
    setMobile("");
    setCompanyName("");
    setIdentityType("");
    setIdentityValue("");
    setIdentity2Value("");
    setError(null);
    onClose();
  };
  const overlayClose = useOverlayClose(closeModal, submitting);

  useEffect(() => {
    if (isOpen && overlayRef.current && modalRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.22 });
        gsap.fromTo(
          modalRef.current,
          { scale: 0.85, opacity: 0, y: 16 },
          { scale: 1, opacity: 1, y: 0, duration: 0.32, ease: "back.out(1.2)" }
        );
      });
      return () => ctx.revert();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitInFlight.current) return;
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    if (!email.trim() && !mobile.trim()) {
      setError("Either an email address or a mobile number is required.");
      return;
    }
    const emailKey = email.trim().toLowerCase();
    const phoneKey = mobile.replace(/\D/g, "");
    const existing = existingInvitees.find((item) =>
      (emailKey && item.email?.trim().toLowerCase() === emailKey) ||
      (phoneKey && item.mobile?.replace(/\D/g, "") === phoneKey)
    );
    if (existing) {
      setError(`This contact is already on the event invitee list as ${existing.name}. Edit that invitee instead of adding a duplicate.`);
      return;
    }

    const payload: CreateInviteePayload = {
      name: trimmed,
      ...(email.trim() && { email: email.trim() }),
      ...(mobile.trim() && { mobile: mobile.trim() }),
      ...(companyName.trim() && { companyName: companyName.trim() }),
      // Stored on the guest and printable on the card via "Additional Info" (the API never accepted `designation`)
      ...(identityLabel
        ? identityValue.trim() && { professionalIdentity: identityValue.trim() }
        : identityType && identityValue.trim() && { professionalIdentity: `${identityType}: ${identityValue.trim()}` }),
      ...(identity2Value.trim() && { secondaryIdentity: identity2Value.trim() }),
      ...(sessionId && { sessionAccess: [{ sessionId, allowed: true }] }),
    };

    setSubmitting(true);
    submitInFlight.current = true;
    try {
      const res = await inviteeService.createInvitee(eventId, payload);
      if (!res.success) {
        setError(res.message || "Failed to add invitee. Please try again.");
        return;
      }
      onSaved();
      closeModal();
    } catch {
      setError("The request could not reach the server. Your entries are kept; please retry.");
    } finally {
      submitInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans"
      {...overlayClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-invitee-manual-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="add-invitee-manual-title" className="text-base font-bold text-gray-900">
            Add Invitee
          </h2>
          <button
            type="button"
            onClick={closeModal}
            disabled={submitting}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-4">
            {/* Session first, when sessions keep their own invitee lists */}
            {sessionOptions.length > 1 && onSessionChange && (
              <div>
                <label htmlFor="ai-session" className={labelClass}>Add to session</label>
                <select id="ai-session" value={sessionId} onChange={(e) => onSessionChange(e.target.value)} className={inputClass}>
                  <option value="">All sessions (the whole event)</option>
                  {sessionOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="ai-name" className={labelClass}>
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="ai-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className={inputClass}
                autoComplete="off"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="ai-email" className={labelClass}>
                Email Address
                <span className="text-[#828282] font-normal text-xs ml-1">(required if no mobile)</span>
              </label>
              <input
                id="ai-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. priya@example.com"
                className={inputClass}
                autoComplete="off"
              />
            </div>

            {/* Mobile */}
            <div>
              <label htmlFor="ai-mobile" className={labelClass}>
                Mobile Number
                <span className="text-[#828282] font-normal text-xs ml-1">(required if no email)</span>
              </label>
              <input
                id="ai-mobile"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className={inputClass}
                autoComplete="off"
              />
            </div>

            {/* Professional identity: only when the event's card uses it (same condition as the Excel sample) */}
            {has("identity") && (
            identityLabel ? (
            <div>
              <label htmlFor="ai-identity" className={labelClass}>
                {identityLabel} <span className="text-[#828282] font-normal text-xs ml-1">(optional)</span>
              </label>
              <input id="ai-identity" type="text" value={identityValue} maxLength={100} onChange={(e) => setIdentityValue(e.target.value)} placeholder={`Enter ${identityLabel}`} className={inputClass} autoComplete="off" />
            </div>
            ) : (
            <div>
              <label className={labelClass}>
                Professional Identity <span className="text-[#828282] font-normal text-xs ml-1">(optional)</span>
              </label>
              <CustomDropdown
                value={identityType}
                onChange={setIdentityType}
                options={professionalIdentityOptions}
                placeholder="Select an identity type"
                ariaLabel="Professional identity type"
              />
              {identityType && (
                <input
                  type="text"
                  value={identityValue}
                  onChange={(e) => setIdentityValue(e.target.value)}
                  placeholder={`Enter ${identityType.toLowerCase()}`}
                  className={`${inputClass} mt-2`}
                  autoComplete="off"
                  aria-label={`${identityType} value`}
                />
              )}
            </div>
            )
            )}

            {has("identity2") && (
              <div>
                <label htmlFor="ai-identity2" className={labelClass}>
                  {identity2Label || "Second Identity"} <span className="text-[#828282] font-normal text-xs ml-1">(optional)</span>
                </label>
                <input id="ai-identity2" type="text" value={identity2Value} maxLength={100} onChange={(e) => setIdentity2Value(e.target.value)} placeholder={`Enter ${identity2Label || "second identity"}`} className={inputClass} autoComplete="off" />
              </div>
            )}

            {/* Company: corporate events only (or when chosen for the card); never required */}
            {has("company") && (
              <div>
                <label htmlFor="ai-company" className={labelClass}>
                  Company Name <span className="text-[#828282] font-normal text-xs ml-1">(optional)</span>
                </label>
                <input
                  id="ai-company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className={inputClass}
                  autoComplete="off"
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div role="alert" aria-live="assertive" className="px-3.5 py-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={closeModal}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium border border-[#E0E0E0] text-gray-700 rounded-md hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium bg-[#FF651D] hover:bg-[#E5520F] text-white rounded-md transition-colors cursor-pointer disabled:opacity-60 min-w-[80px]"
            >
              {submitting ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Adding...
                </span>
              ) : (
                "Add Invitee"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
