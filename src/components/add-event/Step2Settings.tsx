"use client";

import { CARD_DISPLAY_DEFAULTS, CARD_DISPLAY_OPTIONS, CARD_INFO_OPTIONS, CUSTOM_DETAIL, EMPLOYEE_ID, EMPLOYEE_ID_LABEL, customFieldFor, customShowKey, customTitleKey, detailKind, isCustomDetail, type CardInfo, type CardInfoField } from "./eventDraft";
import PopupMessage from "@/components/common/PopupMessage";
import CustomDropdown from "@/components/common/CustomDropdown";
import { CheckInPolicy, POLICY_FLAGS, POLICY_LABEL, policyOf, policyOptions } from "@/utils/checkInPolicy";
import React, { useEffect, useRef } from "react";
import { DraftErrors, EventDraft, PreferenceCategory, newClientKey } from "./eventDraft";
import { EventFeatureSettings } from "@/services/platformSettingsService";
import InfoTip from "@/components/common/InfoTip";
import { useAlert } from "@/context/AlertContext";
import { checkCardTitles } from "@/utils/cardTitleRules";

interface Step2SettingsProps {
  draft: EventDraft;
  onChange: (patch: Partial<EventDraft>) => void;
  errors: DraftErrors;
  // Options the platform administrator switched off are not offered
  features: EventFeatureSettings;
  /** The Excel sample was downloaded and the columns have changed since (a custom title was edited) */
  sampleColumnsChanged?: boolean;
  onNext: () => void;
  onBack: () => void;
  readOnly?: boolean;
}

