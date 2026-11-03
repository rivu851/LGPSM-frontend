"use client";

import React, { useState } from "react";
import CustomDropdown from "@/components/common/CustomDropdown";
import { credentialService, ReasonCategory } from "@/services/credentialService";
import { NOTE_MAX, reasonLabel, reasonsFor, validatePassForm } from "@/utils/credentialUi";

interface PassActionModalProps {
  action: "REVOKE" | "REPLACE";
  invitee: { _id: string; name: string; credentialRevocation?: { category?: string } | null; credentialStatus?: string };
  /** where the guest will be told, e.g. "email and WhatsApp" (from the server's channel plan when known) */
  needsReview?: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}

// Confirmation dialog for Revoke / Replace Access Pass, modelled on the "Deactivate Organizer" popup (Figma 708:5446):
// title + close, Reason* select, a message box, Cancel / orange action. Replacing always tells the guest; there is no silent option.
export default function PassActionModal({ action, invitee, needsReview, onClose, onDone }: PassActionModalProps) {
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const revoke = action === "REVOKE";
  const errors = validatePassForm(action, { category, note });
  const blocked = Object.keys(errors).length > 0 || (needsReview && !reviewed);

  const submit = async () => {
    setTouched(true);
    if (blocked) return;
    setBusy(true);
    setError(null);
    try {
      const body = { category: category as ReasonCategory, note: note.trim() || undefined, ...(needsReview ? { reviewConfirmed: true } : {}) };
      const res = revoke ? await credentialService.revoke(invitee._id, body) : await credentialService.replace(invitee._id, body);
      if (res.success) onDone(revoke ? `${invitee.name}'s access pass was revoked. They are being told.` : `${invitee.name} has a new access pass. It is being sent to them and the old pass no longer works.`);
      else setError(res.message || "That did not work.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="pass-action-title">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-[490px] overflow-y-auto max-h-[calc(100dvh-2rem)]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E5E5]">
          <h2 id="pass-action-title" className="text-base font-medium text-[#15191C]">{revoke ? "Revoke Access Pass" : "Replace Access Pass"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[#15191C] cursor-pointer">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-[#4B4F52]">
            {revoke
              ? <><strong className="font-medium text-[#15191C]">{invitee.name}</strong>&rsquo;s QR pass stops working immediately. They will be told through the same channel(s) their invitation was sent on. Their RSVP is not changed.</>
              : <>A new QR pass is issued to <strong className="font-medium text-[#15191C]">{invitee.name}</strong> and sent to them. Their current pass stops working immediately. Their RSVP is not changed.</>}
          </p>

          {needsReview && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
              <p>This pass was revoked for <strong className="font-medium">{reasonLabel(invitee.credentialRevocation?.category)}</strong>, which needs a review before a new pass is issued.</p>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-0.5 size-4 check-orange" />
                <span>I have reviewed why this pass was revoked and the guest may have a new one.</span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#15191C] mb-1.5">Reason<span className="text-[#FF651D]">*</span></label>
            <CustomDropdown
              value={category}
              onChange={setCategory}
              options={reasonsFor(action).map((r) => ({ value: r.value, label: r.label }))}
              placeholder="Select a reason"
              ariaLabel="Reason"
              invalid={touched && !!errors.category}
              portal
            />
            {touched && errors.category && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.category}</p>}
          </div>

          <div>
            <label htmlFor="pass-note" className="block text-sm font-medium text-[#15191C] mb-1.5">
              Explanation{category === "OTHER" ? <span className="text-[#FF651D]">*</span> : <span className="font-normal text-[#828282]"> (optional)</span>}
            </label>
            <textarea
              id="pass-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              rows={4}
              placeholder="Type"
              className={`w-full px-3 py-2 bg-[#FAFAFA] border rounded-md text-sm focus:outline-none focus:border-[#FF651D] resize-none ${touched && errors.note ? "border-rose-400" : "border-[#E0E0E0]"}`}
            />
            <div className="flex justify-between text-xs">
              <span role="alert" className="text-rose-600">{touched ? errors.note : ""}</span>
              <span className="text-[#828282]">{note.length}/{NOTE_MAX} · kept in the pass history, not sent to the guest</span>
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E5E5E5]">
          <button type="button" onClick={onClose} disabled={busy} className="px-6 py-2.5 bg-white border border-[#DDD] rounded-md text-base font-semibold text-black cursor-pointer disabled:opacity-50">Cancel</button>
          <button type="button" onClick={submit} disabled={busy || (touched && !!blocked)} className="px-6 py-2.5 bg-[#FF651D] hover:bg-[#E5520F] rounded-md text-base font-semibold text-white cursor-pointer disabled:opacity-50">
            {busy ? (revoke ? "Revoking…" : "Replacing…") : revoke ? "Revoke" : "Replace"}
          </button>
        </div>
      </div>
    </div>
  );
}
