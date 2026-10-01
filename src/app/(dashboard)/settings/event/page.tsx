"use client";

import React from "react";
import PageHeader from "@/components/common/PageHeader";
import SettingsToggleList from "@/components/settings/SettingsToggleList";
import { EventFeatureSettings, platformSettingsService } from "@/services/platformSettingsService";

const ITEMS: { key: keyof EventFeatureSettings; label: string; help: string }[] = [
  { key: "allowEventRSVP", label: "Option to allow Event RSVP", help: "Organizers can collect RSVPs and set an acceptance last date." },
  { key: "acceptInvitedAttendees", label: "Option to choose accept invited attendees", help: "Organizers can admit everyone on the invitee list." },
  { key: "chooseNotRespondedInvitees", label: "Option to choose not-responded invitees", help: "Organizers can admit guests who did not reply to the RSVP." },
  { key: "chooseRSVPDeclinedInvitees", label: "Option to choose RSVP declined invitees", help: "Organizers can admit guests who declined." },
  { key: "askFoodPreference", label: "Option to ask for food preference", help: "Organizers can ask guests for dietary preferences." },
];

// Admin-only. Options switched off here are hidden from the Add/Edit Event steps and forced off by the API.
export default function EventSettingsPage() {
  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader title="Event Settings" />
      <div className="p-4 sm:p-6 lg:p-8">
        <SettingsToggleList
          title="Event options available to organizers"
          description="Turning an option off removes it from the event creation steps for every organizer."
          items={ITEMS}
          load={platformSettingsService.getEventFeatures}
          save={platformSettingsService.updateEventFeatures}
        />
      </div>
    </div>
  );
}
