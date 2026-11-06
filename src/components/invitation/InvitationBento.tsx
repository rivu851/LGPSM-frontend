"use client";

import React, { useState } from "react";
import type { PublicInvitationData } from "@/services/invitationService";
import { contactWithCountryCode } from "@/utils/eventUtils";
import GuideMascot from "./GuideMascot";
import { Ico, InfoHint, TileLabel, type IconName } from "./InviteParts";

type EventData = PublicInvitationData["event"];
type InviteeData = PublicInvitationData["invitee"];

interface Props {
  event: EventData;
  invitee: InviteeData;
  /** how the page treats this invitation right now */
  state: { rsvpEnabled: boolean; rsvpClosed: boolean; cancelled: boolean; over: boolean; revoked: boolean; showPass: boolean; foodOnly: boolean };
  closesAt: Date | null;
  formatDateTime: (d: Date | null) => string;
  locationText: string;
  addressDetails: string;
  admissionNote: string;
  startDate: Date | null;
  endDate: Date | null;
  /** how many food/preference questions this guest is asked, and whether the saved answers are complete */
  foodQuestions: number;
  foodDone: boolean;
}

interface Step { icon: IconName; title: string; detail: string; done: boolean; href?: string }

/** The tile's round icon chip */
function Chip({ name, tone = "primary" }: { name: IconName; tone?: "primary" | "accent" | "soft" }) {
  const cls = tone === "primary" ? "bg-[color:var(--inv-primary)] text-[color:var(--inv-on-primary)]"
    : tone === "accent" ? "bg-[color:var(--inv-accent)] text-white"
    : "bg-[color:var(--inv-soft)] text-[color:var(--inv-accent-text)]";
  return <span className={`flex size-10 shrink-0 items-center justify-center rounded-full shadow-sm ${cls}`}><Ico name={name} /></span>;
}

const tile = "rounded-[26px] border border-[color:var(--inv-line)] bg-white p-4 shadow-sm";

