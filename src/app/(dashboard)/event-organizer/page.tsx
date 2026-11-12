"use client";

import ListControls, { addButtonClass } from "@/components/common/ListControls";
import PageHeader from "@/components/common/PageHeader";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { userService } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";
import { TableSkeletonRows } from "@/components/common/Skeleton";
import RowMenu from "@/components/common/RowMenu";
import Icon from "@/components/icons/Icon";
import Pagination from "@/components/common/Pagination";
import { paginate } from "@/utils/pagination.mjs";
import { formatMoney } from "@/utils/money";

interface OrganizerRow {
  id: string;
  name: string;
  accountName: string;
  type: string;
  email: string;
  phone: string;
  status: "Active" | "In Active" | "Deactivate";
}

export default function AllOrganizersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
            // an individual organizer has no organization name: the person's own name is shown
            name: u.profile?.organizationName || u.fullName || "Organisation not set",
            type: ((u.profile?.organizationType ?? (u.profile?.organizationName ? "ORGANIZATION" : "INDIVIDUAL")) === "ORGANIZATION" ? "Organization" : "Individual") as string,
            accountName: u.fullName || u.name || "Event Organizer",
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
      o.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone.includes(searchQuery)
  );
  // The list used to show fixed "1 2 … 9 10" buttons that did nothing; it now really pages, 10 organizers at a time
  const PAGE_SIZE = 10;
  const { current: currentPage, totalPages, rows: pageOrganizers } = paginate(filteredOrganizers, page, PAGE_SIZE);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <PageHeader title="Event Organizer" />

        {/* Page Content */}
        <div className="px-4 sm:px-6 pt-[30px] pb-24 w-full space-y-6">
          {/* Controls (Figma 462:10218) */}
          <ListControls label="Organizer" searchId="organizer-search" placeholder="Search organizers" value={searchQuery} onChange={(v) => { setSearchQuery(v); setPage(1); }}>
            <Link href="/event-organizer/add" className={addButtonClass}>
              <Icon name="events/add-white" width={24} height={24} />
              Add Organizer
            </Link>
          </ListControls>

          {/* Stats tiles: separate bordered cards (Figma 462:10218) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Active Organizer */}
            <div className="bg-white border border-[#E0E0E0] rounded-lg p-5 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-[#15191C] block">Active Organizer</span>
                <span className="text-[32px] leading-tight font-semibold text-black mt-1 block">
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
            <div className="bg-white border border-[#E0E0E0] rounded-lg p-5 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-[#15191C] block">Inactive Organizers</span>
                <span className="text-[32px] leading-tight font-semibold text-black mt-1 block">
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
            <div className="bg-white border border-[#E0E0E0] rounded-lg p-5 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-[#15191C] block">Earnings</span>
                <span className="text-[32px] leading-tight font-semibold text-black mt-1 block">{formatMoney(0, { maxFractionDigits: 0 })}</span>
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
                  <tr className="border-b border-gray-200 text-gray-500 font-medium text-[11px] bg-white">
                    <th className="py-3 px-4 w-10">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
role="checkbox"
aria-checked={selectedIds.length === filteredOrganizers.length && filteredOrganizers.length > 0}
aria-label="Select all"
                        className="inline-flex h-6 w-6 items-center justify-center cursor-pointer">
<span className={`w-4 h-4 rounded-sm flex items-center justify-center transition-colors border ${
                          selectedIds.length === filteredOrganizers.length && filteredOrganizers.length > 0
                            ? "bg-[#10B981] border-[#10B981] text-white"
                            : "bg-white border-gray-300 hover:border-gray-400"
                        }`}>
                        {selectedIds.length === filteredOrganizers.length && filteredOrganizers.length > 0 && (
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
</button>
                    </th>
                    <th className="py-3 px-4 font-medium text-gray-500">Organizer</th>
                    <th className="py-3 px-4 font-medium text-gray-500">Type</th>
                    <th className="py-3 px-4 font-medium text-gray-500">Email</th>
                    <th className="py-3 px-4 font-medium text-gray-500">Phone Number</th>
                    <th className="py-3 px-4 font-medium text-gray-500">Status</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800">
                  {loading && (
                    <TableSkeletonRows rows={5} cols={6} />
                  )}
                  {!loading && loadError && (
                    <tr><td colSpan={7} className="py-12 text-center text-rose-600 text-sm">{loadError}</td></tr>
                  )}
                  {!loading && !loadError && filteredOrganizers.length === 0 && (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-500 text-sm">No organizers found.</td></tr>
                  )}
                  {pageOrganizers.map((org) => {
                    const isSelected = selectedIds.includes(org.id);

                    return (
                      // The whole row opens the organizer; the checkbox, the name link and the ⋯ menu keep their own clicks
                      <tr
                        key={org.id}
                        onClick={(e) => { if (!(e.target as Element).closest("button, a, input")) router.push(`/event-organizer/${org.id}`); }}
                        onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === "Enter") router.push(`/event-organizer/${org.id}`); }}
                        tabIndex={0}
                        role="link"
                        aria-label={`Open ${org.name}`}
                        className="hover:bg-gray-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5B22] transition-colors cursor-pointer"
                      >
                        <td className="py-4 px-4">
                          <button
                            type="button"
                            onClick={() => toggleSelectRow(org.id)}
role="checkbox"
aria-checked={isSelected}
aria-label={`Select ${org.name}`}
                            className="inline-flex h-6 w-6 items-center justify-center cursor-pointer">
<span className={`w-4 h-4 rounded-sm flex items-center justify-center transition-colors border ${
                              isSelected ? "bg-[#10B981] border-[#10B981] text-white" : "bg-white border-gray-300 hover:border-gray-400"
                            }`}>
                            {isSelected && (
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
</button>
                        </td>

                        {/* Organizer Name with link to details */}
                        <td className="py-4 px-4 font-medium text-gray-900">
                          <Link
                            href={`/event-organizer/${org.id}`}
                            className="hover:text-[#A83800] transition-colors cursor-pointer"
                          >
                            {org.name}
                            <span className="block text-xs font-normal text-gray-500">Account: {org.accountName}</span>
                          </Link>
                        </td>

                        <td className="py-4 px-4 text-gray-600">{org.type}</td>
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
                          <RowMenu label={`Actions for ${org.name}`} items={[{ label: "View Details", onClick: () => router.push(`/event-organizer/${org.id}`) }]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-3 text-xs text-[#6B6B6B]">
                <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} label="Organizer pages" />
                <span>Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredOrganizers.length)} of {filteredOrganizers.length}</span>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
