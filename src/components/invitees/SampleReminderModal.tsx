"use client";

import React from "react";
import { useOverlayClose } from "@/hooks/useOverlayClose";
import ModalClose from "@/components/common/ModalClose";

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
      <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4 overflow-y-auto max-h-[calc(100dvh-2rem)] relative">
        <ModalClose onClick={onCancel} />
        <h2 id="sample-reminder-title" className="pr-8 text-lg font-semibold text-[#15191C]" >Use this event&apos;s Excel sample</h2>
        <p className="text-sm text-[#4B4F52]">
          The columns depend on this event&apos;s settings, so the file must use exactly these headings. Download the sample, fill it in, then upload it. A file with different columns will be refused.
        </p>
        <div className="flex flex-wrap gap-1.5" aria-label="Columns this event expects">
          {columns.map((c) => <span key={c} className="px-2.5 py-1 rounded-full bg-[#F4F5F8] border border-[#E0E0E0] text-xs font-medium text-[#15191C]">{c}</span>)}
        </div>
        {/* the three buttons always in one row */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button type="button" onClick={onDownload} className="px-2 py-2 whitespace-nowrap text-center border border-[#FF651D] rounded-md text-[13px] font-medium text-[#C44200] hover:bg-[#D6F5E1] hover:text-[#0F7A33] cursor-pointer">Download sample</button>
          <button type="button" onClick={onContinue} className="px-2 py-2 whitespace-nowrap text-center bg-[#C65318] hover:bg-[#A83800] rounded-md text-[13px] font-medium text-white cursor-pointer">I have it, choose file</button>
        </div>
      </div>
    </div>
  );
}
