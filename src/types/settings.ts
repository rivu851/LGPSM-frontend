export interface TemplateCategory {
  id: string;
  name: string;
}

export interface TemplateSubcategory {
  id: string;
  categoryId: string;
  name: string;
}

export interface TemplateItem {
  id: string;
  name: string;
  categoryId: string;
  subcategoryId: string;
  // Stored image reference (see utils/mediaUrl.ts); null when no image was uploaded
  imageKey: string | null;
  status: "Published" | "Saved on Draft";
  createdAt: string;
}

export interface EventSettingsOptions {
  allowEventRSVP: boolean;
  acceptInvitedAttendees: boolean;
  chooseNotRespondedInvitees: boolean;
  chooseRSVPDeclinedInvitees: boolean;
  askFoodPreference: boolean;
}

export interface PriceRateSettings {
  organizerFeeRate: number;
  perInviteeRate: number;
  taxPercentage: number;
  currency: string;
  autoBillingEnabled: boolean;
}

export interface NotificationSettingsOptions {
  emailNotifications: boolean;
  smsNotifications: boolean;
  systemAlerts: boolean;
  eventReminders: boolean;
  weeklySummary: boolean;
}

export interface AccountSettingsProfile {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl: string;
}
