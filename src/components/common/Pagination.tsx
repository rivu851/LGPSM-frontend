"use client";

import React from "react";
import { pageWindow } from "@/utils/pagination.mjs";

// Page buttons under a list (Figma list pages: 32px squares, the current page outlined in orange). Hidden when everything fits on one page.
export default function Pagination({ page, totalPages, onChange, label = "Pages" }: { page: number; totalPages: number; onChange: (page: number) => void; label?: string }) {
  if (totalPages <= 1) return null;
  const btn = "w-8 h-8 rounded border flex items-center justify-center text-xs cursor-pointer disabled:cursor-not-allowed";
  return (
    <nav aria-label={label} className="flex items-center gap-1">
      <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className={`${btn} border-gray-200 text-gray-600 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500`}>&lt;</button>
      {pageWindow(page, totalPages).map((p, i) =>
        p === "..." ? (
          <span key={`gap-${i}`} className="px-1 text-gray-500" aria-hidden>…</span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? "page" : undefined}
            onClick={() => onChange(p)}
            className={`${btn} ${p === page ? "border-[#FF651D] text-[#C44200] font-bold" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {p}
          </button>
        )
      )}
      <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={`${btn} border-gray-200 text-gray-600 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500`}>&gt;</button>
    </nav>
  );
}
