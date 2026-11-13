"use client";

import React from "react";
import { SessionOption } from "@/hooks/useEventSessions";
import { Skeleton, SkeletonRegion } from "@/components/common/Skeleton";

interface SessionScopePickerProps {
  sessions: SessionOption[];
  loading?: boolean;
  error?: string | null;
  // null = every session of the event (sent to the backend as an empty list);
  // an array = only those sessions (an empty array is an incomplete choice the caller must block)
  value: string[] | null;
  onChange: (value: string[] | null) => void;
  label?: string;
}

// A staff member's session access as checkboxes: "All Sessions" (the default) or any combination of the event's sessions.
export default function SessionScopePicker({
  sessions,
  loading = false,
  error,
  value,
  onChange,
  label = "Session access",
}: SessionScopePickerProps) {
  const allIds = sessions.map((s) => s.id);
  const valid = (value || []).filter((id) => allIds.includes(id));
  const checked = (id: string) => value === null || valid.includes(id);
  const toggleAll = () => onChange(value === null ? [] : null);
  const toggle = (id: string) => {
    const base = value === null ? allIds : valid;
    const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    // every session ticked is the same thing as "All Sessions"
    onChange(next.length === allIds.length ? null : next);
  };
  const box = "check-orange";

  return (
    <fieldset className="space-y-1.5">
      <legend className="block text-xs font-semibold text-gray-800 mb-1.5">{label}</legend>
      {loading ? (
        <SkeletonRegion label="Loading sessions" className="space-y-2"><Skeleton className="h-9" /></SkeletonRegion>
      ) : error ? (
        <p className="text-xs text-rose-600 break-words">{error}</p>
      ) : (
        <>
          <div className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-56 overflow-auto bg-white">
            <label className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-900 cursor-pointer">
              <input type="checkbox" checked={value === null} onChange={toggleAll} className={box} />
              {/* one session is the whole event: its name, not "All Sessions (1)" */}
              {sessions.length === 1 ? <span className="min-w-0 break-words">{sessions[0].name}</span> : <>All Sessions{sessions.length ? ` (${sessions.length})` : ""}</>}
            </label>
            {sessions.length > 1 && sessions.map((s) => (
              <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 pl-8 text-sm text-gray-800 cursor-pointer">
                <input type="checkbox" checked={checked(s.id)} onChange={() => toggle(s.id)} className={box} />
                <span className="min-w-0 break-words">{s.name}</span>
              </label>
            ))}
          </div>
          {value !== null && valid.length === 0 && sessions.length > 0 && <p className="text-[11px] text-amber-700">Tick at least one session, or choose &quot;All Sessions&quot;.</p>}
          {sessions.length === 0 && <p className="text-[11px] text-gray-500">This event has no sessions yet; staff can check guests in at the event entry.</p>}
        </>
      )}
    </fieldset>
  );
}
