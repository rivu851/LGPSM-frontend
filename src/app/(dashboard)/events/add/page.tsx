"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAlert } from "@/context/AlertContext";
import { eventService } from "@/services/eventService";
import { templateService } from "@/services/templateService";
import { useFormDraft } from "@/hooks/useFormDraft";
import EventWizard, { EventWizardSubmit } from "@/components/add-event/EventWizard";
import {
  EVENT_DRAFT_VERSION,
  EventDraft,
  createEmptyEventDraft,
  draftToCreatePayload,
  hasMeaningfulContent,
  normalizeEventDraft,
} from "@/components/add-event/eventDraft";
import { persistSessionsAndInvitees } from "@/components/add-event/persistEventExtras";

function AddEventContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  // The draft is scoped to the signed-in user and kept until the backend confirms creation
  const draftState = useFormDraft<EventDraft>(`lgpsm:event-create-draft:${user?._id || "anonymous"}`, createEmptyEventDraft, {
    version: EVENT_DRAFT_VERSION,
    enabled: !!user?._id,
    normalize: normalizeEventDraft,
  });
  const { hydrated, update } = draftState;

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // "Create an Event" from the Templates page preselects that template (applied once the draft is loaded)
  const templateParam = searchParams.get("template");
  const appliedTemplate = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || !templateParam || appliedTemplate.current === templateParam) return;
    appliedTemplate.current = templateParam;
    templateService.getTemplateById(templateParam).then((res) => {
      if (res.success && res.data && res.data.isPublished !== false) {
        const t = res.data;
        update((prev) => ({ ...prev, template: { id: t._id, name: t.name, previewKey: t.previewImageKey || null } }));
      }
    });
  }, [hydrated, templateParam, update]);

  const handleSubmit = async ({ draft, sessionFiles }: EventWizardSubmit) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await eventService.createEvent(draftToCreatePayload(draft));
      // POST /api/v1/events responds with { eventId, status, createdAt }
      const created = res.data as { eventId?: string } | undefined;
      const createdId = res.success ? created?.eventId : undefined;
      if (!createdId) {
        // Keep the draft so nothing typed is lost
        setSubmitError(res.message || "Failed to create event.");
        return;
      }

      // The event now exists; clear the draft before follow-up requests so a retry cannot create a duplicate
      draftState.clearDraft();

      const problems = await persistSessionsAndInvitees(createdId, draft, sessionFiles);
      if (problems.length > 0) {
        showAlert(`Event created, but some items were not saved: ${problems.join("; ")}`, "warning");
      }
      router.push(`/events/${createdId}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "An error occurred while creating the event.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EventWizard
      heading="Add Event"
      draft={draftState.value}
      setDraft={draftState.update}
      draftStatus={draftState.status}
      draftSavedAt={hasMeaningfulContent(draftState.value) ? draftState.savedAt : null}
      onDismissDraftStatus={draftState.dismissStatus}
      onDiscardDraft={draftState.discardDraft}
      canDiscard
      submitLabel="Create Event"
      submitting={submitting}
      submitError={submitError}
      onSubmit={handleSubmit}
      onCancel={() => {
        if (hasMeaningfulContent(draftState.value)) {
          showAlert("Your draft is saved on this device. You can continue it from Add Event later.", "info");
        }
        router.push("/events");
      }}
    />
  );
}

export default function AddEventPage() {
  return (
    <Suspense fallback={null}>
      <AddEventContent />
    </Suspense>
  );
}
