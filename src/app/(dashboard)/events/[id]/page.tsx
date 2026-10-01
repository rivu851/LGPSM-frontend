"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { eventService } from "@/services/eventService";
import { sessionService, SessionData } from "@/services/sessionService";
import { assignmentService } from "@/services/assignmentService";
import { reportService, EventReportData } from "@/services/reportService";
import { auditLogService, AuditLogItem } from "@/services/auditLogService";
import { invitationService } from "@/services/invitationService";
import { formatCompactDateTime, formatDateTime, formatTime } from "@/utils/dateTime";
import { getDynamicEventStatus } from "@/utils/eventUtils";
import { formatEventId } from "@/utils/formatId";
import PageHeader from "@/components/common/PageHeader";
import CustomDropdown from "@/components/common/CustomDropdown";
import EventSubNav from "@/components/EventSubNav";
import EventCleanupModal from "@/components/events/EventCleanupModal";
import CardPreviewModal from "@/components/invitees/CardPreviewModal";
import HorizontalScroll from "@/components/common/HorizontalScroll";

interface EventDetail {
  _id: string;
  title: string;
  status?: string;
  schedule?: { start?: string; end?: string };
  categoryId?: { name?: string } | string;
  subcategory?: { name?: string } | null;
  organizerId?: { fullName?: string; profile?: { organizationName?: string } } | string;
  location?: { address?: string } | string;
  templateId?: { name?: string } | string | null;
  operationalDataCleared?: boolean;
}

const card = "bg-white border border-[#E0E0E0] rounded-lg";

function ArrowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} title={label} className="p-1 -m-1 text-gray-900 hover:text-[#FF651D]">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H9M17 7v8" />
      </svg>
    </Link>
  );
}

// Figma widget: coloured round icon, big number, label, arrow to the related list
function MetricCard({ value, label, href, tone, icon }: { value: number; label: string; href: string; tone: "peach" | "mint" | "lavender"; icon: React.ReactNode }) {
  const tones = { peach: "bg-[#FFDCCF] text-[#FF651D]", mint: "bg-[#C9F6E6] text-[#16A34A]", lavender: "bg-[#DCE1FF] text-[#2C2EB5]" };
  return (
    <div className={`${card} p-4 flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <span className={`size-10 rounded-full flex items-center justify-center ${tones[tone]}`}>{icon}</span>
        <ArrowLink href={href} label={`Open ${label}`} />
      </div>
      <div>
        <p className="text-3xl font-medium text-black leading-none">{String(value).padStart(2, "0")}</p>
        <p className="mt-1.5 text-sm text-[#4B4F52]">{label}</p>
      </div>
    </div>
  );
}

function Ring({ value, max, center, label }: { value: number; max: number; center: React.ReactNode; label: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="flex flex-col items-center gap-2 min-w-0">
      <div className="relative size-16">
        <svg viewBox="0 0 64 64" className="size-16 -rotate-90" aria-hidden>
          <circle cx="32" cy="32" r={r} fill="none" stroke="#E8ECFF" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke="#FF651D" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${pct * c} ${c}`} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-900">{center}</span>
      </div>
      <span className="text-xs text-[#4B4F52] text-center">{label}</span>
    </div>
  );
}

