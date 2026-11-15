// The invitee fields an event collects, in one place: the Excel sample's columns, the Excel preview, and the manual Add
// Invitee form are all built from this list, so they can never drift apart.

import { meaningOf } from "./columnMeaning.ts";

export type InviteeFieldKey = "name" | "email" | "mobile" | "company" | "identity" | "identity2";

export interface InviteeFieldConfig {
  /** Company chosen under Additional Information (the event's category does not add it) */
  company?: boolean;
  /** Professional identity chosen for the invitation card */
  identity?: boolean;
  /** The organizer's own title for that detail (e.g. "Designation"); the standard title is used when empty */
  identityLabel?: string;
  /** A second custom detail, when both card lines carry one, and its title */
  identity2?: boolean;
  identity2Label?: string;
  /** A custom title that means a column the sample already has ("Ph No" for Mobile) renames that column instead of adding a new one */
  columnTitles?: Partial<Record<"name" | "email" | "mobile", string>>;
  /** Kept for callers; the food choice is never a column or a form field: the guest makes it on the invitation page */
  dietary?: boolean;
}

/** Excel column heading for each field (the backend import recognises these) */
export const EXCEL_HEADER: Record<InviteeFieldKey, string> = {
  name: "Name",
  email: "Email",
  mobile: "Mobile",
  company: "Company Name",
  identity: "Professional Identity",
  identity2: "Second Identity",
};

export const EXCEL_EXAMPLE: Record<InviteeFieldKey, string> = {
  name: "Guest Name",
  email: "guest@example.com",
  mobile: "+919876543210",
  company: "Company",
  identity: "Employee ID: 4521",
  identity2: "Sample value",
};

interface CardInfoLike { primary?: string | null; secondary?: string | null; identityLabel?: string | null; secondaryIdentityLabel?: string | null }

export function inviteeConfigFor(opts: { cardInfo?: CardInfoLike | null; dietaryEnabled?: boolean; /** Ignored: kept so callers need no change; the category never adds a column */ corporate?: boolean }): InviteeFieldConfig {
  const chosen = [opts.cardInfo?.primary, opts.cardInfo?.secondary];
  const titleOf = (field: "PROFESSIONAL_IDENTITY" | "SECONDARY_IDENTITY") => ((field === "PROFESSIONAL_IDENTITY" ? opts.cardInfo?.identityLabel : opts.cardInfo?.secondaryIdentityLabel) || "").trim();
  const columnTitles: NonNullable<InviteeFieldConfig["columnTitles"]> = {};
  // a custom detail whose title only renames Name, Email or Mobile adds no column: that column takes the title
  const own = (field: "PROFESSIONAL_IDENTITY" | "SECONDARY_IDENTITY") => {
    if (!chosen.includes(field)) return false;
    const m = meaningOf(titleOf(field));
    if (m === "name" || m === "email" || m === "mobile") { if (!columnTitles[m]) columnTitles[m] = titleOf(field); return false; }
    return true;
  };
  const identity = own("PROFESSIONAL_IDENTITY");
  const identity2 = own("SECONDARY_IDENTITY");
  return {
    company: chosen.includes("COMPANY_NAME"),
    identity,
    identityLabel: identity ? titleOf("PROFESSIONAL_IDENTITY") || undefined : undefined,
    identity2,
    identity2Label: identity2 ? titleOf("SECONDARY_IDENTITY") || undefined : undefined,
    columnTitles: Object.keys(columnTitles).length ? columnTitles : undefined,
    dietary: Boolean(opts.dietaryEnabled),
  };
}

export function inviteeFieldsFor(config: InviteeFieldConfig): InviteeFieldKey[] {
  return [
    "name", "email", "mobile",
    // what the organizer chose to print on the card comes straight after the three standard columns
    ...(config.identity ? (["identity"] as const) : []),
    ...(config.identity2 ? (["identity2"] as const) : []),
    ...(config.company ? (["company"] as const) : []),
  ];
}

/** The Excel column heading / form label for a field in this event: the organizer's own title for the custom detail, otherwise the standard one */
export const headerFor = (key: InviteeFieldKey, config: InviteeFieldConfig = {}): string => ((key === "name" || key === "email" || key === "mobile") && config.columnTitles?.[key] ? config.columnTitles[key]! : key === "identity" && config.identityLabel?.trim() ? config.identityLabel.trim() : key === "identity2" && config.identity2Label?.trim() ? config.identity2Label.trim() : EXCEL_HEADER[key]);

export const excelColumnsFor = (config: InviteeFieldConfig): string[] => inviteeFieldsFor(config).map((k) => headerFor(k, config));

/** One example row for the Excel sample: a cell for every column, in the same order */
export function templateRow(config: InviteeFieldConfig = {}): Record<string, string> {
  return Object.fromEntries(inviteeFieldsFor(config).map((k) => [headerFor(k, config), k === "identity" && config.identityLabel?.trim() ? "Sample value" : EXCEL_EXAMPLE[k]]));
}

export interface ExpectedColumn { key: InviteeFieldKey; header: string }

/** The columns an uploaded sheet must have for this event: the same list as the sample Excel */
export const expectedColumnsFor = (config: InviteeFieldConfig): ExpectedColumn[] => inviteeFieldsFor(config).map((key) => ({ key, header: headerFor(key, config) }));
