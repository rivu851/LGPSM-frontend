"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DietarySelection, invitationService, PublicInvitationData } from "@/services/invitationService";
import { usePageTitle } from "@/context/PageTitleContext";
import BrandLoader from "@/components/common/BrandLoader";
import CustomDropdown from "@/components/common/CustomDropdown";
import { resolveInvitationTheme, themeCssVars } from "@/utils/invitationTheme";

interface DietaryPrompt {
  title: string;
  options: string[];
}

function getDietaryPrompts(preference?: PublicInvitationData["event"]["dietaryPreference"]): DietaryPrompt[] {
  if (!preference?.enabled || !Array.isArray(preference.options)) return [];
  const groups = preference.options.filter((option): option is { title?: string; options?: unknown[] } =>
    !!option && typeof option === "object" && !Array.isArray(option)
  );
  if (groups.length) {
    return groups
      .map((group) => ({ title: group.title?.trim() || preference.title?.trim() || "Dietary Preference", options: Array.isArray(group.options) ? group.options.map(String).map((value) => value.trim()).filter(Boolean) : [] }))
      .filter((group) => group.options.length > 0);
  }
  const options = preference.options.map(String).map((value) => value.trim()).filter(Boolean);
  return options.length ? [{ title: preference.title?.trim() || "Dietary Preference", options }] : [];
}

function restoreDietaryChoices(prompts: DietaryPrompt[], selections?: DietarySelection[], legacyValue?: string): Record<string, string> {
  if (selections?.length) {
    return Object.fromEntries(prompts.flatMap((prompt, index) => {
      const saved = selections.find((selection) => selection.title === prompt.title && prompt.options.includes(selection.value));
      return saved ? [[String(index), saved.value]] : [];
    }));
  }
  if (!legacyValue) return {};
  if (prompts.length === 1 && prompts[0].options.includes(legacyValue)) return { "0": legacyValue };
  const pieces = legacyValue.split(" · ");
  return Object.fromEntries(prompts.flatMap((prompt, index) => {
    const prefix = `${prompt.title}: `;
    const piece = pieces.find((part) => part.startsWith(prefix));
    const value = piece?.slice(prefix.length);
    return value && prompt.options.includes(value) ? [[String(index), value]] : [];
  }));
}

