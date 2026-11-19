"use client";

import { isEventOver } from "@/utils/eventUtils";

// Shown where an event's guests, sessions or staff would otherwise be editable. The server refuses those changes for a closed,
// cancelled or finished event; this says so up front instead of offering buttons that can only fail.
// Drawn as a notice (amber, with a lock) rather than plain text, so it is not mistaken for a field.
export default function ClosedEventNotice({ status, endsAt }: { status?: string; endsAt?: unknown }) {
  if (!isEventOver({ status, schedule: { end: endsAt } })) return null;
  const cancelled = status === "CANCELLED";
  const closed = status === "COMPLETED";
  const title = cancelled ? "This event was cancelled" : closed ? "This event is closed" : "This event is over";
  return (
    <div role="status" className="flex items-start gap-3 rounded-lg border border-[#F5C26B] border-l-4 border-l-[#E8890C] bg-[#FFF7E6] px-4 py-3">
      <svg className="mt-0.5 size-6 shrink-0 text-[#C26A00]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="5" y="11" width="14" height="9.5" rx="2" />
        <path d="M8 11V8a4 4 0 018 0v3" />
        <path d="M12 15v2.2" />
      </svg>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#7A4300]">{title}: view only</p>
        <p className="text-sm text-[#7A4300]/90">What is shown here is kept as a record and can no longer be changed.</p>
      </div>
    </div>
  );
}
