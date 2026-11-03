// Event wizard form model shared by the create and edit flows.
// All dates are ISO strings (see utils/dateTime.ts); payload builders produce the exact backend contract.

import { addHours, isAfter, isValidIso, nextWholeHourIso, parseIso } from "@/utils/dateTime";
import { resolveImageUrl } from "@/utils/mediaUrl";
import { EVENT_TITLE_MAX_LENGTH, EVENT_DESCRIPTION_MAX_LENGTH, EVENT_LOCATION_MAX_LENGTH } from "@/utils/eventLimits.mjs";
import type { CreateEventRequest, UpdateEventRequest } from "@/services/eventService";
import type { SessionRequest } from "@/services/sessionService";

export type AccessControl = "NO_RESTRICTION" | "ONLY_ONCE";
// NEW_LIST: the session has its own invitee list; COPY_SESSION: it keeps another session's invitees
export type InviteeSource = "NEW_LIST" | "COPY_SESSION";

export interface DraftSession {
  key: string; // stable client key
  backendId?: string; // set for sessions that already exist on the server (edit flow)
  name: string;
  start: string;
  end: string;
  accessControl: AccessControl;
  // Only meaningful on the first (primary) session
  validateAgainstOtherSessions: boolean;
  inviteeSource: InviteeSource;
  // Client key of the session whose invitees are reused (COPY_SESSION only)
  sourceSessionKey: string | null;
  // While true, the session follows the event's start/end; editing the session's own times unlinks it
  timesLinked: boolean;
}

export interface PreferenceCategory {
  id: string;
  title: string;
  options: string[];
}

export interface SelectedTemplate {
  id: string;
  name: string;
  // Stored image reference of the template (resolve with utils/mediaUrl.ts when rendering)
  previewKey?: string | null;
}

// "Additional Info" (Figma Event_Add event-5): guest details printed on the card's two guest lines
export type CardInfoField = "INVITEE_NAME" | "COMPANY_NAME" | "PROFESSIONAL_IDENTITY" | "SECONDARY_IDENTITY";
export interface CardInfo {
  primary: CardInfoField | null;
  secondary: CardInfoField | null;
  /** The organizer's own title for the custom detail ("Designation"); empty uses the standard title */
  identityLabel?: string | null;
  /** The same for a second custom detail, when both lines carry one */
  secondaryIdentityLabel?: string | null;
}
export const CUSTOM_DETAIL = "CUSTOM";
export const CARD_INFO_OPTIONS: { value: string; label: string }[] = [
  { value: "INVITEE_NAME", label: "Invitee Name" },
  { value: "COMPANY_NAME", label: "Company Name" },
  { value: CUSTOM_DETAIL, label: "Custom detail (add your own title)" },
];

export const isCustomDetail = (f: CardInfoField | null | undefined): boolean => f === "PROFESSIONAL_IDENTITY" || f === "SECONDARY_IDENTITY";
/** Each card line that carries a custom detail keeps its own field, title and Excel column */
export const customFieldFor = (other: CardInfoField | null): CardInfoField => (other === "PROFESSIONAL_IDENTITY" ? "SECONDARY_IDENTITY" : "PROFESSIONAL_IDENTITY");
export const customTitleKey = (f: CardInfoField | null | undefined): "identityLabel" | "secondaryIdentityLabel" => (f === "SECONDARY_IDENTITY" ? "secondaryIdentityLabel" : "identityLabel");

export interface EventDraft {
  organizerIds: string[];
  title: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  contactNumber: string;
  /** Event Location: mandatory, printed on the card */
  venue: string;
  /** Address: optional full address / directions */
  addressDetails?: string;
  /** Where the venue was pinned on the map (the "Verify" step); cleared when the address text changes */
  venuePin?: { lat: number; lng: number } | null;
  start: string;
  end: string;
  rsvpEnabled: boolean;
  rsvpDeadline: string | null;
  /** kept only so older saved drafts still load; the setting was removed from Add Event */
  thresholdLimit?: string;
  allowAllInvited: boolean;
  allowNotResponded: boolean;
  allowDeclined: boolean;
  dietaryEnabled: boolean;
  preferenceCategories: PreferenceCategory[];
  template: SelectedTemplate | null;
  /** null until the organiser saves a choice; the card then keeps guest name, then company */
  cardInfo?: CardInfo | null;
  // Uploaded event logo ("media:<id>"), shown on the card preview
  logoKey: string | null;
  sessions: DraftSession[];
  skipInvitees: boolean;
}

