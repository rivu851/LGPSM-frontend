"use client";

import { createPortal } from "react-dom";
import AlertIcon from "@/components/common/AlertIcon";
import React, { useState } from "react";
import PopupMessage from "@/components/common/PopupMessage";
import ModalClose from "@/components/common/ModalClose";

interface Props {
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
  error?: string | null;
}

/** Shown when "Additional Information" is changed after the Excel sample was downloaded: the uploaded lists no longer match. */
export default function ListResetWarningModal({ onCancel, onConfirm, busy = false, error }: Props) {
  const [read, setRead] = useState(false);
  // drawn on the page itself (not inside the form's layout), so the dim layer and the window cover the whole screen
  return typeof document === "undefined" ? null : createPortal(
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="list-reset-title" aria-describedby="list-reset-text">
      <div className="w-full max-w-md bg-white rounded-lg shadow-2xl relative">
        <ModalClose onClick={onCancel} disabled={busy} />
        <div className="px-6 pt-6 pb-4 text-center">
          <AlertIcon kind="warning" className="w-14 h-14 mx-auto mb-3" />
          <h2 id="list-reset-title" className="text-base font-semibold text-[#15191C]">Change additional information?</h2>
          <p id="list-reset-text" className="mt-2 text-sm text-[#4B4F52]">
            All invitee lists you uploaded will be deleted and you must download the excel sample again to update additional information on your invitee list.
          </p>
          <label className="mt-4 inline-flex items-center gap-2.5 text-sm font-medium text-[#15191C] cursor-pointer">
            <span className="relative size-4 shrink-0">
              <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} className="peer size-4 appearance-none rounded border border-gray-400 bg-white checked:border-[#15803D] checked:bg-[#15803D] cursor-pointer" />
              <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none absolute inset-0 size-4 text-white opacity-0 peer-checked:opacity-100"><path d="m3.5 8 3 3 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            Yes, I have read this
          </label>
          <PopupMessage message={error} />
        </div>
        <div className="px-6 py-4 border-t border-[#E0E0E0] flex justify-end gap-3">
          <button type="button" onClick={onConfirm} disabled={!read || busy} className="px-6 py-2 text-sm font-semibold bg-[#1F65FF] hover:bg-[#1A56DB] text-white rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">{busy ? "Deleting…" : "Okay"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
