"use client";

import React, { useState, useRef, useEffect, useId } from "react";

export interface CustomDropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface CustomDropdownAction {
  label: string;
  onClick: () => void;
}

interface CustomDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: CustomDropdownOption[];
  placeholder?: string;
  // Rendered as the first row of the open list (e.g. "Add New Category")
  topAction?: CustomDropdownAction;
  disabled?: boolean;
  className?: string;
  invalid?: boolean;
  emptyMessage?: string;
  ariaLabel?: string;
}

export default function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "- Select -",
  topAction,
  disabled = false,
  className = "",
  invalid = false,
  emptyMessage = "No options available",
  ariaLabel,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative w-full text-left ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-md border transition-colors flex items-center justify-between gap-2 cursor-pointer select-none ${
          disabled
            ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
            : invalid
              ? "bg-[#FAFAFA] border-rose-400 text-gray-800"
              : isOpen
                ? "bg-white border-[#FF651D] text-gray-800"
                : "bg-[#FAFAFA] border-[#E0E0E0] hover:border-[#FF651D] text-gray-700"
        }`}
      >
        <span className={`inline-flex items-center gap-2 min-w-0 ${selectedOption ? "text-gray-900" : "text-gray-400"}`}>
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <svg className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-md shadow-xl overflow-hidden z-50 animate-dropdown">
          {topAction && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                topAction.onClick();
              }}
              className="w-full text-left px-3.5 py-2.5 bg-[#FFF3EC] hover:bg-[#FFE3D7] text-[#E5520F] font-medium text-sm flex items-center gap-2 cursor-pointer border-b border-[#FFE3D7]"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{topAction.label}</span>
            </button>
          )}
          <div id={listId} role="listbox" className="max-h-56 overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3.5 py-3 text-sm text-gray-400 text-center">{emptyMessage}</div>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected ? "bg-orange-50 text-[#E5520F] font-medium" : "text-gray-700 hover:text-[#E5520F]"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <span className="break-words">{opt.label}</span>
                    </span>
                    {isSelected && (
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