export default function PublicInvitationPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<PublicInvitationData | null>(null);
  const [cardImageFailed, setCardImageFailed] = useState(false);

  const eventTitle = invitationData?.event?.title;
  const rsvpEnabled = invitationData?.event?.rsvp?.enabled !== false;
  usePageTitle(eventTitle ? `Invitation: ${eventTitle}` : "Event Invitation");

  const [selectedRsvp, setSelectedRsvp] = useState<"ACCEPTED" | "DECLINED" | null>(null);
  const [dietaryChoices, setDietaryChoices] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setCardImageFailed(false);
    if (!token) {
      setError("Invitation token is missing.");
      setLoading(false);
      return;
    }

    async function fetchInvitation() {
      try {
        setLoading(true);
        const res = await invitationService.getPublicInvitation(token);
        
        let data: PublicInvitationData | null = null;
        if (res?.data && (res.data as any).event) {
          data = res.data as PublicInvitationData;
        } else if ((res as any)?.event) {
          data = res as unknown as PublicInvitationData;
        }

        if (data && data.event && data.invitee) {
          setInvitationData(data);
          setSelectedRsvp(data.invitee.rsvpStatus === "ACCEPTED" || data.invitee.rsvpStatus === "DECLINED" ? data.invitee.rsvpStatus : null);
          setDietaryChoices(restoreDietaryChoices(getDietaryPrompts(data.event.dietaryPreference), data.invitee.dietarySelections, data.invitee.dietaryPreference));
        } else {
          setError(res.message || "Invitation not found or link is invalid.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load invitation.");
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  const handleSubmitFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const prompts = getDietaryPrompts(invitationData?.event.dietaryPreference);
    const selections: DietarySelection[] = prompts.map((prompt, index) => ({ title: prompt.title, value: dietaryChoices[String(index)] || prompt.options[0] || "" }));
    if (selections.some((s) => !s.value)) {
      setError("Please choose an option for every question.");
      return;
    }
    try {
      setSubmitting(true);
      setSubmitSuccessMsg(null);
      setError(null);
      const res = await invitationService.submitFood(token, selections);
      if (res.success) {
        setSubmitSuccessMsg("Thank you! Your answers have been saved.");
        setDietaryChoices(Object.fromEntries(selections.map((s, i) => [String(i), s.value])));
        setInvitationData((cur) => (cur ? { ...cur, invitee: { ...cur.invitee, dietarySelections: selections } } : cur));
      } else {
        setError(res.message || "Could not save your answers. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Could not save your answers.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!selectedRsvp) {
      setError("Choose Accept or Decline before submitting your response.");
      return;
    }

    const prompts = getDietaryPrompts(invitationData?.event.dietaryPreference);
    const selections: DietarySelection[] = selectedRsvp === "ACCEPTED"
      ? prompts.flatMap((prompt, index) => dietaryChoices[String(index)] ? [{ title: prompt.title, value: dietaryChoices[String(index)] }] : [])
      : [];
    if (selectedRsvp === "ACCEPTED" && selections.length < prompts.length) {
      setError("Please choose an option for every question.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitSuccessMsg(null);
      setError(null);

      const res = await invitationService.submitRsvp(token, {
        rsvpStatus: selectedRsvp,
        dietarySelections: selections,
      });

      if (res.success || (res as any).data?.message) {
        setSubmitSuccessMsg("Thank you! Your RSVP has been saved.");
        try {
          const updated = await invitationService.getPublicInvitation(token);
          const updatedData = (updated?.data && (updated.data as any).event)
            ? (updated.data as PublicInvitationData)
            : (updated as unknown as PublicInvitationData);
          if (updatedData?.invitee) {
            setInvitationData(updatedData);
            setSelectedRsvp(updatedData.invitee.rsvpStatus === "ACCEPTED" || updatedData.invitee.rsvpStatus === "DECLINED" ? updatedData.invitee.rsvpStatus : null);
            setDietaryChoices(restoreDietaryChoices(getDietaryPrompts(updatedData.event.dietaryPreference), updatedData.invitee.dietarySelections, updatedData.invitee.dietaryPreference));
          }
        } catch {
          // The RSVP has already been saved; a refresh failure must not report the submission as failed.
        }
      } else {
        setError(res.message || "Failed to submit RSVP. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit RSVP.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <BrandLoader label="Loading invitation" />;

  if (error && !invitationData) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl border border-slate-100 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800">Invitation Not Found</h1>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </main>
    );
  }

  const { event, invitee } = invitationData!;
  const theme = resolveInvitationTheme(invitationData!.theme);
  const passStatus = invitationData!.credential?.status;

  // An old link whose pass was replaced: say so and point to the new message. Nothing about the new pass is shown here.
  if (passStatus === "REPLACED") {
    return (
      <main style={themeCssVars(theme)} className="min-h-screen bg-[color:var(--inv-bg)] text-[color:var(--inv-ink)] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-[color:var(--inv-line)] overflow-hidden">
          <div className="px-7 pt-7 pb-8 text-center text-[color:var(--inv-on-primary)]" style={{ background: "linear-gradient(135deg, var(--inv-primary) 0%, color-mix(in srgb, var(--inv-primary) 72%, var(--inv-accent)) 100%)" }}>
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.18em] mb-3 border border-current/30 bg-white/15">Access pass replaced</span>
            <h1 style={{ fontFamily: "var(--inv-heading)" }} className="mx-auto max-w-[24rem] px-2 text-2xl font-bold leading-tight [overflow-wrap:anywhere]">{event.title}</h1>
          </div>
          <div aria-hidden className="h-1.5 bg-[color:var(--inv-accent)]" />
          <div className="p-6">
            <div role="alert" className="rounded-xl border border-[#E0E0E0] bg-[#F4F4F4] p-4 space-y-2 text-sm">
              <p className="font-semibold">Hello {invitee.name}, this access pass has been replaced.</p>
              <p><strong className="font-semibold">This link and its QR code no longer work.</strong> We have sent you a new pass: please use the latest message from the organizer by email or WhatsApp.</p>
            </div>
          </div>
        </div>
      </main>
    );
  }
  const locationText = event.format === "VIRTUAL"
    ? "Online event"
    : typeof event.location === "string" ? event.location : event.location?.address || "";
  const addressDetails = typeof event.location === "object" ? event.location?.addressDetails || "" : "";
  const dietaryPrompts = getDietaryPrompts(event.dietaryPreference);
  const closesAt = event.rsvp?.closesAt ? new Date(event.rsvp.closesAt) : null;
  const rsvpClosed = !!closesAt && !Number.isNaN(closesAt.getTime()) && closesAt.getTime() < Date.now();
  const eventCancelled = event.status?.toUpperCase() === "CANCELLED";
  const canRespond = rsvpEnabled && !rsvpClosed && !eventCancelled;
  // No RSVP for this event but guests are asked for food: the choice is made here, on the access card (the first option is pre-selected)
  const eventOver = passStatus === "EXPIRED" && !eventCancelled;
  const foodOnly = !rsvpEnabled && dietaryPrompts.length > 0 && !eventCancelled && !eventOver;
  const foodChoice = (index: number) => dietaryChoices[String(index)] || dietaryPrompts[index]?.options[0] || "";
  // What is already saved for this guest, to keep "Save" off until something is changed
  const storedChoices = restoreDietaryChoices(dietaryPrompts, invitee.dietarySelections, invitee.dietaryPreference);
  const storedKey = dietaryPrompts.length > 0 && dietaryPrompts.every((_, i) => storedChoices[String(i)]) ? JSON.stringify(dietaryPrompts.map((_, i) => storedChoices[String(i)])) : null;
  const foodSaved = storedKey !== null && storedKey === JSON.stringify(dietaryPrompts.map((_, i) => foodChoice(i)));
  const rsvpSaved = (invitee.rsvpStatus === "ACCEPTED" || invitee.rsvpStatus === "DECLINED") && invitee.rsvpStatus === selectedRsvp
    && (selectedRsvp === "DECLINED" || dietaryPrompts.length === 0 || storedKey === JSON.stringify(dietaryPrompts.map((_, i) => dietaryChoices[String(i)] || "")));
  const startDate = event.schedule?.start ? new Date(event.schedule.start) : null;
  const endDate = event.schedule?.end ? new Date(event.schedule.end) : null;
  const formatDateTime = (d: Date | null) =>
    d && !isNaN(d.getTime())
      ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: event.timeZone })
      : "TBD";
  // Only mentioned when the check-in window differs from the event's own hours
  const admissionOpens = event.admission?.opensAt ? new Date(event.admission.opensAt) : null;
  const admissionCloses = event.admission?.closesAt ? new Date(event.admission.closesAt) : null;
  const sameInstant = (a: Date | null, b: Date | null) => !!a && !!b && a.getTime() === b.getTime();
  const admissionNote = [
    admissionOpens && startDate && !sameInstant(admissionOpens, startDate) ? `Check-in opens ${formatDateTime(admissionOpens)}` : null,
    admissionCloses && endDate && !sameInstant(admissionCloses, endDate) ? `Check-in closes ${formatDateTime(admissionCloses)}` : null,
  ].filter(Boolean).join(" · ");

  // The guest's pass image is the top of the page card; without it (cancelled, over, withdrawn, or it failed to load) the plain banner is used
  const showPass = !cardImageFailed && !eventCancelled && !eventOver && passStatus !== "REVOKED";

  return (
    <main style={themeCssVars(theme)} className="min-h-screen bg-[color:var(--inv-bg)] text-[color:var(--inv-ink)] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className={`${showPass ? "max-w-[400px]" : "max-w-lg"} w-full bg-white rounded-3xl shadow-xl border border-[color:var(--inv-line)] overflow-hidden`}>
        {!showPass && (
          <>
        {/* Header: the colours and character of the invitation card the guest was sent */}
        <div
          className="px-7 pt-7 pb-8 text-center relative text-[color:var(--inv-on-primary)]"
          style={{ background: eventCancelled ? "linear-gradient(135deg, #4B4F52 0%, #2B2F33 100%)" : "linear-gradient(135deg, var(--inv-primary) 0%, color-mix(in srgb, var(--inv-primary) 72%, var(--inv-accent)) 100%)", color: eventCancelled ? "#FFFFFF" : undefined }}
        >
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.18em] mb-3 border border-current/30 bg-white/15">
            {eventCancelled ? "Event cancelled" : "You're invited"}
          </span>
          <h1 style={{ fontFamily: "var(--inv-heading)" }} className="mx-auto max-w-[24rem] min-w-0 px-2 text-2xl sm:text-[28px] font-bold leading-tight tracking-tight text-balance [overflow-wrap:anywhere]">{event.title}</h1>
          {event.format && (
            <p className="text-[11px] opacity-90 font-medium mt-2 uppercase tracking-[0.16em]">
              {event.format === "VIRTUAL" ? "Online event" : "In person"}
            </p>
          )}
        </div>
        <div aria-hidden className="h-1.5 bg-[color:var(--inv-accent)]" />

          </>
        )}

        {/* The invitation card itself is the top of this page: the guest's pass as designed, then the card extends downward with everything the guest needs */}
        {showPass && (
          <>
            <img
              src={invitationService.publicInvitationCardUrl(token)}
              alt={`${event.title} digital access pass for ${invitee.name}`}
              onError={() => setCardImageFailed(true)}
              className="block w-full bg-[color:var(--inv-soft)] object-contain"
            />
            {/* tear line between the pass and the rest of the ticket */}
            <div className="relative h-7 bg-white" role="separator" aria-label="Digital access pass">
              <span aria-hidden className="absolute -left-3.5 top-0 size-7 rounded-full bg-[color:var(--inv-bg)] shadow-[inset_-2px_0_3px_rgba(0,0,0,0.06)]" />
              <span aria-hidden className="absolute -right-3.5 top-0 size-7 rounded-full bg-[color:var(--inv-bg)] shadow-[inset_2px_0_3px_rgba(0,0,0,0.06)]" />
              <span aria-hidden className="absolute inset-x-6 top-3.5 border-t-2 border-dashed border-[color:var(--inv-line)]" />
            </div>
          </>
        )}

        {/* Card Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {eventCancelled && (
            <div role="alert" className="rounded-xl border border-[#E0E0E0] bg-[#F4F4F4] p-4 space-y-2 text-sm text-[color:var(--inv-ink)]">
              <p className="font-semibold">This event has been cancelled and is no longer taking place.</p>
              <p><strong className="font-semibold">Your access pass is no longer valid</strong> and cannot be used for entry. You do not need to do anything.</p>
              {event.cancellation?.reason && <p className="break-words"><span className="font-semibold">Message from the organizer:</span> {event.cancellation.reason}</p>}
              {event.contactNumber && <p>Questions? Contact the organizer on <a href={`tel:${event.contactNumber.replace(/[^+\d]/g, "")}`} className="underline">{event.contactNumber}</a>.</p>}
            </div>
          )}

          {passStatus === "REVOKED" && !eventCancelled && (
            <div role="alert" className="rounded-xl border border-[#E0E0E0] bg-[#F4F4F4] p-4 space-y-2 text-sm text-[color:var(--inv-ink)]">
              <p className="font-semibold">Your access pass has been withdrawn.</p>
              <p><strong className="font-semibold">The QR code no longer works for entry.</strong> This page still shows your event details and lets you answer your invitation. If you think this is a mistake, please contact the organizer{event.contactNumber ? <> on <a href={`tel:${event.contactNumber.replace(/[^+\d]/g, "")}`} className="underline">{event.contactNumber}</a></> : null}.</p>
            </div>
          )}

          {eventOver && (
            <div role="status" className="rounded-xl border border-[#E0E0E0] bg-[#F4F4F4] p-4 space-y-2 text-sm text-[color:var(--inv-ink)]">
              <p className="font-semibold">This event has ended.</p>
              <p>Your access pass is no longer valid for entry.</p>
            </div>
          )}

          {/* Invitee Welcome */}
          <div className="rounded-2xl p-4 border-2 border-[color:var(--inv-line)] bg-gradient-to-br from-[color:var(--inv-soft)] to-white shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--inv-primary)] text-lg font-bold text-[color:var(--inv-on-primary)] shadow-md">{(invitee.name || "?").trim().charAt(0).toUpperCase()}</span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--inv-accent-text)]">Invited Guest</p>
                <h2 className="text-lg font-bold leading-snug text-[color:var(--inv-ink)] break-words">{invitee.name}</h2>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--inv-accent-text)] mb-1">RSVP Status</p>
              {!rsvpEnabled ? (
                // RSVP not set up for this event: the same "--" placeholder used for an empty dietary preference
                <span className="text-xs font-semibold text-slate-400" aria-label="RSVP not requested">--</span>
              ) : invitee.rsvpStatus === "ACCEPTED" ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  ACCEPTED
                </span>
              ) : invitee.rsvpStatus === "DECLINED" ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                  DECLINED
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  PENDING
                </span>
              )}
              {rsvpEnabled && !eventCancelled && closesAt && !Number.isNaN(closesAt.getTime()) && (
                <p className="mt-1 text-[11px] font-medium text-slate-600">{rsvpClosed ? "Responses closed" : "Respond by"} {formatDateTime(closesAt)}</p>
              )}
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-3">
            {event.description && (
              <p className="text-sm text-[color:var(--inv-ink)]/80 leading-relaxed break-words whitespace-pre-line">{event.description}</p>
            )}

            <div className="rounded-2xl border border-[color:var(--inv-line)] bg-white shadow-sm divide-y divide-[color:var(--inv-line)] overflow-hidden text-sm">
              {event.organizerName && (
                <div className="flex items-start gap-3.5 px-4 py-3.5">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--inv-primary)] text-[color:var(--inv-on-primary)] shadow-sm"><svg className="size-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
                  </svg></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--inv-accent-text)]">Hosted by</p>
                    <p className="font-medium text-[color:var(--inv-ink)] break-words">{event.organizerName}</p>
                  </div>
                </div>
              )}

              {locationText && (
                <div className="flex items-start gap-3.5 px-4 py-3.5">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--inv-primary)] text-[color:var(--inv-on-primary)] shadow-sm"><svg className="size-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--inv-accent-text)]">Location</p>
                    {event.format === "VIRTUAL" ? (
                      <p className="font-medium text-[color:var(--inv-ink)] break-words">{locationText}</p>
                    ) : (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`} target="_blank" rel="noreferrer" className="font-medium text-[color:var(--inv-ink)] break-words underline decoration-slate-300 underline-offset-2 hover:text-[color:var(--inv-accent-text)]">
                        {locationText}
                      </a>
                    )}
                    {addressDetails && <p className="font-medium text-[color:var(--inv-ink)] break-words whitespace-pre-line mt-0.5">{addressDetails}</p>}
                  </div>
                </div>
              )}

              {event.schedule && (
                <div className="flex items-start gap-3.5 px-4 py-3.5">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--inv-primary)] text-[color:var(--inv-on-primary)] shadow-sm"><svg className="size-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--inv-accent-text)]">Date & Time</p>
                    <p className="font-medium text-[color:var(--inv-ink)] break-words">
                      {formatDateTime(startDate)}
                      {endDate && !isNaN(endDate.getTime()) ? ` – ${formatDateTime(endDate)}` : ""}
                    </p>
                    {admissionNote && <p className="mt-1 text-xs font-medium text-[color:var(--inv-accent-text)]">{admissionNote}</p>}
                    {event.timeZone && <p className="mt-0.5 text-[11px] text-slate-500">Times shown in {event.timeZone}</p>}
                  </div>
                </div>
              )}

              {event.contactNumber && (
                <div className="flex items-start gap-3.5 px-4 py-3.5">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--inv-primary)] text-[color:var(--inv-on-primary)] shadow-sm"><svg className="size-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.2 3.6a1 1 0 01-.5 1.2l-2.1 1.05a11.04 11.04 0 005.12 5.12l1.05-2.1a1 1 0 011.2-.5l3.6 1.2a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.16 21 3 14.84 3 7V5z" />
                  </svg></span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--inv-accent-text)]">Event contact</p>
                    <a href={`tel:${event.contactNumber.replace(/[^+\d]/g, "")}`} className="font-medium text-[color:var(--inv-ink)] break-words hover:text-[color:var(--inv-accent-text)]">{event.contactNumber}</a>
                  </div>
                </div>
              )}
            </div>

            {!!event.sessions?.length && (
              <section aria-labelledby="invitation-sessions-title" className="rounded-2xl border border-[color:var(--inv-line)] bg-white shadow-sm overflow-hidden">
                <h3 id="invitation-sessions-title" className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] bg-[color:var(--inv-primary)] text-[color:var(--inv-on-primary)]">Your event sessions</h3>
                <ul className="divide-y divide-[color:var(--inv-line)]">
                  {event.sessions.map((session, index) => (
                    <li key={`${session.name}-${session.start || index}`} className="flex items-start gap-3 px-4 py-3 text-sm">
                      <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-[color:var(--inv-accent)] ring-4 ring-[color:var(--inv-soft)]" />
                      <span className="min-w-0">
                        <span className="block font-semibold text-[color:var(--inv-ink)] break-words">{session.name}</span>
                        <span className="block text-xs font-medium text-slate-600">
                          {session.start ? formatDateTime(new Date(session.start)) : "Time TBD"}
                          {session.end ? ` – ${formatDateTime(new Date(session.end))}` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <hr className="border-[color:var(--inv-line)]" />

          {/* RSVP Form — only when the organiser asked guests to respond (the API refuses answers otherwise) */}
          {canRespond ? (
          <form onSubmit={handleSubmitRsvp} className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[color:var(--inv-ink)]">Respond to Invitation</h3>
              <p className="mt-1 text-xs text-slate-500">Choose whether you can attend, then submit your response.</p>
            </div>

            {error && (
              <div role="alert" aria-live="assertive" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600">
                {error}
              </div>
            )}

            {submitSuccessMsg && rsvpSaved && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium">
                {submitSuccessMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={selectedRsvp === "ACCEPTED"}
                onClick={() => {
                  setSelectedRsvp("ACCEPTED");
                  // the first option the organizer configured is pre-selected; a guest's earlier choice is kept
                  setDietaryChoices((current) => Object.fromEntries(dietaryPrompts.map((p, i) => [String(i), current[String(i)] || p.options[0] || ""])));
                  setError(null);
                }}
                className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  selectedRsvp === "ACCEPTED"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-[color:var(--inv-ink)] border-slate-200 hover:border-emerald-300"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Accept</span>
              </button>

              <button
                type="button"
                aria-pressed={selectedRsvp === "DECLINED"}
                onClick={() => { setSelectedRsvp("DECLINED"); setDietaryChoices({}); setError(null); }}
                className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  selectedRsvp === "DECLINED"
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : "bg-white text-[color:var(--inv-ink)] border-slate-200 hover:border-rose-300"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Decline</span>
              </button>
            </div>

            {selectedRsvp === "ACCEPTED" && dietaryPrompts.length > 0 && (
              <fieldset className="rounded-xl border border-[color:var(--inv-line)] bg-[color:var(--inv-soft)] p-4 space-y-4">
                {dietaryPrompts.map((prompt, index) => (
                  <div key={`${index}-${prompt.title}`} className="space-y-1.5">
                    <label className="text-xs font-medium text-[color:var(--inv-ink)]">{prompt.title} <span className="text-rose-600">*</span></label>
                    <CustomDropdown
                      value={dietaryChoices[String(index)] || ""}
                      onChange={(value) => setDietaryChoices((current) => ({ ...current, [String(index)]: value }))}
                      options={prompt.options.map((value) => ({ value, label: value }))}
                      placeholder="Choose an option"
                      ariaLabel={prompt.title}
                      portal
                      portalPlacement="top"
                    />
                  </div>
                ))}
              </fieldset>
            )}

            {selectedRsvp === "ACCEPTED" && event.dietaryPreference?.enabled && dietaryPrompts.length === 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Dietary preference is enabled, but the organizer has not configured any options yet.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !selectedRsvp || rsvpSaved}
              className="w-full py-3 px-4 bg-[color:var(--inv-primary)] hover:brightness-90 text-[color:var(--inv-on-primary)] text-xs font-bold rounded-xl transition cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving RSVP...</span>
                </>
              ) : (
                <span>{rsvpSaved ? "Response saved" : "Submit Response"}</span>
              )}
            </button>
          </form>
          ) : foodOnly ? (
          <form onSubmit={handleSubmitFood} className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[color:var(--inv-ink)]">Your preferences</h3>
              <p className="mt-1 text-xs text-slate-500">Please answer the questions below. You can change your answers later from this page.</p>
            </div>
            {error && <div role="alert" aria-live="assertive" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600">{error}</div>}
            {submitSuccessMsg && foodSaved && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium">{submitSuccessMsg}</div>}
            <fieldset className="rounded-xl border border-[color:var(--inv-line)] bg-[color:var(--inv-soft)] p-4 space-y-4">
              {dietaryPrompts.map((prompt, index) => (
                <div key={`${index}-${prompt.title}`} className="space-y-1.5">
                  <label className="text-xs font-medium text-[color:var(--inv-ink)]">{prompt.title} <span className="text-rose-600">*</span></label>
                  <CustomDropdown
                    value={foodChoice(index)}
                    onChange={(value) => setDietaryChoices((current) => ({ ...current, [String(index)]: value }))}
                    options={prompt.options.map((value) => ({ value, label: value }))}
                    placeholder="Choose an option"
                    ariaLabel={prompt.title}
                    portal
                    portalPlacement="top"
                  />
                </div>
              ))}
            </fieldset>
            <button type="submit" disabled={submitting || foodSaved} className="w-full py-3 px-4 bg-[color:var(--inv-primary)] hover:brightness-90 text-[color:var(--inv-on-primary)] text-xs font-bold rounded-xl transition cursor-pointer shadow-md disabled:opacity-60">
              {submitting ? "Saving..." : foodSaved ? "Saved" : "Save"}
            </button>
          </form>
          ) : (
            <div role="status" className="rounded-xl border border-[color:var(--inv-line)] bg-[color:var(--inv-soft)] p-4 text-sm text-[color:var(--inv-ink)]">
              {!rsvpEnabled ? "RSVP is not required for this event." : eventCancelled ? "This event has been cancelled." : "The response deadline for this invitation has passed."}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
