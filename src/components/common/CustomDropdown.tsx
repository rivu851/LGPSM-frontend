"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { createPortal } from "react-dom";

export interface CustomDropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  /** Shows a delete button on this row (the organizer's own custom entries) */
  onRemove?: () => void;
  removeLabel?: string;
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
  /** "plain" is the borderless toolbar picker from the Figma list pages (e.g. 217:21076): grey 12px text and a small caret */
  variant?: "field" | "plain";
  /** Replaces the default chevron (e.g. the Figma "down" caret on the Reports toolbar) */
  caret?: React.ReactNode;
  /** "ink" keeps a plain picker black instead of grey (Reports toolbar) */
  plainTone?: "muted" | "ink";
  /** Smaller text for the compact filter drawer (Figma 217:22781) */
  compact?: boolean;
  /** Render the menu in the document layer so cards with overflow clipping cannot cut it off. */
  portal?: boolean;
  portalPlacement?: "auto" | "top" | "bottom";
}

export default function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "- Select -",
  topAction,
  disabled = false,
  className = "",
  caret,
  plainTone = "muted",
  invalid = false,
  emptyMessage = "No options available",
  ariaLabel,
  variant = "field",
  compact = false,
  portal = false,
  portalPlacement = "auto",
}: CustomDropdownProps) {
  const plain = variant === "plain";
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [portalPosition, setPortalPosition] = useState<React.CSSProperties | null>(null);
  const listId = useId();

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
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

  useEffect(() => {
    if (!isOpen || !portal) return;
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const desiredHeight = Math.min(224, Math.max(48, options.length * 42 + (topAction ? 48 : 0) + 8));
      const below = Math.max(0, window.innerHeight - rect.bottom - 8);
      const above = Math.max(0, rect.top - 8);
      const openAbove = portalPlacement === "top" || (portalPlacement === "auto" && below < Math.min(desiredHeight, 120) && above > below);
      // a ceiling, not an estimate: options that wrap onto two lines are taller than the 42px assumed above, so the list sizes to its
      // content up to this height and scrolls beyond it
      const maxHeight = Math.max(48, Math.min(320, openAbove ? above : below));
      setPortalPosition({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        top: openAbove ? undefined : rect.bottom + 6,
        bottom: openAbove ? window.innerHeight - rect.top + 6 : undefined,
        maxHeight,
        zIndex: 10000,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, options.length, portal, portalPlacement, topAction]);

  return (
    <div ref={containerRef} className={`relative text-left ${plain ? "w-auto max-w-[220px]" : "w-full"} ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        onClick={() => setIsOpen(!isOpen)}
        className={`${plain ? "h-[47px] px-4 text-xs font-medium rounded-md border border-transparent hover:text-[#15191C] gap-3" : `w-full ${compact ? "min-h-[47px] px-4 text-xs font-medium" : "min-h-[44px] px-3.5 py-2.5 text-sm"} rounded-md border gap-2`} transition-colors flex items-center justify-between cursor-pointer select-none ${
          plain
            ? `bg-transparent ${isOpen || plainTone === "ink" ? "text-[#15191C]" : "text-[#6B6B6B]"}`
            : disabled
            ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed"
            : invalid
              ? "bg-[#FAFAFA] border-rose-400 text-gray-800"
              : isOpen
                ? "bg-white border-[#FF651D] text-gray-800"
                : "bg-[#FAFAFA] border-[#E0E0E0] hover:border-[#FF651D] text-gray-700"
        }`}
      >
        <span className={`inline-flex items-center gap-2 min-w-0 ${plain ? "" : selectedOption && value !== "" ? "text-gray-900" : "text-gray-500"}`}>
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        {caret ? (
          <span className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}>{caret}</span>
        ) : (
          <svg className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && !disabled && (() => {
        const menu = (
        <div ref={menuRef} style={portal ? portalPosition || { position: "fixed", visibility: "hidden", zIndex: 10000 } : undefined} className={`${portal ? "fixed flex flex-col" : "absolute top-full mt-1.5 z-50"} bg-white border border-gray-200 rounded-md shadow-xl overflow-hidden animate-dropdown ${plain ? "right-0 w-max min-w-[180px] max-w-[300px]" : portal ? "" : "left-0 right-0"}`}>
          {topAction && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                topAction.onClick();
              }}
              className="w-full text-left px-3.5 py-2.5 bg-[#FFF3EC] hover:bg-[#FFE3D7] text-[#A83800] font-medium text-sm flex items-center gap-2 cursor-pointer border-b border-[#FFE3D7]"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{topAction.label}</span>
            </button>
          )}
          <div id={listId} role="listbox" className={`${portal ? "min-h-0" : "max-h-56"} overflow-y-auto pt-1 pb-2`}>
            {options.length === 0 ? (
              <div className="px-3.5 py-3 text-sm text-gray-500 text-center">{emptyMessage}</div>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                const row = (
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
                      isSelected ? "bg-orange-50 text-[#C44200] font-medium" : "text-gray-700 hover:text-[#A83800]"
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
                if (!opt.onRemove) return row;
                return (
                  <div key={opt.value} className="flex items-center pr-2">
                    <div className="min-w-0 flex-1">{row}</div>
                    <button
                      type="button"
                      aria-label={opt.removeLabel || `Delete ${opt.label}`}
                      title={opt.removeLabel || `Delete ${opt.label}`}
                      onClick={() => {
                        setIsOpen(false);
                        opt.onRemove?.();
                      }}
                      className="shrink-0 flex size-7 items-center justify-center rounded-md text-gray-500 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                    >
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5h6v2m-8 0l1 12h8l1-12" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
        );
        return portal && typeof document !== "undefined" ? createPortal(menu, document.body) : menu;
      })()}
    </div>
  );
}
