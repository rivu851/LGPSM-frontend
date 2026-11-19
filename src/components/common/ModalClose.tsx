import React from "react";

/** The close icon at the top right corner of a window. It replaces Cancel / Close buttons; the parent window must be `relative`. */
export default function ModalClose({ onClick, disabled = false, label = "Close" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="absolute right-3 top-3 z-10 size-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
    </button>
  );
}
