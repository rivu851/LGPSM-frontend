import { apiClient, ApiResponse } from "./apiClient";

// Mirrors Backend models/PlatformSettings.ts
export interface EventFeatureSettings {
  allowEventRSVP: boolean;
  acceptInvitedAttendees: boolean;
  chooseNotRespondedInvitees: boolean;
  chooseRSVPDeclinedInvitees: boolean;
  askFoodPreference: boolean;
}

export interface NotificationPreferences {
  newOrganizerRegistration: boolean;
  newEventAdded: boolean;
  deactivatedOrganizerBySuperAdmin: boolean;
  changeInPrice: boolean;
  invitationSendFailed: boolean;
  dayBeforeEventAlert: boolean;
  reportDownload: boolean;
  customTemplateRequest: boolean;
}

export interface PriceRateChange {
  _id: string;
  previousRate: number | null;
  newRate: number;
  currency: string;
  changedBy?: { fullName?: string; email?: string } | string;
  createdAt: string;
}

export interface PricingSettings {
  ratePerInvitee: number | null;
  currency: string;
  updatedAt: string | null;
  history: PriceRateChange[];
}

export interface EarningsRow {
  eventId: string;
  eventName: string;
  organizerId: string | null;
  organizerName: string;
  eventStart?: string;
  createdAt: string;
  invitesSent: number;
  ratePerInvitee: number | null;
  rateSource: "locked" | "historical" | "unset";
  amount: number | null;
}

export interface EarningsData {
  currency: string;
  currentRate: number | null;
  totalAmount: number;
  totalInvitesSent: number;
  eventsWithoutRate: number;
  events: EarningsRow[];
}

// Used while the real settings load or if they cannot be read; every option stays available
export const ALL_EVENT_FEATURES: EventFeatureSettings = {
  allowEventRSVP: true,
  acceptInvitedAttendees: true,
  chooseNotRespondedInvitees: true,
  chooseRSVPDeclinedInvitees: true,
  askFoodPreference: true,
};

export const platformSettingsService = {
  getEventFeatures: () => apiClient<EventFeatureSettings>("/api/v1/settings/event-features", { method: "GET" }, true),
  updateEventFeatures: (features: EventFeatureSettings) =>
    apiClient<EventFeatureSettings>("/api/v1/settings/event-features", { method: "PUT", body: JSON.stringify(features) }, true),
  getNotificationPreferences: () => apiClient<NotificationPreferences>("/api/v1/settings/notifications", { method: "GET" }, true),
  updateNotificationPreferences: (prefs: NotificationPreferences) =>
    apiClient<NotificationPreferences>("/api/v1/settings/notifications", { method: "PUT", body: JSON.stringify(prefs) }, true),
  getPricing: () => apiClient<PricingSettings>("/api/v1/settings/pricing", { method: "GET" }, true),
  updateRate: (ratePerInvitee: number): Promise<ApiResponse<PricingSettings>> =>
    apiClient<PricingSettings>("/api/v1/settings/pricing", { method: "PUT", body: JSON.stringify({ ratePerInvitee }) }, true),
  getEarnings: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const qs = q.toString();
    return apiClient<EarningsData>(`/api/v1/reports/earnings${qs ? `?${qs}` : ""}`, { method: "GET" }, true);
  },
};

export function formatMoney(amount: number | null | undefined, currency = "USD"): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}
