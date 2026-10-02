"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SelectedTemplate } from "./eventDraft";
import { formatDateTime } from "@/utils/dateTime";
import { resolveImageUrl } from "@/utils/mediaUrl";
import CustomDropdown from "@/components/common/CustomDropdown";

interface MobileCardPreviewProps {
  template: SelectedTemplate | null;
  eventTitle: string;
  eventStart: string;
  venue: string;
  logoKey: string | null;
  categoryName: string;
  subcategoryName: string;
  onOpenTemplateModal: () => void;
}

const ZOOM_SCALE: Record<string, number> = { "100%": 1, "75%": 0.75, "50%": 0.5 };

// Live invitation preview built only from what is in the form: the chosen template image, the
// event logo, and the entered title, date, venue and category.
export default function MobileCardPreview({
  template,
  eventTitle,
  eventStart,
  venue,
  logoKey,
  categoryName,
  subcategoryName,
  onOpenTemplateModal,
}: MobileCardPreviewProps) {
  const [zoomLevel, setZoomLevel] = useState("100%");
  const templateUrl = resolveImageUrl(template?.previewKey);
  const logoUrl = resolveImageUrl(logoKey);
  const categoryLine = [categoryName, subcategoryName].filter(Boolean).join(" · ");

  return (
    <div className="h-full bg-[#F7F3F0] p-4 sm:p-6 flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-4">
        <span className="text-xs font-medium px-3 py-1 bg-white border border-[#E0E0E0] rounded-md text-gray-800">Preview</span>
        <div className="w-28">
          <CustomDropdown
            value={zoomLevel}
            onChange={setZoomLevel}
            options={Object.keys(ZOOM_SCALE).map((z) => ({ value: z, label: z }))}
            ariaLabel="Preview zoom"
          />
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div
          className="relative w-[230px] sm:w-[250px] aspect-[9/18.5] bg-[#1E2A33] rounded-[38px] p-2 shadow-xl origin-top transition-transform"
          style={{ transform: `scale(${ZOOM_SCALE[zoomLevel] ?? 1})` }}
          aria-label="Invitation card preview"
        >
          <div className="relative w-full h-full rounded-[30px] overflow-hidden bg-[#D9D9D9]">
            {templateUrl && <Image src={templateUrl} alt={template?.name || "Template"} fill unoptimized sizes="250px" className="object-cover" />}
            <div className="absolute inset-x-3 bottom-3 rounded-xl bg-white/90 p-3 text-center space-y-1">
              {logoUrl && (
                <div className="relative mx-auto h-8 w-24">
                  <Image src={logoUrl} alt="Event logo" fill unoptimized sizes="96px" className="object-contain" />
                </div>
              )}
              {categoryLine && <p className="text-[10px] font-medium uppercase tracking-wider text-[#E5520F] truncate">{categoryLine}</p>}
              <p className="text-sm font-semibold text-gray-900 leading-tight break-words line-clamp-2">{eventTitle.trim() || "Your event title"}</p>
              <p className="text-[11px] text-[#4B4F52]">{formatDateTime(eventStart, "Date to be set")}</p>
              {venue.trim() && <p className="text-[10px] text-[#828282] break-words line-clamp-2">{venue}</p>}
            </div>
            {!templateUrl && (
              <p className="absolute top-1/3 inset-x-4 text-center text-xs text-[#4B4F52]">
                {template ? "This template has no preview image" : "Choose a template to see your card"}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenTemplateModal}
          className="mt-5 px-4 py-2 bg-white hover:bg-gray-50 border border-[#E0E0E0] text-gray-900 text-sm font-medium rounded-md shadow-xs cursor-pointer"
        >
          {template ? "Change Template" : "Select Template"}
        </button>
        {template && <p className="mt-2 text-xs text-[#4B4F52] text-center break-words">Template: {template.name}</p>}
        <p className="text-xs text-[#4B4F52] mt-3 text-center">
          Looking for custom card design?{" "}
          <Link href="/contact" className="text-[#16A34A] font-medium underline">
            Contact us
          </Link>
        </p>
      </div>
    </div>
  );
}
