"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { userService } from "@/services/userService";
import UserNavDropdown from "@/components/common/UserNavDropdown";
import { useAuth } from "@/context/AuthContext";

interface OrganizerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "Active" | "In Active" | "Deactivate";
}

export default function AllOrganizersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrganizers() {
      setLoading(true);
      let list: OrganizerRow[] = [];
      setLoadError(null);

      try {
        const res = await userService.getUsers("ORGANIZER");
        if (!res?.success) {
          setLoadError(res?.message || "Failed to load organizers.");
        }
        if (res?.success && Array.isArray(res.data)) {
          const organizerUsersOnly = res.data.filter((u: any) => u.role === "ORGANIZER");
          const apiOrgs = organizerUsersOnly.map((u: any, idx: number) => ({
            id: u._id || u.id || `org_${idx}`,
            name: u.fullName || u.name || "Event Organizer",
            email: u.email || "--",
            phone: u.phone || u.contactNo || "--",
            status: (u.isActive === false ? "In Active" : "Active") as any,
          }));

          list = apiOrgs;
        }
      } catch (e) {
        setLoadError("Could not reach the server. Please try again.");
      }

      setOrganizers(list);
      setLoading(false);
    }

    loadOrganizers();
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === organizers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(organizers.map((o) => o.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const filteredOrganizers = organizers.filter(
    (o) =>
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone.includes(searchQuery)
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <svg className="w-7 h-7 text-[#FF5B22] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
            </svg>
            <h1 className="text-sm sm:text-xl font-bold text-gray-900 truncate">Event Organizers</h1>
          </div>
          <UserNavDropdown />
        </header>

        {/* Page Content */}
        <main className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Controls Bar: Title + Search Bar on Left, + Add Organizer Button on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 max-w-xl">
              <h2 className="text-lg font-bold text-gray-900 shrink-0">Organizer</h2>
              <div className="relative flex-1">
                <svg
                  className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search organizers"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>
            </div>

            <Link
              href="/event-organizer/add"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#FF5B22] hover:bg-[#E04B16] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 shadow-2xs w-fit self-start"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Organizer</span>
            </Link>
          </div>

          {/* Single Stats Container Card with Dividers */}
          <div className="bg-white border border-gray-200 rounded-md divide-y sm:divide-y-0 sm:divide-x divide-gray-200 grid grid-cols-1 sm:grid-cols-3 shadow-2xs">
            {/* 1. Active Organizer */}
            <div className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-700 block">Active Organizer</span>
                <span className="text-2xl font-bold text-gray-900 mt-1 block">
                  {organizers.filter((o) => o.status === "Active").length}
                </span>
              </div>
              <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>

            {/* 2. Inactive Organizers */}
            <div className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-700 block">Inactive Organizers</span>
                <span className="text-2xl font-bold text-gray-900 mt-1 block">
                  {organizers.filter((o) => o.status !== "Active").length}
                </span>
              </div>
              <div className="w-11 h-11 rounded-full bg-orange-50 text-orange-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>

            {/* 3. Earnings */}
            <div className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-700 block">Earnings</span>
                <span className="text-2xl font-bold text-gray-900 mt-1 block">$0</span>
              </div>
              <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-gray-200 rounded-md shadow-2xs overflow-hidden">
            <div className="overflow-x-auto pb-16">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 font-medium text-[11px] bg-white">
                    <th className="py-3 px-4 w-10">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className={`w-4 h-4 rounded-sm flex items-center justify-center transition-colors border cursor-pointer ${
                          selectedIds.length === filteredOrganizers.length && filteredOrganizers.length > 0
                            ? "bg-[#10B981] border-[#10B981] text-white"
                            : "bg-white border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        {selectedIds.length === filteredOrganizers.length && filteredOrganizers.length > 0 && (
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4 font-medium text-gray-400">Organizer</th>
                    <th className="py-3 px-4 font-medium text-gray-400">Email</th>
                    <th className="py-3 px-4 font-medium text-gray-400">Phone Number</th>
                    <th className="py-3 px-4 font-medium text-gray-400">Status</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800">
                  {loading && (
                    <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">Loading organizers...</td></tr>
                  )}
                  {!loading && loadError && (
                    <tr><td colSpan={6} className="py-12 text-center text-rose-600 text-sm">{loadError}</td></tr>
                  )}
                  {!loading && !loadError && filteredOrganizers.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No organizers found.</td></tr>
                  )}
                  {filteredOrganizers.map((org, idx) => {
                    const isSelected = selectedIds.includes(org.id);
                    const isActionOpen = activeActionId === org.id;
                    const shouldOpenUpwards = idx > 2 && idx >= filteredOrganizers.length - 2;

                    return (
                      <tr key={org.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-4 px-4">
                          <button
                            type="button"
                            onClick={() => toggleSelectRow(org.id)}
                            className={`w-4 h-4 rounded-sm flex items-center justify-center transition-colors border cursor-pointer ${
                              isSelected ? "bg-[#10B981] border-[#10B981] text-white" : "bg-white border-gray-300 hover:border-gray-400"
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </td>

                        {/* Organizer Name with link to details */}
                        <td className="py-4 px-4 font-medium text-gray-900">
                          <Link
                            href={`/event-organizer/${org.id}`}
                            className="hover:text-[#FF5B22] transition-colors cursor-pointer"
                          >
                            {org.name}
                          </Link>
                        </td>

                        <td className="py-4 px-4 text-gray-600">{org.email}</td>
                        <td className="py-4 px-4 text-gray-600">{org.phone}</td>

                        {/* Status Badge */}
                        <td className="py-4 px-4">
                          {org.status === "Active" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                              Active
                            </span>
                          )}
                          {org.status === "In Active" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">
                              In Active
                            </span>
                          )}
                          {org.status === "Deactivate" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-700">
                              Deactivate
                            </span>
                          )}
                        </td>

                        {/* Action Column */}
                        <td className="py-4 px-4 text-right">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() => setActiveActionId(isActionOpen ? null : org.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 10a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z" />
                              </svg>
                            </button>

                            {isActionOpen && (
                              <div className={`absolute right-0 ${shouldOpenUpwards ? "bottom-full mb-1" : "top-full mt-1"} z-50 bg-[#1E232A] text-white text-xs font-medium py-1.5 px-3 rounded-md shadow-2xl border border-gray-700 animate-menu flex flex-col gap-1 min-w-[110px] text-left`}>
                                <button
                                  onClick={() => router.push(`/event-organizer/${org.id}`)}
                                  className="py-1 hover:text-[#FF5B22] text-left transition-colors cursor-pointer"
                                >
                                  View Details
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-start gap-1 text-xs">
              <button className="w-8 h-8 rounded border border-gray-200 bg-gray-100 text-gray-400 flex items-center justify-center cursor-not-allowed">
                &lt;
              </button>
              <button className="w-8 h-8 rounded border border-[#FF5B22] text-[#FF5B22] font-bold flex items-center justify-center">
                1
              </button>
              <button className="w-8 h-8 rounded border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50">
                2
              </button>
              <span className="px-1 text-gray-400">...</span>
              <button className="w-8 h-8 rounded border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50">
                9
              </button>
              <button className="w-8 h-8 rounded border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50">
                10
              </button>
              <button className="w-8 h-8 rounded border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50">
                &gt;
              </button>
            </div>
          </div>
        </main>
    </div>
  );
}
