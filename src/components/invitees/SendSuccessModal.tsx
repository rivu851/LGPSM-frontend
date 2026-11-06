"use client";

import React from "react";
import SuccessAnimation from "./SuccessAnimation";

interface Props {
  title: string;
  message: string;
  details?: string[];
  onClose: () => void;
}

/** Confirms that invitations went out (shown after Send / Resend when at least one guest was reached). */
export default function SendSuccessModal({ title, message, details = [], onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="send-success-title">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-2xl px-6 pt-4 pb-7 text-center">
        <SuccessAnimation size={128} />
        <h2 id="send-success-title" className="text-lg font-semibold text-[#15191C]">{title}</h2>
        <p className="mt-2 text-sm text-[#4B4F52]">{message}</p>
        {details.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-[#828282]">
            {details.map((d) => <li key={d}>{d}</li>)}
          </ul>
        )}
        <button type="button" onClick={onClose} autoFocus className="mt-6 w-full px-6 py-2.5 bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-semibold rounded-lg cursor-pointer">Okay</button>
      </div>
    </div>
  );
}
