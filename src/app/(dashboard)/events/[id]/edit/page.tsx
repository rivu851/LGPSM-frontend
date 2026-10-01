"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAlert } from "@/context/AlertContext";
import { eventService } from "@/services/eventService";
import { sessionService } from "@/services/sessionService";
import { useFormDraft } from "@/hooks/useFormDraft";
import EventWizard, { EventWizardSubmit } from "@/components/add-event/EventWizard";
import {
  EVENT_DRAFT_VERSION,
  EventDraft,
  createEmptyEventDraft,
  draftToUpdatePayload,
  eventToDraft,
  normalizeEventDraft,
  ServerEvent,
} from "@/components/add-event/eventDraft";
import { persistSessionsAndInvitees } from "@/components/add-event/persistEventExtras";

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = (params?.id as string) || "";
  const { showAlert } = useAlert();

  const [isFetchingEvent, setIsFetchingEvent] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [baseVersion, setBaseVersion] = useState<string | undefined>(undefined);
  // Server state the edit started from; used for "discard changes" and to detect changed sessions
  const serverDraftRef = useRef<EventDraft | null>(null);

  const draftState = useFormDraft<EventDraft>(
    `lgpsm:event-edit-draft:${eventId}`,
    () => serverDraftRef.current || createEmptyEventDraft(),
    { version: EVENT_DRAFT_VERSION, baseVersion, enabled: !!baseVersion, normalize: normalizeEventDraft }
  );
  const { reset } = draftState;

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    (async () => {
      setIsFetchingEvent(true);
      setLoadError(null);
      const [eventRes, sessionsRes] = await Promise.all([
        eventService.getEvent(eventId),
        sessionService.getSessions(eventId),
      ]);
      if (cancelled) return;
      if (!eventRes.success || !eventRes.data) {
        setLoadError(eventRes.message || "Event not found or you do not have access to it.");
        setIsFetchingEvent(false);
        return;
      }
      const sessions = sessionsRes.success && Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
      const serverDraft = eventToDraft(eventRes.data as ServerEvent, sessions);
      serverDraftRef.current = serverDraft;
      // Seed with server data first; enabling the draft afterwards restores newer local edits if still valid
      reset(serverDraft);
      setBaseVersion(String(eventRes.data.updatedAt || "server"));
      setIsFetchingEvent(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, reset]);

  const handleSubmit = async ({ draft, sessionFiles }: EventWizardSubmit) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await eventService.updateEvent(eventId, draftToUpdatePayload(draft));
      if (!res.success) {
        setSubmitError(res.message || "Failed to update event.");
        return;
      }
      draftState.clearDraft();
      const problems = await persistSessionsAndInvitees(eventId, draft, sessionFiles, serverDraftRef.current?.sessions || []);
      if (problems.length > 0) {
        showAlert(`Event updated, but some items were not saved: ${problems.join("; ")}`, "warning");
      }
      router.push(`/events/${eventId}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "An error occurred while updating the event.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isFetchingEvent) {
    return (
      <div className="w-full min-h-full flex items-center justify-center bg-[#F4F5F8]">
        <div className="flex items-center gap-3 text-gray-600 text-xs font-semibold">
          <svg className="animate-spin h-5 w-5 text-[#FF5B22]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading Edit Event...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full min-h-full flex items-center justify-center bg-[#F4F5F8] p-6">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-md p-8 text-center space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Event unavailable</h2>
          <p className="text-xs text-gray-500 break-words">{loadError}</p>
          <Link href="/events" className="inline-block px-4 py-2 bg-[#FF5B22] hover:bg-[#E04B16] text-white rounded-md text-xs font-semibold">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <EventWizard
      heading="Edit Event"
      draft={draftState.value}
      setDraft={draftState.update}
      draftStatus={draftState.status}
      draftSavedAt={draftState.savedAt}
      onDismissDraftStatus={draftState.dismissStatus}
      onDiscardDraft={draftState.discardDraft}
      canDiscard
      submitLabel="Save Changes"
      submitting={submitting}
      submitError={submitError}
      onSubmit={handleSubmit}
      onCancel={() => router.push(`/events/${eventId}`)}
    />
  );
}