function DeliveryDonut({ sent, notSent, failed }: { sent: number; notSent: number; failed: number }) {
  const total = sent + notSent + failed;
  const r = 36;
  const c = 2 * Math.PI * r;
  const parts = [
    { v: sent, color: "#FF651D", label: "Sent" },
    { v: notSent, color: "#262A2D", label: "Not sent" },
    { v: failed, color: "#9CA3AF", label: "Failed" },
  ];
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative size-28 shrink-0">
        <svg viewBox="0 0 100 100" className="size-28 -rotate-90" role="img" aria-label={`${sent} sent, ${notSent} not sent, ${failed} failed`}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#E5E5E5" strokeWidth="14" />
          {total > 0 &&
            parts.map((p) => {
              const len = (p.v / total) * c;
              const el = p.v > 0 ? <circle key={p.label} cx="50" cy="50" r={r} fill="none" stroke={p.color} strokeWidth="14" strokeDasharray={`${len} ${c}`} strokeDashoffset={-offset} /> : null;
              offset += len;
              return el;
            })}
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-medium text-gray-900 leading-none">{total}</span>
          <span className="text-[10px] text-[#828282]">guests</span>
        </span>
      </div>
      <ul className="space-y-2 text-sm text-[#4B4F52]">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2 whitespace-nowrap">
            <span className="size-2.5 rounded-full shrink-0" style={{ background: p.color }} />
            {p.label} <span className="text-gray-900 font-medium">{p.v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function EventDetailsPage() {
  const params = useParams();
  const eventId = (params?.id as string) || "";
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [assignmentsCount, setAssignmentsCount] = useState(0);
  const [report, setReport] = useState<EventReportData | null>(null);
  const [accessLogs, setAccessLogs] = useState<AuditLogItem[]>([]);
  const [analysisSession, setAnalysisSession] = useState("");
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardExpanded, setCardExpanded] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [evRes, sessRes, asgRes, repRes, logRes] = await Promise.all([
      eventService.getEvent(eventId),
      sessionService.getSessions(eventId),
      assignmentService.getEventAssignments(eventId),
      reportService.getEventReport(eventId),
      auditLogService.getAuditLogs({ eventId, limit: 10 }),
    ]);
    if (!evRes.success || !evRes.data) {
      setLoadError(evRes.message || "Event not found or you do not have access to it.");
      setLoading(false);
      return;
    }
    const ev = evRes.data as unknown as EventDetail;
    setEvent(ev);
    const ss = sessRes.success && Array.isArray(sessRes.data) ? sessRes.data : [];
    setSessions(ss);
    setAnalysisSession((prev) => prev || ss[0]?._id || "");
    setAssignmentsCount(asgRes.success && Array.isArray(asgRes.data) ? asgRes.data.length : 0);
    setReport(repRes.success && repRes.data ? repRes.data : null);
    setAccessLogs(logRes.success && Array.isArray(logRes.data) ? logRes.data : []);
    setLoading(false);

    const ended = ev.schedule?.end && new Date(ev.schedule.end) < new Date();
    if (user?.role === "ADMIN" && ended && !ev.operationalDataCleared && sessionStorage.getItem(`dismiss_cleanup_${eventId}`) !== "true") {
      setCleanupOpen(true);
    }
  }, [eventId, user?.role]);

  useEffect(() => {
    if (eventId) load();
  }, [eventId, load]);

  // The panel shows the same server-rendered card guests receive (sample guest)
  useEffect(() => {
    if (!event) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    invitationService
      .previewCardPNG(eventId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setCardUrl(objectUrl);
      })
      .catch((e: Error) => !cancelled && setCardError(e.message || "Card preview unavailable"));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [event, eventId]);

  if (loading) {
    return (
      <div className="w-full min-h-full bg-white">
        <PageHeader title="Event" />
        <p className="py-24 text-center text-sm text-[#828282]">Loading event...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="w-full min-h-full bg-white">
        <PageHeader title="Event" />
        <div role="alert" className="max-w-md mx-auto mt-16 border border-[#E0E0E0] rounded-lg p-8 text-center space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Event unavailable</h2>
          <p className="text-sm text-[#4B4F52] break-words">{loadError}</p>
          <div className="flex justify-center gap-3">
            <button type="button" onClick={load} className="px-4 py-2 border border-[#E0E0E0] rounded-md text-sm font-medium hover:bg-gray-50 cursor-pointer">Retry</button>
            <Link href="/events" className="px-4 py-2 bg-[#FF651D] hover:bg-[#E5520F] text-white rounded-md text-sm font-medium">Back to Events</Link>
          </div>
        </div>
      </div>
    );
  }

  const categoryName = typeof event.categoryId === "object" ? event.categoryId?.name : "";
  const categoryPill = [categoryName, event.subcategory?.name].filter(Boolean).join(" · ");
  const organizer = typeof event.organizerId === "object" ? event.organizerId?.profile?.organizationName || event.organizerId?.fullName : "";
  const venue = typeof event.location === "string" ? event.location : event.location?.address;
  const delivery = report?.deliverySummary || { SENT: 0, PENDING: 0, FAILED: 0 };
  const totalInvitees = report?.totalInvitees ?? 0;
  const timeStatus = event.status === "CANCELLED" ? "Cancelled" : getDynamicEventStatus(event.schedule?.start, event.schedule?.end, "Upcoming");
  const status = timeStatus === "Upcoming" && delivery.SENT === 0 && delivery.FAILED === 0 ? "Invitation not send" : timeStatus;
  const statusTone: Record<string, string> = {
    "Invitation not send": "bg-[#FFE9C0] text-[#9E8C00]",
    Upcoming: "bg-[#C0FFD5] text-[#1A9242]",
    Ongoing: "bg-[#CCD2FF] text-[#2C2EB5]",
    Completed: "bg-[#FFE3D7] text-[#FF651D]",
    Cancelled: "bg-gray-200 text-gray-700",
  };
  const ended = !!event.schedule?.end && new Date(event.schedule.end) < new Date();
  const sessionRow = (id: string) => report?.sessionReports.find((r) => String(r.sessionId) === id);
  const selected = sessionRow(analysisSession);
  const invited = selected?.invitedCount ?? 0;
  const attended = selected?.attendeeCount ?? 0;

  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader title="Event" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1240px] w-full mx-auto space-y-6 pb-24">
        {notice && (
          <div role="status" className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-800 flex justify-between gap-3">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} className="font-medium cursor-pointer">Dismiss</button>
          </div>
        )}
        {event.operationalDataCleared && (
          <p className="p-3 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-700">
            Operational data (sessions, invitees, invitations and staff assignments) for this completed event was cleared by an administrator.
          </p>
        )}

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl sm:text-[28px] font-medium text-black break-words">{event.title}</h2>
              {categoryPill && <span className="px-2.5 py-0.5 border border-[#FF651D] text-[#FF651D] text-xs font-medium rounded">{categoryPill}</span>}
            </div>
            <div className="mt-3 flex items-center gap-x-3 gap-y-2 flex-wrap text-xs text-[#4B4F52]">
              <span className={`px-3 py-1 rounded-full font-medium ${statusTone[status] || statusTone.Upcoming}`}>{status}</span>
              <span className="text-[#828282]">{formatEventId(event._id)}</span>
              {organizer && <span><span className="font-medium text-gray-900">Organized by:</span> {organizer}</span>}
              <span className="text-[#D3D3D3] hidden sm:inline">|</span>
              <span><span className="font-medium text-gray-900">Start:</span> {formatDateTime(event.schedule?.start, "—")}</span>
              <span className="text-[#D3D3D3] hidden sm:inline">|</span>
              <span><span className="font-medium text-gray-900">End:</span> {formatDateTime(event.schedule?.end, "—")}</span>
            </div>
            {venue && <p className="mt-2 text-xs text-[#828282] break-words">{venue}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {user?.role === "ADMIN" && ended && !event.operationalDataCleared && (
              <button type="button" onClick={() => setCleanupOpen(true)} className="px-4 py-2 border border-amber-600 text-amber-700 hover:bg-amber-50 text-sm font-medium rounded-md cursor-pointer">
                Clear Event Data
              </button>
            )}
            <Link href={`/events/${eventId}/edit`} className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-medium rounded-md">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Link>
          </div>
        </div>

        <EventSubNav eventId={eventId} activeTab="overview" sessionsCount={sessions.length} inviteesCount={totalInvitees} assignmentsCount={assignmentsCount} />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_290px] gap-5 items-start">
          <div className="space-y-5 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard value={totalInvitees} label="Total Invitees" href={`/events/${eventId}/invitees`} tone="peach" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              } />
              <MetricCard value={assignmentsCount} label="Assigned System Users" href={`/events/${eventId}/assign-users`} tone="mint" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              } />
              <MetricCard value={sessions.length} label="Total Sessions" href={`/events/${eventId}/sessions`} tone="lavender" icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              } />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,240px)_1fr] gap-5">
              <section className={`${card} p-4`} aria-labelledby="guest-logs-title">
                <div className="flex items-center justify-between mb-3">
                  <h3 id="guest-logs-title" className="text-base font-medium text-gray-900">Guest Logs</h3>
                  <ArrowLink href={`/events/${eventId}/invitees`} label="Open invitees list" />
                </div>
                {event.operationalDataCleared ? <p className="text-sm text-[#828282] py-8 text-center">Data cleared</p> : <DeliveryDonut sent={delivery.SENT} notSent={delivery.PENDING} failed={delivery.FAILED} />}
              </section>

              <section className={`${card} p-4 min-w-0`} aria-labelledby="sessions-widget-title">
                <div className="flex items-center justify-between mb-3">
                  <h3 id="sessions-widget-title" className="text-base font-medium text-gray-900">Sessions</h3>
                  <ArrowLink href={`/events/${eventId}/sessions`} label="Open sessions list" />
                </div>
                {sessions.length === 0 ? (
                  <p className="text-sm text-[#828282] py-6 text-center">No sessions yet.</p>
                ) : (
                  <HorizontalScroll>
                    <table className="w-full text-left text-sm whitespace-nowrap min-w-[520px]">
                      <thead className="text-[#828282] border-b border-[#D3D3D3]">
                        <tr>
                          <th className="py-2 pr-3 font-medium">#</th>
                          <th className="py-2 pr-4 font-medium">Session Name</th>
                          <th className="py-2 pr-4 font-medium">Date &amp; Time</th>
                          <th className="py-2 pr-4 font-medium">No. of Guests</th>
                          <th className="py-2 font-medium">Checked in</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEEEEE] text-[#4B4F52]">
                        {sessions.map((s, i) => {
                          const r = sessionRow(s._id!);
                          return (
                            <tr key={s._id}>
                              <td className="py-2.5 pr-3">{i + 1}</td>
                              <td className="py-2.5 pr-4 text-gray-900">{s.name}</td>
                              <td className="py-2.5 pr-4">{formatCompactDateTime(s.schedule?.start, "—")}{s.schedule?.end ? ` to ${formatTime(s.schedule.end)}` : ""}</td>
                              <td className="py-2.5 pr-4">{r?.invitedCount ?? 0}</td>
                              <td className="py-2.5">{r?.attendeeCount ?? 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </HorizontalScroll>
                )}
              </section>
            </div>
          </div>

          <section className={`${card} p-4`} aria-labelledby="card-preview-heading">
            <div className="flex items-center justify-between mb-3">
              <h3 id="card-preview-heading" className="text-base font-medium text-gray-900">Card Preview</h3>
              {cardUrl && (
                <button type="button" onClick={() => setCardExpanded(true)} aria-label="Expand card preview" className="p-1 -m-1 text-gray-900 hover:text-[#FF651D] cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              )}
            </div>
            <div className="relative w-full aspect-[2/3] rounded-md overflow-hidden bg-[#F4F5F8] border border-[#EEEEEE]">
              {cardUrl ? (
                <Image src={cardUrl} alt={`Invitation card for ${event.title}`} fill unoptimized className="object-contain" />
              ) : (
                <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-[#828282]">{cardError || "Generating preview..."}</p>
              )}
            </div>
            <p className="mt-2 text-xs text-[#828282] truncate">
              {typeof event.templateId === "object" && event.templateId?.name ? `Template: ${event.templateId.name}` : "No template selected"}
            </p>
            <Link href={`/events/${eventId}/invitees`} className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-medium rounded-md">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
              Send Invitation
            </Link>
          </section>
        </div>

        <section className={`${card} p-4 sm:p-5 space-y-5`} aria-labelledby="analysis-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="analysis-title" className="text-xl font-medium text-gray-900">Analysis</h3>
            {sessions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#4B4F52]">Session:</span>
                <div className="w-48">
                  <CustomDropdown value={analysisSession} onChange={setAnalysisSession} options={sessions.map((s) => ({ value: s._id!, label: s.name }))} ariaLabel="Analysis session" />
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="border border-[#E0E0E0] rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Session Health Overview Panel</h4>
              {selected ? (
                <div className="grid grid-cols-3 gap-2">
                  <Ring value={attended} max={invited} center={<>{attended}<span className="text-[10px] text-[#828282]">/{invited}</span></>} label="Current Logged" />
                  <Ring value={selected.checkInsToday ?? 0} max={Math.max(invited, 1)} center={selected.checkInsToday ?? 0} label="Check-ins Today" />
                  <Ring value={attended} max={invited} center={`${invited > 0 ? Math.round((attended / invited) * 100) : 0}%`} label="Occupancy" />
                </div>
              ) : (
                <p className="text-sm text-[#828282] py-6 text-center">{sessions.length ? "No data for this session yet." : "Add a session to see its health."}</p>
              )}
            </div>
            <div className="border border-[#E0E0E0] rounded-lg p-4 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Access Logs</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[360px]">
                  <thead className="text-[#828282] border-b border-[#D3D3D3]">
                    <tr><th className="py-2 pr-3 font-medium">User Type</th><th className="py-2 pr-3 font-medium">Date &amp; Time</th><th className="py-2 font-medium">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEEEEE] text-[#4B4F52]">
                    {accessLogs.length === 0 ? (
                      <tr><td colSpan={3} className="py-6 text-center text-[#828282]">No recorded activity yet.</td></tr>
                    ) : (
                      accessLogs.map((log) => (
                        <tr key={log._id}>
                          <td className="py-2 pr-3 whitespace-nowrap">{log.actorType === "SYSTEM_USER" ? "System User" : log.actorType === "ORGANIZER" ? "Organizer" : "Admin"}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                          <td className="py-2 max-w-[220px] truncate" title={log.action}>{log.action}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>

      {cardExpanded && <CardPreviewModal eventId={eventId} onClose={() => setCardExpanded(false)} />}
      <EventCleanupModal
        isOpen={cleanupOpen}
        onClose={() => {
          setCleanupOpen(false);
          sessionStorage.setItem(`dismiss_cleanup_${eventId}`, "true");
        }}
        eventId={eventId}
        eventTitle={event.title}
        onCleanupSuccess={async () => {
          setCleanupOpen(false);
          setNotice("Operational data for this event has been cleared.");
          await load();
        }}
      />
    </div>
  );
}
