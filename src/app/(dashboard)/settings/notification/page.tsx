"use client";

import React from "react";
import PageHeader from "@/components/common/PageHeader";
import SettingsToggleList from "@/components/settings/SettingsToggleList";
import { NotificationPreferences, platformSettingsService } from "@/services/platformSettingsService";

const ITEMS: { key: keyof NotificationPreferences; label: string }[] = [
  { key: "newOrganizerRegistration", label: "New organizer registration" },
  { key: "newEventAdded", label: "New event added" },
  { key: "deactivatedOrganizerBySuperAdmin", label: "Deactivated organizer by super admin" },
  { key: "changeInPrice", label: "Change in price" },
  { key: "invitationSendFailed", label: "Invitation send failed" },
  { key: "dayBeforeEventAlert", label: "Day before event alert" },
  { key: "reportDownload", label: "Report download" },
  { key: "customTemplateRequest", label: "Custom template request" },
];

// Admin-only email alert preferences, stored on the server
export default function NotificationSettingsPage() {
  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader title="Notifications Settings" />
      <div className="p-4 sm:p-6 lg:p-8">
        <SettingsToggleList
          title="Email alerts"
          description="Choose which platform events send an alert to administrators."
          items={ITEMS}
          load={platformSettingsService.getNotificationPreferences}
          save={platformSettingsService.updateNotificationPreferences}
        />
      </div>
    </div>
  );
}
