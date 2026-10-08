"use client";

import React, { useEffect, useRef, useState } from "react";
import { DraftErrors, EventDraft } from "./eventDraft";
import { formatDateTime } from "@/utils/dateTime";
import CategoryFields from "@/components/categories/CategoryFields";
import ImageUploadField from "@/components/common/ImageUploadField";
import { CategoriesApi } from "@/hooks/useCategories";
import { userService } from "@/services/userService";
import { UserData } from "@/services/tokenStorage";

export type EventDateField = "start" | "end" | "rsvpDeadline";

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 500;

interface Step1EventDetailsProps {
  draft: EventDraft;
  onChange: (patch: Partial<EventDraft>) => void;
  onOpenDatePicker: (field: EventDateField) => void;
  categories: CategoriesApi;
  canManageCategories: boolean;
  isAdmin?: boolean;
  // Admin event settings: RSVP can be switched off platform-wide
  rsvpAllowed: boolean;
  errors: DraftErrors;
  onNext: () => void;
  onCancel: () => void;
}

const labelClass = "text-sm font-medium text-gray-900";
const inputClass = "w-full px-3.5 py-2.5 bg-[#FAFAFA] border rounded-md text-sm text-gray-900 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D]";
const border = (err?: string) => (err ? "border-rose-400" : "border-[#E0E0E0]");
const Err = ({ msg }: { msg?: string }) => (msg ? <p className="mt-1 text-xs font-medium text-rose-600">{msg}</p> : null);
const Req = () => <span className="text-[#FF651D] ml-0.5">*</span>;

