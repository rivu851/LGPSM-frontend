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
      <PageHeader title="Event Settings" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
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
