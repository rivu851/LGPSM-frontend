"use client";

import React, { useState } from "react";

interface Props {
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
  error?: string | null;
}

/** Shown when "Additional Information" is changed after the Excel sample was downloaded: the uploaded lists no longer match. */
export default function ListResetWarningModal({ onCancel, onConfirm, busy = false, error }: Props) {
  const [read, setRead] = useState(false);
  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="list-reset-title" aria-describedby="list-reset-text">
      <div className="w-full max-w-md bg-white rounded-lg shadow-2xl">
        <div className="px-6 pt-6 pb-4 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700" aria-hidden>
            <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
          </span>
          <h2 id="list-reset-title" className="text-base font-semibold text-[#15191C]">Change additional information?</h2>
          <p id="list-reset-text" className="mt-2 text-sm text-[#4B4F52]">
            All invitee lists you uploaded will be deleted and you must download the excel sample again to update additional information on your invitee list.
          </p>
          <label className="mt-4 inline-flex items-center gap-2.5 text-sm font-medium text-[#15191C] cursor-pointer">
            <span className="relative size-4 shrink-0">
              <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} className="peer size-4 appearance-none rounded border border-gray-400 bg-white checked:border-[#FF651D] checked:bg-[#FF651D] cursor-pointer" />
              <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none absolute inset-0 size-4 text-white opacity-0 peer-checked:opacity-100"><path d="m3.5 8 3 3 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            Yes, I have read this
          </label>
          {error && <p role="alert" className="mt-3 rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-[#E0E0E0] flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="px-5 py-2 text-sm font-semibold border border-[#E0E0E0] rounded-lg text-[#15191C] hover:bg-gray-50 cursor-pointer disabled:opacity-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={!read || busy} className="px-6 py-2 text-sm font-semibold bg-[#C65318] hover:bg-[#A83800] text-white rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">{busy ? "Deleting…" : "Okay"}</button>
        </div>
      </div>
    </div>
  );
}
