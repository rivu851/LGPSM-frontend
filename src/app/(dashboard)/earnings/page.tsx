"use client";

import React, { useState, useEffect } from "react";
import { EarningsRecord } from "@/types/earnings";
import EarningsOverviewCard from "@/components/earnings/EarningsOverviewCard";
import EarningsStatsRow from "@/components/earnings/EarningsStatsRow";
import EarningsTable from "@/components/earnings/EarningsTable";
import UserNavDropdown from "@/components/common/UserNavDropdown";
import { eventService } from "@/services/eventService";
import { reportService } from "@/services/reportService";
import { parseEventDate } from "@/utils/eventUtils";

interface EventInviteSummary {
  id: string;
  eventName: string;
  organizer: string;
  invites: number;
  eventStart?: string;
}

export default function EarningsPage() {
  const [activeTab, setActiveTab] = useState<"organizer" | "event">("organizer");
  // The billing rate is not persisted by the backend yet; amounts below are estimates at this rate
  const [rate, setRate] = useState<number>(3.0);
  const [tempRate, setTempRate] = useState<number>(3.0);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const [eventSummaries, setEventSummaries] = useState<EventInviteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Invitations actually sent per event, read from the event reports
  useEffect(() => {
    let cancelled = false;
    async function loadEarnings() {
      setLoading(true);
      setLoadError(null);
      const res = await eventService.getEvents();
      if (cancelled) return;
      if (!res.success || !Array.isArray(res.data)) {
        setLoadError(res.message || "Failed to load events.");
        setEventSummaries([]);
        setLoading(false);
        return;
      }

      const events = res.data as any[];
      const summaries = await Promise.all(
        events.map(async (ev) => {
          const id = ev._id || ev.id;
          const report = await reportService.getEventReport(id);
          return {
            id,
            eventName: ev.title || "Untitled Event",
            organizer: ev.organizerId?.fullName || "—",
            invites: report.success && report.data ? report.data.deliverySummary?.SENT ?? 0 : 0,
            eventStart: ev.schedule?.start,
          };
        })
      );
      if (cancelled) return;
      setEventSummaries(summaries);
      setLoading(false);
    }

    loadEarnings();
    return () => {
      cancelled = true;
    };
  }, []);

  const fromDate = startDate.trim() ? parseEventDate(startDate) : null;
  const toDate = endDate.trim() ? parseEventDate(endDate) : null;
  if (toDate) toDate.setHours(23, 59, 59, 999);
  const inRange = (iso?: string) => {
    if (!fromDate && !toDate) return true;
    if (!iso) return false;
    const d = new Date(iso);
    return (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
  };

  const eventRecords: EarningsRecord[] = eventSummaries
    .filter((ev) => inRange(ev.eventStart))
    .map((ev) => ({
      id: `evt_${ev.id}`,
      eventName: ev.eventName,
      organizer: ev.organizer,
      dateOfPayment: "—",
      invites: ev.invites,
      rate,
      amount: ev.invites * rate,
      eventStart: ev.eventStart,
    }));

  const organizerMap = new Map<string, EarningsRecord>();
  eventRecords.forEach((r) => {
    const existing = organizerMap.get(r.organizer);
    if (existing) {
      existing.invites += r.invites;
      existing.amount += r.amount;
      existing.eventName = `${existing.eventName}, ${r.eventName}`;
    } else {
      organizerMap.set(r.organizer, { ...r, id: `org_${r.organizer}` });
    }
  });
  const organizerRecords = Array.from(organizerMap.values());

  const currentRecords = (activeTab === "organizer" ? organizerRecords : eventRecords).filter(
    (r) => !hiddenIds.includes(r.id)
  );
  const estimatedTotal = eventRecords.reduce((sum, r) => sum + r.amount, 0);
  const organizersBilled = organizerRecords.filter((r) => r.invites > 0).length;

  const handleSaveRate = () => {
    setRate(tempRate);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2500);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === currentRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentRecords.map((r) => r.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Hides rows from this view only; nothing is deleted on the server
  const handleDeleteSelected = () => {
    setHiddenIds((prev) => [...prev, ...selectedIds]);
    setSelectedIds([]);
  };

  const exportCSV = () => {
    const headers = activeTab === "organizer"
      ? "Organizer,Event Name,Date of Payment,Invites,Rate,Amount\n"
      : "Event Name,Organizer,Date of Payment,Invites,Rate,Amount\n";

    const rows = currentRecords
      .map((r) =>
        activeTab === "organizer"
          ? `"${r.organizer}","${r.eventName}","${r.dateOfPayment}",${r.invites},$${r.rate},$${r.amount}`
          : `"${r.eventName}","${r.organizer}","${r.dateOfPayment}",${r.invites},$${r.rate},$${r.amount}`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `earnings_${activeTab}_report.csv`;
    a.click();
  };

  const filteredRecords = currentRecords.filter((r) =>
    r.organizer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.eventName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-full bg-white">
      <header className="h-20 bg-white border-b border-gray-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <svg className="w-7 h-7 text-[#FF5B22] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h1 className="text-sm sm:text-xl font-bold text-gray-900 truncate">Earnings</h1>
        </div>
        <UserNavDropdown />
      </header>

      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6 bg-white pb-24">
        <EarningsOverviewCard
          rate={rate}
          tempRate={tempRate}
          setTempRate={setTempRate}
          onSaveRate={handleSaveRate}
          isSavedNotice={isSavedNotice}
        />

        <p className="text-[11px] text-gray-500 font-medium -mt-2">
          Invite counts are the invitations actually sent for each event. Online payments and a saved billing rate are not configured yet,
          so amounts are estimates at the rate above.
        </p>

        {loadError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-medium break-words">{loadError}</div>
        )}

        <EarningsStatsRow estimatedTotal={estimatedTotal} organizersBilled={organizersBilled} loading={loading} />

        <EarningsTable
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          records={filteredRecords}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          selectedIds={selectedIds}
          toggleSelectAll={toggleSelectAll}
          toggleSelectRow={toggleSelectRow}
          onDeleteSelected={handleDeleteSelected}
          onExportCSV={exportCSV}
        />
      </div>
    </div>
  );
}