export const EVENT_DRAFT_VERSION = 1;

let keyCounter = 0;
export function newClientKey(prefix = "k"): string {
  keyCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${keyCounter}`;
}

export function createSessionDraft(name: string, start: string, end: string): DraftSession {
  return {
    key: newClientKey("session"),
    name,
    start,
    end,
    accessControl: "ONLY_ONCE",
    validateAgainstOtherSessions: false,
    inviteeSource: "NEW_LIST",
    sourceSessionKey: null,
    timesLinked: true,
  };
}

export function createEmptyEventDraft(): EventDraft {
  const start = nextWholeHourIso();
  const end = addHours(start, 4);
  return {
    organizerIds: [],
    title: "",
    description: "",
    categoryId: "",
    subcategoryId: "",
    contactNumber: "",
    venue: "",
    venuePin: null,
    start,
    end,
    rsvpEnabled: true,
    rsvpDeadline: null,
    thresholdLimit: "",
    allowAllInvited: true,
    allowNotResponded: false,
    allowDeclined: false,
    dietaryEnabled: false,
    preferenceCategories: [{ id: newClientKey("pref"), title: "Dietary Preference", options: [""] }],
    template: null,
    cardInfo: null,
    logoKey: null,
    sessions: [createSessionDraft("Entry Session", start, end)],
    skipInvitees: true,
  };
}

// Drafts saved by earlier versions of the form lack newer fields; fill them so a restored draft is never lost
export function normalizeEventDraft(raw: EventDraft): EventDraft {
  const base = createEmptyEventDraft();
  const sessions = (Array.isArray(raw?.sessions) && raw.sessions.length ? raw.sessions : base.sessions).map((s, index) => ({
    ...createSessionDraft(s.name ?? "", s.start, s.end),
    ...s,
    inviteeSource: s.inviteeSource === "COPY_SESSION" && index > 0 ? ("COPY_SESSION" as const) : ("NEW_LIST" as const),
    sourceSessionKey: s.inviteeSource === "COPY_SESSION" && index > 0 ? s.sourceSessionKey ?? null : null,
    validateAgainstOtherSessions: index === 0 ? !!s.validateAgainstOtherSessions : false,
  }));
  // Older drafts stored a resolved preview URL under `previewUrl`
  const legacyTemplate = raw?.template as (SelectedTemplate & { previewUrl?: string | null }) | null | undefined;
  const template = legacyTemplate
    ? { id: legacyTemplate.id, name: legacyTemplate.name, previewKey: legacyTemplate.previewKey ?? legacyTemplate.previewUrl ?? null }
    : null;
  const organizerIds = Array.isArray(raw?.organizerIds) ? raw.organizerIds : [];
  return { ...base, ...raw, organizerIds, template, logoKey: raw?.logoKey ?? null, sessions };
}

// Changing the event window moves every session that still follows it
export function applyEventWindow(draft: EventDraft, patch: { start?: string; end?: string }): EventDraft {
  const next = { ...draft, ...patch };
  return {
    ...next,
    sessions: next.sessions.map((s) => (s.timesLinked ? { ...s, start: next.start, end: next.end } : s)),
  };
}

export function hasMeaningfulContent(draft: EventDraft): boolean {
  return Boolean(
    draft.title.trim() ||
      draft.description.trim() ||
      draft.venue.trim() ||
      draft.contactNumber.trim() ||
      draft.template ||
      draft.logoKey ||
      draft.organizerIds.length > 0 ||
      draft.sessions.some((s) => !s.timesLinked || s.name !== "Entry Session")
  );
}

export type DraftErrors = Record<string, string>;

export interface DraftValidationOptions {
  // True when the chosen category offers subcategories
  subcategoryRequired?: boolean;
}

export function validateEventDraft(draft: EventDraft, options: DraftValidationOptions = {}): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.title.trim()) errors.title = "Title is required.";
  else if (draft.title.trim().length > EVENT_TITLE_MAX_LENGTH) errors.title = `Title cannot exceed ${EVENT_TITLE_MAX_LENGTH} characters.`;
  if (draft.description.length > EVENT_DESCRIPTION_MAX_LENGTH) errors.description = `Description cannot exceed ${EVENT_DESCRIPTION_MAX_LENGTH} characters.`; // optional: empty is fine
  if (!draft.categoryId) errors.categoryId = "Choose an event category.";
  else if (options.subcategoryRequired && !draft.subcategoryId) errors.subcategoryId = "Choose a subcategory.";
  const contactDigits = draft.contactNumber.replace(/\D/g, "");
  if (!contactDigits) errors.contactNumber = "Contact number is required.";
  else if (contactDigits.length < 7 || contactDigits.length > 15) errors.contactNumber = "Enter a valid contact number.";
  if (!draft.venue.trim()) errors.venue = "Event location is required.";
  else if (draft.venue.trim().length > EVENT_LOCATION_MAX_LENGTH) errors.venue = `Event location cannot exceed ${EVENT_LOCATION_MAX_LENGTH} characters.`;
  if (!isValidIso(draft.start)) errors.start = "Choose a start date and time.";
  if (!isValidIso(draft.end)) errors.end = "Choose an end date and time.";
  else if (!isAfter(draft.end, draft.start)) errors.end = "End must be after the start.";
  if (draft.rsvpEnabled && draft.rsvpDeadline && isAfter(draft.rsvpDeadline, draft.end)) {
    errors.rsvpDeadline = "RSVP deadline should be before the event ends.";
  }
  if (draft.dietaryEnabled) {
    const hasMissingOptions = draft.preferenceCategories.some((category) => !category.options.some((option) => option.trim()));
    if (hasMissingOptions) errors.dietaryPreference = "Add at least one dietary option for each question before continuing.";
  }

  if (draft.cardInfo) {
    const titles = [draft.cardInfo.primary, draft.cardInfo.secondary].filter(isCustomDetail).map((f) => (draft.cardInfo![customTitleKey(f)] || "").trim());
    if (titles.some((t) => !t)) errors.cardInfo = "Enter a title for each custom detail.";
    else if (titles.length === 2 && titles[0].toLowerCase() === titles[1].toLowerCase()) errors.cardInfo = "The two custom details need different titles: each one becomes its own Excel column.";
  }

  const start = parseIso(draft.start);
  const end = parseIso(draft.end);
  draft.sessions.forEach((s, index) => {
    if (!s.name.trim()) errors[`session:${s.key}:name`] = "Session name is required.";
    if (s.inviteeSource === "COPY_SESSION") {
      const sourceIndex = draft.sessions.findIndex((o) => o.key === s.sourceSessionKey);
      if (index === 0 || sourceIndex < 0 || sourceIndex >= index || draft.sessions[sourceIndex].inviteeSource !== "NEW_LIST") {
        errors[`session:${s.key}:source`] = "Choose an earlier session that has its own invitee list.";
      }
    }
    if (!isAfter(s.end, s.start)) {
      errors[`session:${s.key}:time`] = "Session end must be after its start.";
    } else if (start && end) {
      const ss = parseIso(s.start)!;
      const se = parseIso(s.end)!;
      if (ss < start || se > end) errors[`session:${s.key}:time`] = "Session must fall within the event start and end.";
    }
  });
  return errors;
}

export function stepOfError(key: string): 1 | 2 | 3 {
  if (key.startsWith("session:")) return 3;
  if (key === "dietaryPreference" || key === "cardInfo") return 2;
  return 1;
}

function buildDietaryPreference(draft: EventDraft) {
  const categories = draft.preferenceCategories
    .map((c) => ({ title: c.title.trim(), options: c.options.map((o) => o.trim()).filter(Boolean) }))
    .filter((c) => c.title || c.options.length);
  if (categories.length <= 1) {
    return { enabled: draft.dietaryEnabled, title: categories[0]?.title || undefined, options: categories[0]?.options || [] };
  }
  // Several preference groups are stored as structured options
  return { enabled: draft.dietaryEnabled, title: categories[0].title || undefined, options: categories };
}

function commonPayload(draft: EventDraft) {
  return {
    title: draft.title.trim(),
    // optional: an empty description falls back to the title
    description: draft.description.trim() || draft.title.trim(),
    ...(draft.organizerIds && draft.organizerIds.length > 0
      ? { organizerIds: draft.organizerIds, organizerId: draft.organizerIds[0] }
      : {}),
    ...(draft.categoryId ? { categoryId: draft.categoryId } : {}),
    ...(draft.subcategoryId ? { subcategoryId: draft.subcategoryId } : {}),
    ...(draft.contactNumber.trim() ? { contactNumber: draft.contactNumber.trim() } : {}),
    ...(draft.venue.trim()
      ? { location: { address: draft.venue.trim(), ...(draft.addressDetails?.trim() ? { addressDetails: draft.addressDetails.trim() } : {}) } }
      : {}),
    schedule: { start: draft.start, end: draft.end },
    rsvp: {
      enabled: draft.rsvpEnabled,
      ...(draft.rsvpEnabled && draft.rsvpDeadline ? { acceptanceLastDate: draft.rsvpDeadline } : {}),
      allowAllInvited: draft.allowAllInvited,
      allowNotResponded: draft.allowNotResponded,
      allowDeclined: draft.allowDeclined,
    },
    dietaryPreference: buildDietaryPreference(draft),
    ...(draft.template ? { templateId: draft.template.id } : {}),
    ...(draft.cardInfo ? { cardInfo: draft.cardInfo } : {}),
    // An empty key clears a previously saved logo
    media: { logoKey: draft.logoKey || "" },
  };
}

export function draftToCreatePayload(draft: EventDraft): CreateEventRequest {
  return { ...commonPayload(draft), format: "PHYSICAL" };
}

export function draftToUpdatePayload(draft: EventDraft): UpdateEventRequest {
  return commonPayload(draft);
}

// `isPrimary`: the first session carries the cross-session validation flag.
// `backendIdOf` maps a session's client key to its saved id (sources are saved before the sessions copying them).
export function sessionToRequest(s: DraftSession, isPrimary: boolean, backendIdOf: (key: string) => string | undefined): SessionRequest {
  const sourceId = s.inviteeSource === "COPY_SESSION" && s.sourceSessionKey ? backendIdOf(s.sourceSessionKey) : undefined;
  return {
    name: s.name.trim(),
    schedule: { start: s.start, end: s.end },
    accessControl: s.accessControl,
    validateAgainstOtherSessions: isPrimary ? s.validateAgainstOtherSessions : false,
    ...(sourceId ? { inviteeSource: "COPY_SESSION" as const, sourceSessionId: sourceId } : { inviteeSource: "NEW_LIST" as const, sourceSessionId: null }),
  };
}

type RefOrId = string | { _id: string; name?: string } | null | undefined;

// Shape of GET /api/v1/events/:id (with category/template populated) as used by the edit flow
export interface ServerEvent {
  title?: string;
  description?: string;
  categoryId?: RefOrId;
  subcategoryId?: RefOrId;
  contactNumber?: string;
  location?: string | { address?: string; coordinates?: { coordinates?: [number, number] } };
  schedule?: { start?: string; end?: string };
  admission?: { opensAt?: string | null; closesAt?: string | null };
  rsvp?: { enabled?: boolean; acceptanceLastDate?: string; allowAllInvited?: boolean; allowNotResponded?: boolean; allowDeclined?: boolean };
  attendeeSettings?: { thresholdLimit?: number };
  dietaryPreference?: { enabled?: boolean; title?: string; options?: unknown[] };
  templateId?: string | { _id: string; name: string; previewImageKey?: string } | null;
  cardInfo?: { primary?: CardInfoField | null; secondary?: CardInfoField | null; identityLabel?: string | null; secondaryIdentityLabel?: string | null };
  media?: { logoKey?: string };
  updatedAt?: string;
}

export interface ServerSession {
  _id?: string;
  id?: string;
  name?: string;
  schedule?: { start?: string; end?: string };
  accessControl?: string;
  validateAgainstOtherSessions?: boolean;
  inviteeSource?: string;
  sourceSessionId?: string | null;
}

// Server event (+ its sessions) -> editable draft
// GeoJSON stores [longitude, latitude]; the form works in { lat, lng }
function pinOf(location: unknown): { lat: number; lng: number } | null {
  const pair = typeof location === "object" && location ? (location as { coordinates?: { coordinates?: unknown } }).coordinates?.coordinates : null;
  return Array.isArray(pair) && pair.length === 2 && pair.every((n) => typeof n === "number" && Number.isFinite(n)) ? { lng: pair[0], lat: pair[1] } : null;
}

export function eventToDraft(event: ServerEvent, sessions: ServerSession[]): EventDraft {
  const base = createEmptyEventDraft();
  const start = event?.schedule?.start || base.start;
  const end = event?.schedule?.end || base.end;
  const idOf = (v: RefOrId) => (v && typeof v === "object" ? v._id || "" : v || "");

  const rawOptions: unknown[] = Array.isArray(event?.dietaryPreference?.options) ? event.dietaryPreference.options : [];
  const structured = rawOptions.length > 0 && typeof rawOptions[0] === "object" && rawOptions[0] !== null;
  const preferenceCategories: PreferenceCategory[] = structured
    ? (rawOptions as { title?: string; options?: string[] }[]).map((c) => ({
        id: newClientKey("pref"),
        title: c.title || "",
        options: Array.isArray(c.options) && c.options.length ? c.options.map(String) : [""],
      }))
    : [{ id: newClientKey("pref"), title: event?.dietaryPreference?.title || "Dietary Preference", options: rawOptions.length ? rawOptions.map(String) : [""] }];

  const template = event?.templateId && typeof event.templateId === "object"
    ? { id: event.templateId._id, name: event.templateId.name, previewKey: event.templateId.previewImageKey || null }
    : event?.templateId
      ? { id: String(event.templateId), name: "Selected template", previewKey: null }
      : null;

  return {
    ...base,
    title: event?.title || "",
    description: event?.description || "",
    categoryId: idOf(event?.categoryId),
    subcategoryId: idOf(event?.subcategoryId),
    contactNumber: event?.contactNumber || "",
    venue: typeof event?.location === "string" ? event.location : event?.location?.address || "",
    venuePin: pinOf(event?.location),
    addressDetails: typeof event?.location === "object" && event?.location ? (event.location as { addressDetails?: string }).addressDetails || "" : "",
    start,
    end,
    rsvpEnabled: event?.rsvp?.enabled ?? base.rsvpEnabled,
    rsvpDeadline: event?.rsvp?.acceptanceLastDate || null,
    allowAllInvited: event?.rsvp?.allowAllInvited ?? base.allowAllInvited,
    allowNotResponded: event?.rsvp?.allowNotResponded ?? base.allowNotResponded,
    allowDeclined: event?.rsvp?.allowDeclined ?? base.allowDeclined,
    dietaryEnabled: event?.dietaryPreference?.enabled ?? false,
    preferenceCategories,
    cardInfo: event?.cardInfo && (event.cardInfo.primary !== undefined || event.cardInfo.secondary !== undefined)
      ? { primary: event.cardInfo.primary ?? null, secondary: event.cardInfo.secondary ?? null, identityLabel: event.cardInfo.identityLabel ?? null, secondaryIdentityLabel: event.cardInfo.secondaryIdentityLabel ?? null }
      : null,
    template,
    logoKey: event?.media?.logoKey || null,
    sessions: draftSessionsFromServer(sessions || [], start, end),
    skipInvitees: true,
  };
}

// Server sessions in creation order (the first one is the primary session), with source links mapped to client keys
function draftSessionsFromServer(sessions: ServerSession[], start: string, end: string): DraftSession[] {
  const ordered = [...sessions].sort((a, b) => String(a._id || a.id || "").localeCompare(String(b._id || b.id || "")));
  const keyById = new Map<string, string>();
  const drafts = ordered.map((s, index) => {
    const key = newClientKey("session");
    keyById.set(String(s._id || s.id), key);
    return {
      key,
      backendId: s._id || s.id,
      name: s.name || "",
      start: s.schedule?.start || start,
      end: s.schedule?.end || end,
      accessControl: (s.accessControl === "NO_RESTRICTION" ? "NO_RESTRICTION" : "ONLY_ONCE") as AccessControl,
      validateAgainstOtherSessions: index === 0 && !!s.validateAgainstOtherSessions,
      inviteeSource: "NEW_LIST" as InviteeSource,
      sourceSessionKey: null as string | null,
      timesLinked: false,
    };
  });
  ordered.forEach((s, index) => {
    if (s.inviteeSource === "COPY_SESSION" && s.sourceSessionId && keyById.has(String(s.sourceSessionId))) {
      drafts[index].inviteeSource = "COPY_SESSION";
      drafts[index].sourceSessionKey = keyById.get(String(s.sourceSessionId)) || null;
    }
  });
  return drafts;
}

export const templatePreviewUrl = resolveImageUrl;
