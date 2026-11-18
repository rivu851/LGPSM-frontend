"use client";

import { createPortal } from "react-dom";
import AlertIcon from "@/components/common/AlertIcon";
import React, { useEffect } from "react";
import ModalClose from "@/components/common/ModalClose";

interface Choice { label: string; onClick: () => void }

/** A message with two ways forward (and the close icon): used when a problem can be fixed in either of two places. */
export default function ChoiceModal({ title, message, first, second, onClose }: { title: string; message: string; first: Choice; second: Choice; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  // drawn on the page itself (not inside the form's layout), so the dim layer and the window cover the whole screen
  return typeof document === "undefined" ? null : createPortal(
    <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans" role="alertdialog" aria-modal="true" aria-labelledby="choice-title" aria-describedby="choice-text">
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xl max-w-md w-full p-6 text-center space-y-4 relative">
        <ModalClose onClick={onClose} />
        <AlertIcon kind="warning" />
        <h3 id="choice-title" className="text-base font-bold text-gray-900">{title}</h3>
        <p id="choice-text" className="text-xs text-gray-600 leading-relaxed font-medium px-2">{message}</p>
        <div className="pt-1 grid grid-cols-1 gap-3">
          <button type="button" onClick={first.onClick} className="py-2.5 px-3 font-bold text-xs rounded-md border border-[#C65318] text-[#C44200] hover:bg-[#EEF3FF] cursor-pointer">{first.label}</button>
          <button type="button" onClick={second.onClick} className="py-2.5 px-3 font-bold text-xs rounded-md bg-[#C65318] hover:bg-[#A83800] text-white cursor-pointer">{second.label}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
