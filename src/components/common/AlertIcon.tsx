import React from "react";

export type AlertIconKind = "success" | "error" | "warning" | "info" | "question";

// The icon at the top of every popup: a clean outlined symbol in its own colour, with no circle or fill behind it.
const COLOR: Record<AlertIconKind, string> = {
  success: "text-[#16A34A]",
  error: "text-[#D92D20]",
  warning: "text-[#E8890C]",
  info: "text-[#2563EB]",
  question: "text-[#D92D20]",
};

export default function AlertIcon({ kind, className = "w-14 h-14 mx-auto" }: { kind: AlertIconKind; className?: string }) {
  const common = { className: `${className} ${COLOR[kind]}`, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (kind) {
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
