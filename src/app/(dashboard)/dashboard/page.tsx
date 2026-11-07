"use client";

import PageHeader from "@/components/common/PageHeader";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { eventService } from "@/services/eventService";
import { reportService } from "@/services/reportService";
import { userService } from "@/services/userService";
import { notificationService, type NotificationItem } from "@/services/notificationService";
import { platformSettingsService, type EarningsData } from "@/services/platformSettingsService";
import { eventDisplayStatus } from "@/utils/eventUtils";
import DashboardPopupModal from "@/components/dashboard/DashboardPopupModal";
import { Skeleton, TableSkeletonRows } from "@/components/common/Skeleton";
import { formatDateTime } from "@/utils/dateTime";
import { settleRange, startsWithin } from "@/utils/dateRange";

interface OrganizerSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalEvents: number;
  ongoingEvents: number;
  pastEvents: number;
}

type Phase = "Upcoming" | "Ongoing" | "Past";

interface OverviewRow {
  id: string;
  title: string;
  start: string;
  end: string;
  invitees: number;
  invited: boolean;
  phase: Phase | "Cancelled";
  organizer: string;
}

// ---- small pieces drawn the way the dashboard design shows them -------------------------------------------------------------

const ArrowOut = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} aria-label={label} title={label} className="text-[#15191C] hover:text-[#FF651D] shrink-0">
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 17L17 7M9 7h8v8" /></svg>
  </Link>
);

function StatCard({ tone, icon, label, value, caption, lines, href, loading }: {
  tone: "orange" | "green" | "blue";
  icon: React.ReactNode;
  label: string;
  value: string;
  caption: string;
  lines: React.ReactNode[];
  href: string;
  loading: boolean;
}) {
  const t = { orange: ["bg-[#FFE9DE]", "text-[#FF651D]"], green: ["bg-[#DDF6EA]", "text-[#1A9C5B]"], blue: ["bg-[#E1E8FF]", "text-[#2F5BEA]"] }[tone];
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className={`size-12 rounded-full flex items-center justify-center ${t[0]} ${t[1]}`} aria-hidden>{icon}</span>
          <span className={`text-sm font-semibold ${t[1]}`}>{label}</span>
        </div>
        <ArrowOut href={href} label={`Open ${label}`} />
      </div>
      <div className="mt-4 text-[34px] leading-none font-semibold text-[#15191C] tracking-tight">{loading ? <Skeleton className="h-9 w-24" /> : value}</div>
      <p className="mt-1.5 text-sm text-[#15191C]">{caption}</p>
      <div className="mt-4 space-y-1.5 text-xs text-[#4B4F52]">{loading ? <Skeleton className="h-4 w-40" /> : lines.map((l, i) => <p key={i}>{l}</p>)}</div>
    </div>
  );
}

function Donut({ invitees, attendees }: { invitees: number; attendees: number }) {
  if (invitees <= 0) return <p className="py-6 text-center text-xs text-[#828282]">No guests were invited to this event.</p>;
  const attended = Math.min(attendees, invitees);
  const pctAttended = Math.round((attended / invitees) * 100);
  const r = 44, c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-28 shrink-0">
        <svg viewBox="0 0 120 120" className="size-28 -rotate-90" role="img" aria-label={`${attended} of ${invitees} invitees attended (${pctAttended}%)`}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="#FF651D" strokeWidth="22" />
          <circle cx="60" cy="60" r={r} fill="none" stroke="#2B2F33" strokeWidth="22" strokeDasharray={`${(pctAttended / 100) * c} ${c}`} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[#15191C]">{pctAttended}%</span>
      </div>
      <div className="min-w-0 space-y-2.5 text-xs text-[#15191C]">
        <p className="flex items-center gap-2"><span className="size-2.5 shrink-0 rounded-full bg-[#FF651D]" aria-hidden />Invitees <span className="font-semibold">{invitees}</span></p>
        <p className="flex items-center gap-2"><span className="size-2.5 shrink-0 rounded-full bg-[#2B2F33]" aria-hidden />Attendees <span className="font-semibold">{attended}</span></p>
      </div>
    </div>
  );
}

