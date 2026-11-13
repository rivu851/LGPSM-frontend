"use client";

import { csvRow, csvBlob } from "@/utils/csv";
import PageHeader from "@/components/common/PageHeader";
import React, { useState, useEffect } from "react";
import { EarningsRecord } from "@/types/earnings";
import EarningsOverviewCard from "@/components/earnings/EarningsOverviewCard";
import EarningsStatsRow from "@/components/earnings/EarningsStatsRow";
import EarningsTable from "@/components/earnings/EarningsTable";
import { EarningsData, platformSettingsService } from "@/services/platformSettingsService";
import { parseEventDate } from "@/utils/eventUtils";

export default function EarningsPage() {
  const [activeTab, setActiveTab] = useState<"organizer" | "event">("organizer");
  // The rate in force for new events. Each row below uses the rate locked on that event when it was created.
  const [rate, setRate] = useState<number | null>(null);
  const [tempRate, setTempRate] = useState<number>(1);
  const [savingRate, setSavingRate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Worked out on the server: invitations actually sent x the rate locked on each event
  useEffect(() => {
    let cancelled = false;
    platformSettingsService.getEarnings().then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setEarnings(res.data);
        setRate(res.data.currentRate);
        if (res.data.currentRate !== null) setTempRate(res.data.currentRate);
      } else {
        setLoadError(res.message || "Failed to load earnings.");
      }
      setLoading(false);
    });
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

  const eventRecords: EarningsRecord[] = (earnings?.events ?? [])
    .filter((ev) => inRange(ev.eventStart))
    .map((ev) => ({
      id: `evt_${ev.eventId}`,
      eventName: ev.eventName,
      organizer: ev.organizerName || "Organisation not set",
      dateOfPayment: "—",
      invites: ev.invitesSent,
      rate: ev.ratePerInvitee,
      amount: ev.amount ?? 0,
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

  const handleSaveRate = async () => {
    if (savingRate || tempRate === rate) return;
    setSavingRate(true);
    const res = await platformSettingsService.updateRate(tempRate);
    setSavingRate(false);
    if (!res.success || !res.data) {
      setLoadError(res.message || "The rate could not be saved, so it is unchanged.");
      return;
    }
    setRate(res.data.ratePerInvitee);
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
      ? "Organizer,Event Name,Date of Payment,Invites,Rate (INR),Amount (INR)\n"
      : "Event Name,Organizer,Date of Payment,Invites,Rate (INR),Amount (INR)\n";

    const rows = currentRecords
      .map((r) =>
        activeTab === "organizer"
          ? csvRow([r.organizer, r.eventName, r.dateOfPayment, r.invites, r.rate === null ? "Not set" : r.rate, r.amount])
          : csvRow([r.eventName, r.organizer, r.dateOfPayment, r.invites, r.rate === null ? "Not set" : r.rate, r.amount])
      )
      .join("\n");

    const blob = csvBlob(headers + rows);
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
      <PageHeader title="Earnings" />

      <div className="px-4 sm:px-6 pt-7 w-full space-y-6 bg-white pb-24">
        <EarningsOverviewCard
          rate={rate}
          tempRate={tempRate}
          setTempRate={setTempRate}
          onSaveRate={handleSaveRate}
          saving={savingRate}
          isSavedNotice={isSavedNotice}
        />

        <p className="text-[11px] text-gray-500 font-medium -mt-2">
          Invite counts are the invitations actually sent for each event, at the rate locked on that event when it was created.
          These are amounts due, not payments: online payments are not configured.
        </p>

        {loadError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-medium break-words">{loadError}</div>
        )}

        <EarningsStatsRow estimatedTotal={estimatedTotal} organizersBilled={organizersBilled} loading={loading} />

        <EarningsTable
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          records={filteredRecords}
          loading={loading}
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
          onHideRow={(id) => { setHiddenIds((prev) => [...prev, id]); setSelectedIds((prev) => prev.filter((x) => x !== id)); }}
          onExportCSV={exportCSV}
        />
      </div>
    </div>
  );
}
