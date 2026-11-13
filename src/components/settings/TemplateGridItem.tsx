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
    <div className="group relative bg-white rounded-lg overflow-hidden" title={[template.name, categoryLabel].filter(Boolean).join(" — ")}>
      <div className="relative">
        <TemplateThumb imageKey={template.imageKey} name={template.name} className="aspect-[2/3]!" />
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(template)}
            aria-label={`Edit template ${template.name}`}
            className="absolute top-2 right-2 p-1.5 bg-white/85 text-gray-800 rounded-md hover:bg-white shadow-sm transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
        <span
          className={`absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
            isPublished ? "bg-[#C65318] text-white" : "bg-white/95 text-gray-800 border border-gray-200"
          }`}
        >
          {template.status}
        </span>
      </div>
      {/* The Figma grid shows just the card and its status; the name and category are in the hover title and the edit form */}
      <span className="sr-only">{template.name}{categoryLabel ? `, ${categoryLabel}` : ""}</span>
    </div>
  );
}
