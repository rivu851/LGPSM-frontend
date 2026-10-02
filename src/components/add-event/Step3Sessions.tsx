"use client";

import React from "react";
import CustomDropdown from "@/components/common/CustomDropdown";
import { AccessControl, DraftErrors, DraftSession, createSessionDraft } from "./eventDraft";
import { formatDateTime } from "@/utils/dateTime";
import { downloadInviteeTemplate } from "@/utils/inviteeTemplate";
import { InviteeSheetRow, parseInviteeSheet } from "@/utils/inviteeSheet";

// Invitee sheets stay in memory only (they hold guest contact details and a File object)
export interface SessionInviteeFile {
  file: File;
  name: string;
  rows: InviteeSheetRow[];
  problemCount: number;
}

interface Step3SessionsProps {
  sessions: DraftSession[];
  onSessionsChange: (sessions: DraftSession[]) => void;
  sessionFiles: Record<string, SessionInviteeFile | undefined>;
  onSessionFileChange: (sessionKey: string, file: SessionInviteeFile | null) => void;
  skipInvitees: boolean;
  onSkipInviteesChange: (value: boolean) => void;
  eventStart: string;
  eventEnd: string;
  errors: DraftErrors;
  onOpenSessionPicker: (sessionKey: string, field: "start" | "end") => void;
  onOpenInviteesPreview: (sessionKey: string) => void;
  onFinish: () => void;
  onBack: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

const ACCESS_OPTIONS: { value: AccessControl; label: string }[] = [
  { value: "NO_RESTRICTION", label: "No Restrictions" },
  { value: "ONLY_ONCE", label: "Only Once" },
];

const labelClass = "block text-sm font-medium text-gray-900 mb-1.5";
const fieldClass = "w-full px-3.5 py-2.5 bg-[#FAFAFA] border rounded-md text-sm text-gray-900 focus:outline-none focus:border-[#FF651D]";

function ExcelLogo({ className = "w-4 h-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M18 3H27C28.1046 3 29 3.89543 29 5V27C29 28.1046 28.1046 29 27 29H18V3Z" fill="#107C41" />
      <path d="M18 9.5H27M18 14.5H27M18 19.5H27M18 24.5H27" stroke="#339966" strokeWidth="1" />
      <path d="M22.5 3V29" stroke="#339966" strokeWidth="1" />
      <path d="M5 5C5 3.89543 5.89543 3 7 3H18V29H7C5.89543 29 5 28.1046 5 27V5Z" fill="#1F7244" />
      <path d="M9.5 10.5L12.3 16L9.5 21.5H11.8L13.4 18.2L15 21.5H17.3L14.5 16L17.3 10.5H15L13.4 13.8L11.8 10.5H9.5Z" fill="white" />
    </svg>
  );
}

function Checkbox({ checked, onChange, children, id }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; id: string }) {
  return (
    <label htmlFor={id} className="inline-flex items-center gap-2.5 cursor-pointer select-none text-sm text-[#4B4F52]">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 rounded border-gray-300 accent-[#16A34A] cursor-pointer" />
      {children}
    </label>
  );
}

export default function Step3Sessions({
  sessions,
  onSessionsChange,
  sessionFiles,
  onSessionFileChange,
  skipInvitees,
  onSkipInviteesChange,
  eventStart,
  eventEnd,
  errors,
  onOpenSessionPicker,
  onOpenInviteesPreview,
  onFinish,
  onBack,
  submitting = false,
  submitLabel = "Save",
}: Step3SessionsProps) {
  const [fileError, setFileError] = React.useState<Record<string, string | undefined>>({});

  const updateSession = (key: string, patch: Partial<DraftSession>) => {
    onSessionsChange(sessions.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

  const handleAddSession = () => {
    onSessionsChange([...sessions, createSessionDraft(`Session ${sessions.length + 1}`, eventStart, eventEnd)]);
  };

  // Saved sessions are deleted from the event's Sessions page; here only unsaved ones can be removed.
  // Sessions that copied the removed session's invitees fall back to their own list.
  const handleRemoveSession = (key: string) => {
    onSessionsChange(
      sessions
        .filter((s) => s.key !== key)
        .map((s) => (s.sourceSessionKey === key ? { ...s, inviteeSource: "NEW_LIST" as const, sourceSessionKey: null } : s))
    );
    onSessionFileChange(key, null);
  };

  const handleFile = async (session: DraftSession, file: File) => {
    setFileError((prev) => ({ ...prev, [session.key]: undefined }));
    try {
      const parsed = await parseInviteeSheet(file);
      if (parsed.rows.length === 0) {
        setFileError((prev) => ({ ...prev, [session.key]: "The sheet has no invitee rows." }));
        return;
      }
      onSessionFileChange(session.key, { file, name: file.name, rows: parsed.rows, problemCount: parsed.problems.length });
      onSkipInviteesChange(false);
      onOpenInviteesPreview(session.key);
    } catch {
      setFileError((prev) => ({ ...prev, [session.key]: "The file could not be read. Upload an .xlsx or .xls sheet." }));
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onFinish();
      }}
      noValidate
      className="p-4 sm:p-6 space-y-5"
    >
      {sessions.map((sess, index) => {
        const isPrimary = index === 0;
        const fileInfo = sessionFiles[sess.key];
        const timeError = errors[`session:${sess.key}:time`];
        const nameError = errors[`session:${sess.key}:name`];
        const sourceError = errors[`session:${sess.key}:source`];
        const copies = sess.inviteeSource === "COPY_SESSION";
        // Earlier sessions with their own list can be copied
        const sourceOptions = sessions
          .slice(0, index)
          .filter((o) => o.inviteeSource === "NEW_LIST")
          .map((o, i) => ({ value: o.key, label: o.name.trim() || `Session ${i + 1}` }));

        return (
          <section key={sess.key} aria-label={`Session ${index + 1}`} className="p-4 sm:p-5 border border-[#E0E0E0] rounded-lg bg-white space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5 gap-2">
                <label htmlFor={`session-name-${sess.key}`} className="text-sm font-medium text-gray-900">
                  Session Name<span className="text-[#FF651D] ml-0.5">*</span>
                  {isPrimary && <span className="ml-2 text-xs font-normal text-[#828282]">Primary session</span>}
                </label>
                {!sess.backendId && sessions.length > 1 && (
                  <button type="button" onClick={() => handleRemoveSession(sess.key)} className="text-sm font-medium text-[#E5520F] hover:underline cursor-pointer">
                    Remove
                  </button>
                )}
              </div>
              <input
                id={`session-name-${sess.key}`}
                type="text"
                maxLength={100}
                value={sess.name}
                onChange={(e) => updateSession(sess.key, { name: e.target.value })}
                placeholder="Entry Session"
                aria-invalid={!!nameError}
                className={`${fieldClass} ${nameError ? "border-rose-400" : "border-[#E0E0E0]"}`}
              />
              {nameError && <p className="mt-1 text-xs font-medium text-rose-600">{nameError}</p>}
            </div>

            {isPrimary && (
              <div>
                <Checkbox
                  id={`session-validate-${sess.key}`}
                  checked={sess.validateAgainstOtherSessions}
                  onChange={(v) => updateSession(sess.key, { validateAgainstOtherSessions: v })}
                >
                  Consider Access session validation on other session access
                </Checkbox>
                <p className="mt-1 ml-6.5 text-xs text-[#828282]">When on, guests must check in to this session before entering any other session.</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["start", "end"] as const).map((field) => (
                <div key={field} className="min-w-0">
                  <span className={labelClass}>
                    {field === "start" ? "Start Time" : "End Time"}
                    <span className="text-[#FF651D] ml-0.5">*</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`${sess.name || "Session"} ${field === "start" ? "start" : "end"} time`}
                    onClick={() => onOpenSessionPicker(sess.key, field)}
                    className={`${fieldClass} flex items-center justify-between gap-2 text-left cursor-pointer ${timeError ? "border-rose-400" : "border-[#E0E0E0]"}`}
                  >
                    <span className="truncate">{formatDateTime(field === "start" ? sess.start : sess.end, "Select date and time")}</span>
                    <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              ))}
              <div className="min-w-0">
                <span className={labelClass} title="No Restrictions: guests may enter any number of times. Only Once: a single entry.">
                  Access Control<span className="text-[#FF651D] ml-0.5">*</span>
                </span>
                <CustomDropdown
                  value={sess.accessControl}
                  onChange={(val) => updateSession(sess.key, { accessControl: val as AccessControl })}
                  options={ACCESS_OPTIONS}
                  ariaLabel={`${sess.name || "Session"} access control`}
                />
              </div>
            </div>
            {timeError && <p className="-mt-2 text-xs font-medium text-rose-600">{timeError}</p>}
            {sess.timesLinked && <p className="-mt-2 text-xs text-[#828282]">Follows the event start and end until you change it.</p>}

            {!isPrimary && (
              <div className="flex flex-wrap items-center gap-2">
                <Checkbox
                  id={`session-copy-${sess.key}`}
                  checked={copies}
                  onChange={(v) => {
                    if (v) {
                      onSessionFileChange(sess.key, null);
                      updateSession(sess.key, { inviteeSource: "COPY_SESSION", sourceSessionKey: sourceOptions[0]?.value ?? null });
                    } else {
                      updateSession(sess.key, { inviteeSource: "NEW_LIST", sourceSessionKey: null });
                    }
                  }}
                >
                  Keep same invitees as
                </Checkbox>
                <div className="w-48">
                  <CustomDropdown
                    value={copies ? sess.sourceSessionKey || "" : ""}
                    onChange={(v) => updateSession(sess.key, { inviteeSource: "COPY_SESSION", sourceSessionKey: v })}
                    options={sourceOptions}
                    disabled={!copies}
                    placeholder={sourceOptions[0]?.label || "Session"}
                    emptyMessage="No earlier session has its own list"
                    ariaLabel="Session to copy invitees from"
                  />
                </div>
                {sourceError && <p className="w-full text-xs font-medium text-rose-600">{sourceError}</p>}
              </div>
            )}

            {!copies && (
              <div>
                <span className={labelClass}>Add Invitees List</span>
                <div className="flex items-center bg-[#FAFAFA] border border-[#E0E0E0] rounded-md p-1 min-w-0">
                  <label className="px-4 py-2 bg-white border border-[#E0E0E0] hover:bg-gray-50 text-gray-800 text-sm font-medium rounded cursor-pointer shrink-0">
                    Choose File
                    <input
                      type="file"
                      accept=".xls,.xlsx"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(sess, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <div className="flex-1 px-3 flex items-center justify-between gap-2 min-w-0">
                    {fileInfo ? (
                      <button
                        type="button"
                        onClick={() => onOpenInviteesPreview(sess.key)}
                        className="flex items-center gap-2 text-sm text-gray-800 hover:text-[#E5520F] cursor-pointer min-w-0"
                        title="Open the invitees list preview"
                      >
                        <ExcelLogo />
                        <span className="truncate">{fileInfo.name}</span>
                        <span className="shrink-0 text-[#828282]">({fileInfo.rows.length})</span>
                      </button>
                    ) : (
                      <span className="text-sm text-[#828282]">No file chosen</span>
                    )}
                    {fileInfo && (
                      <button type="button" onClick={() => onSessionFileChange(sess.key, null)} aria-label="Remove file" className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {fileError[sess.key] && <p role="alert" className="mt-1 text-xs font-medium text-rose-600">{fileError[sess.key]}</p>}
                {fileInfo && fileInfo.problemCount > 0 && (
                  <p className="mt-1 text-xs font-medium text-amber-700">{fileInfo.problemCount} row(s) need attention — open the preview to fix them.</p>
                )}
                <div className="flex flex-wrap justify-between items-center gap-2 mt-2">
                  <p className="text-xs text-[#828282]">Imported when you save. Files are not kept in the saved draft.</p>
                  <button type="button" onClick={() => downloadInviteeTemplate()} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 underline hover:text-[#E5520F] cursor-pointer">
                    <ExcelLogo /> Download Excel Sample
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      <button
        type="button"
        onClick={handleAddSession}
        className="px-4 py-2 border border-[#FF651D] text-[#E5520F] hover:bg-orange-50 text-sm font-medium rounded-md inline-flex items-center gap-1.5 cursor-pointer bg-white"
      >
        <span aria-hidden>+</span> Add Sessions
      </button>

      <div className="pt-4 border-t border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-end gap-3">
        <Checkbox id="skip-invitees" checked={skipInvitees} onChange={onSkipInviteesChange}>
          I don&apos;t have any invitees list yet, skip for later
        </Checkbox>
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={onBack} className="px-6 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-900 text-sm font-medium rounded-md cursor-pointer">
            Back
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-7 py-2.5 bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-medium rounded-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
