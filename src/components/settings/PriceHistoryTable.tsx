"use client";

import React from "react";
import { PriceHistoryRecord } from "@/types/priceRate";
import { formatMoney } from "@/utils/money";
import { csvBlob } from "@/utils/csv";

interface PriceHistoryTableProps {
  history: PriceHistoryRecord[];
}

export default function PriceHistoryTable({ history }: PriceHistoryTableProps) {
  const handleExportCSV = () => {
    const headers = "Date & Time,Previous Rate (INR),New Rate (INR),Change Type,Status\n";
    const rows = history
      .map(
        (r) =>
          `"${r.dateTime}",${r.previousRate === null ? "Not set" : r.previousRate},${r.newRate},${r.changeType},${r.status}`
      )
      .join("\n");
    const blob = csvBlob(headers + rows);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "price-change-history.csv";
    a.click();
  };

  return (
    <div className="bg-white rounded-lg border border-[#E0E0E0] p-6 space-y-4">
      {/* Table Header Row */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-[#15191C]">Price Change History</h2>
        <button
          onClick={handleExportCSV}
          className="text-xs font-semibold text-[#C44200] hover:underline transition-all"
        >
          Export CSV
        </button>
      </div>

      {/* History Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#D3D3D3] text-[#6B6B6B] font-medium">
              <th className="py-3 px-4 font-normal">Date & Time</th>
              <th className="py-3 px-4 font-normal">Previous Rate</th>
              <th className="py-3 px-4 font-normal">New Rate</th>
              <th className="py-3 px-4 font-normal">Change Type</th>
              <th className="py-3 px-4 font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D3D3D3] text-[#4B4F52]">
            {history.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-500 font-medium">
                  No rate changes recorded in this session.
                </td>
              </tr>
            )}
            {history.map((item) => {
              const isIncrease = item.changeType === "Increase";
              const isActive = item.status === "Active";

              return (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-gray-800">
                    {item.dateTime}
                  </td>
                  <td className="py-3.5 px-4 text-gray-600">{item.previousRate === null ? "Not set" : formatMoney(item.previousRate)}</td>
                  <td className="py-3.5 px-4 font-semibold text-gray-800">
                    {formatMoney(item.newRate)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        isIncrease ? "text-emerald-700" : "text-amber-600"
                      }`}
                    >
                      {item.changeType}
                      <span>{isIncrease ? "↑" : "↓"}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-semibold ${
                        isActive ? "text-emerald-700" : "text-amber-600"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
