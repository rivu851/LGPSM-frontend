"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import UserNavDropdown from "@/components/common/UserNavDropdown";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { userService } from "@/services/userService";
import { eventService } from "@/services/eventService";
import { getDynamicEventStatus } from "@/utils/eventUtils";
import CustomDropdown from "@/components/common/CustomDropdown";
import { formatEventId } from "@/utils/formatId";

interface EventRow {
  id: string;
  eventId: string;
  name: string;
  organizer: string;
  createdOn: string;
  category: string;
  startDate: string;
  endDate: string;
  status: "Upcoming" | "Completed" | "Ongoing" | "Invitation not send";
}

interface OrganizerDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  logoUrl?: string;
  status: "Active" | "In Active" | "Deactivate";
}

export default function OrganizerDetailsPage() {
  const params = useParams();
  const { user } = useAuth();
  const organizerId = (params?.id as string) || "";

  const [organizer, setOrganizer] = useState<OrganizerDetail | null>(null);

  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("Policy Violation");
  const [deactivateMessage, setDeactivateMessage] = useState("");
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  useEffect(() => {
    async function loadOrganizerAndEvents() {
      setLoading(true);
      setLoadError(null);

      // 1. Organizer account (only active organizers are returned by the backend)
      const usersRes = await userService.getUsers("ORGANIZER");
      if (!usersRes.success) {
        setLoadError(usersRes.message || "Failed to load organizer.");
        setOrganizer(null);
        setLoading(false);
        return;
      }
      const matched = (usersRes.data || []).find(
        (u: any) => String(u._id || u.id) === String(organizerId) && u.role === "ORGANIZER"
      ) as any;

      if (!matched) {
        setLoadError("Organizer not found or already deactivated.");
        setOrganizer(null);
        setLoading(false);
        return;
      }

      const foundOrg: OrganizerDetail = {
        id: matched._id || matched.id,
        name: matched.fullName || matched.name || "",
        email: matched.email || "—",
        phone: matched.phone || "—",
        logoUrl: matched.avatarUrl || matched.profile?.avatarUrl,
        status: matched.isActive === false ? "Deactivate" : "Active",
      };
      setOrganizer(foundOrg);
      setIsDeactivated(foundOrg.status !== "Active");

      // 2. Events owned by this organizer (admin read access)
      const evRes = await eventService.getEvents({ organizerId: foundOrg.id });
      const rawList: any[] = evRes.success && Array.isArray(evRes.data) ? (evRes.data as any[]) : [];
      if (!evRes.success) {
        setLoadError(evRes.message || "Failed to load this organizer's events.");
      }

      const mappedEvents: EventRow[] = rawList.map((ev: any) => {
        const start = ev.schedule?.start || ev.startDate;
        const end = ev.schedule?.end || ev.endDate;
        const rawStatus = String(ev.status || "").toUpperCase();
        const rawId = ev._id || ev.id;
        return {
          id: rawId,
          eventId: formatEventId(ev.eventId || rawId),
          name: ev.title || ev.eventName || "Untitled Event",
          organizer: ev.organizerId?.fullName || foundOrg.name,
          createdOn: ev.createdAt ? new Date(ev.createdAt).toLocaleDateString() : "—",
          category: ev.categoryId?.name || ev.category || "—",
          startDate: start ? new Date(start).toLocaleString() : "TBD",
          endDate: end ? new Date(end).toLocaleString() : "TBD",
          status: (rawStatus === "CANCELLED" ? "Cancelled" : getDynamicEventStatus(start, end, ev.status)) as any,
        };
      });

      setEvents(mappedEvents);
      setLoading(false);
    }

    loadOrganizerAndEvents();
  }, [organizerId]);

  // Deactivation is a soft delete on the backend (isActive = false); the account is kept
  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizer) return;
    setIsDeactivating(true);
    setActionError(null);
    const res = await userService.deleteUser(organizer.id);
    setIsDeactivating(false);
    if (!res.success) {
      setActionError(res.message || "Failed to deactivate organizer.");
      return;
    }
    setIsDeactivated(true);
    setOrganizer((prev) => (prev ? { ...prev, status: "Deactivate" } : null));
    setIsDeactivateModalOpen(false);
  };

  const filteredEvents = events.filter(
    (ev) =>
      ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.eventId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upcomingEventsCount = events.filter((e) => e.status === "Upcoming" || e.status === "Ongoing").length;

  if (!loading && !organizer) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <header className="h-20 bg-white border-b border-gray-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <svg className="w-7 h-7 text-[#FF5B22] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
            </svg>
            <h1 className="text-sm sm:text-xl font-bold text-gray-900 truncate">Event Organizer</h1>
          </div>
          <UserNavDropdown />
        </header>
        <div className="flex-1 flex justify-center items-center py-24 px-6">
          <div className="max-w-md w-full border border-gray-200 rounded-md p-8 text-center space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Organizer unavailable</h2>
            <p className="text-xs text-gray-500 break-words">{loadError || "Organizer not found."}</p>
            <Link href="/event-organizer" className="inline-block px-4 py-2 bg-[#FF5B22] hover:bg-[#E04B16] text-white rounded-md text-xs font-semibold">
              Back to Organizers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !organizer) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <header className="h-20 bg-white border-b border-gray-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <svg className="w-7 h-7 text-[#FF5B22] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
            </svg>
            <h1 className="text-sm sm:text-xl font-bold text-gray-900 truncate">Event Organizer</h1>
          </div>
          <UserNavDropdown />
        </header>
        <div className="flex-1 flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF5B22]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <svg className="w-7 h-7 text-[#FF5B22] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
            </svg>
            <h1 className="text-sm sm:text-xl font-bold text-gray-900 truncate">Event Organizer Details</h1>
          </div>
          <UserNavDropdown />
        </header>

        {/* Page Content */}
        <main className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Organizer Detail Banner Card */}
          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Logo Avatar */}
              {organizer.logoUrl ? (
                <img
                  src={organizer.logoUrl}
                  alt={organizer.name}
                  className="w-20 h-20 rounded-full object-cover border border-gray-300 shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#FF5B22]/10 border border-[#FF5B22]/20 text-[#FF5B22] flex items-center justify-center font-bold text-xl uppercase tracking-wider shrink-0">
                  {organizer.name ? organizer.name.slice(0, 2) : "OG"}
                </div>
              )}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-900 break-words min-w-0">{organizer.name}</h2>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${isDeactivated
                        ? "bg-orange-100 text-orange-700"
                        : "bg-emerald-100 text-emerald-700"
                      }`}
                  >
                    {isDeactivated ? "Deactivated" : "Active"}
                  </span>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-4 flex-wrap">
                  <span className="break-all">
                    <strong className="text-gray-700">Email:</strong> {organizer.email}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span>
                    <strong className="text-gray-700">Phone:</strong> {organizer.phone}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Deactivate & Edit */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsDeactivateModalOpen(true)}
                disabled={isDeactivated}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FEE8E1] hover:bg-[#FCD8CC] text-[#FF5B22] text-xs font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6h12a6 6 0 00-6-6zM21 12h-6" />
                </svg>
                <span>{isDeactivated ? "Deactivated" : "Deactivate"}</span>
              </button>
            </div>
          </div>

          {actionError && !isDeactivateModalOpen && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-medium break-words">{actionError}</div>
          )}

          {/* Single Stats Container Card with Dividers */}
          <div className="bg-white border border-gray-200 rounded-md divide-y sm:divide-y-0 sm:divide-x divide-gray-200 grid grid-cols-1 sm:grid-cols-3 shadow-2xs">
            {/* Total Events */}
            <div className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-700 block">Total Events</span>
                <span className="text-2xl font-bold text-gray-900 mt-1 block">{events.length}</span>
              </div>
              <div className="w-11 h-11 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-700 block">Upcoming Events</span>
                <span className="text-2xl font-bold text-gray-900 mt-1 block">{upcomingEventsCount}</span>
              </div>
              <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            {/* Earnings */}
            <div className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-700 block">Earnings</span>
                <span className="text-2xl font-bold text-gray-900 mt-1 block">—</span>
                <span className="text-[10px] text-gray-400 block">Billing is not configured yet</span>
              </div>
              <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Events Table Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 max-w-md">
                <h3 className="text-lg font-bold text-gray-900 shrink-0">Events</h3>
                <div className="relative flex-1">
                  <svg
                    className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search event.."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button className="p-2 border border-gray-200 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-50 cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>
                <Link
                  href="/events/add"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF5B22] hover:bg-[#E04B16] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-2xs"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Event</span>
                </Link>
              </div>
            </div>

            {/* Table Container */}
            <div className="bg-white border border-gray-200 rounded-md shadow-2xs overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 font-medium text-[11px] bg-white">
                    <th className="py-3 px-4 font-medium">Event ID</th>
                    <th className="py-3 px-4 font-medium">Event Name</th>
                    <th className="py-3 px-4 font-medium">Organizer</th>
                    <th className="py-3 px-4 font-medium">Created on</th>
                    <th className="py-3 px-4 font-medium">Category</th>
                    <th className="py-3 px-4 font-medium">Event Start Date</th>
                    <th className="py-3 px-4 font-medium">Event End Date</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800">
                  {filteredEvents.length === 0 && (
                    <tr><td colSpan={8} className="py-12 text-center text-gray-400 text-sm">No events found for this organizer.</td></tr>
                  )}
                  {filteredEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-4 font-medium text-gray-900">{ev.eventId}</td>
                      <td className="py-4 px-4 font-medium text-gray-900">{ev.name}</td>
                      <td className="py-4 px-4 text-gray-600">{ev.organizer}</td>
                      <td className="py-4 px-4 text-gray-600">{ev.createdOn}</td>
                      <td className="py-4 px-4 text-gray-600">{ev.category}</td>
                      <td className="py-4 px-4 text-gray-600">{ev.startDate}</td>
                      <td className="py-4 px-4 text-gray-600">{ev.endDate}</td>
                      <td className="py-4 px-4">
                        {ev.status === "Upcoming" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                            Upcoming
                          </span>
                        )}
                        {ev.status === "Completed" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-700">
                            Completed
                          </span>
                        )}
                        {ev.status === "Ongoing" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-700">
                            Ongoing
                          </span>
                        )}
                        {ev.status === "Invitation not send" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
                            Invitation not send
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>

      {/* Deactivate Organizer Modal (Image 4) */}
      {isDeactivateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-overlay">
          <div className="bg-white rounded-md border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden space-y-6 animate-modal">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Deactivate Organizer</h3>
              <button
                onClick={() => setIsDeactivateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleDeactivate} className="px-6 space-y-5">
              {/* Reason Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Reason<span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  value={deactivateReason}
                  onChange={setDeactivateReason}
                  options={[
                    { value: "Product Launch Event 2026", label: "Product Launch Event 2026" },
                    { value: "Policy Violation", label: "Policy Violation" },
                    { value: "Account Inactivity", label: "Account Inactivity" },
                    { value: "Other", label: "Other" },
                  ]}
                  ariaLabel="Deactivation reason"
                />
              </div>

              {/* Message Organizer Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Message Organizer<span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type"
                  value={deactivateMessage}
                  onChange={(e) => setDeactivateMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 pb-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeactivateModalOpen(false)}
                  className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                {actionError && (
                  <p className="text-xs text-rose-600 font-medium break-words flex-1">{actionError}</p>
                )}
                <button
                  type="submit"
                  disabled={isDeactivating}
                  className="px-5 py-2 bg-[#FF5B22] hover:bg-[#E04B16] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-xs"
                >
                  Deactivate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
