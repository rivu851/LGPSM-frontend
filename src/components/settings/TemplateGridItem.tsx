"use client";

import React from "react";
import { TemplateItem } from "@/types/settings";
import TemplateThumb from "./TemplateThumb";

interface TemplateGridItemProps {
  template: TemplateItem;
  categoryLabel?: string;
  onEdit?: (template: TemplateItem) => void;
}

export default function TemplateGridItem({ template, categoryLabel, onEdit }: TemplateGridItemProps) {
  const isPublished = template.status === "Published";
  return (
    <div className="group relative bg-white border border-[#E0E0E0] rounded-md overflow-hidden">
      <div className="relative">
        <TemplateThumb imageKey={template.imageKey} name={template.name} />
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(template)}
            aria-label={`Edit template ${template.name}`}
            className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-md hover:bg-black/70 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
        <span
          className={`absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
            isPublished ? "bg-[#FF651D] text-white" : "bg-white/95 text-gray-800 border border-gray-200"
          }`}
        >
          {template.status}
        </span>
      </div>
      <div className="px-2.5 py-2">
        <p className="text-sm font-medium text-gray-900 truncate" title={template.name}>{template.name}</p>
        {categoryLabel && <p className="text-xs text-[#828282] truncate">{categoryLabel}</p>}
      </div>
    </div>
  );
}
