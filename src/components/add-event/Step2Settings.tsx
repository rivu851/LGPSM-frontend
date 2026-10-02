"use client";

import React from "react";
import { DraftErrors, EventDraft, PreferenceCategory, newClientKey } from "./eventDraft";
import { EventFeatureSettings } from "@/services/platformSettingsService";

interface Step2SettingsProps {
  draft: EventDraft;
  onChange: (patch: Partial<EventDraft>) => void;
  errors: DraftErrors;
  // Options the platform administrator switched off are not offered
  features: EventFeatureSettings;
  onNext: () => void;
  onBack: () => void;
}

function OptionRow({
  id,
  checked,
  disabled,
  onChange,
  label,
  help,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  label: string;
  help: string;
}) {
  return (
    <div className={`p-3.5 border rounded-md flex items-start gap-3 ${disabled ? "bg-[#F4F5F8] border-[#E5E5E5]" : "bg-white border-[#E0E0E0]"}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 rounded border-gray-300 accent-[#16A34A] cursor-pointer disabled:cursor-not-allowed"
      />
      <label htmlFor={id} className={`text-sm ${disabled ? "text-[#828282] cursor-not-allowed" : "text-gray-900 cursor-pointer"}`}>
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-[#828282] mt-0.5">{help}</span>
      </label>
    </div>
  );
}

// Controlled step: values live in the wizard draft owned by the page
export default function Step2Settings({ draft, onChange, errors, features, onNext, onBack }: Step2SettingsProps) {
  const categories = draft.preferenceCategories;
  const setCategories = (next: PreferenceCategory[]) => onChange({ preferenceCategories: next });
  const updateCategory = (id: string, patch: Partial<PreferenceCategory>) => setCategories(categories.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  // "Accept all invited attendees" already admits guests who have not responded
  const notRespondedImplied = features.acceptInvitedAttendees && draft.allowAllInvited;
  const anyRsvpOption = features.acceptInvitedAttendees || features.chooseNotRespondedInvitees || features.chooseRSVPDeclinedInvitees;

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
        <label htmlFor="event-threshold" className="block text-sm font-medium text-gray-900 mb-1.5">Attendee threshold limit</label>
        <input
          id="event-threshold"
          type="number"
          inputMode="numeric"
          min={1}
          value={draft.thresholdLimit}
          onChange={(e) => onChange({ thresholdLimit: e.target.value })}
          placeholder="Enter Max Attendee count"
          aria-invalid={!!errors.thresholdLimit}
          className={`w-full max-w-lg px-3.5 py-2.5 bg-[#FAFAFA] border rounded-md text-sm text-gray-900 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D] ${errors.thresholdLimit ? "border-rose-400" : "border-[#E0E0E0]"}`}
        />
        {errors.thresholdLimit && <p className="mt-1 text-xs font-medium text-rose-600">{errors.thresholdLimit}</p>}
      </div>

      {anyRsvpOption && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-900 mb-2">Who can check in</legend>
          {features.acceptInvitedAttendees && (
            <OptionRow
              id="opt-accept-all"
              checked={draft.allowAllInvited}
              onChange={(v) => onChange({ allowAllInvited: v })}
              label="Accept all invited attendees"
              help="Everyone on the invitee list can check in, whether or not they responded."
            />
          )}
          {features.chooseNotRespondedInvitees && (
            <OptionRow
              id="opt-not-responded"
              checked={notRespondedImplied || draft.allowNotResponded}
              disabled={notRespondedImplied}
              onChange={(v) => onChange({ allowNotResponded: v })}
              label="Allow not-responded invitees"
              help={notRespondedImplied ? "Included because all invited attendees are accepted." : "Guests who have not replied to the RSVP can still check in."}
            />
          )}
          {features.chooseRSVPDeclinedInvitees && (
            <OptionRow
              id="opt-declined"
              checked={draft.allowDeclined}
              onChange={(v) => onChange({ allowDeclined: v })}
              label="Allow RSVP declined invitees"
              help="Guests who declined the invitation can still check in."
            />
          )}
        </fieldset>
      )}

      {features.askFoodPreference && (
        <div className="p-4 border border-[#E0E0E0] rounded-md bg-white space-y-4">
          <label htmlFor="opt-food" className="flex items-center gap-3 cursor-pointer">
            <input
              id="opt-food"
              type="checkbox"
              checked={draft.dietaryEnabled}
              onChange={(e) => onChange({ dietaryEnabled: e.target.checked })}
              className="size-4 rounded border-gray-300 accent-[#16A34A] cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-900">Ask for food preference</span>
          </label>

          {draft.dietaryEnabled && (
            <div className="space-y-6">
              {categories.map((category, catIdx) => (
                <div key={category.id} className="pt-4 border-t border-[#EEEEEE] first:border-t-0 first:pt-0 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor={`pref-title-${category.id}`} className="text-sm font-medium text-gray-900">
                      Question {catIdx + 1} title
                    </label>
                    {categories.length > 1 && (
                      <button type="button" onClick={() => setCategories(categories.filter((c) => c.id !== category.id))} className="text-sm font-medium text-rose-600 hover:underline cursor-pointer">
                        Remove question
                      </button>
                    )}
                  </div>
                  <input
                    id={`pref-title-${category.id}`}
                    type="text"
                    value={category.title}
                    maxLength={100}
                    onChange={(e) => updateCategory(category.id, { title: e.target.value })}
                    placeholder="Dietary Preference"
                    className="w-full max-w-md px-3.5 py-2.5 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-sm text-gray-900 focus:outline-none focus:border-[#FF651D]"
                  />
                  <ul className="space-y-2.5">
                    {category.options.map((opt, optIdx) => (
                      <li key={optIdx} className="flex items-center gap-2.5">
                        <span aria-hidden className="size-4 rounded-full border-2 border-[#16A34A] shrink-0" />
                        <input
                          type="text"
                          aria-label={`Option ${optIdx + 1}`}
                          value={opt}
                          maxLength={60}
                          onChange={(e) => updateCategory(category.id, { options: category.options.map((o, i) => (i === optIdx ? e.target.value : o)) })}
                          placeholder={`Option ${optIdx + 1}`}
                          className="flex-1 max-w-xs border-b border-gray-300 focus:border-[#FF651D] focus:outline-none py-1 text-sm text-gray-900 bg-transparent"
                        />
                        {category.options.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Remove option ${optIdx + 1}`}
                            onClick={() => updateCategory(category.id, { options: category.options.filter((_, i) => i !== optIdx) })}
                            className="text-gray-400 hover:text-rose-600 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => updateCategory(category.id, { options: [...category.options, ""] })} className="text-sm font-medium text-[#16A34A] hover:underline cursor-pointer">
                    Add another option
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setCategories([...categories, { id: newClientKey("pref"), title: "", options: [""] }])}
                className="px-4 py-2 border border-[#FF651D] text-[#E5520F] hover:bg-orange-50 text-sm font-medium rounded-md cursor-pointer"
              >
                + Add another question
              </button>
            </div>
          )}
        </div>
      )}

      <div className="pt-5 border-t border-[#E5E5E5] flex items-center justify-end gap-3">
        <button type="button" onClick={onBack} className="px-6 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-900 text-sm font-medium rounded-md cursor-pointer">
          Back
        </button>
        <button type="submit" className="px-7 py-2.5 bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-medium rounded-md cursor-pointer">
          Next
        </button>
      </div>
    </form>
  );
}
