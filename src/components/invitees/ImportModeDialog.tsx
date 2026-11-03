"use client";

import React from "react";
import type { ImportMode, ImportPreview } from "@/services/inviteeService";
import { alreadyUploadedAndSent, previewLines } from "@/utils/inviteeLists";

interface Props {
  fileName: string;
  rowCount: number;
  /** Lists an invitation has already been dispatched from; null while it is being looked up */
  sentSets: number | null;
  /** The server's forecast for each choice (nothing is written to make it); null while it is being worked out */
  previews: { replace: ImportPreview | null; append: ImportPreview | null } | null;
  previewError?: string | null;
  busy?: boolean;
  onCancel: () => void;
  onChoose: (mode: ImportMode) => void;
}

export const ALREADY_SENT_MESSAGE = "You have already uploaded this list of invitees and they have already received their invitations, so there is nothing new to import. To invite more people, upload a file with new invitees.";
export const SENT_SETS_NOTICE = "Previously sent invitation sets will be preserved. Only unsent invitees will be replaced.";

// Asked when an event already has invitees: add the new file to the list, or replace the not-yet-invited part of it.
export default function ImportModeDialog({ fileName, rowCount, sentSets, previews, previewError, busy, onCancel, onChoose }: Props) {
  // The same list again, after its invitations went out: nothing to import, so no choice is offered
  if (alreadyUploadedAndSent(previews?.append)) {
    return (
      <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="import-mode-title">
        <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4 overflow-y-auto max-h-[calc(100dvh-2rem)]">
          <h2 id="import-mode-title" className="text-lg font-semibold text-[#15191C]">This list has already been uploaded</h2>
          <p className="text-sm text-[#828282] break-words">{fileName} · {rowCount} row{rowCount === 1 ? "" : "s"}</p>
          <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{ALREADY_SENT_MESSAGE}</p>
          <div className="flex justify-end">
            <button type="button" onClick={onCancel} className="px-4 py-2 bg-[#FF651D] hover:bg-[#E5520F] rounded-md text-sm font-medium text-white cursor-pointer">OK</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="import-mode-title">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4 overflow-y-auto max-h-[calc(100dvh-2rem)]">
        <div>
          <h2 id="import-mode-title" className="text-lg font-semibold text-[#15191C]">How should this list be imported?</h2>
          <p className="text-sm text-[#828282] mt-1 break-words">{fileName} · {rowCount} row{rowCount === 1 ? "" : "s"}</p>
        </div>

        {sentSets !== null && sentSets > 0 && (
          <p role="note" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{SENT_SETS_NOTICE}</p>
        )}

        <div className="space-y-3">
          <button type="button" disabled={busy} onClick={() => onChoose("APPEND")} className="w-full text-left rounded-lg border border-[#E0E0E0] hover:border-[#FF651D] px-4 py-3 cursor-pointer disabled:opacity-60">
            <span className="block text-sm font-semibold text-[#15191C]">Add to existing invitees</span>
            <span className="block text-xs text-[#828282] mt-0.5">Everyone already on the list stays. Only people who are not already invited are added; duplicates are skipped.</span>
            <Forecast preview={previews?.append ?? null} loading={!previews && !previewError} mode="APPEND" />
          </button>
          <button type="button" disabled={busy} onClick={() => onChoose("REPLACE")} className="w-full text-left rounded-lg border border-[#E0E0E0] hover:border-[#FF651D] px-4 py-3 cursor-pointer disabled:opacity-60">
            <span className="block text-sm font-semibold text-[#15191C]">Replace the not-yet-invited list</span>
            <span className="block text-xs text-[#828282] mt-0.5">
              Invitees who have never been invited and are not in this file are set aside (kept, not deleted, and restorable from Uploaded Lists). Guests with a failed or unresolved send are always kept. {sentSets ? "Lists you have already sent from are left as they are." : "Anyone already invited is never removed."}
            </span>
            <Forecast preview={previews?.replace ?? null} loading={!previews && !previewError} mode="REPLACE" />
          </button>
        </div>

        {previewError && <p role="status" className="text-xs text-[#828282]">{previewError}</p>}
        {previews?.replace && previews.replace.errors.length > 0 && (
          <details className="text-xs text-[#4B4F52]">
            <summary className="cursor-pointer font-medium">Rows with problems ({previews.replace.errors.length})</summary>
            <ul className="mt-1 space-y-0.5 list-disc pl-4">{previews.replace.errors.slice(0, 5).map((e) => <li key={`${e.row}-${e.error}`}>Row {e.row}: {e.error}</li>)}</ul>
          </details>
        )}

        <div className="flex justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className="px-4 py-2 border border-[#E0E0E0] rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// What this choice would do right now, as worked out by the server. It is a forecast: the import checks everything again.
function Forecast({ preview, loading, mode }: { preview: ImportPreview | null; loading: boolean; mode: ImportMode }) {
  if (loading) return <span className="block text-xs text-[#828282] mt-1.5">Checking what this would do…</span>;
  if (!preview) return null;
  return (
    <span className="block mt-2 rounded bg-[#F6F6F6] px-2.5 py-1.5 text-xs text-[#15191C]" data-testid={`forecast-${mode}`}>
      {previewLines(preview, mode).map((l) => <span key={l} className="block">• {l}</span>)}
    </span>
  );
}