export default function InvitationBento({ event, invitee, state, closesAt, formatDateTime, locationText, addressDetails, admissionNote, startDate, endDate, foodQuestions, foodDone }: Props) {
  const tel = event.contactNumber ? contactWithCountryCode(event.contactNumber) : "";
  const validStart = startDate && !Number.isNaN(startDate.getTime()) ? startDate : null;
  const day = validStart ? new Intl.DateTimeFormat([], { day: "numeric", timeZone: event.timeZone }).format(validStart) : "";
  const month = validStart ? new Intl.DateTimeFormat([], { month: "short", timeZone: event.timeZone }).format(validStart).toUpperCase() : "";
  const weekday = validStart ? new Intl.DateTimeFormat([], { weekday: "long", timeZone: event.timeZone }).format(validStart) : "";
  const live = !state.cancelled && !state.over;
  const declined = invitee.rsvpStatus === "DECLINED";
  const replied = invitee.rsvpStatus === "ACCEPTED" || declined;

  // ---- what this guest actually has to do, in order ----
  const steps: Step[] = [];
  if (live && state.rsvpEnabled && (!state.rsvpClosed || replied)) {
    steps.push({
      icon: "reply", title: "Reply to the invitation", href: "#invitation-respond", done: replied,
      detail: replied ? `You replied: ${declined ? "Not attending" : "Attending"}` : closesAt && !Number.isNaN(closesAt.getTime()) ? `Please answer by ${formatDateTime(closesAt)}` : "Choose Accept or Decline below",
    });
  }
  if (live && !declined && foodQuestions > 0 && (state.foodOnly || !state.rsvpClosed || replied)) {
    steps.push({
      icon: "food", title: "Tell us your food preference", href: "#invitation-respond", done: foodDone,
      detail: foodDone ? "Your answers are saved" : `${foodQuestions} quick ${foodQuestions === 1 ? "question" : "questions"} below${state.rsvpEnabled && !replied ? ", after you accept" : ""}`,
    });
  }
  if (live && !declined && !state.revoked && state.showPass) {
    steps.push({ icon: "qr", title: "Show your QR at the entrance", done: false, detail: admissionNote || "Open this page on the day and tap “Full screen to scan”" });
  }

  // Tips: every line is built from this invitation's own event and this guest's own answers (nothing from other events or the platform),
  // most useful first. They are recomputed on every render, so they change as the guest answers or the day gets closer.
  const [now] = useState(() => Date.now());
  const msToStart = validStart ? validStart.getTime() - now : null;
  // whole calendar days in the event's own time zone (a 7 PM event tomorrow is "tomorrow", not "in 2 days")
  const dayKey = (t: number) => { const [y, m, d] = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: event.timeZone }).format(t).split("-").map(Number); return Date.UTC(y, m - 1, d) / 86_400_000; };
  const daysToGo = validStart ? Math.round(dayKey(validStart.getTime()) - dayKey(now)) : null;
  const when = validStart
    ? new Intl.DateTimeFormat([], { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: event.timeZone }).format(validStart)
    : "";
  const mySelections = (invitee.dietarySelections || []).map((x) => x.value).filter(Boolean);
  const pending = steps.filter((s) => !s.done && s.href);
  const tips = !live ? [] : [
    ...(pending.length ? [`You still have ${pending.length === 1 ? "a step" : `${pending.length} steps`} for ${event.title}. Tap ${pending.length === 1 ? "it" : "one"} on the list and I'll take you there.`] : []),
    ...(declined ? ["You've told the host you can't make it. You can change your answer below until replies close."] : []),
    ...(daysToGo !== null && daysToGo > 1 ? [`${daysToGo} days to go until ${event.title}.`] : daysToGo === 1 ? [`${event.title} is tomorrow!`] : daysToGo !== null && daysToGo <= 0 && msToStart !== null && msToStart > -86_400_000 ? [`Today is the day. See you at ${event.title}!`] : []),
    ...(when && !declined ? [`${event.title} starts on ${when}.`] : []),
    ...(locationText && event.format !== "VIRTUAL" && !declined ? [`The venue is ${locationText}. Tap the address in the location tile for directions.`] : []),
    ...(event.format === "VIRTUAL" ? [`${event.title} is an online event.`] : []),
    ...(admissionNote && !declined ? [admissionNote + "."] : []),
    ...(state.showPass && !declined && !state.revoked ? ["Your QR code is your ticket for this event. It works only for you, so please don't share it."] : []),
    ...(event.sessions?.length && !declined ? [`You're invited to ${event.sessions.length === 1 ? "a session" : `${event.sessions.length} sessions`}, starting with “${event.sessions[0].name}”.`] : []),
    ...(foodDone && mySelections.length ? [`Your food choice for ${event.title}: ${mySelections.join(", ")}. You can change it below.`] : []),
    ...(event.organizerName ? [`${event.organizerName} is looking forward to welcoming you.`] : []),
    ...(tel ? [`Questions about ${event.title}? Call ${tel}.`] : []),
  ];

  return (
    <div className="space-y-3">
      {/* Guest, with the RSVP status on its own line */}
      <div className="rounded-[28px] border border-[color:var(--inv-line)] bg-gradient-to-r from-[color:var(--inv-soft)] to-white p-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--inv-primary)] text-lg font-bold text-[color:var(--inv-on-primary)] shadow-md">{(invitee.name || "?").trim().charAt(0).toUpperCase()}</span>
          <div className="min-w-0">
            <TileLabel hint={<InfoHint title="Your digital access pass">This page is your invitation. The card above carries a QR code made just for you; it is what the host scans to let you in.</InfoHint>}>Invited guest</TileLabel>
            <h2 className="break-words text-base font-bold leading-snug text-[color:var(--inv-ink)]">{invitee.name}</h2>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-[color:var(--inv-line)] pt-2.5">
          <TileLabel hint={<InfoHint title="RSVP status">RSVP means “please reply”. <b>Pending</b>: the host has not heard from you yet. <b>Accepted</b> or <b>Declined</b>: your answer is saved, and you can change it until replies close.</InfoHint>}>RSVP status</TileLabel>
          {!state.rsvpEnabled ? (
            <span className="text-xs font-semibold text-slate-400" aria-label="RSVP not requested">Not needed</span>
          ) : invitee.rsvpStatus === "ACCEPTED" ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">ACCEPTED</span>
          ) : declined ? (
            <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">DECLINED</span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">PENDING</span>
          )}
        </div>
      </div>

      {/* What to do (with the guide) */}
      {steps.length > 0 && (
        <section aria-labelledby="inv-todo" className="relative overflow-hidden rounded-[28px] border border-[color:var(--inv-line)] bg-gradient-to-br from-[color:var(--inv-soft)] via-white to-white p-3 shadow-sm min-[400px]:rounded-[32px] min-[400px]:p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 id="inv-todo" className="flex items-center gap-1.5 text-sm font-bold text-[color:var(--inv-ink)]">
                What you need to do
               
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">{steps.filter((s) => !s.done && s.href).length ? "A couple of quick things before the day." : "Nothing left to do before the day."}</p>
            </div>
          </div>
          <ol className="mt-3 space-y-2">
            {steps.map((s, i) => {
              const inner = (
                <>
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-emerald-500 text-white" : "bg-white text-[color:var(--inv-accent-text)] ring-1 ring-[color:var(--inv-line)]"}`}>
                    {s.done
                      ? <svg aria-hidden className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d={"M5 13l4 4L19 7"} style={{ strokeDasharray: 24, strokeDashoffset: 0 }} /></svg>
                      : <Ico name={s.icon} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold leading-snug text-[color:var(--inv-ink)]"><span className="mr-1 text-[color:var(--inv-accent-text)]">{i + 1}.</span>{s.title}</span>
                    <span className="block text-[11.5px] leading-snug text-slate-500">{s.detail}</span>
                  </span>
                  {s.href && !s.done && <span aria-hidden className="text-[color:var(--inv-accent-text)]"><Ico name="reply" className="size-4 rotate-[-90deg]" /></span>}
                </>
              );
              const cls = "flex items-center gap-3 rounded-3xl border border-[color:var(--inv-line)] bg-white/80 py-2 pl-2 pr-3";
              return (
                <li key={s.title}>
                  {s.href && !s.done
                    ? <a href={s.href} className={`${cls} transition hover:border-[color:var(--inv-accent)] hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--inv-accent)]`}>{inner}</a>
                    : <div className={cls}>{inner}</div>}
                </li>
              );
            })}
          </ol>
          {/* the guide sits in the corner and keeps moving */}
          <div className="mt-3">
            <GuideMascot tips={tips} name={invitee.name} />
          </div>
        </section>
      )}

      {event.description && (
        <div className="flex items-start gap-3 rounded-md border border-[color:var(--inv-line)] bg-[color:var(--inv-soft)] p-3.5">
          <span aria-hidden className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--inv-accent)] text-white"><Ico name="info" className="size-4" stroke={2.2} /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--inv-accent-text)]">About this event</p>
            <p className="mt-0.5 break-words whitespace-pre-line text-sm leading-relaxed text-[color:var(--inv-ink)]/85">{event.description}</p>
          </div>
        </div>
      )}

      {/* Bento: when and where, host and contact */}
      <div className="grid grid-cols-2 gap-3">
        {event.schedule && (
          <div className="col-span-2 flex items-center gap-4 overflow-hidden rounded-l-[48px] rounded-r-[26px] border border-[color:var(--inv-line)] bg-white py-4 pl-3 pr-4 shadow-sm">
            <span aria-hidden className="flex size-[68px] shrink-0 flex-col items-center justify-center rounded-full bg-[color:var(--inv-primary)] leading-none text-[color:var(--inv-on-primary)] shadow-md">
              {validStart ? (<><span className="text-[10px] font-bold tracking-widest opacity-90">{month}</span><span className="mt-0.5 text-[26px] font-extrabold">{day}</span></>) : <Ico name="calendar" className="size-7" />}
            </span>
            <div className="min-w-0">
              <TileLabel>Date &amp; time</TileLabel>
              {weekday && <p className="text-[15px] font-bold text-[color:var(--inv-ink)]">{weekday}</p>}
              <p className="break-words text-[13px] font-medium text-[color:var(--inv-ink)]/85">
                {formatDateTime(startDate)}{endDate && !Number.isNaN(endDate.getTime()) ? ` – ${formatDateTime(endDate)}` : ""}
              </p>
              {admissionNote && <p className="mt-1 text-[11.5px] font-medium text-[color:var(--inv-accent-text)]">{admissionNote}</p>}
            </div>
          </div>
        )}

        {locationText && (
          <div className={`${tile} col-span-2 flex items-start gap-3`}>
            <Chip name="pin" tone="accent" />
            <div className="min-w-0 flex-1">
              <TileLabel>Location</TileLabel>
              {event.format === "VIRTUAL" ? (
                <p className="break-words text-sm font-semibold text-[color:var(--inv-ink)]">{locationText}</p>
              ) : (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 break-words text-sm font-semibold text-[color:var(--inv-ink)] hover:text-[color:var(--inv-accent-text)]">
                  <span className="underline decoration-[color:var(--inv-line)] decoration-2 underline-offset-2">{locationText}</span>
                  <Ico name="external" className="mt-0.5 size-3.5 shrink-0 opacity-60" />
                </a>
              )}
              {addressDetails && <p className="mt-0.5 break-words whitespace-pre-line text-[12.5px] text-[color:var(--inv-ink)]/75">{addressDetails}</p>}
            </div>
          </div>
        )}

        {event.organizerName && (
          <div className={`${tel ? "" : "col-span-2"} flex flex-col gap-2 rounded-b-xl rounded-t-[26px] border border-[color:var(--inv-line)] bg-white p-4 shadow-sm`}>
            <Chip name="building" tone="soft" />
            <div className="min-w-0">
              <TileLabel>Hosted by</TileLabel>
              <p className="break-words text-sm font-semibold text-[color:var(--inv-ink)]">{event.organizerName}</p>
            </div>
          </div>
        )}

        {tel && (
          <a href={`tel:${tel.replace(/[^+\d]/g, "")}`} className={`${event.organizerName ? "" : "col-span-2"} group flex flex-col gap-2 rounded-b-xl rounded-t-[26px] border border-[color:var(--inv-line)] bg-white p-4 shadow-sm transition hover:border-[color:var(--inv-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--inv-accent)]`}>
            <Chip name="phone" tone="soft" />
            <div className="min-w-0">
              <TileLabel>Contact</TileLabel>
              <p className="break-words text-sm font-semibold text-[color:var(--inv-ink)] group-hover:text-[color:var(--inv-accent-text)]">{tel}</p>
            </div>
          </a>
        )}
      </div>

      {!!event.sessions?.length && (
        <section aria-labelledby="invitation-sessions-title" className="overflow-hidden rounded-[26px] border border-[color:var(--inv-line)] bg-white shadow-sm">
          <h3 id="invitation-sessions-title" className="flex items-center gap-2 bg-[color:var(--inv-primary)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--inv-on-primary)]">
            <Ico name="sessions" className="size-4" /> Your event sessions
          </h3>
          <ul className="px-4 py-3">
            {event.sessions.map((session, index) => (
              <li key={`${session.name}-${session.start || index}`} className="relative flex gap-3 pb-3 text-sm last:pb-0">
                {index < event.sessions!.length - 1 && <span aria-hidden className="absolute left-[7px] top-4 h-full w-0.5 rounded-full bg-[color:var(--inv-line)]" />}
                <span aria-hidden className="relative mt-1 size-4 shrink-0 rounded-full bg-[color:var(--inv-accent)] ring-4 ring-[color:var(--inv-soft)]" />
                <span className="min-w-0">
                  <span className="block break-words font-semibold text-[color:var(--inv-ink)]">{session.name}</span>
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
  );
}
