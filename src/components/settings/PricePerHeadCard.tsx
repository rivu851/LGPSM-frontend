"use client";

import React, { useState } from "react";
import { formatMoney } from "@/utils/money";

interface PricePerHeadCardProps {
  /** null until a rate has been set for the first time */
  currentRate: number | null;
  saving?: boolean;
  onSaveRate: (newRate: number) => void;
}

export default function PricePerHeadCard({
  currentRate,
  saving = false,
  onSaveRate,
}: PricePerHeadCardProps) {
  const [sliderVal, setSliderVal] = useState<number>(currentRate ?? 1);
  const rateText = currentRate === null ? "Not set" : formatMoney(currentRate);
  const rateLine = currentRate === null ? "No rate has been set yet, so events created now have no per-head price" : `Per-head billing · ${rateText} / invitee (current rate)`;

  const handleSave = () => {
    onSaveRate(sliderVal);
  };

  return (
    <div className="bg-white rounded-lg border border-[#E0E0E0] p-6 space-y-4">
      {/* Title Header */}
      <div>
        <h2 className="text-xl font-medium text-[#15191C]">Price Per-Head</h2>
        <p className="text-xs text-[#4B4F52] mt-0.5">
          {rateLine}
        </p>
      </div>

      {/* Main Grid Card */}
      <div className="rounded-md px-2 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left Side Big Rate Display */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold text-[#C44200]">
              {rateText}
            </span>
            <span className="text-sm font-medium text-[#4B4F52]">Per head</span>
          </div>
          <p className="text-xs text-gray-500">{rateLine}</p>
        </div>

        {/* Right Side Slider Adjuster */}
        <div className="w-full md:w-[480px] bg-[#F7F7F7] rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-[#4B4F52] uppercase">
              ADJUST RATE
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={sliderVal}
                aria-label="Price per invitee"
                onChange={(e) => setSliderVal(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF5B22]"
              />
              <div className="flex justify-between text-xs font-medium text-[#6B6B6B]">
                <span>{formatMoney(1, { maxFractionDigits: 0 })}</span>
                <span>{formatMoney(10, { maxFractionDigits: 0 })}</span>
                <span>{formatMoney(20, { maxFractionDigits: 0 })}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || sliderVal === currentRate}
              className="disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 bg-[#C65318] text-white text-sm font-semibold rounded-md hover:bg-[#A83800] transition-colors shrink-0"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