const compactMoney = (amount: number, currency: string) => {
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(amount); }
  catch { return String(amount); }
};
const fullMoney = (amount: number, currency: string) => {
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount); }
  catch { return String(amount); }
};
const sameMonth = (iso?: string) => { if (!iso) return false; const d = new Date(iso), n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth(); };
const shortDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [lastCreated, setLastCreated] = useState<string | undefined>();
  const [people, setPeople] = useState<{ total: number; active: number; inactive: number; newThisMonth: number }>({ total: 0, active: 0, inactive: 0, newThisMonth: 0 });
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [notes, setNotes] = useState<NotificationItem[]>([]);
  const [report, setReport] = useState<{ title: string; invitees: number; attendees: number } | null>(null);
  const [topOrganizers, setTopOrganizers] = useState<OrganizerSummary[]>([]);

  const [tab, setTab] = useState<Phase>("Upcoming");
  // the overview shows one page at a time, so a long list never stretches the page past the cards beside it
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Welcome Popup modal (06-Popup.pdf)
  const [showWelcomePopup, setShowWelcomePopup] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined" || sessionStorage.getItem("show_dashboard_popup") !== "true") return;
    // Wait for the dashboard's own page fade-in (~0.45s) to finish. Opened any earlier, the popup's entrance
    // plays underneath a still-transparent page and the user just sees it appear.
    const timer = window.setTimeout(() => {
      sessionStorage.removeItem("show_dashboard_popup");
      setShowWelcomePopup(true);
    }, 650);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      // Each role sees only what it may: an organizer their own events, staff and billing; an admin everyone's events, the organizers and platform earnings
      const [eventsRes, peopleRes, earningsRes, notesRes] = await Promise.all([
        eventService.getEvents(),
        userService.getUsers(isAdmin ? "ORGANIZER" : "SYSTEM_USER", undefined, { includeInactive: isAdmin }),
        platformSettingsService.getEarnings(),
        notificationService.getUserNotifications(false, 1, 6),
      ]);
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const events: any[] = eventsRes?.success && Array.isArray(eventsRes.data) ? (eventsRes.data as any[]) : [];
      if (!eventsRes?.success) setError(eventsRes?.message || "Failed to load events.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const phaseOf = (e: any): OverviewRow["phase"] => {
        if (String(e.status || "").toUpperCase() === "CANCELLED") return "Cancelled";
        const p = eventDisplayStatus({ status: String(e.status || "").toUpperCase(), schedule: { start: e.schedule?.start || e.startDate, end: e.schedule?.end || e.endDate } });
        return p === "Completed" ? "Past" : (p as Phase);
      };
      const mapped: OverviewRow[] = events.map((e) => ({
        id: String(e._id || e.id),
        title: String(e.title || "Untitled event"),
        start: String(e.schedule?.start || e.startDate || ""),
        end: String(e.schedule?.end || e.endDate || ""),
        invitees: Number(e.inviteesCount ?? 0),
        invited: Number(e.invitationsSent ?? 0) > 0,
        phase: phaseOf(e),
        organizer: e.organizerId && typeof e.organizerId === "object" ? e.organizerId.profile?.organizationName || e.organizerId.fullName || "—" : "—",
      }));
      setRows(mapped);
      setLastCreated(events.map((e) => e.createdAt).filter(Boolean).sort().pop());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: any[] = peopleRes?.success && Array.isArray(peopleRes.data) ? (peopleRes.data as any[]).filter((u) => u.role === (isAdmin ? "ORGANIZER" : "SYSTEM_USER")) : [];
      setPeople({
        total: list.length,
        active: list.filter((u) => u.isActive !== false).length,
        inactive: list.filter((u) => u.isActive === false).length,
        newThisMonth: list.filter((u) => sameMonth(u.createdAt)).length,
      });
      setEarnings(earningsRes?.success && earningsRes.data ? earningsRes.data : null);
      setNotes(notesRes?.success && Array.isArray(notesRes.data) ? notesRes.data : []);

      if (isAdmin) {
        setTopOrganizers(
          list
            .map((org) => {
              const owned = events.filter((e) => String(e.organizerId?._id || e.organizerId) === String(org._id));
              return {
                id: org._id,
                name: org.profile?.organizationName || "Organisation not set",
                email: org.email,
                phone: org.phone || "—",
                totalEvents: owned.length,
                ongoingEvents: owned.filter((e) => ["Upcoming", "Ongoing"].includes(phaseOf(e))).length,
                pastEvents: owned.filter((e) => phaseOf(e) === "Past").length,
              };
            })
            .sort((a, b) => b.totalEvents - a.totalEvents)
            .slice(0, 5)
        );
      }

      // "Last Event Report": the most recent event that has ended (else the one running now), invitees against attendees
      const ended = mapped.filter((r) => r.phase === "Past").sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());
      const target = ended[0] || mapped.filter((r) => r.phase === "Ongoing")[0];
      if (target) {
        const rep = await reportService.getEventReport(target.id);
        if (!cancelled && rep.success && rep.data) setReport({ title: target.title, invitees: rep.data.totalInvitees, attendees: rep.data.uniqueAttendees ?? rep.data.totalCheckIns });
      } else if (!cancelled) setReport(null);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, isAdmin]);

  const counts = useMemo(() => ({
    upcoming: rows.filter((r) => r.phase === "Upcoming").length,
    ongoing: rows.filter((r) => r.phase === "Ongoing").length,
  }), [rows]);

  // Events Overview: the chosen tab, within the chosen dates (by start date); soonest first for what is to come, latest first for the past
  const overview = useMemo(() => {
    const list = rows.filter((r) => r.phase === tab && startsWithin(r.start, from, to));
    return list.sort((a, b) => (tab === "Past" ? new Date(b.start).getTime() - new Date(a.start).getTime() : new Date(a.start).getTime() - new Date(b.start).getTime()));
  }, [rows, tab, from, to]);

  // The table keeps one height whichever tab is open: room for as many rows as the fullest tab shows (at most a page), plus the
  // pagination bar if any tab needs one. Switching tabs then never makes the card, or the column beside it, jump.
  const tabCounts = useMemo(() => {
    const inRange = rows.filter((r) => startsWithin(r.start, from, to));
    return (["Upcoming", "Ongoing", "Past"] as const).map((ph) => inRange.filter((r) => r.phase === ph).length);
  }, [rows, from, to]);
  const reservedRows = Math.min(PAGE_SIZE, Math.max(1, ...tabCounts));
  const reservePager = tabCounts.some((c) => c > PAGE_SIZE);

  const pageCount = Math.max(1, Math.ceil(overview.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = overview.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  // events still to come (or running) whose invitations have / have not gone out (used by the Invitation Status card, hidden for now)
  // const active = rows.filter((r) => r.phase === "Upcoming" || r.phase === "Ongoing");
  // const sentCount = active.filter((r) => r.invited).length;

  const currency = earnings?.currency || "INR";
  const thisMonth = (earnings?.events || []).filter((e) => sameMonth(e.createdAt)).reduce((n, e) => n + (e.amount || 0), 0);
  const lastBilled = [...(earnings?.events || [])].filter((e) => e.amount).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const card = "bg-white border border-[#E0E0E0] rounded-lg";
  const dateField = "h-9 w-[132px] px-2.5 text-xs border border-[#E0E0E0] rounded-md bg-white text-[#15191C] focus:outline-none focus:border-[#FF651D]";

  return (
    <div className="w-full min-h-full bg-white text-gray-900 font-sans">
      <PageHeader title="Dashboard" />

      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-[1440px] mx-auto space-y-6 pb-24">
        {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-medium break-words">{error}</div>}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-6">
          {/* Left: the three summary cards, then the events overview */}
          <div className="space-y-6 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                tone="orange"
                label="Events"
                href="/events"
                loading={loading}
                value={rows.length.toLocaleString()}
                caption="Total Events"
                icon={<svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 7V3m8 4V3M4 11h16M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                lines={[
                  <><span className="font-semibold text-[#FF651D]">{counts.upcoming} Upcoming</span> <span className="mx-1">•</span> <span className="font-medium text-[#15191C]">{counts.ongoing} Ongoing</span></>,
                  <>Last Created: {shortDate(lastCreated)}</>,
                ]}
              />
              <StatCard
                tone="green"
                label={isAdmin ? "Event Organizers" : "System Users"}
                href={isAdmin ? "/event-organizer" : "/user-management"}
                loading={loading}
                value={people.total.toLocaleString()}
                caption={isAdmin ? "Total Organizers" : "Total System Users"}
                icon={<svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17 20h5v-2a3 3 0 00-5.36-1.86M17 20H7m10 0v-2c0-.66-.13-1.28-.36-1.86M7 20H2v-2a3 3 0 015.36-1.86M7 20v-2c0-.66.13-1.28.36-1.86m0 0a5 5 0 019.28 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                lines={[
                  <><span className="font-semibold text-[#FF651D]">{people.active.toLocaleString()} Active</span> <span className="mx-1">•</span> <span className="font-medium text-[#15191C]">{people.inactive.toLocaleString()} Inactive</span></>,
                  <>{people.newThisMonth} New {isAdmin ? (people.newThisMonth === 1 ? "organizer" : "organizers") : people.newThisMonth === 1 ? "user" : "users"} added this month</>,
                ]}
              />
              <StatCard
                tone="blue"
                label={isAdmin ? "Earnings Overview" : "Billing Overview"}
                href={isAdmin ? "/earnings" : "/billing"}
                loading={loading}
                value={earnings ? compactMoney(earnings.totalAmount, currency) : "—"}
                caption={isAdmin ? "Total Earnings" : "Total Payments"}
                icon={<svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                lines={[
                  <>This Month: <span className="font-semibold text-[#FF651D]">{fullMoney(thisMonth, currency)}</span></>,
                  lastBilled ? <>Last billed: <span className="font-semibold text-[#1A9C5B]">{lastBilled.eventName}</span></> : <>No billed events yet</>,
                ]}
              />
            </div>

            {/* Events Overview: tabs, a date range and the events of the chosen kind */}
            <section className={`${card} p-5`} aria-labelledby="events-overview-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 id="events-overview-title" className="text-base font-medium text-[#15191C]">Events Overview</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <input type="date" aria-label="From date" title="Events starting on or after this day" value={from} max={to || undefined} onChange={(e) => { const r = settleRange({ from: e.target.value, to }, "from"); setFrom(r.from); setTo(r.to); setPage(1); }} className={dateField} />
                  <span className="text-xs text-[#828282]">To</span>
                  <input type="date" aria-label="To date" title="Events starting on or before this day" value={to} min={from || undefined} onChange={(e) => { const r = settleRange({ from, to: e.target.value }, "to"); setFrom(r.from); setTo(r.to); setPage(1); }} className={dateField} />
                  {(from || to) && (
                    <button type="button" onClick={() => { setFrom(""); setTo(""); setPage(1); }} className="h-9 px-3 text-xs font-medium text-[#15191C] underline decoration-[#BDBDBD] underline-offset-2 hover:text-[#FF651D] cursor-pointer">
                      Clear dates
                    </button>
                  )}
                  <Link href="/events/add" className="ml-1 inline-flex items-center gap-2 px-5 h-10 bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-semibold rounded-md">
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    Add Event
                  </Link>
                </div>
              </div>
              <div role="tablist" aria-label="Which events" className="mt-4 flex gap-6 border-b border-[#E0E0E0]">
                {(["Upcoming", "Ongoing", "Past"] as Phase[]).map((p) => (
                  <button key={p} type="button" role="tab" aria-selected={tab === p} onClick={() => { setTab(p); setPage(1); }} className={`-mb-px pb-2.5 text-sm cursor-pointer ${tab === p ? "border-b-2 border-[#15191C] text-[#15191C] font-medium" : "text-[#4B4F52] hover:text-[#15191C]"}`}>
                    {p} Events
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] table-fixed text-left text-sm">
                  <thead>
                    <tr className="text-[#828282] text-[13px] border-b border-[#E0E0E0]">
                      <th className={`${isAdmin ? "w-[28%]" : "w-[36%]"} py-3 px-2.5 font-normal`}>Event Name</th>
                      {isAdmin && <th className="w-[18%] py-3 px-2.5 font-normal">Organizer</th>}
                      <th className="w-[24%] py-3 px-2.5 font-normal">Start Date &amp; Time</th>
                      <th className="w-[13%] py-3 px-2.5 font-normal">Total Invitee</th>
                      <th className="w-[19%] py-3 px-2.5 font-normal">Status</th>
                      <th className="w-[6%] py-3" aria-label="Open" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E0E0] text-[#15191C] [&>tr]:h-12">
                    {loading ? (
                      <TableSkeletonRows rows={4} cols={isAdmin ? 6 : 5} />
                    ) : overview.length === 0 ? (
                      <tr><td colSpan={isAdmin ? 6 : 5} className="py-3 text-center text-sm text-[#828282]">No {tab.toLowerCase()} events{from || to ? " in these dates" : ""}.</td></tr>
                    ) : (
                      pageRows.map((r) => (
                        <tr key={r.id} onClick={() => router.push(`/events/${r.id}`)} className="cursor-pointer hover:bg-gray-50/80">
                          <td className="py-3 px-2.5 truncate" title={r.title}><Link href={`/events/${r.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-[#FF651D]">{r.title}</Link></td>
                          {isAdmin && <td className="py-3 px-2.5 truncate text-[#4B4F52]" title={r.organizer}>{r.organizer}</td>}
                          <td className="py-3 px-2.5 whitespace-nowrap">{r.start ? formatDateTime(r.start).replace(", ", " | ") : "—"}</td>
                          <td className="py-3 px-2.5">{String(r.invitees).padStart(2, "0")}</td>
                          <td className="py-3 px-2.5">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${r.invited ? "bg-[#D6F5E1] text-[#1A9242]" : "bg-[#FFF0C2] text-[#9E7C00]"}`}>{r.invited ? "Invitation Sent" : "Invitation not sent"}</span>
                          </td>
                          <td className="py-3 text-right text-[#FF651D]" aria-hidden>
                            <svg className="size-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 17L17 7M9 7h8v8" /></svg>
                          </td>
                        </tr>
                      ))
                    )}
                    {/* blank rows up to the reserved height (see reservedRows) */}
                    {!loading && Array.from({ length: Math.max(0, reservedRows - Math.max(1, pageRows.length)) }, (_, i) => (
                      <tr key={`pad-${i}`} aria-hidden className="!h-[49px] !border-transparent"><td colSpan={isAdmin ? 6 : 5} /></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!loading && (overview.length > PAGE_SIZE || reservePager) && (
                // kept (invisible) on a tab that fits one page when another tab needs it, so the height stays the same
                <div aria-hidden={overview.length > PAGE_SIZE ? undefined : true} className={`mt-3 flex items-center justify-between gap-3 text-xs text-[#4B4F52] ${overview.length > PAGE_SIZE ? "" : "invisible"}`}>
                  <span>Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, overview.length)} of {overview.length}</span>
                  <span className="inline-flex items-center gap-2">
                    <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1} className="px-3 py-1.5 border border-[#E0E0E0] rounded-md disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">Previous</button>
                    <span>Page {currentPage} of {pageCount}</span>
                    <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount} className="px-3 py-1.5 border border-[#E0E0E0] rounded-md disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">Next</button>
                  </span>
                </div>
              )}
            </section>
          </div>

          {/* Right: recent notifications and the last event's attendance. The column is as tall as the left one (grid rows
              stretch) and the two cards share that height, so the two sides always end together. */}
          <div className="flex flex-col gap-6 min-w-0">
            <section className={`${card} p-5 xl:flex-1 flex flex-col`} aria-labelledby="recent-notes-title">
              <div className="flex items-center justify-between gap-2">
                <h3 id="recent-notes-title" className="text-base font-medium text-[#15191C]">Recent Notification</h3>
                <ArrowOut href="/notification" label="Open notifications" />
              </div>
              <div className={`mt-3 max-h-[300px] overflow-y-auto pr-1 divide-y divide-[#E0E0E0] xl:flex-1 ${!loading && notes.length === 0 ? "flex flex-col justify-center" : ""}`}>
                {loading ? (
                  <div className="space-y-3 py-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-8 w-full" /></div>
                ) : notes.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[#828282]">No notifications yet.</p>
                ) : (
                  notes.map((n) => (
                    <div key={n._id} className="py-3">
                      <p className={`text-sm ${n.isRead ? "font-normal" : "font-semibold"} text-[#15191C] break-words`}>{n.title}</p>
                      <p className="mt-1 text-xs text-[#4B4F52] line-clamp-2 break-words">{n.message}</p>
                      <p className="mt-1.5 text-[11px] text-[#828282]">{formatDateTime(n.createdAt).replace(", ", " | ")}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className={`${card} p-5 xl:flex-1 flex flex-col`} aria-labelledby="last-report-title">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="size-11 rounded-full bg-[#FFE9DE] text-[#FF651D] flex items-center justify-center shrink-0" aria-hidden>
                    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17V9m4 8V7m4 10v-4M4 21h16a1 1 0 001-1V4a1 1 0 00-1-1H4a1 1 0 00-1 1v16a1 1 0 001 1z" /></svg>
                  </span>
                  <div className="min-w-0">
                    <h3 id="last-report-title" className="text-sm font-semibold text-[#15191C]">Last Event Report</h3>
                    <p className="text-xs text-[#4B4F52] truncate" title={report?.title}>{report?.title || "No finished events yet"}</p>
                  </div>
                </div>
                <ArrowOut href="/reports" label="Open reports" />
              </div>
              <div className="mt-5 xl:flex-1 flex flex-col justify-center">
                {loading ? <Skeleton className="h-32 w-full" /> : report ? <Donut invitees={report.invitees} attendees={report.attendees} /> : <p className="py-6 text-center text-xs text-[#828282]">Attendance appears here once an event has taken place.</p>}
              </div>
            </section>

            {/* Hidden for now (not needed on the dashboard); the two cards above share the column's height instead.
            (Invitation Status: of the events still to come or running, how many have sent their invitations)
            <section className={`${card} p-5 xl:flex-1 flex flex-col`} aria-labelledby="invite-status-title">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 id="invite-status-title" className="text-sm font-semibold text-[#15191C]">Invitation Status</h3>
                  <p className="text-xs text-[#4B4F52]">Upcoming and ongoing events</p>
                </div>
                <ArrowOut href="/events" label="Open events" />
              </div>
              {loading ? <Skeleton className="mt-4 h-16 w-full" /> : active.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#828282]">No upcoming events.</p>
              ) : (
                <div className="mt-4 space-y-3 xl:flex-1 xl:flex xl:flex-col xl:justify-center">
                  <div className="h-2.5 w-full rounded-full bg-[#FFF0C2] overflow-hidden" role="img" aria-label={`${sentCount} of ${active.length} events have sent invitations`}>
                    <div className="h-full rounded-full bg-[#1A9242]" style={{ width: `${Math.round((sentCount / active.length) * 100)}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-[#D6F5E1] px-3 py-2.5">
                      <p className="text-xl font-semibold text-[#1A9242]">{sentCount}</p>
                      <p className="text-[11px] font-medium text-[#1A9242]">Invitation Sent</p>
                    </div>
                    <div className="rounded-md bg-[#FFF0C2] px-3 py-2.5">
                      <p className="text-xl font-semibold text-[#9E7C00]">{active.length - sentCount}</p>
                      <p className="text-[11px] font-medium text-[#9E7C00]">Invitation not sent</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
            */}
          </div>
        </div>

        {/* Bottom Section: Top Organizers Table Card Container */}
        {user?.role === "ADMIN" && (
          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Top Organizers</h3>
              <Link
                href="/event-organizer/add"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF5B22] hover:bg-[#E04B16] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Organizer</span>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-medium text-[11px]">
                    <th className="py-3 px-4 font-medium">Name</th>
                    <th className="py-3 px-4 font-medium">Email</th>
                    <th className="py-3 px-4 font-medium">Phone Number</th>
                    <th className="py-3 px-4 font-medium">Total Events</th>
                    <th className="py-3 px-4 font-medium">Revenue</th>
                    <th className="py-3 px-4 font-medium">Ongoing Events</th>
                    <th className="py-3 px-4 font-medium">Past Events</th>
                    <th className="py-3 px-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800">
                  {loading ? (
                    <TableSkeletonRows rows={5} cols={8} />
                  ) : topOrganizers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500 font-medium">
                        No organizer data available yet
                      </td>
                    </tr>
                  ) : (
                    topOrganizers.map((org) => (
                      <tr key={org.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-4 px-4 font-semibold text-gray-900 max-w-[200px] truncate" title={org.name}>{org.name}</td>
                        <td className="py-4 px-4 text-gray-600 max-w-[240px] truncate" title={org.email}>{org.email}</td>
                        <td className="py-4 px-4 text-gray-600">{org.phone}</td>
                        <td className="py-4 px-4 font-medium">{org.totalEvents}</td>
                        <td className="py-4 px-4 text-gray-400">—</td>
                        <td className="py-4 px-4 font-medium">{org.ongoingEvents}</td>
                        <td className="py-4 px-4 font-medium">{org.pastEvents}</td>
                        <td className="py-4 px-2 text-right">
                          <Link href={`/event-organizer/${org.id}`} className="text-[#FF5B22] font-semibold hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <DashboardPopupModal
        isOpen={showWelcomePopup}
        onClose={() => {
          setShowWelcomePopup(false);
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("show_dashboard_popup");
          }
        }}
      />
    </div>
  );
}
