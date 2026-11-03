"use client";

import React from "react";
import { EarningsRecord } from "@/types/earnings";
import { TableSkeletonRows } from "@/components/common/Skeleton";
import RowMenu, { EditIcon, TrashIcon } from "@/components/common/RowMenu";
import { useRouter } from "next/navigation";

interface EarningsTableProps {
  activeTab: "organizer" | "event";
  setActiveTab: (tab: "organizer" | "event") => void;
  records: EarningsRecord[];
  loading?: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  selectedIds: string[];
  toggleSelectAll: () => void;
  toggleSelectRow: (id: string) => void;
  onDeleteSelected: () => void;
  /** Hides one row from this view (same as selecting it and pressing the bin) */
  onHideRow: (id: string) => void;
  onExportCSV: () => void;
}

export default function EarningsTable({
  activeTab,
  setActiveTab,
  records,
  loading = false,
  searchQuery,
  setSearchQuery,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedIds,
  toggleSelectAll,
  toggleSelectRow,
  onDeleteSelected,
  onHideRow,
  onExportCSV,
}: EarningsTableProps) {
  const router = useRouter();
  return (
    <div className="bg-white border border-gray-200 rounded-md p-6 shadow-2xs space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-[#15191C]">Earnings</h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">68 Records:</span>
          <button
            type="button"
            onClick={onExportCSV}
            className="font-bold text-[#FF5B22] hover:underline cursor-pointer"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="inline-flex items-center bg-gray-100 p-1 rounded-md text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("organizer")}
          className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${activeTab === "organizer"
              ? "bg-white text-gray-900 font-semibold shadow-2xs"
              : "text-gray-500 hover:text-gray-800"
            }`}
        >
          By Organizer
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("event")}
          className={`px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${activeTab === "event"
              ? "bg-white text-gray-900 font-semibold shadow-2xs"
              : "text-gray-500 hover:text-gray-800"
            }`}
        >
          By Event
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xl">
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
            placeholder="Search..."
            aria-label="Search earnings"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-gray-700 shrink-0">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-3 py-1.5">
            <input
              type="text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="DD/MM/YYYY"
              aria-label="From date"
              className="w-20 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none"
            />
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          <span className="text-gray-400 font-normal">To</span>

          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-3 py-1.5">
            <input
              type="text"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="DD/MM/YYYY"
              aria-label="To date"
              className="w-20 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none"
            />
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
          <input
            type="checkbox"
            id="selectAllEarnings"
            checked={selectedIds.length === records.length && records.length > 0}
            onChange={toggleSelectAll}
            className="rounded border-gray-300 text-[#FF5B22] focus:ring-[#FF5B22] cursor-pointer check-orange"
          />
          <label htmlFor="selectAllEarnings" className="cursor-pointer">
            Select All
          </label>
        </div>

        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={onDeleteSelected}
            title="Delete Selected Records"
            className="p-1.5 text-[#FF5B22] hover:bg-orange-50 rounded-md transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 text-[#FF5B22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-200 text-[#828282] font-medium text-sm">
              <th className="py-3 px-4 w-10"></th>
              <th className="py-3 px-4 font-medium">
                {activeTab === "organizer" ? "Organizer" : "Event Name"}
              </th>
              <th className="py-3 px-4 font-medium">
                {activeTab === "organizer" ? "Event Name" : "Organizer"}
              </th>
              <th className="py-3 px-4 font-medium">Date of Payment</th>
              <th className="py-3 px-4 font-medium">Invites</th>
              <th className="py-3 px-4 font-medium">Rate</th>
              <th className="py-3 px-4 font-medium">Amount</th>
              <th className="py-3 px-4 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-[#4B4F52]">
            {loading && <TableSkeletonRows rows={5} cols={8} />}
            {!loading && records.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="py-4 px-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(r.id)}
                    onChange={() => toggleSelectRow(r.id)}
                    aria-label="Select this row"
                    className="rounded border-gray-300 text-[#FF5B22] focus:ring-[#FF5B22] cursor-pointer check-orange"
                  />
                </td>
                <td className="py-4 px-4 font-semibold text-gray-900">
                  {activeTab === "organizer" ? r.organizer : r.eventName}
                </td>
                <td className="py-4 px-4 text-gray-700 font-medium">
                  {activeTab === "organizer" ? r.eventName : r.organizer}
                </td>
                <td className="py-4 px-4 text-gray-600">{r.dateOfPayment}</td>
                <td className="py-4 px-4 text-gray-900 font-semibold">{r.invites}</td>
                <td className="py-4 px-4 text-gray-600">{r.rate === null ? "Not set" : `$${r.rate}`}</td>
                <td className="py-4 px-4 text-emerald-600 font-bold">${r.amount}</td>
                <td className="py-4 px-4 text-right">
                  {/* was an inert "⋯"; event rows can open their event, and any row can be hidden from this view */}
                  <RowMenu
                    label={`Actions for ${activeTab === "organizer" ? r.organizer : r.eventName}`}
                    items={[
                      ...(r.id.startsWith("evt_") ? [{ label: "Open event", icon: EditIcon, onClick: () => router.push(`/events/${r.id.slice(4)}`) }] : []),
                      { label: "Hide from this list", icon: TrashIcon, onClick: () => onHideRow(r.id) },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
