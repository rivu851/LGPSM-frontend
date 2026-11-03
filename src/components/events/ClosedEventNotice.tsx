"use client";

import { isHistoricalEvent } from "@/utils/eventUtils";

// Shown where an event's guests, sessions or staff would otherwise be editable. The server refuses those changes for a closed or
// cancelled event; this says so up front instead of offering buttons that can only fail.
export default function ClosedEventNotice({ status }: { status?: string }) {
  if (!isHistoricalEvent(status)) return null;
  return (
    <div role="status" className="p-3.5 rounded-md border border-[#E0E0E0] bg-[#F4F4F4] text-sm text-[#4B4F52]">
      This event has been {status === "CANCELLED" ? "cancelled" : "closed"}. What is shown here is kept as a record and can no longer be changed.
    </div>
  );
}
