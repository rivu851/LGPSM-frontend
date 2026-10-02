"use client";

import React, { useState } from "react";
import PricePerHeadCard from "@/components/settings/PricePerHeadCard";
import PriceHistoryTable from "@/components/settings/PriceHistoryTable";
import { PriceHistoryRecord } from "@/types/priceRate";
import UserNavDropdown from "@/components/common/UserNavDropdown";

export default function PriceRateSettingsPage() {
  const [currentRate, setCurrentRate] = useState<number>(3.0);
  // No price-rate API exists yet: changes live only in this page session
  const [history, setHistory] = useState<PriceHistoryRecord[]>([]);

  const handleSaveRate = (newRateVal: number) => {
    if (newRateVal === currentRate) return;

    const record: PriceHistoryRecord = {
      id: Date.now().toString(),
      dateTime: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      previousRate: currentRate,
      newRate: newRateVal,
      changeType: newRateVal > currentRate ? "Increase" : "Decrease",
      status: "Active",
    };

    setHistory((prev) => [
      record,
      ...prev.map((item) => ({ ...item, status: "Suspended" as const })),
    ]);
    setCurrentRate(newRateVal);
  };

  return (
    <div className="w-full min-h-full bg-white">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <svg className="w-6 h-6 text-[#FF5B22] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h10m-5 5h5M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
          </svg>
          <h1 className="text-sm sm:text-base font-bold text-gray-800 truncate">Price Rate Settings</h1>
        </div>
        <UserNavDropdown />
      </header>

      {/* Page Content */}
      <div className="p-6 max-w-7xl w-full mx-auto space-y-6 pb-24">
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs font-medium">
          Price-rate changes are not stored on the server yet. They apply to this session only and reset on reload.
        </div>
        <PricePerHeadCard currentRate={currentRate} onSaveRate={handleSaveRate} />
        <PriceHistoryTable history={history} />
      </div>
    </div>
  );
}
