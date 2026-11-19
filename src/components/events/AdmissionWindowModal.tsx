"use client";

import React, { useState } from "react";
import PopupMessage from "@/components/common/PopupMessage";
import ModalClose from "@/components/common/ModalClose";
import DateTimePickerModal from "@/components/add-event/modals/DateTimePickerModal";
import { eventService } from "@/services/eventService";
import { admissionPayload, browserTimeZone, validateAdmission } from "@/utils/admissionWindow";
import { formatDateTime } from "@/utils/dateTime";

interface AdmissionWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  start: string;
  end: string;
  opens: string | null;
  closes: string | null;
  onSaved: () => void;
}

type Field = "opens" | "closes";

/** Change the check-in window of a published event. Allowed after invitations went out: nothing on a pass depends on it. */
export default function AdmissionWindowModal({ isOpen, onClose, eventId, start, end, opens, closes, onSaved }: AdmissionWindowModalProps) {
  const [draft, setDraft] = useState<{ opens: string | null; closes: string | null }>({ opens, closes });
  const [picking, setPicking] = useState<Field | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const errors = validateAdmission({ start, end, ...draft });
  const problem = errors.admissionOpens || errors.admissionCloses;

  const save = async () => {
    if (problem) return;
    setBusy(true);
    setError(null);
    try {
      const res = await eventService.updateAdmission(eventId, admissionPayload(draft));
      if (res.success) onSaved();
      else setError(res.message || "Could not save the check-in window.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the check-in window.");
    }
    setBusy(false);
  };

  const row = (field: Field, label: string, fallback: string, fallbackLabel: string) => (
    <div>
      <span className="block text-xs font-medium text-gray-700 mb-1">{label}</span>
      <button type="button" onClick={() => setPicking(field)} aria-label={label} className="w-full px-3 py-2.5 border border-[#E0E0E0] rounded-md text-sm text-left cursor-pointer hover:bg-[#EEF3FF]">
        {draft[field] ? formatDateTime(draft[field]) : <span className="text-[#6B6B6B]">{fallbackLabel} — {formatDateTime(fallback)}</span>}
      </button>
      {draft[field] && <button type="button" onClick={() => setDraft((d) => ({ ...d, [field]: null }))} className="mt-1 text-xs text-[#C44200] underline cursor-pointer">{fallbackLabel === "Event start" ? "Use event start" : "Use event end"}</button>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="admission-title">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 space-y-4 overflow-y-auto max-h-[calc(100dvh-2rem)] relative">
        <ModalClose onClick={onClose} disabled={busy} />
        <h3 id="admission-title" className="pr-8 text-base font-medium text-gray-900">Check-in window</h3>
        <p className="text-sm text-[#4B4F52]">
          The event runs {formatDateTime(start)} – {formatDateTime(end)}. Guests can only be checked in while this window is open; once it closes their passes stop working. Times are in {browserTimeZone()}.
        </p>
        {row("opens", "Check-in opens", start, "Event start")}
        {row("closes", "Check-in closes", end, "Event end")}
        <PopupMessage message={problem || error} />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={save} disabled={busy || !!problem} className="px-4 py-2 bg-[#C65318] hover:bg-[#A83800] text-white rounded-md text-sm font-medium cursor-pointer disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
      <DateTimePickerModal
        key={picking ? `${picking}-${draft[picking] ?? ""}` : "closed"}
        isOpen={!!picking}
        onClose={() => setPicking(null)}
        onSave={(iso) => { if (picking) setDraft((d) => ({ ...d, [picking]: iso })); setPicking(null); }}
        value={picking ? draft[picking] || (picking === "opens" ? start : end) : null}
        title={picking === "opens" ? "Check-in opens" : "Check-in closes"}
      />
    </div>
  );
}
