"use client";

import React, { useEffect, useRef, useState } from "react";
import PopupMessage from "@/components/common/PopupMessage";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAlert } from "@/context/AlertContext";
import { eventService } from "@/services/eventService";
import { sessionService } from "@/services/sessionService";
import { useFormDraft } from "@/hooks/useFormDraft";
import EventWizard, { EventWizardSubmit } from "@/components/add-event/EventWizard";
import type { ExtraCategory } from "@/hooks/useCategories";
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
import { reportService } from "@/services/reportService";
import { usePageTitle, usePageTitleContext } from "@/context/PageTitleContext";
import { Skeleton, SkeletonRegion } from "@/components/common/Skeleton";

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = (params?.id as string) || "";
  const { showAlert } = useAlert();
  const { cacheEventTitle } = usePageTitleContext();

  const [isFetchingEvent, setIsFetchingEvent] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lockedAfterInvitation, setLockedAfterInvitation] = useState(false);
  const [baseVersion, setBaseVersion] = useState<string | undefined>(undefined);
  // the version of the event this editor was opened on (its updatedAt), sent with the save so a newer version is never overwritten
  const serverVersion = useRef<string | undefined>(undefined);
  const [conflict, setConflict] = useState(false);
  // Server state the edit started from; used for "discard changes" and to detect changed sessions
  const serverDraftRef = useRef<EventDraft | null>(null);

  const draftState = useFormDraft<EventDraft>(
    `lgpsm:event-edit-draft:${eventId}`,
    () => serverDraftRef.current || createEmptyEventDraft(),
    { version: EVENT_DRAFT_VERSION, baseVersion, enabled: !!baseVersion, normalize: normalizeEventDraft }
  );
  const { reset } = draftState;

  const currentTitle = draftState.value?.title || serverDraftRef.current?.title;
  usePageTitle(currentTitle ? `Edit: ${currentTitle}` : "Edit Event");

  // The event's own category and subcategory, which an admin's list does not hold when they are the organizer's custom ones
  const [extraCategory, setExtraCategory] = useState<ExtraCategory | null>(null);
  // when the event was created: it cannot start before it
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    (async () => {
      setIsFetchingEvent(true);
      setLoadError(null);
      const [eventRes, sessionsRes, reportRes] = await Promise.all([
        eventService.getEvent(eventId),
        sessionService.getSessions(eventId),
        reportService.getEventReport(eventId),
      ]);
      if (cancelled) return;
      if (!eventRes.success || !eventRes.data) {
        setLoadError(eventRes.message || "Event not found or you do not have access to it.");
        setIsFetchingEvent(false);
        return;
      }
      if (reportRes.success && reportRes.data && (reportRes.data.deliverySummary.SENT > 0 || reportRes.data.deliverySummary.FAILED > 0)) {
        setLockedAfterInvitation(true);
        setIsFetchingEvent(false);
        return;
      }
      const sessions = sessionsRes.success && Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
      const serverEvent = eventRes.data as unknown as { categoryId?: { _id?: string; name?: string; ownerId?: string } | string; subcategory?: { _id?: string; name?: string; isCustom?: boolean } | null };
      const populated = serverEvent.categoryId && typeof serverEvent.categoryId === "object" ? serverEvent.categoryId : null;
      setExtraCategory(populated?._id ? {
        id: populated._id,
        name: populated.name || "",
        isCustom: !!populated.ownerId,
        subcategory: serverEvent.subcategory?._id ? { id: serverEvent.subcategory._id, name: serverEvent.subcategory.name || "", isCustom: !!serverEvent.subcategory.isCustom } : null,
      } : null);
      setCreatedAt((eventRes.data as unknown as { createdAt?: string }).createdAt ?? null);
      const serverDraft = eventToDraft(eventRes.data as ServerEvent, sessions);
      serverDraftRef.current = serverDraft;
      if (eventRes.data?.title) {
        cacheEventTitle(eventId, eventRes.data.title);
      }
      // Seed with server data first; enabling the draft afterwards restores newer local edits if still valid
      reset(serverDraft);
      serverVersion.current = eventRes.data.updatedAt ? String(eventRes.data.updatedAt) : undefined;
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
      setConflict(false);
      const res = await eventService.updateEvent(eventId, draftToUpdatePayload(draft), serverVersion.current);
      if (!res.success) {
        // someone else saved this event since it was opened here: nothing was overwritten, and the person decides what to do next
        if (res.status === 409 && res.code === "EVENT_EDIT_CONFLICT") setConflict(true);
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
      <SkeletonRegion label="Loading event" className="w-full min-h-full bg-white px-6 pt-8 grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-5"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-12" /><Skeleton className="h-24" /><div className="grid grid-cols-2 gap-4"><Skeleton className="h-12" /><Skeleton className="h-12" /></div><Skeleton className="h-12" /></div>
        <Skeleton className="h-[520px]" />
      </SkeletonRegion>
    );
  }

  if (loadError) {
    return (
      <div className="w-full min-h-full flex items-center justify-center bg-[#F4F5F8] p-6">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-md p-8 text-center space-y-4">
          <h1 className="text-lg font-bold text-gray-900">Event unavailable</h1>
          <p className="text-xs text-gray-500 break-words">{loadError}</p>
          <Link href="/events" className="inline-block px-4 py-2 bg-[#C65318] hover:bg-[#A83800] text-white rounded-md text-xs font-semibold">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  if (lockedAfterInvitation) {
    return (
      <div className="w-full min-h-full flex items-center justify-center bg-[#F4F5F8] p-6">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-md p-8 text-center space-y-4">
          <h1 className="text-lg font-bold text-gray-900">Event details are locked</h1>
          <p className="text-sm text-gray-600">This event can’t be edited after invitations have been sent.</p>
          <Link href={`/events/${eventId}`} className="inline-block px-4 py-2 bg-[#C65318] hover:bg-[#A83800] text-white rounded-md text-sm font-semibold">Back to Event</Link>
        </div>
      </div>
    );
  }

  return (
    <>
    <PopupMessage message={conflict ? "This event was changed by someone else after you opened it. Your changes were not saved, so nothing they did was overwritten." : null} type="warning" title="Event changed by someone else" action={{ label: "Reload the latest version (discards my edits)", onClick: () => { draftState.clearDraft(); window.location.reload(); } }} />
    <EventWizard
      heading="Edit Event"
      eventId={eventId}
      createdAt={createdAt}
      extraCategory={extraCategory}
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
    </>
  );
}
