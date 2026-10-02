"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { eventService } from "@/services/eventService";
import { useCategories } from "@/hooks/useCategories";
import { getDynamicEventStatus } from "@/utils/eventUtils";
import { formatEventId } from "@/utils/formatId";
import { formatCompactDateTime, formatDateTime } from "@/utils/dateTime";
import PageHeader from "@/components/common/PageHeader";
import CustomDropdown from "@/components/common/CustomDropdown";

type RowStatus = "Upcoming" | "Ongoing" | "Completed" | "Invitation not send" | "Cancelled";

interface EventRow {
  id: string;
  displayId: string;
  name: string;
  organizer: string;
  categoryId: string;
  category: string;
  createdAt?: string;
  start?: string;
  end?: string;
  status: RowStatus;
}

const STATUS_STYLE: Record<RowStatus, string> = {
  Upcoming: "bg-[#C0FFD5] text-[#1A9242]",
  Ongoing: "bg-[#CCD2FF] text-[#2C2EB5]",
  Completed: "bg-[#FFE3D7] text-[#FF651D]",
  "Invitation not send": "bg-[#FFE9C0] text-[#9E8C00]",
  Cancelled: "bg-gray-200 text-gray-700",
};

interface RawEvent {
  _id?: string;
  id?: string;
  title?: string;
  status?: string;
  createdAt?: string;
  schedule?: { start?: string; end?: string };
  categoryId?: { _id?: string; name?: string } | string;
  organizerId?: { fullName?: string; profile?: { organizationName?: string } } | string;
  invitationsSent?: number;
}

function toRow(e: RawEvent): EventRow {
  const id = String(e._id || e.id);
  const timeStatus = getDynamicEventStatus(e.schedule?.start, e.schedule?.end, "Upcoming") as RowStatus;
  const status: RowStatus = e.status === "CANCELLED" ? "Cancelled" : timeStatus === "Upcoming" && !e.invitationsSent ? "Invitation not send" : timeStatus;
  const cat = typeof e.categoryId === "object" ? e.categoryId : null;
  const org = typeof e.organizerId === "object" ? e.organizerId : null;
  return {
    id,
    displayId: formatEventId(id),
    name: e.title || "Untitled event",
    organizer: org?.profile?.organizationName || org?.fullName || "—",
    categoryId: cat?._id || "",
    category: cat?.name || "—",
    createdAt: e.createdAt,
    start: e.schedule?.start,
    end: e.schedule?.end,
    status,
  };
}

