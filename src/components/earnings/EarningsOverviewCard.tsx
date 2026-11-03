"use client";

import React from "react";

interface EarningsOverviewCardProps {
  /** null until a rate has been set for the first time */
  rate: number | null;
  tempRate: number;
  setTempRate: (val: number) => void;
  onSaveRate: () => void;
  saving?: boolean;
  isSavedNotice: boolean;
}

export default function EarningsOverviewCard({
  rate,
  tempRate,
  setTempRate,
  onSaveRate,
  saving = false,
  isSavedNotice,
}: EarningsOverviewCardProps) {
  const rateText = rate === null ? "Not set" : `$${rate.toFixed(2)}`;
  const rateLine = rate === null ? "No rate has been set yet" : `Per-head billing · ${rateText} / invitee (current rate)`;
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-medium text-[#15191C]">Earnings Overview</h2>
        <p className="text-xs text-[#4B4F52] mt-0.5">
          {rateLine}
        </p>
      </div>

      <div className="bg-white border border-[#E0E0E0] rounded-lg p-6 space-y-6">
        {/* Main Flex Layout directly inside the outer card */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
          {/* Left Side Rate Text (No extra box wrapper) */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-semibold text-[#FF651D]">
                {rateText}
              </span>
              <span className="text-sm font-medium text-[#4B4F52]">Per head</span>
            </div>
            <p className="text-sm text-[#4B4F52]">{rateLine}</p>
          </div>

          {/* Right Side Adjust Rate Box */}
          <div className="bg-[#F7F7F7] rounded-md p-4 max-w-[480px] w-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#4B4F52] tracking-wide uppercase">
                ADJUST RATE
              </span>
              {isSavedNotice && (
                <span className="text-xs font-semibold text-emerald-600 animate-fadeIn">
                  Saved. Applies to events created from now on.
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={tempRate}
                  aria-label="Price per invitee"
                  onChange={(e) => setTempRate(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF5B22]"
                />
                <div className="flex items-center justify-between text-xs font-medium text-[#828282] px-0.5">
                  <span>$1</span>
                  <span>$10</span>
                  <span>$20</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onSaveRate}
                disabled={saving || tempRate === rate}
                className="disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-semibold rounded-md transition-colors cursor-pointer shrink-0"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