function OrganizerSelectField({
  selectedIds,
  onChange,
  error,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  const [organizers, setOrganizers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    userService.getUsers("ORGANIZER").then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setOrganizers(res.data);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = organizers.filter(
    (o) =>
      o.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      o.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onChange(organizers.map((o) => o._id));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label className={labelClass}>
          Select Organizer(s)<Req />
        </label>
        {selectedIds.length > 0 && (
          <span className="text-xs text-[#FF651D] font-semibold">
            {selectedIds.length} organizer{selectedIds.length > 1 ? "s" : ""} selected
          </span>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full min-h-[44px] px-3.5 py-2 bg-[#FAFAFA] border rounded-md text-sm text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
            error ? "border-rose-400" : "border-[#E0E0E0] focus:border-[#FF651D]"
          }`}
        >
          {selectedIds.length === 0 ? (
            <span className="text-[#828282]">
              {loading ? "Loading organizers..." : "Select for which organizer(s) this event will be created"}
            </span>
          ) : (
            <div className="flex flex-wrap gap-1.5 py-0.5">
              {selectedIds.map((id) => {
                const org = organizers.find((o) => o._id === id);
                const name = org ? org.fullName || org.email : id;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FF651D]/10 text-[#C44200] border border-[#FF651D]/20"
                  >
                    <span>{name}</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(id);
                      }}
                      className="hover:text-rose-700 cursor-pointer font-bold ml-0.5"
                    >
                      ×
                    </span>
                  </span>
                );
              })}
            </div>
          )}
          <svg className="w-4 h-4 text-gray-500 shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={isOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-30 mt-1.5 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-2 px-1 text-sm max-h-64 overflow-y-auto">
            <div className="px-2 pb-2 mb-1 border-b border-gray-100 flex items-center justify-between gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search organizer by name or email..."
                className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-[#FF651D]"
              />
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] font-semibold text-[#FF651D] hover:underline px-1 py-0.5"
                >
                  All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] font-semibold text-gray-500 hover:underline px-1 py-0.5"
                >
                  Clear
                </button>
              </div>
            </div>

            {loading ? (
              <p className="p-3 text-xs text-gray-500 text-center">Loading list of organizers...</p>
            ) : filtered.length === 0 ? (
              <p className="p-3 text-xs text-gray-500 text-center">No matching organizers found</p>
            ) : (
              filtered.map((org) => {
                const isSelected = selectedIds.includes(org._id);
                return (
                  <div
                    key={org._id}
                    onClick={() => toggleSelect(org._id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors ${
                      isSelected ? "bg-orange-50/70 text-gray-900 font-medium" : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-gray-300 accent-[#FF651D] cursor-pointer"
                      />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-gray-900 truncate">{org.fullName}</div>
                        <div className="text-[11px] text-gray-500 truncate">{org.email}</div>
                      </div>
                    </div>
                    {isSelected && <span className="text-[#FF651D] text-xs font-bold shrink-0 ml-2">✓</span>}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <Err msg={error} />
    </div>
  );
}

function DateButton({ label, value, placeholder, onClick, error }: { label: string; value: string | null; placeholder: string; onClick: () => void; error?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-invalid={!!error}
      className={`${inputClass} ${border(error)} flex items-center justify-between gap-2 text-left cursor-pointer`}
    >
      <span className={value ? "text-gray-900" : "text-[#828282]"}>{formatDateTime(value, placeholder)}</span>
      <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </button>
  );
}

// Controlled step: all values live in the wizard draft owned by the page
export default function Step1EventDetails({ draft, onChange, onOpenDatePicker, categories, canManageCategories, isAdmin, rsvpAllowed, errors, onNext, onCancel }: Step1EventDetailsProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
      noValidate
      className="p-4 sm:p-6 space-y-5"
    >
      {isAdmin && (
        <OrganizerSelectField
          selectedIds={draft.organizerIds}
          onChange={(organizerIds) => onChange({ organizerIds })}
          error={errors.organizerIds}
        />
      )}
      <div>
        <div className="flex justify-between items-center mb-1.5 gap-2">
          <label htmlFor="event-title" className={labelClass}>Title<Req /></label>
          <span className="text-xs text-[#828282]">{TITLE_MAX - draft.title.length} Chars remaining</span>
        </div>
        <input
          id="event-title"
          type="text"
          value={draft.title}
          maxLength={TITLE_MAX}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Product Launch Event 2026"
          aria-invalid={!!errors.title}
          className={`${inputClass} ${border(errors.title)}`}
        />
        <Err msg={errors.title} />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5 gap-2">
          <label htmlFor="event-description" className={labelClass}>Description<Req /></label>
          <span className="text-xs text-[#828282]">{DESCRIPTION_MAX - draft.description.length} Chars remaining</span>
        </div>
        <textarea
          id="event-description"
          rows={3}
          value={draft.description}
          maxLength={DESCRIPTION_MAX}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Eg: Join us for an unforgettable event filled with celebration, connection, and memorable moments."
          aria-invalid={!!errors.description}
          className={`${inputClass} ${border(errors.description)} leading-relaxed`}
        />
        <Err msg={errors.description} />
      </div>

      <CategoryFields
        api={categories}
        categoryId={draft.categoryId}
        subcategoryId={draft.subcategoryId}
        onChange={({ categoryId, subcategoryId }) => onChange({ categoryId, subcategoryId })}
        canManage={canManageCategories}
        required
        categoryLabel="Event Category"
        subcategoryLabel="Event Subcategory"
        categoryError={errors.categoryId}
        subcategoryError={errors.subcategoryId}
        labelClassName={`block ${labelClass} mb-1.5`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span className={`block ${labelClass} mb-1.5`}>Event Start Date Time<Req /></span>
          <DateButton label="Event start date and time" value={draft.start} placeholder="Select start date and time" onClick={() => onOpenDatePicker("start")} error={errors.start} />
          <Err msg={errors.start} />
        </div>
        <div>
          <span className={`block ${labelClass} mb-1.5`}>Event End Date Time<Req /></span>
          <DateButton label="Event end date and time" value={draft.end} placeholder="Select end date and time" onClick={() => onOpenDatePicker("end")} error={errors.end} />
          <Err msg={errors.end} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="event-contact" className={`block ${labelClass} mb-1.5`}>Contact Number<Req /></label>
          <div className={`flex items-center bg-[#FAFAFA] border rounded-md overflow-hidden focus-within:border-[#FF651D] ${border(errors.contactNumber)}`}>
            <span className="px-3 text-sm text-[#828282] border-r border-[#E0E0E0]">+91</span>
            <input
              id="event-contact"
              type="tel"
              inputMode="tel"
              value={draft.contactNumber}
              onChange={(e) => onChange({ contactNumber: e.target.value })}
              placeholder="Enter Number"
              aria-invalid={!!errors.contactNumber}
              className="w-full px-3 py-2.5 bg-transparent text-sm text-gray-900 placeholder:text-[#828282] focus:outline-none"
            />
          </div>
          <Err msg={errors.contactNumber} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        {rsvpAllowed ? (
          <div className="p-4 border border-[#E0E0E0] rounded-md bg-white space-y-3">
            <label htmlFor="event-rsvp" className="flex items-center gap-2 cursor-pointer">
              <input
                id="event-rsvp"
                type="checkbox"
                checked={draft.rsvpEnabled}
                onChange={(e) => onChange({ rsvpEnabled: e.target.checked })}
                className="size-4 rounded border-gray-300 accent-[#16A34A] cursor-pointer"
              />
              <span className={labelClass}>Event RSVP Acceptance</span>
            </label>
            {draft.rsvpEnabled && (
              <div>
                <span className={`block ${labelClass} mb-1.5`}>Acceptance Last Date</span>
                <DateButton label="RSVP acceptance last date" value={draft.rsvpDeadline} placeholder="Optional — last date to respond" onClick={() => onOpenDatePicker("rsvpDeadline")} error={errors.rsvpDeadline} />
                <Err msg={errors.rsvpDeadline} />
              </div>
            )}
          </div>
        ) : (
          <p className="p-4 border border-[#E0E0E0] rounded-md text-sm text-[#828282]">RSVP collection is turned off by the platform administrator.</p>
        )}
        <ImageUploadField
          label="Event Logo/image"
          value={draft.logoKey}
          onChange={(logoKey) => onChange({ logoKey })}
          purpose="EVENT_LOGO"
          aspectClassName="aspect-[2/1]"
          hint="Shown on the invitation card. JPG, PNG or WEBP, up to 5 MB"
        />
      </div>

      <div>
        <label htmlFor="event-address" className={`block ${labelClass} mb-1.5`}>Event Address<Req /></label>
        <input
          id="event-address"
          type="text"
          value={draft.venue}
          maxLength={300}
          onChange={(e) => onChange({ venue: e.target.value })}
          placeholder="Enter Event Address"
          aria-invalid={!!errors.venue}
          className={`${inputClass} ${border(errors.venue)}`}
        />
        <Err msg={errors.venue} />
      </div>

      <div className="pt-5 border-t border-[#E5E5E5] flex items-center justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-6 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-900 text-sm font-medium rounded-md cursor-pointer">
          Cancel
        </button>
        <button type="submit" className="px-8 py-2.5 bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-medium rounded-md cursor-pointer">
          Next
        </button>
      </div>
    </form>
  );
}
