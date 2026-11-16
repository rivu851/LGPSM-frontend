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
  { key: "guestCheckIns", label: "Guests checking in (running count)" },
  { key: "invitationsSent", label: "Invitations sent by an organizer" },
  { key: "eventCancelled", label: "Event cancelled by an organizer" },
];

// Admin-only email alert preferences, stored on the server
export default function NotificationSettingsPage() {
  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader title="Notification Settings" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>} />
      <div className="px-4 sm:px-6 pt-6">
        <SettingsToggleList
          title="Email Notification"
          items={ITEMS}
          load={platformSettingsService.getNotificationPreferences}
          save={platformSettingsService.updateNotificationPreferences}
        />
      </div>
    </div>
  );
}
