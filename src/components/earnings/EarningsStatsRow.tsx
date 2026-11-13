"use client";

import React from "react";
import { Skeleton } from "@/components/common/Skeleton";
import { formatMoney } from "@/utils/money";

interface EarningsStatsRowProps {
  estimatedTotal: number;
  organizersBilled: number;
  loading?: boolean;
}

export default function EarningsStatsRow({ estimatedTotal, organizersBilled, loading = false }: EarningsStatsRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white border border-[#E0E0E0] rounded-lg p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#15191C]">Total Earning (estimated)</p>
          <h3 className="text-[32px] leading-tight font-semibold text-black mt-1">
            {loading ? <Skeleton className="h-9 w-28" /> : formatMoney(estimatedTotal)}
          </h3>
        </div>
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div className="bg-white border border-[#E0E0E0] rounded-lg p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#15191C]">Total Organizer Billed</p>
          <h3 className="text-[32px] leading-tight font-semibold text-black mt-1">{loading ? <Skeleton className="h-9 w-16" /> : organizersBilled}</h3>
        </div>
        <div className="w-12 h-12 rounded-full bg-orange-50 text-[#C44200] flex items-center justify-center shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
