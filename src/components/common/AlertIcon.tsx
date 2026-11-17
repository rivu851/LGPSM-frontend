import React from "react";

// Besides the general symbols, a popup can name one drawn for what it says: "userAdded" (a person with a green tick: someone was added),
// "draft" (a calendar page with a pencil, amber: an unfinished event) and "discard" (a bin, red: throwing something away).
export type AlertIconKind = "success" | "error" | "warning" | "info" | "question" | "userAdded" | "draft" | "discard";

// The icon at the top of every popup: a clean outlined symbol in its own colour, with no circle or fill behind it.
const COLOR: Record<AlertIconKind, string> = {
  success: "text-[#16A34A]",
  error: "text-[#D92D20]",
  warning: "text-[#E8890C]",
  info: "text-[#2563EB]",
  question: "text-[#D92D20]",
  userAdded: "text-[#16A34A]",
  draft: "text-[#E8890C]",
  discard: "text-[#D92D20]",
};

export default function AlertIcon({ kind, className = "w-14 h-14 mx-auto" }: { kind: AlertIconKind; className?: string }) {
  const common = { className: `${className} ${COLOR[kind]}`, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (kind) {
    case "userAdded":
      return <svg {...common}><circle cx="9.5" cy="8" r="3.4" /><path d="M3.2 19.8c.4-3.5 3-5.8 6.3-5.8 1.1 0 2.1.2 3 .7" /><circle cx="17.6" cy="16.7" r="4.5" fill="currentColor" stroke="none" /><path d="M15.4 16.8l1.6 1.6 2.9-3.2" stroke="#FFFFFF" strokeWidth={1.8} /></svg>;
    case "draft":
      return <svg {...common}><path d="M4.5 5.5h15A1.5 1.5 0 0121 7v11.5a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 18.5V7a1.5 1.5 0 011.5-1.5z" /><path d="M3 10h18M8 3.3v3.4M16 3.3v3.4" /><path d="M9.3 17.6l.5-2.3 4.8-4.8 1.8 1.8-4.8 4.8z" /></svg>;
    case "discard":
      return <svg {...common}><path d="M4 6.5h16M9.5 6.5V4.3a1 1 0 011-1h3a1 1 0 011 1v2.2" /><path d="M6.2 6.5l.8 12.4a1.8 1.8 0 001.8 1.7h6.4a1.8 1.8 0 001.8-1.7l.8-12.4" /><path d="M10 10.5v6.2M14 10.5v6.2" /></svg>;
    case "success":
      return <svg {...common}><circle cx="12" cy="12" r="9.25" /><path d="M7.9 12.4l2.8 2.8 5.5-5.8" /></svg>;
    case "error":
      return <svg {...common}><circle cx="12" cy="12" r="9.25" /><path d="M9 9l6 6M15 9l-6 6" /></svg>;
    case "warning":
      return <svg {...common}><path d="M10.3 4.2L2.9 17.4A2 2 0 004.6 20.4h14.8a2 2 0 001.7-3L13.7 4.2a2 2 0 00-3.4 0z" /><path d="M12 9.5v4.3" /><circle cx="12" cy="16.7" r=".6" fill="currentColor" stroke="none" /></svg>;
    case "info":
      return <svg {...common}><circle cx="12" cy="12" r="9.25" /><path d="M12 11v5.2" /><circle cx="12" cy="7.9" r=".6" fill="currentColor" stroke="none" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9.25" /><path d="M9.4 9.4a2.7 2.7 0 015.2.9c0 1.8-2.6 2.3-2.6 3.9" /><circle cx="12" cy="17.2" r=".6" fill="currentColor" stroke="none" /></svg>;
  }
}