// Controlled step: values live in the wizard draft owned by the page
export default function Step2Settings({ draft, onChange, errors, features, sampleColumnsChanged = false, onNext, onBack, readOnly = false }: Step2SettingsProps) {
  const { showAlert, confirm } = useAlert();
  const display = { ...CARD_DISPLAY_DEFAULTS, ...(draft.cardDisplay || {}) };
  // "Invitee Name" is one of the choices for the two lines; before anything is saved the name is on the primary line, as every card has always had it
  const cardInfo: CardInfo = draft.cardInfo ?? { primary: display.inviteeName ? "INVITEE_NAME" : null, secondary: null };
  // the name is printed exactly when it is chosen for one of the lines
  const setCardInfo = (next: CardInfo) => onChange({ cardInfo: next, cardDisplay: { ...display, inviteeName: next.primary === "INVITEE_NAME" || next.secondary === "INVITEE_NAME" } });

  // The custom titles are checked by what they MEAN (utils/columnMeaning.ts): one that says what the card or the sample Excel already
  // has is refused, and one that only renames a standard Excel column is kept only if the organizer agrees.
  const agreed = useRef(new Set<string>());
  const asking = useRef(false);
  const verifyTitles = async (): Promise<boolean> => {
    if (asking.current || draft.template?.staticCard) return true;
    const customSlots = (["primary", "secondary"] as const).filter((s) => isCustomDetail(cardInfo[s])).map((slot) => ({ slot, title: (cardInfo[customTitleKey(cardInfo[slot])] ?? "").trim() })).filter((x) => x.title);
    if (customSlots.length === 0) return true;
    const verdict = checkCardTitles({ nameChosen: cardInfo.primary === "INVITEE_NAME" || cardInfo.secondary === "INVITEE_NAME", companyChosen: cardInfo.primary === "COMPANY_NAME" || cardInfo.secondary === "COMPANY_NAME", custom: customSlots });
    const clear = (slots: Array<"primary" | "secondary">) => {
      const next = { ...cardInfo };
      slots.forEach((s) => { (next as Record<string, unknown>)[customTitleKey(cardInfo[s])] = ""; });
      setCardInfo(next);
    };
    asking.current = true;
    try {
      if (verdict.blocked) {
        showAlert(verdict.blocked, "error", "Already included");
        const bad = customSlots.filter((x) => verdict.blocked!.includes(`"${x.title}"`)).map((x) => x.slot);
        if (bad.length) clear(bad);
        return false;
      }
      const pending = verdict.renames.filter((r) => !agreed.current.has(`${r.slot}:${r.title.toLowerCase()}`));
      if (pending.length === 0) return true;
      const list = pending.map((r) => `"${r.title}" is the ${r.column} column`).join(", ");
      const ok = await confirm({
        title: "These columns are already in the sample Excel",
        message: `${list}, which the sample Excel already has. Do you still want to keep ${pending.length === 1 ? "this title" : "these titles"}? If you do, the sample Excel will use ${pending.length === 1 ? "it" : "them"} as the heading${pending.length === 1 ? "" : "s"} of ${pending.length === 1 ? "that column" : "those columns"} instead of adding new columns, and the card will show that detail under your title.`,
        confirmText: pending.length === 1 ? "Keep this title" : "Keep these titles",
        cancelText: "Set a different title",
        cancelButton: true,
      });
      if (ok) { pending.forEach((r) => agreed.current.add(`${r.slot}:${r.title.toLowerCase()}`)); return true; }
      clear(pending.map((r) => r.slot));
      return false;
    } finally { asking.current = false; }
  };
  const categories = draft.preferenceCategories;
  const setCategories = (next: PreferenceCategory[]) => onChange({ preferenceCategories: next });
  const updateCategory = (id: string, patch: Partial<PreferenceCategory>) => setCategories(categories.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  // A newly added option or question takes the cursor straight away, so the organizer can keep typing
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    if (!focusNext.current) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = null;
  }, [categories]);
  const anyRsvpOption = features.acceptInvitedAttendees || features.chooseNotRespondedInvitees || features.chooseRSVPDeclinedInvitees;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void verifyTitles().then((ok) => { if (ok) onNext(); });
      }}
      noValidate
      className="p-4 sm:p-6 space-y-5"
    >
      {/* Who can check in: one dropdown, shown only while RSVP is on (it is about how guests' answers affect entry).
          Food preference below does not depend on RSVP being on. */}
      {draft.rsvpEnabled && anyRsvpOption && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label className="text-sm font-medium text-gray-900">Who can check in</label>
            <InfoTip label="About who can check in" text="Decides how a guest's RSVP answer affects entry. The check-in app enforces this at the door." align="left" />
          </div>
          <div className="max-w-lg">
            <CustomDropdown
              value={policyOf(draft)}
              onChange={(v) => onChange(POLICY_FLAGS[v as CheckInPolicy])}
              options={policyOptions(features).map((k) => ({ value: k, label: POLICY_LABEL[k] }))}
              ariaLabel="Who can check in"
              optional
            />
          </div>
        </div>
      )}

      {/* Select data to show on card: the event's own details every card prints (the card preview follows). An organizer's own uploaded design is
          the card as it is, so neither this nor Additional Information is offered for it: only who can check in and the food question are. */}
      {!draft.template?.staticCard && (
      <div className="p-4 border border-[#E0E0E0] rounded-md bg-white space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">Select data to show on card</span>
          <InfoTip label="About the data on the card" text="Untick a detail to leave it off every guest's card. The card preview shows the result." align="left" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* the event location is mandatory on the card (the master card always prints it), so it is not a choice */}
          {CARD_DISPLAY_OPTIONS.filter(({ key }) => key !== "inviteeName" && key !== "location").map(({ key, label }) => {
            const display = { ...CARD_DISPLAY_DEFAULTS, ...(draft.cardDisplay || {}) };
            return (
              <label key={key} htmlFor={`card-show-${key}`} className="flex items-center gap-2.5 rounded-md border border-[#E0E0E0] px-3 py-2.5 text-sm font-medium text-[#15191C] cursor-pointer">
                <input id={`card-show-${key}`} type="checkbox" checked={display[key]} onChange={(e) => onChange({ cardDisplay: { ...display, [key]: e.target.checked } })} className="size-[18px] accent-[#1A9242] cursor-pointer" />
                {label}
              </label>
            );
          })}
        </div>
        <PopupMessage message={draft.cardDisplay?.qr === false ? "Cards will be printed without the QR code. Guests will need to open their invitation link to show their entry QR at check-in." : null} type="warning" title="No QR code on the cards" />
      </div>
      )}

      {!draft.template?.staticCard && (
      <div className="p-4 border border-[#E0E0E0] rounded-md bg-white space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">Additional Information you want to show on card</span>
          <InfoTip label="About additional information" text="Choose which guest details are printed under the event name on each guest's card. A guest without that detail gets an empty line. This also decides the extra columns in the invitee Excel sample." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {(["primary", "secondary"] as const).map((slot) => {
            const info = cardInfo;
            const field = info[slot];
            const other = info[slot === "primary" ? "secondary" : "primary"];
            const on = field !== null;
            const titleKey = customTitleKey(field);
            const kind = detailKind(field, info[titleKey]);
            const custom = kind === "CUSTOM";
            const otherKind = detailKind(other, info[customTitleKey(other)]);
            const label = slot === "primary" ? "Primary additional information" : "Secondary additional information";
            const pick = (v: string) => {
              if (v === EMPLOYEE_ID || v === CUSTOM_DETAIL) {
                const next = customFieldFor(other);
                const key = customTitleKey(next);
                // Employee ID has a fixed title; leaving it for Custom clears the title so a new one is typed
                const title = v === EMPLOYEE_ID ? EMPLOYEE_ID_LABEL : (info[key] ?? "").trim().toLowerCase() === EMPLOYEE_ID_LABEL.toLowerCase() ? "" : info[key] ?? "";
                return setCardInfo({ ...info, [slot]: next, [key]: title });
              }
              setCardInfo({ ...info, [slot]: v as CardInfoField });
            };
            return (
              <div key={slot} className="border border-[#E0E0E0] rounded-md p-4 flex flex-col gap-3">
                <label htmlFor={`card-info-${slot}`} className="inline-flex items-center gap-2.5 text-sm font-medium text-[#15191C] cursor-pointer">
                  <input
                    id={`card-info-${slot}`}
                    type="checkbox"
                    checked={on}
                    onChange={(e) => setCardInfo({ ...info, [slot]: e.target.checked ? (otherKind !== "INVITEE_NAME" ? "INVITEE_NAME" : "COMPANY_NAME") : null })}
                    className="size-[18px] accent-[#1A9242] cursor-pointer"
                  />
                  {label}
                </label>
                <div className={on ? "" : "opacity-50 pointer-events-none"} aria-disabled={!on}>
                  <CustomDropdown
                    value={kind === "CUSTOM" ? CUSTOM_DETAIL : kind === "EMPLOYEE_ID" ? EMPLOYEE_ID : field ?? ""}
                    onChange={pick}
                    // Company Name and Employee ID can sit on one line only; Custom is offered on both lines (each with its own title); a custom detail shows the title that was typed
                    options={CARD_INFO_OPTIONS
                      .filter((o) => (o.value === CUSTOM_DETAIL ? true : o.value === EMPLOYEE_ID ? otherKind !== "EMPLOYEE_ID" : o.value === "INVITEE_NAME" ? otherKind !== "INVITEE_NAME" : otherKind !== "COMPANY_NAME"))
                      .map((o) => (o.value === CUSTOM_DETAIL && custom && (info[titleKey] ?? "").trim() ? { ...o, label: (info[titleKey] ?? "").trim() } : o))}
                    placeholder="Choose a detail"
                    ariaLabel={label}
                    optional
                  />
                </div>
                {custom && (
                  <div>
                    <label htmlFor={`card-info-title-${slot}`} className="block text-sm font-medium text-gray-900 mb-1.5">Title for the custom detail<span className="text-[#C44200] ml-0.5">*</span></label>
                    <input
                      id={`card-info-title-${slot}`}
                      type="text"
                      value={info[titleKey] ?? ""}
                      maxLength={40}
                      onChange={(e) => { agreed.current.clear(); setCardInfo({ ...info, [titleKey]: e.target.value }); }}
                      onBlur={() => { void verifyTitles(); }}
                      placeholder="e.g. Designation, Employee ID, Badge No."
                      aria-invalid={!!errors.cardInfo}
                      className={`w-full px-3.5 py-2.5 bg-[#FAFAFA] border rounded-md text-sm text-gray-900 placeholder:text-[#6B6B6B] focus:outline-none focus:border-black ${errors.cardInfo ? "!border-rose-500" : "border-[#E0E0E0]"}`}
                    />
                    <label htmlFor={`card-info-show-title-${slot}`} className="mt-2 inline-flex items-center gap-2 text-sm text-[#15191C] cursor-pointer">
                      <input
                        id={`card-info-show-title-${slot}`}
                        type="checkbox"
                        checked={info[customShowKey(field)] === true}
                        onChange={(e) => setCardInfo({ ...info, [customShowKey(field)]: e.target.checked })}
                        className="size-4 accent-[#1A9242] cursor-pointer"
                      />
                      Show this title on the card (e.g. &ldquo;{(info[titleKey] ?? "").trim() || "Designation"}: value&rdquo;)
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {(isCustomDetail(cardInfo.primary) || isCustomDetail(cardInfo.secondary)) && (
          <p className="text-xs text-[#6B6B6B]">The title becomes the column heading in the Excel sample and the field name when adding an invitee.</p>
        )}
        {errors.cardInfo && <p role="alert" className="text-xs font-medium text-rose-600">{errors.cardInfo}</p>}
        <PopupMessage message={sampleColumnsChanged ? "You already downloaded the Excel sample with the earlier columns. These changes alter the columns, so download the sample again; a file with the old headings will be refused." : null} type="warning" title="Download the Excel sample again" />
      </div>
      )}

      {features.askFoodPreference && (
        <div className={`p-4 border rounded-md bg-white space-y-4 ${errors.dietaryPreference ? "!border-rose-500" : "border-[#E0E0E0]"}`}>
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
                    className="w-full max-w-md px-3.5 py-2.5 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-sm text-gray-900 focus:outline-none focus:border-black"
                  />
                  <ul className="space-y-2.5">
                    {category.options.map((opt, optIdx) => (
                      <li key={optIdx} className="flex items-center gap-2.5">
                        <span aria-hidden className="size-4 rounded-full border-2 border-[#16A34A] shrink-0" />
                        <input
                          type="text"
                          id={`pref-opt-${category.id}-${optIdx}`}
                          aria-label={`Option ${optIdx + 1}`}
                          value={opt}
                          maxLength={60}
                          onChange={(e) => updateCategory(category.id, { options: category.options.map((o, i) => (i === optIdx ? e.target.value : o)) })}
                          placeholder={`Option ${optIdx + 1}`}
                          className="flex-1 max-w-xs border-b border-gray-300 focus:border-black focus:outline-none py-1 text-sm text-gray-900 bg-transparent"
                        />
                        {optIdx === 0 && <span className="shrink-0 text-xs text-[#6B6B6B]">(Stays selected by default for invitees)</span>}
                        {category.options.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Remove option ${optIdx + 1}`}
                            onClick={() => updateCategory(category.id, { options: category.options.filter((_, i) => i !== optIdx) })}
                            className="text-gray-500 hover:text-rose-600 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => { focusNext.current = `pref-opt-${category.id}-${category.options.length}`; updateCategory(category.id, { options: [...category.options, ""] }); }} className="text-sm font-medium text-[#15803D] hover:underline cursor-pointer">
                    Add another option
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => { const id = newClientKey("pref"); focusNext.current = `pref-title-${id}`; setCategories([...categories, { id, title: "", options: [""] }]); }}
                className="px-4 py-2 border border-[#FF651D] text-[#C44200] hover:bg-[#FF651D] hover:text-white text-sm font-medium rounded-md cursor-pointer"
              >
                + Add another question
              </button>
            </div>
          )}
          {errors.dietaryPreference && <p className="text-xs font-medium text-rose-600" role="alert">{errors.dietaryPreference}</p>}
        </div>
      )}

      {!readOnly && <div className="pt-5 border-t border-[#E5E5E5] flex items-center justify-end gap-3">
        <button type="button" onClick={onBack} className="px-6 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-900 text-sm font-medium rounded-md cursor-pointer">
          Back
        </button>
        <button type="submit" className="px-7 py-2.5 bg-[#C65318] hover:bg-[#A83800] text-white text-sm font-medium rounded-md cursor-pointer">
          Next
        </button>
      </div>}
    </form>
  );
}
