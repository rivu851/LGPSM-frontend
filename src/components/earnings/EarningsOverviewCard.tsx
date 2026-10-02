"use client";

import React from "react";

interface EarningsOverviewCardProps {
  rate: number;
  tempRate: number;
  setTempRate: (val: number) => void;
  onSaveRate: () => void;
  isSavedNotice: boolean;
}

export default function EarningsOverviewCard({
  rate,
  tempRate,
  setTempRate,
  onSaveRate,
  isSavedNotice,
}: EarningsOverviewCardProps) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-800">Earnings Overview</h2>
        <p className="text-xs text-gray-500 font-medium mt-0.5">
          Per-head billing · ${rate.toFixed(2)} / invitee (current rate)
        </p>
      </div>

      <div className="bg-white border border-gray-200/100 rounded-md p-6 shadow-xs space-y-6">
        {/* Main Flex Layout directly inside the outer card */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
          {/* Left Side Rate Text (No extra box wrapper) */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-[#FF5B22] tracking-tight">
                ${rate.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-gray-500">Per head</span>
            </div>
            <p className="text-xs text-gray-400 font-normal">
              Per-head billing · ${rate.toFixed(2)} / invitee (current rate)
            </p>
          </div>

          {/* Right Side Adjust Rate Box */}
          <div className="bg-white border border-gray-200/60 rounded-md p-4 max-w-md w-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">
                ADJUST RATE
              </span>
              {isSavedNotice && (
                <span className="text-xs font-semibold text-emerald-600 animate-fadeIn">
                  Rate applied to estimates (not stored on server)
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
                  onChange={(e) => setTempRate(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF5B22]"
                />
                <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 px-0.5">
                  <span>$1</span>
                  <span>$10</span>
                  <span>$20</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onSaveRate}
                className="px-5 py-2 bg-[#FF5B22] hover:bg-[#E04B16] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
