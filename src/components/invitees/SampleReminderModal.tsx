"use client";

import React from "react";
import { useOverlayClose } from "@/hooks/useOverlayClose";

interface Props {
  /** This event's Excel columns, in order */
  columns: string[];
  onDownload: () => void;
  /** Carry on to choosing the file */
  onContinue: () => void;
  onCancel: () => void;
}

// Asked before a file is chosen: the columns are specific to this event, so the sample should be the starting point.
export default function SampleReminderModal({ columns, onDownload, onContinue, onCancel }: Props) {
  const overlayClose = useOverlayClose(onCancel);
  return (
    <div className="fixed inset-0 z-[65] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="sample-reminder-title" {...overlayClose}>
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl space-y-4 overflow-y-auto max-h-[calc(100dvh-2rem)]">
        <h2 id="sample-reminder-title" className="text-lg font-semibold text-[#15191C]">Use this event&apos;s Excel sample</h2>
        <p className="text-sm text-[#4B4F52]">
          The columns depend on this event&apos;s settings, so the file must use exactly these headings. Download the sample, fill it in, then upload it. A file with different columns will be refused.
        </p>
        <div className="flex flex-wrap gap-1.5" aria-label="Columns this event expects">
          {columns.map((c) => <span key={c} className="px-2.5 py-1 rounded-full bg-[#F4F5F8] border border-[#E0E0E0] text-xs font-medium text-[#15191C]">{c}</span>)}
        </div>
        <div className="flex flex-wrap justify-end gap-2.5 pt-1">
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-[#E0E0E0] rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">Cancel</button>
          <button type="button" onClick={onDownload} className="px-4 py-2 border border-[#FF651D] rounded-md text-sm font-medium text-[#E5520F] hover:bg-orange-50 cursor-pointer">Download sample</button>
          <button type="button" onClick={onContinue} className="px-4 py-2 bg-[#FF651D] hover:bg-[#E5520F] rounded-md text-sm font-medium text-white cursor-pointer">I have it, choose file</button>
        </div>
      </div>
    </div>
  );
}
