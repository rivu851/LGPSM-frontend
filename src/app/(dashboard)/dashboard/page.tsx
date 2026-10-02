"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { eventService } from "@/services/eventService";
import { reportService } from "@/services/reportService";
import { userService } from "@/services/userService";
import { assignmentService, AssignmentData } from "@/services/assignmentService";
import { getDynamicEventStatus } from "@/utils/eventUtils";
import UserNavDropdown from "@/components/common/UserNavDropdown";
import CheckInModal from "@/components/common/CheckInModal";
import DashboardPopupModal from "@/components/dashboard/DashboardPopupModal";

interface OrganizerSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalEvents: number;
  ongoingEvents: number;
  pastEvents: number;
}

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

  // System User personalized assignments state
  const [myAssignments, setMyAssignments] = useState<AssignmentData[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState<boolean>(true);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);

  // CheckIn Modal state
  const [checkInModalEvent, setCheckInModalEvent] = useState<{ id: string; title: string } | null>(null);

  // Welcome Popup modal (06-Popup.pdf)
  const [showWelcomePopup, setShowWelcomePopup] = useState<boolean>(false);

  const isSystemUser = user?.role === "SYSTEM_USER";
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("show_dashboard_popup") === "true") {
      setShowWelcomePopup(true);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    if (isSystemUser) {
      // Fetch personal assignments from GET /api/v1/users/me/assignments
      (async () => {
        setLoadingAssignments(true);
        setAssignmentsError(null);
        const res = await assignmentService.getMyAssignments();
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data)) {
          setMyAssignments(res.data);
        } else {
          setMyAssignments([]);
          setAssignmentsError(res?.message || "Failed to load your assignments.");
        }
        setLoadingAssignments(false);
      })();
    } else {
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

        const statusOf = (e: any) =>
          String(e.status || "").toUpperCase() === "CANCELLED"
            ? "Cancelled"
            : getDynamicEventStatus(e.schedule?.start || e.startDate, e.schedule?.end || e.endDate, e.status);

        setTotalEvents(statsRes?.success && statsRes.data ? statsRes.data.totalEvents : events.length);
        setTotalInvitees(statsRes?.success && statsRes.data ? statsRes.data.totalInvitees : 0);
        setActiveEvents(events.filter((e) => ["Upcoming", "Ongoing"].includes(statusOf(e))).length);

        if (isAdmin && organizersRes) {
          const organizers = organizersRes.success && Array.isArray(organizersRes.data)
            ? organizersRes.data.filter((u) => u.role === "ORGANIZER")
            : [];
          setOrganizerCount(organizers.length);
          const summaries: OrganizerSummary[] = organizers.map((org) => {
            const owned = events.filter((e) => String(e.organizerId?._id || e.organizerId) === String(org._id));
            return {
              id: org._id,
              name: org.fullName,
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
    }

    return () => {
      cancelled = true;
    };
  }, [user, isSystemUser, isAdmin]);

  // If System User, render personalized assignments dashboard
  if (isSystemUser) {
    const totalAssignedSessions = myAssignments.reduce(
      (sum, item) => sum + (item.sessionIds?.length || 0),
      0
    );

    return (
      <div className="w-full min-h-full bg-white text-gray-900 font-sans select-none">
        {/* Top Header Bar */}
        <header className="h-20 bg-white border-b border-gray-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <svg className="w-7 h-7 text-[#FF5B22] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <div>
              <h1 className="text-xl font-bold text-gray-900">My Assignments</h1>
              <p className="text-xs text-gray-500">System User Operations Portal</p>
            </div>
          </div>
          <UserNavDropdown />
        </header>

        {/* System User Main Content */}
        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6 pb-24">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-[#FF5B22] to-[#ff7b4d] text-white p-6 rounded-xl shadow-md flex items-center justify-between">
            <div>
              <span className="inline-block px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold uppercase tracking-wider mb-1">
                System User Portal
              </span>
              <h2 className="text-xl font-bold">Welcome back, {user?.fullName || "Staff Member"}!</h2>
              <p className="text-xs text-white/90 mt-1">
                Here are the event sessions assigned to you for check-in management and operational support.
              </p>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 text-[#FF5B22] flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{myAssignments.length}</h3>
                <p className="text-xs font-semibold text-gray-500">Assigned Events</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{totalAssignedSessions}</h3>
                <p className="text-xs font-semibold text-gray-500">Assigned Sessions</p>
              </div>
            </div>
          </div>

          {/* Assignments Table Container */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-gray-900">Assigned Event Sessions</h3>

            {loadingAssignments ? (
              <div className="py-12 flex justify-center items-center">
                <div className="w-6 h-6 border-2 border-[#FF5B22] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : assignmentsError ? (
              <div className="py-12 text-center text-rose-600 text-xs font-medium break-words">{assignmentsError}</div>
            ) : myAssignments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 font-semibold text-[11px]">
                      <th className="py-3 px-4">Event</th>
                      <th className="py-3 px-4">Assigned Sessions</th>
                      <th className="py-3 px-4">Location / Format</th>
                      <th className="py-3 px-4">Assigned By</th>
                      <th className="py-3 px-4">Assignment Date</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-800">
                    {myAssignments.map((item) => {
                      const eventObj = typeof item.eventId === "object" ? item.eventId : null;
                      const realEvtId = eventObj?._id || (typeof item.eventId === "string" ? item.eventId : "");
                      const eventTitle = eventObj?.title || "Event";
                      const rawLocation: any = eventObj?.location;
                      const eventLocation = (typeof rawLocation === "string" ? rawLocation : rawLocation?.address) || eventObj?.format || "—";

                      const assignedByObj = typeof item.assignedBy === "object" ? item.assignedBy : null;
                      const assignedByName = assignedByObj?.fullName || assignedByObj?.email || "Organizer";

                      return (
                        <tr key={item._id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-4 px-4 font-bold text-gray-900 max-w-[240px] truncate" title={eventTitle}>
                            {eventTitle}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {(item.sessionIds || []).length === 0 && (
                                <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-md uppercase tracking-tight">
                                  All sessions
                                </span>
                              )}
                              {(item.sessionIds || []).map((s: any, idx: number) => {
                                const sessName = typeof s === "object" ? s.name : `Session ${idx + 1}`;
                                return (
                                  <span
                                    key={idx}
                                    className="px-2.5 py-1 bg-[#FF5B22] text-white text-[10px] font-bold rounded-md uppercase tracking-tight"
                                  >
                                    • {sessName}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-600 font-medium max-w-[220px] truncate" title={eventLocation}>
                            {eventLocation}
                          </td>
                          <td className="py-4 px-4 text-gray-700 font-medium">
                            {assignedByName}
                          </td>
                          <td className="py-4 px-4 text-gray-500 text-[11px]">
                            {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                          </td>
                          <td className="py-4 px-4 text-right">
                            {realEvtId && (
                              <button
                                type="button"
                                onClick={() => setCheckInModalEvent({ id: realEvtId, title: eventTitle })}
                                className="px-3 py-1.5 bg-[#FF5B22] hover:bg-[#E04B16] text-white font-bold text-xs rounded-md shadow-xs transition-colors cursor-pointer"
                              >
                                Scan / Check In
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500 text-xs">
                No active assignments found for your account. You will be notified when an organizer assigns event sessions to you.
              </div>
            )}
          </div>
        </div>

        {/* Check-In Modal for System Users */}
        {checkInModalEvent && (
          <CheckInModal
            isOpen={!!checkInModalEvent}
            onClose={() => setCheckInModalEvent(null)}
            eventId={checkInModalEvent.id}
            eventName={checkInModalEvent.title}
          />
        )}
      </div>
    );
  }

  // Standard Admin / Organizer Dashboard
  return (
    <div className="w-full min-h-full bg-white text-gray-900 font-sans">
      {/* Top Header Bar */}
      <header className="h-20 bg-white border-b border-gray-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <svg className="w-7 h-7 text-[#FF5B22] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <UserNavDropdown />
      </header>

      {/* Dashboard Main Content */}
      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6 pb-24">
        {metricsError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-medium break-words">{metricsError}</div>
        )}
        {/* Top Section: Single Stats Card Container with dividers (Left) + Revenue Overview Chart (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Metrics Single Card Container with Dividers */}
          <div className="lg:col-span-4 bg-white border border-gray-200 rounded-md divide-y divide-gray-200 shadow-2xs flex flex-col justify-between">
            {/* Row 1: Total Revenue */}
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

            {/* Row 2: Total Events */}
            <div className="p-5 flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-full bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{loadingMetrics ? "…" : totalEvents.toLocaleString()}</h3>
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
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{loadingMetrics ? "…" : activeEvents.toLocaleString()}</h3>
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
                  {loadingMetrics ? "…" : (isAdmin ? organizerCount : totalInvitees).toLocaleString()}
                </h3>
                <p className="text-xs font-medium text-gray-500 mt-0.5">{isAdmin ? "Total Organizers" : "Total Invitees"}</p>
              </div>
            </div>
          </div>

          {/* Right Revenue Overview Chart Card Container */}
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
                  {loadingMetrics ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500 font-medium">Loading organizers...</td>
                    </tr>
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