function RowActions({ row, onDelete }: { row: EventRow; onDelete: (row: EventRow) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const item = "w-full text-left px-3 py-2 text-sm hover:bg-white/10 flex items-center gap-2";
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={`Actions for ${row.name}`} aria-expanded={open} className="p-1.5 rounded text-[#828282] hover:text-gray-900 hover:bg-gray-100 cursor-pointer">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M6 10a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 min-w-[150px] rounded-md bg-[#1E232A] text-white py-1 shadow-xl">
          <Link href={`/events/${row.id}`} className={item}>View Event</Link>
          {row.status !== "Cancelled" && <Link href={`/events/${row.id}/edit`} className={item}>Edit Event</Link>}
          {row.status !== "Cancelled" && (
            <button type="button" onClick={() => { setOpen(false); onDelete(row); }} className={`${item} text-rose-300 cursor-pointer`}>
              Delete Event
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function EventListingPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const categories = useCategories();
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ category: "", status: "", organizer: "", from: "", to: "" });
  const [draftFilters, setDraftFilters] = useState(filters);
  const [deleting, setDeleting] = useState<EventRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const res = await eventService.getEvents();
    const list = Array.isArray(res.data) ? (res.data as unknown as RawEvent[]) : [];
    if (res.success) setRows(list.map(toRow));
    else setLoadError(res.message || "Failed to load events.");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    if (!deleting) return;
    const res = await eventService.deleteEvent(deleting.id);
    if (!res.success) {
      setDeleteError(res.message || "Failed to delete event.");
      return;
    }
    setDeleting(null);
    await load();
  };

  const term = search.trim().toLowerCase();
  const fromDate = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
  const toDate = filters.to ? new Date(`${filters.to}T23:59:59.999`) : null;
  const visible = rows.filter((r) => {
    if (term && ![r.name, r.organizer, r.displayId, r.category].some((v) => v.toLowerCase().includes(term))) return false;
    if (filters.category && r.categoryId !== filters.category) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.organizer && !r.organizer.toLowerCase().includes(filters.organizer.trim().toLowerCase())) return false;
    const start = r.start ? new Date(r.start) : null;
    if (fromDate && (!start || start < fromDate)) return false;
    if (toDate && (!start || start > toDate)) return false;
    return true;
  });
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader title="Event" />
      <div className="p-4 sm:p-6 lg:px-9 lg:py-6 w-full space-y-4 pb-24">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <label htmlFor="event-search" className="text-base font-medium text-black shrink-0">Search</label>
          <div className="relative flex-1">
            <svg className="w-5 h-5 text-[#828282] absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="event-search"
              type="search"
              placeholder="Search event.."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[47px] pl-11 pr-4 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-sm text-gray-900 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D]"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => { setDraftFilters(filters); setFilterOpen(true); }}
              aria-label={`Filter events${activeFilterCount ? ` (${activeFilterCount} active)` : ""}`}
              className="relative h-[47px] px-4 rounded-md text-[#828282] hover:bg-gray-100 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M3 5h18l-7 8.5V19l-4 2v-7.5L3 5z" /></svg>
              {activeFilterCount > 0 && <span className="absolute top-2 right-2 size-4 rounded-full bg-[#FF651D] text-white text-[10px] flex items-center justify-center">{activeFilterCount}</span>}
            </button>
            <Link href="/events/add" className="inline-flex items-center gap-2 px-4 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Event
            </Link>
          </div>
        </div>

        {loadError && (
          <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-sm flex items-center justify-between gap-3">
            <span className="break-words">{loadError}</span>
            <button type="button" onClick={load} className="font-medium underline shrink-0 cursor-pointer">Retry</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-[#D3D3D3] text-[#828282]">
                {["Event ID", "Event Name", "Organizer", "Created on", "Category", "Event Start Date", "Event End Date", "Status"].map((h) => (
                  <th key={h} className="h-[46px] px-2.5 font-medium whitespace-nowrap">{h}</th>
                ))}
                <th className="h-[46px] px-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-[#4B4F52]">
              {loading ? (
                <tr><td colSpan={9} className="py-10 text-center text-[#828282]">Loading events...</td></tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#828282]">
                    {rows.length === 0 ? (
                      <>No events yet. <Link href="/events/add" className="text-[#E5520F] font-medium underline">Create your first event</Link></>
                    ) : (
                      "No events match your search or filters."
                    )}
                  </td>
                </tr>
              ) : (
                visible.map((r) => (
                  <tr key={r.id} className="border-b border-[#D3D3D3] hover:bg-gray-50/70">
                    <td className="h-[46px] px-2.5 font-medium whitespace-nowrap"><Link href={`/events/${r.id}`} className="hover:text-[#FF651D]">{r.displayId}</Link></td>
                    <td className="px-2.5 max-w-[220px]"><Link href={`/events/${r.id}`} className="text-gray-900 hover:text-[#FF651D] line-clamp-2 break-words">{r.name}</Link></td>
                    <td className="px-2.5 max-w-[180px] truncate" title={r.organizer}>{r.organizer}</td>
                    <td className="px-2.5 whitespace-nowrap">{formatCompactDateTime(r.createdAt, "—")}</td>
                    <td className="px-2.5 whitespace-nowrap">{r.category}</td>
                    <td className="px-2.5 whitespace-nowrap">{formatDateTime(r.start, "—")}</td>
                    <td className="px-2.5 whitespace-nowrap">{formatDateTime(r.end, "—")}</td>
                    <td className="px-2.5"><span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_STYLE[r.status]}`}>{r.status}</span></td>
                    <td className="px-2.5 text-right"><RowActions row={r} onDelete={(row) => { setDeleteError(null); setDeleting(row); }} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="delete-event-title">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <h3 id="delete-event-title" className="text-base font-medium text-gray-900">Delete Event</h3>
            <p className="text-sm text-[#4B4F52] break-words">Delete “{deleting.name}”? It will be cancelled and its invitations stop working.</p>
            {deleteError && <p role="alert" className="text-sm text-rose-600">{deleteError}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setDeleting(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button type="button" onClick={confirmDelete} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm font-medium cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      {filterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="filter-title">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFilterOpen(false)} />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5]">
              <h2 id="filter-title" className="text-base font-medium text-gray-900">Filter</h2>
              <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close filters" className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pt-5">
              <div>
                <span className="block text-sm font-medium text-gray-900 mb-1.5">Event Category</span>
                <CustomDropdown value={draftFilters.category} onChange={(v) => setDraftFilters((f) => ({ ...f, category: v }))} options={[{ value: "", label: "All categories" }, ...categories.categoryOptions]} ariaLabel="Category filter" />
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-900 mb-1.5">Event Status</span>
                <CustomDropdown
                  value={draftFilters.status}
                  onChange={(v) => setDraftFilters((f) => ({ ...f, status: v }))}
                  options={[{ value: "", label: "All statuses" }, ...(Object.keys(STATUS_STYLE) as RowStatus[]).map((s) => ({ value: s, label: s }))]}
                  ariaLabel="Status filter"
                />
              </div>
              {isAdmin && (
                <div>
                  <label htmlFor="filter-organizer" className="block text-sm font-medium text-gray-900 mb-1.5">Organizer</label>
                  <input id="filter-organizer" type="text" value={draftFilters.organizer} onChange={(e) => setDraftFilters((f) => ({ ...f, organizer: e.target.value }))} placeholder="Organisation or name" className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:border-[#FF651D]" />
                </div>
              )}
              <fieldset>
                <legend className="text-sm font-medium text-gray-900 mb-1.5">Event start date</legend>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-[#828282]">From<input type="date" value={draftFilters.from} onChange={(e) => setDraftFilters((f) => ({ ...f, from: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-sm text-gray-900" /></label>
                  <label className="text-xs text-[#828282]">To<input type="date" value={draftFilters.to} onChange={(e) => setDraftFilters((f) => ({ ...f, to: e.target.value }))} className="mt-1 w-full px-3 py-2 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-sm text-gray-900" /></label>
                </div>
              </fieldset>
            </div>
            <div className="flex gap-3 pt-4 border-t border-[#E5E5E5]">
              <button type="button" onClick={() => { const empty = { category: "", status: "", organizer: "", from: "", to: "" }; setDraftFilters(empty); setFilters(empty); setFilterOpen(false); }} className="flex-1 py-2.5 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 cursor-pointer">
                Clear
              </button>
              <button type="button" onClick={() => { setFilters(draftFilters); setFilterOpen(false); }} className="flex-1 py-2.5 bg-[#FF651D] hover:bg-[#E5520F] rounded-md text-sm font-medium text-white cursor-pointer">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
