// The invitee fields an event collects, in one place: the Excel sample's columns, the Excel preview, and the manual Add
// Invitee form are all built from this list, so they can never drift apart.

export type InviteeFieldKey = "name" | "email" | "mobile" | "company" | "identity" | "identity2";

export interface InviteeFieldConfig {
  /** The event shows a company (corporate events, or company chosen for the invitation card) */
  company?: boolean;
  /** Professional identity chosen for the invitation card */
  identity?: boolean;
  /** The organizer's own title for that detail (e.g. "Designation"); the standard title is used when empty */
  identityLabel?: string;
  /** A second custom detail, when both card lines carry one, and its title */
  identity2?: boolean;
  identity2Label?: string;
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

export function inviteeConfigFor(opts: { cardInfo?: CardInfoLike | null; dietaryEnabled?: boolean; corporate?: boolean }): InviteeFieldConfig {
  const chosen = [opts.cardInfo?.primary, opts.cardInfo?.secondary];
  return {
    company: Boolean(opts.corporate) || chosen.includes("COMPANY_NAME"),
    identity: chosen.includes("PROFESSIONAL_IDENTITY"),
    identityLabel: chosen.includes("PROFESSIONAL_IDENTITY") ? (opts.cardInfo?.identityLabel || "").trim() || undefined : undefined,
    identity2: chosen.includes("SECONDARY_IDENTITY"),
    identity2Label: chosen.includes("SECONDARY_IDENTITY") ? (opts.cardInfo?.secondaryIdentityLabel || "").trim() || undefined : undefined,
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
export const headerFor = (key: InviteeFieldKey, config: InviteeFieldConfig = {}): string => (key === "identity" && config.identityLabel?.trim() ? config.identityLabel.trim() : key === "identity2" && config.identity2Label?.trim() ? config.identity2Label.trim() : EXCEL_HEADER[key]);

export const excelColumnsFor = (config: InviteeFieldConfig): string[] => inviteeFieldsFor(config).map((k) => headerFor(k, config));

/** One example row for the Excel sample: a cell for every column, in the same order */
export function templateRow(config: InviteeFieldConfig = {}): Record<string, string> {
  return Object.fromEntries(inviteeFieldsFor(config).map((k) => [headerFor(k, config), k === "identity" && config.identityLabel?.trim() ? "Sample value" : EXCEL_EXAMPLE[k]]));
}

export interface ExpectedColumn { key: InviteeFieldKey; header: string }

/** The columns an uploaded sheet must have for this event: the same list as the sample Excel */
export const expectedColumnsFor = (config: InviteeFieldConfig): ExpectedColumn[] => inviteeFieldsFor(config).map((key) => ({ key, header: headerFor(key, config) }));
