"use client";

import React, { useState } from "react";
import { InviteeSheetRow, sheetIssues } from "@/utils/inviteeSheet";

interface InviteesPreviewModalProps {
  title?: string;
  subtitle?: string;
  rows: InviteeSheetRow[];
  showCompany?: boolean;
  showIdentity?: boolean;
  /** Column titles of the custom details; a second column appears when `identity2Label` is given */
  identityLabel?: string;
  identity2Label?: string;
  // When provided the list is editable and Save returns the edited rows; otherwise it is read-only
  onSave?: (rows: InviteeSheetRow[]) => void;
  onClose: () => void;
}

const inputClass = "w-full px-2.5 py-1.5 text-sm border border-[#E0E0E0] rounded bg-white focus:outline-none focus:border-[#FF651D]";

// "Invitees List Quick Preview": what an uploaded sheet (or the current list) contains, row by row.
// Mounted only while open, so its local edits start from the rows passed in.
export default function InviteesPreviewModal({ title = "Invitees List Preview", subtitle, rows, showCompany = true, showIdentity = false, identityLabel, identity2Label, onSave, onClose }: InviteesPreviewModalProps) {
  const [list, setList] = useState<InviteeSheetRow[]>(rows);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<InviteeSheetRow | null>(null);
  const editable = !!onSave;

  const term = search.trim().toLowerCase();
  const visible = term
    ? list.filter((r) => [r.name, r.email, r.phone, r.company].some((v) => v.toLowerCase().includes(term)))
    : list;
  const issues = sheetIssues(list);
  const invalidCount = issues.invalid.size;
  const repeatedCount = issues.repeated.size;

  const commitEdit = () => {
    if (!editing) return;
    setList((prev) => prev.map((r) => (r.id === editing.id ? { ...editing, name: editing.name.trim(), email: editing.email.trim().toLowerCase(), phone: editing.phone.trim(), company: editing.company.trim(), identity: (editing.identity || "").trim(), identity2: (editing.identity2 || "").trim() } : r)));
    setEditing(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-overlay" role="dialog" aria-modal="true" aria-labelledby="invitee-preview-title">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] animate-modal">
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-[#E5E5E5]">
          <div className="min-w-0">
            <h2 id="invitee-preview-title" className="text-base font-medium text-gray-900">
              {title} <span className="text-sm font-normal text-[#6B6B6B]">({list.length} invitees)</span>
            </h2>
            {subtitle && <p className="text-xs text-[#6B6B6B] mt-0.5 break-words">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-600 cursor-pointer shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pt-4 space-y-2">
          <label htmlFor="invitee-preview-search" className="block text-sm font-medium text-gray-900">Search</label>
          <input
            id="invitee-preview-search"
            type="search"
            placeholder="Search by name, email or mobile"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-[#E0E0E0] rounded-md bg-[#FAFAFA] focus:outline-none focus:border-[#FF651D]"
          />
          {(invalidCount > 0 || repeatedCount > 0) && (
            <p className="text-xs font-medium text-amber-700" role="status">
              {issues.importable} of {list.length} row{list.length === 1 ? "" : "s"} can be imported.{" "}
              {invalidCount > 0 && <>{invalidCount} row{invalidCount === 1 ? " has" : "s have"} a problem and will be skipped{editable ? " unless fixed" : ""}. </>}
              {repeatedCount > 0 && <>{repeatedCount} row{repeatedCount === 1 ? " repeats" : "s repeat"} a person already in this file and will be skipped. </>}
              {editable && "Guests who are already on this event are checked in the next step."}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-auto px-6 py-3 min-h-[200px]">
          {list.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#6B6B6B]">No invitees in this list.</p>
          ) : (
            <table className="w-full text-left text-sm min-w-[560px]">
              <thead className="text-[#6B6B6B] border-b border-[#D3D3D3]">
                <tr>
                  <th className="py-2.5 pr-3 font-medium w-12">#</th>
                  <th className="py-2.5 pr-3 font-medium">Name</th>
                  <th className="py-2.5 pr-3 font-medium">Email</th>
                  <th className="py-2.5 pr-3 font-medium">Mobile Number</th>
                  {showIdentity && <th className="py-2.5 pr-3 font-medium">{identityLabel || "Professional Identity"}</th>}
                  {identity2Label && <th className="py-2.5 pr-3 font-medium">{identity2Label}</th>}
                  {showCompany && <th className="py-2.5 pr-3 font-medium">Company Name</th>}
                  {editable && <th className="py-2.5 font-medium text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEEE] text-[#4B4F52]">
                {visible.map((row) => {
                  const problem = issues.invalid.get(row.id) || issues.repeated.get(row.id) || null;
                  const isEditing = editing?.id === row.id;
                  return (
                    <tr key={row.id} className={problem ? "bg-amber-50/60" : undefined}>
                      <td className="py-2.5 pr-3 text-[#6B6B6B]">{row.id}</td>
                      {isEditing ? (
                        <>
                          <td className="py-2 pr-2"><input aria-label="Name" className={inputClass} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></td>
                          <td className="py-2 pr-2"><input aria-label="Email" className={inputClass} value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></td>
                          <td className="py-2 pr-2"><input aria-label="Mobile" className={inputClass} value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></td>
                          {showIdentity && <td className="py-2 pr-2"><input aria-label={identityLabel || "Professional identity"} className={inputClass} value={editing.identity || ""} onChange={(e) => setEditing({ ...editing, identity: e.target.value })} /></td>}
                          {identity2Label && <td className="py-2 pr-2"><input aria-label={identity2Label} className={inputClass} value={editing.identity2 || ""} onChange={(e) => setEditing({ ...editing, identity2: e.target.value })} /></td>}
                          {showCompany && <td className="py-2 pr-2"><input aria-label="Company" className={inputClass} value={editing.company} onChange={(e) => setEditing({ ...editing, company: e.target.value })} /></td>}
                          <td className="py-2 text-right whitespace-nowrap">
                            <button type="button" onClick={commitEdit} className="text-sm font-medium text-[#C44200] hover:underline cursor-pointer mr-2">Done</button>
                            <button type="button" onClick={() => setEditing(null)} className="text-sm text-gray-600 hover:underline cursor-pointer">Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 pr-3 text-gray-900 break-words">
                            {row.name || <span className="text-[#6B6B6B]">—</span>}
                            {problem && <span className="block text-xs text-amber-700">{problem}</span>}
                          </td>
                          <td className="py-2.5 pr-3 break-all">{row.email || "—"}</td>
                          <td className="py-2.5 pr-3 whitespace-nowrap">{row.phone || "—"}</td>
                          {showIdentity && <td className="py-2.5 pr-3 break-words">{row.identity || "—"}</td>}
                          {identity2Label && <td className="py-2.5 pr-3 break-words">{row.identity2 || "—"}</td>}
                          {showCompany && <td className="py-2.5 pr-3 break-words">{row.company || "—"}</td>}
                          {editable && (
                            <td className="py-2.5 text-right whitespace-nowrap">
                              <button type="button" aria-label={`Edit ${row.name || "row " + row.id}`} onClick={() => setEditing(row)} className="p-1.5 text-[#A83800] border border-[#FFD2BF] rounded bg-[#FFF3EC] hover:bg-[#FFE3D7] cursor-pointer mr-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button type="button" aria-label={`Remove ${row.name || "row " + row.id}`} onClick={() => setList((prev) => prev.filter((r) => r.id !== row.id))} className="p-1.5 text-[#A83800] border border-[#FFD2BF] rounded bg-[#FFF3EC] hover:bg-[#FFE3D7] cursor-pointer">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#6B6B6B]">No invitees match your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E5E5E5] flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-800 hover:bg-gray-50 cursor-pointer">
            {editable ? "Cancel" : "Close"}
          </button>
          {editable && (
            <button
              type="button"
              disabled={!!editing}
              onClick={() => {
                onSave!(list);
                onClose();
              }}
              className="px-6 py-2 bg-[#C65318] hover:bg-[#A83800] text-white text-sm font-medium rounded-md disabled:opacity-60 cursor-pointer"
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
