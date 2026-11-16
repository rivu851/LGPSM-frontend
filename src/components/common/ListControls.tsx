import React from "react";
import Icon from "@/components/icons/Icon";

interface ListControlsProps {
  label: string;
  searchId: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  /** Right-hand actions (e.g. the page's orange Add button) */
  children?: React.ReactNode;
}

// The list-page control row used across the Admin and Organiser frames (e.g. 450:6796, 462:10218, 217:22602):
// 17px label, 47px #FAFAFA search with the Figma search icon, then the page's actions.
export default function ListControls({ label, searchId, placeholder, value, onChange, children }: ListControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
      <div className="flex flex-1 items-center gap-2.5 min-w-0">
        <label htmlFor={searchId} className="text-[17px] font-medium text-black shrink-0">{label}</label>
        <div className="relative flex-1 min-w-0">
          <Icon name="events/search" width={18} height={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60" />
          <input
            id={searchId}
            type="search"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-[47px] pl-12 pr-4 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs font-medium text-gray-900 placeholder:text-[#6B6B6B] focus:outline-none focus:border-black"
          />
        </div>
      </div>
      {children && <div className="flex items-center gap-3 shrink-0 w-fit">{children}</div>}
    </div>
  );
}

/** The orange "+ Add …" action from the same frames: 16px semibold, 24px icon, 11px x 24px padding. */
export const addButtonClass = "inline-flex items-center gap-2 px-6 py-[11px] bg-[#C65318] hover:bg-[#A83800] text-white text-base font-semibold rounded-lg";
