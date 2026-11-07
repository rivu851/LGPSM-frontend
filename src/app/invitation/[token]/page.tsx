"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DietarySelection, invitationService, PublicInvitationData } from "@/services/invitationService";
import { usePageTitle } from "@/context/PageTitleContext";
import CardFullscreen from "@/components/invitation/CardFullscreen";
import InvitationBento from "@/components/invitation/InvitationBento";
import { Ico } from "@/components/invitation/InviteParts";
import BrandLoader from "@/components/common/BrandLoader";
import CustomDropdown from "@/components/common/CustomDropdown";
import { resolveInvitationTheme, themeCssVars } from "@/utils/invitationTheme";
import { contactWithCountryCode } from "@/utils/eventUtils";

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
  const [cardFullscreen, setCardFullscreen] = useState(false);
  const [linkDismissed, setLinkDismissed] = useState(false);
  const closeCardFullscreen = useCallback(() => { setCardFullscreen(false); setLinkDismissed(true); }, []);
  // the link in the invitation email ("?view=card") opens the card full screen straight away. Read once at load; nothing is shown
  // until the invitation has loaded, so the server/client difference of this initial value is never rendered.
  const [openedByLink] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "card");

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
      <div data-inv-card className={`${showPass ? "max-w-[400px]" : "max-w-lg"} w-full bg-white rounded-3xl shadow-xl border border-[color:var(--inv-line)] overflow-hidden`}>
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
            <div className="relative">
              <img
                src={invitationService.publicInvitationCardUrl(token)}
                alt={`${event.title} digital access pass for ${invitee.name}`}
                onError={() => setCardImageFailed(true)}
                onClick={() => setCardFullscreen(true)}
                className="block w-full cursor-zoom-in bg-[color:var(--inv-soft)] object-contain"
              />
            </div>
            {/* the organizer chose cards without a QR: the guest's entry QR is shown here on its own */}
            {invitationData?.cardShowsQr === false && (
              <div className="flex flex-col items-center gap-2 px-6 pt-5 text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--inv-accent-text)]">Your entry QR</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={invitationService.publicInvitationQrUrl(token)} alt={`Entry QR code for ${invitee.name}`} className="w-48 h-48 rounded-lg border border-[color:var(--inv-line)] bg-white p-2" />
                <p className="text-xs opacity-70">Show this QR code at the entrance to check in.</p>
              </div>
            )}
            {(cardFullscreen || (openedByLink && !linkDismissed)) && <CardFullscreen src={invitationData?.cardShowsQr === false ? invitationService.publicInvitationQrUrl(token) : invitationService.publicInvitationCardUrl(token)} alt={invitationData?.cardShowsQr === false ? `Entry QR code for ${invitee.name}` : `${event.title} digital access pass for ${invitee.name}`} onClose={closeCardFullscreen} />}
            {/* tear line between the pass and the rest of the ticket */}
            <div className="relative h-7 bg-white" role="separator" aria-label="Digital access pass">
              <span aria-hidden className="absolute -left-3.5 top-0 size-7 rounded-full bg-[color:var(--inv-bg)] shadow-[inset_-2px_0_3px_rgba(0,0,0,0.06)]" />
              <span aria-hidden className="absolute -right-3.5 top-0 size-7 rounded-full bg-[color:var(--inv-bg)] shadow-[inset_2px_0_3px_rgba(0,0,0,0.06)]" />
              <span aria-hidden className="absolute inset-x-6 top-3.5 border-t-2 border-dashed border-[color:var(--inv-line)]" />
            </div>
            {/* its own row, so it never covers anything printed on the card */}
            <div className="px-5 pt-1 sm:px-6">
              <button
                type="button"
                onClick={() => setCardFullscreen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[color:var(--inv-line)] bg-[color:var(--inv-soft)] px-4 py-2.5 text-sm font-semibold text-[color:var(--inv-accent-text)] transition hover:border-[color:var(--inv-accent)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--inv-line)]"
              >
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
                Full screen to scan
              </button>
            </div>
          </>
        )}

        {/* Card Content */}
        <div className="space-y-4 p-3.5 min-[400px]:space-y-5 min-[400px]:p-5 sm:p-6">
          {eventCancelled && (
            <div role="alert" className="rounded-xl border border-[#E0E0E0] bg-[#F4F4F4] p-4 space-y-2 text-sm text-[color:var(--inv-ink)]">
              <p className="font-semibold">This event has been cancelled and is no longer taking place.</p>
              <p><strong className="font-semibold">Your access pass is no longer valid</strong> and cannot be used for entry. You do not need to do anything.</p>
              {event.cancellation?.reason && <p className="break-words"><span className="font-semibold">Message from the organizer:</span> {event.cancellation.reason}</p>}
              {event.contactNumber && <p>Questions? Contact the organizer on <a href={`tel:${contactWithCountryCode(event.contactNumber).replace(/[^+\d]/g, "")}`} className="underline">{contactWithCountryCode(event.contactNumber)}</a>.</p>}
            </div>
          )}

          {passStatus === "REVOKED" && !eventCancelled && (
            <div role="alert" className="rounded-xl border border-[#E0E0E0] bg-[#F4F4F4] p-4 space-y-2 text-sm text-[color:var(--inv-ink)]">
              <p className="font-semibold">Your access pass has been withdrawn.</p>
              <p><strong className="font-semibold">The QR code no longer works for entry.</strong> This page still shows your event details and lets you answer your invitation. If you think this is a mistake, please contact the organizer{event.contactNumber ? <> on <a href={`tel:${contactWithCountryCode(event.contactNumber).replace(/[^+\d]/g, "")}`} className="underline">{contactWithCountryCode(event.contactNumber)}</a></> : null}.</p>
            </div>
          )}

          {eventOver && (
            <div role="status" className="rounded-xl border border-[#E0E0E0] bg-[#F4F4F4] p-4 space-y-2 text-sm text-[color:var(--inv-ink)]">
              <p className="font-semibold">This event has ended.</p>
              <p>Your access pass is no longer valid for entry.</p>
            </div>
          )}

          {/* The guest, what they need to do, and the event in bento tiles */}
          <InvitationBento
            event={event}
            invitee={invitee}
            state={{ rsvpEnabled, rsvpClosed, cancelled: eventCancelled, over: eventOver, revoked: passStatus === "REVOKED", showPass, foodOnly }}
            closesAt={closesAt}
            formatDateTime={formatDateTime}
            locationText={locationText}
            addressDetails={addressDetails}
            admissionNote={admissionNote}
            startDate={startDate}
            endDate={endDate}
            foodQuestions={dietaryPrompts.length}
            foodDone={storedKey !== null}
          />

          <hr className="border-[color:var(--inv-line)]" />

          {/* RSVP Form — only when the organiser asked guests to respond (the API refuses answers otherwise) */}
          {canRespond ? (
          <form id="invitation-respond" onSubmit={handleSubmitRsvp} className="scroll-mt-4 space-y-4">
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
                className={`group flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-3.5 text-sm font-bold transition-all duration-200 active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 ${
                  selectedRsvp === "ACCEPTED"
                    ? "border-emerald-600 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                    : "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50"
                }`}
              >
                <span className={`flex size-9 items-center justify-center rounded-full transition-colors ${selectedRsvp === "ACCEPTED" ? "bg-white/25" : "bg-emerald-100 group-hover:bg-emerald-200"}`}>
                  <Ico name="checkCircle" className="size-[22px]" stroke={2.2} />
                </span>
                <span>Accept</span>
                <span className={`text-[10.5px] font-medium ${selectedRsvp === "ACCEPTED" ? "text-white/85" : "text-emerald-700/70"}`}>I&apos;ll be there</span>
              </button>

              <button
                type="button"
                aria-pressed={selectedRsvp === "DECLINED"}
                onClick={() => { setSelectedRsvp("DECLINED"); setDietaryChoices({}); setError(null); }}
                className={`group flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-3.5 text-sm font-bold transition-all duration-200 active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 ${
                  selectedRsvp === "DECLINED"
                    ? "border-rose-600 bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-600/25"
                    : "border-rose-200 bg-white text-rose-700 hover:border-rose-400 hover:bg-rose-50"
                }`}
              >
                <span className={`flex size-9 items-center justify-center rounded-full transition-colors ${selectedRsvp === "DECLINED" ? "bg-white/25" : "bg-rose-100 group-hover:bg-rose-200"}`}>
                  <Ico name="xCircle" className="size-[22px]" stroke={2.2} />
                </span>
                <span>Decline</span>
                <span className={`text-[10.5px] font-medium ${selectedRsvp === "DECLINED" ? "text-white/85" : "text-rose-700/70"}`}>Can&apos;t make it</span>
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
              className={`flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full px-5 py-3.5 text-sm font-bold transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--inv-line)] disabled:cursor-not-allowed ${
                rsvpSaved
                  ? "border-2 border-emerald-200 bg-emerald-50 text-emerald-700"
                  : !selectedRsvp
                    ? "border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400"
                    : "bg-[color:var(--inv-primary)] text-[color:var(--inv-on-primary)] shadow-lg shadow-black/15 hover:brightness-95 disabled:opacity-80"
              }`}
            >
              {submitting ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Saving your response…</span>
                </>
              ) : rsvpSaved ? (
                <>
                  <Ico name="checkCircle" className="size-5" />
                  <span>Response saved</span>
                </>
              ) : (
                <>
                  <span>{selectedRsvp ? "Submit response" : "Choose Accept or Decline"}</span>
                  {selectedRsvp && <span className="flex size-6 items-center justify-center rounded-full bg-white/20"><Ico name="send" className="size-3.5" /></span>}
                </>
              )}
            </button>
          </form>
          ) : foodOnly ? (
          <form id="invitation-respond" onSubmit={handleSubmitFood} className="scroll-mt-4 space-y-4">
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
            <button
              type="submit"
              disabled={submitting || foodSaved}
              className={`flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full px-5 py-3.5 text-sm font-bold transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--inv-line)] disabled:cursor-not-allowed ${
                foodSaved ? "border-2 border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-[color:var(--inv-primary)] text-[color:var(--inv-on-primary)] shadow-lg shadow-black/15 hover:brightness-95"
              }`}
            >
              {submitting ? (
                <><span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /><span>Saving…</span></>
              ) : foodSaved ? (
                <><Ico name="checkCircle" className="size-5" /><span>Saved</span></>
              ) : (
                <><span>Save my choice</span><span className="flex size-6 items-center justify-center rounded-full bg-white/20"><Ico name="send" className="size-3.5" /></span></>
              )}
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
