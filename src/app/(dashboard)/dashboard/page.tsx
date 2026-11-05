"use client";

import PageHeader from "@/components/common/PageHeader";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { eventService } from "@/services/eventService";
import { reportService } from "@/services/reportService";
import { userService } from "@/services/userService";
import { eventDisplayStatus } from "@/utils/eventUtils";
import DashboardPopupModal from "@/components/dashboard/DashboardPopupModal";
import { Skeleton, TableSkeletonRows } from "@/components/common/Skeleton";
import { formatDateTime } from "@/utils/dateTime";

interface OrganizerSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalEvents: number;
  ongoingEvents: number;
  pastEvents: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  where: string;
  category: string;
}

const UPCOMING_LIMIT = 8;

export default function DashboardPage() {
  const { user } = useAuth();
  
  // Organizer / Admin metric states
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [activeEvents, setActiveEvents] = useState<number>(0);
  const [totalInvitees, setTotalInvitees] = useState<number>(0);
  const [organizerCount, setOrganizerCount] = useState<number>(0);
  const [topOrganizers, setTopOrganizers] = useState<OrganizerSummary[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  // The organizer's next events, soonest first
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([]);
  const [upcomingTotal, setUpcomingTotal] = useState(0);


  // Welcome Popup modal (06-Popup.pdf)
  const [showWelcomePopup, setShowWelcomePopup] = useState<boolean>(false);

  const isAdmin = user?.role === "ADMIN";

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

      // Organizer / Admin metrics, all derived from backend data
      (async () => {
        setLoadingMetrics(true);
        setMetricsError(null);
        const [eventsRes, statsRes, organizersRes] = await Promise.all([
          eventService.getEvents(),
          reportService.getDashboardStats(),
          isAdmin ? userService.getUsers("ORGANIZER") : Promise.resolve(null),
        ]);
        if (cancelled) return;

        const events: any[] = eventsRes?.success && Array.isArray(eventsRes.data) ? (eventsRes.data as any[]) : [];
        if (!eventsRes?.success) setMetricsError(eventsRes?.message || "Failed to load events.");

        const statusOf = (e: any) => eventDisplayStatus({ status: String(e.status || "").toUpperCase(), schedule: { start: e.schedule?.start || e.startDate, end: e.schedule?.end || e.endDate } });

        setTotalEvents(statsRes?.success && statsRes.data ? statsRes.data.totalEvents : events.length);
        setTotalInvitees(statsRes?.success && statsRes.data ? statsRes.data.totalInvitees : 0);
        setActiveEvents(events.filter((e) => ["Upcoming", "Ongoing"].includes(statusOf(e))).length);

        if (!isAdmin) {
          const next = events
            .filter((e) => statusOf(e) === "Upcoming")
            .map((e) => ({
              id: String(e._id || e.id),
              title: String(e.title || "Untitled event"),
              start: String(e.schedule?.start || e.startDate || ""),
              end: String(e.schedule?.end || e.endDate || ""),
              where: e.format === "VIRTUAL" ? "Online event" : String(e.location?.address || e.venue || "—"),
              category: String(e.categoryId?.name || ""),
            }))
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
          setUpcomingTotal(next.length);
          setUpcoming(next.slice(0, UPCOMING_LIMIT));
        }

        if (isAdmin && organizersRes) {
          const organizers = organizersRes.success && Array.isArray(organizersRes.data)
            ? organizersRes.data.filter((u) => u.role === "ORGANIZER")
            : [];
          setOrganizerCount(organizers.length);
          const summaries: OrganizerSummary[] = organizers.map((org) => {
            const owned = events.filter((e) => String(e.organizerId?._id || e.organizerId) === String(org._id));
            return {
              id: org._id,
              name: org.profile?.organizationName || "Organisation not set",
              email: org.email,
              phone: org.phone || "—",
              totalEvents: owned.length,
              ongoingEvents: owned.filter((e) => ["Upcoming", "Ongoing"].includes(statusOf(e))).length,
              pastEvents: owned.filter((e) => statusOf(e) === "Completed").length,
            };
          });
          setTopOrganizers(summaries.sort((a, b) => b.totalEvents - a.totalEvents).slice(0, 5));
        }
        setLoadingMetrics(false);
      })();

    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);

  return (
    <div className="w-full min-h-full bg-white text-gray-900 font-sans">
      {/* Top Header Bar */}
      <PageHeader title="Dashboard" />

      {/* Dashboard Main Content */}
      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6 pb-24">
        {metricsError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-medium break-words">{metricsError}</div>
        )}
        {/* Top Section: Single Stats Card Container with dividers (Left) + Revenue Overview Chart (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Metrics Single Card Container with Dividers */}
          <div className={`bg-white border border-gray-200 rounded-md shadow-2xs ${isAdmin ? "lg:col-span-4 divide-y divide-gray-200 flex flex-col justify-between" : "lg:col-span-12 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-200"}`}>
            {/* Row 1: Total Revenue: only administrators see revenue */}
            {isAdmin && (
            <div className="p-5 flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-full bg-orange-100/70 text-[#FF5B22] flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">—</h3>
                <p className="text-xs font-medium text-gray-500 mt-0.5">Total Revenue (payments not configured)</p>
              </div>
            </div>
            )}

            {/* Row 2: Total Events */}
            <div className="p-5 flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-full bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{loadingMetrics ? <Skeleton className="h-7 w-16" /> : totalEvents.toLocaleString()}</h3>
                <p className="text-xs font-medium text-gray-500 mt-0.5">Total Events</p>
              </div>
            </div>

            {/* Row 3: Active Events */}
            <div className="p-5 flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-full bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{loadingMetrics ? <Skeleton className="h-7 w-16" /> : activeEvents.toLocaleString()}</h3>
                <p className="text-xs font-medium text-gray-500 mt-0.5">Active Events</p>
              </div>
            </div>

            {/* Row 4: Total Organizers */}
            <div className="p-5 flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-full bg-purple-100/70 text-purple-600 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                  {loadingMetrics ? <Skeleton className="h-7 w-16" /> : (isAdmin ? organizerCount : totalInvitees).toLocaleString()}
                </h3>
                <p className="text-xs font-medium text-gray-500 mt-0.5">{isAdmin ? "Total Organizers" : "Total Invitees"}</p>
              </div>
            </div>
          </div>

          {/* Right: Revenue Overview chart (administrators only) */}
          {isAdmin && (
          <div className="lg:col-span-8 bg-white border border-gray-200 rounded-md p-6 shadow-2xs flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Revenue Overview</h3>
            </div>

            <div className="relative h-64 w-full flex items-center justify-center border-l border-b border-gray-200 pl-8 pb-4 pt-4">
              <p className="text-gray-400 font-medium text-sm text-center px-4">
                Revenue appears here once online payments are configured.
              </p>
            </div>
          </div>
          )}
        </div>

        {/* Organizers: what is coming up next */}
        {!isAdmin && (
          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-gray-900">Upcoming Events{!loadingMetrics && upcomingTotal > 0 ? <span className="ml-2 text-xs font-medium text-gray-500">({upcomingTotal})</span> : null}</h3>
              <Link href="/events" className="text-xs font-semibold text-[#FF5B22] hover:underline">View all events</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-medium text-[11px]">
                    <th className="py-3 px-4 font-medium">Event</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Starts</th>
                    <th className="py-3 px-4 font-medium whitespace-nowrap">Ends</th>
                    <th className="py-3 px-4 font-medium">Location</th>
                    <th className="py-3 px-4 font-medium">Category</th>
                    <th className="py-3 px-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800">
                  {loadingMetrics ? (
                    <TableSkeletonRows rows={4} cols={6} />
                  ) : upcoming.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 font-medium">
                        No upcoming events. <Link href="/events/add" className="text-[#FF5B22] font-semibold hover:underline">Create one</Link>
                      </td>
                    </tr>
                  ) : (
                    upcoming.map((ev) => (
                      <tr key={ev.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-4 px-4 font-semibold text-gray-900 max-w-[240px] truncate" title={ev.title}>{ev.title}</td>
                        <td className="py-4 px-4 text-gray-600 whitespace-nowrap">{formatDateTime(ev.start, "—")}</td>
                        <td className="py-4 px-4 text-gray-600 whitespace-nowrap">{formatDateTime(ev.end, "—")}</td>
                        <td className="py-4 px-4 text-gray-600 max-w-[260px] truncate" title={ev.where}>{ev.where}</td>
                        <td className="py-4 px-4 text-gray-600 max-w-[160px] truncate" title={ev.category}>{ev.category || "—"}</td>
                        <td className="py-4 px-2 text-right whitespace-nowrap">
                          <Link href={`/events/${ev.id}`} className="text-[#FF5B22] font-semibold hover:underline">View</Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                  {loadingMetrics ? (
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
