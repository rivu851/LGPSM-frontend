import type React from "react";

/** Clicking anywhere on a date field opens its calendar (browsers otherwise open it only from the small icon). */
export const openDatePicker = (e: React.MouseEvent<HTMLInputElement>) => {
  const input = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
  try { input.showPicker?.(); } catch { /* already open, or not allowed here: the icon still works */ }
};
