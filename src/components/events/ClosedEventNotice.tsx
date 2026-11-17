"use client";

import { isEventOver } from "@/utils/eventUtils";

// Shown where an event's guests, sessions or staff would otherwise be editable. The server refuses those changes for a closed,
// cancelled or finished event; this says so up front instead of offering buttons that can only fail.
export default function ClosedEventNotice({ status, endsAt }: { status?: string; endsAt?: unknown }) {
  if (!isEventOver({ status, schedule: { end: endsAt } })) return null;
  const what = status === "CANCELLED" ? "has been cancelled" : status === "COMPLETED" ? "has been closed" : "is over";
  return (
    <div role="status" className="p-3.5 rounded-md border border-[#E0E0E0] bg-[#F4F4F4] text-sm text-[#4B4F52]">
      This event {what}. What is shown here is kept as a record and can no longer be changed.
    </div>
  );
}
