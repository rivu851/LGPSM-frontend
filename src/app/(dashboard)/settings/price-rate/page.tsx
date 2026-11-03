"use client";

import PageHeader from "@/components/common/PageHeader";
import React, { useCallback, useEffect, useState } from "react";
import PricePerHeadCard from "@/components/settings/PricePerHeadCard";
import PriceHistoryTable from "@/components/settings/PriceHistoryTable";
import { PriceHistoryRecord } from "@/types/priceRate";
import { platformSettingsService, PricingSettings } from "@/services/platformSettingsService";

const toHistory = (history: PricingSettings["history"]): PriceHistoryRecord[] =>
  history.map((change, index) => ({
    id: change._id,
    dateTime: new Date(change.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    previousRate: change.previousRate,
    newRate: change.newRate,
    changeType: change.previousRate !== null && change.newRate < change.previousRate ? "Decrease" : "Increase",
    // newest first: only the latest change is the rate in force
    status: index === 0 ? "Active" : "Suspended",
  }));

export default function PriceRateSettingsPage() {
  const [pricing, setPricing] = useState<PricingSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await platformSettingsService.getPricing();
    if (res.success && res.data) { setPricing(res.data); setError(null); }
    else setError(res.message || "The current rate could not be loaded.");
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const handleSaveRate = async (newRate: number) => {
    if (saving || newRate === pricing?.ratePerInvitee) return;
    setSaving(true);
    const res = await platformSettingsService.updateRate(newRate);
    if (res.success && res.data) { setPricing(res.data); setError(null); }
    else setError(res.message || "The rate could not be saved, so it is unchanged.");
    setSaving(false);
  };

  return (
    <div className="w-full min-h-full bg-white">
      {/* Header */}
      <PageHeader title="Price Rate Settings" />

      {/* Page Content */}
      <div className="px-4 sm:px-6 pt-7 w-full space-y-6 pb-24">
        <p className="text-xs text-[#4B4F52]">
          A new rate applies to events created from now on. Each existing event keeps the rate that was in force when it was created.
        </p>
        {error && (
          <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-medium break-words">{error}</div>
        )}
        {pricing && <PricePerHeadCard key={pricing.ratePerInvitee ?? "unset"} currentRate={pricing.ratePerInvitee} saving={saving} onSaveRate={handleSaveRate} />}
        <PriceHistoryTable history={pricing ? toHistory(pricing.history) : []} />
      </div>
    </div>
  );
}
