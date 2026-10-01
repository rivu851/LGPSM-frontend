"use client";

import React from "react";
import { DraftErrors, EventDraft } from "./eventDraft";
import { formatDateTime } from "@/utils/dateTime";
import CategoryFields from "@/components/categories/CategoryFields";
import ImageUploadField from "@/components/common/ImageUploadField";
import { CategoriesApi } from "@/hooks/useCategories";

export type EventDateField = "start" | "end" | "rsvpDeadline";

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 500;

interface Step1EventDetailsProps {
  draft: EventDraft;
  onChange: (patch: Partial<EventDraft>) => void;
  onOpenDatePicker: (field: EventDateField) => void;
  categories: CategoriesApi;
  canManageCategories: boolean;
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
export default function Step1EventDetails({ draft, onChange, onOpenDatePicker, categories, canManageCategories, rsvpAllowed, errors, onNext, onCancel }: Step1EventDetailsProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
      noValidate
      className="p-4 sm:p-6 space-y-5"
    >
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
