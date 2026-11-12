"use client";

import React from "react";
import { Skeleton, SkeletonRegion, TableSkeleton } from "@/components/common/Skeleton";

export interface DeliverySummary {
  SENT: number;
  PENDING: number;
  FAILED: number;
}

export interface SessionChartPoint {
  id: string;
  name: string;
  invited: number;
  attended: number;
}

interface ReportsChartsProps {
  delivery?: DeliverySummary | null;
  sessions?: SessionChartPoint[];
  loading?: boolean;
}

const DONUT_RADIUS = 15.91549430918954; // circumference of 100 so dash values read as percentages

// Round the axis maximum up to a readable step so ticks are whole numbers
function niceMax(value: number): number {
  if (value <= 5) return 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const step = magnitude / 2;
  return Math.ceil(value / step) * step;
}

export default function ReportsCharts({ delivery, sessions = [], loading = false }: ReportsChartsProps) {
  const sent = delivery?.SENT ?? 0;
  const pending = delivery?.PENDING ?? 0;
  const failed = delivery?.FAILED ?? 0;
  const totalDelivery = sent + pending + failed;

  const segments = [
    { key: "sent", label: "Sent", value: sent, color: "#FF5B22" },
    { key: "pending", label: "Pending", value: pending, color: "#2D3139" },
    { key: "failed", label: "Failed", value: failed, color: "#D1D5DB" },
  ];

  let offset = 0;
  const arcs = segments.map((seg) => {
    const pct = totalDelivery > 0 ? (seg.value / totalDelivery) * 100 : 0;
    const arc = { ...seg, pct, offset };
    offset += pct;
    return arc;
  });

  const maxValue = niceMax(Math.max(0, ...sessions.map((s) => Math.max(s.invited, s.attended))));
  const ticks = [1, 0.8, 0.6, 0.4, 0.2, 0].map((f) => Math.round(maxValue * f));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Donut Chart Card: Invitation delivery */}
      <div className="lg:col-span-4 bg-white border border-gray-200/80 rounded-md p-6 shadow-xs relative space-y-4 flex flex-col justify-between min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Guest Logs</h3>
        </div>

        {/* Chart Legend */}
        <div className="flex items-center gap-3 flex-wrap text-[11px] font-medium text-gray-600">
          {segments.map((seg) => (
            <div key={seg.key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: seg.color }} />
              <span>
                {seg.label} ({seg.value})
              </span>
            </div>
          ))}
        </div>

        <div className="relative w-52 h-52 max-w-full mx-auto my-2 flex items-center justify-center">
          {loading ? (
            <Skeleton className="size-44 rounded-full!" />
          ) : totalDelivery === 0 ? (
            <div className="text-center space-y-1">
              <svg className="w-full h-full absolute inset-0" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r={DONUT_RADIUS} fill="none" stroke="#F3F4F6" strokeWidth="5" />
              </svg>
              <span className="relative text-xs text-gray-500 font-medium">No invitations yet</span>
            </div>
          ) : (
            <>
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r={DONUT_RADIUS} fill="none" stroke="#F3F4F6" strokeWidth="5" />
                {arcs.map((arc) =>
                  arc.pct > 0 ? (
                    <circle
                      key={arc.key}
                      cx="21"
                      cy="21"
                      r={DONUT_RADIUS}
                      fill="none"
                      stroke={arc.color}
                      strokeWidth="5"
                      strokeDasharray={`${arc.pct} ${100 - arc.pct}`}
                      strokeDashoffset={-arc.offset}
                    />
                  ) : null
                )}
              </svg>

              {/* Percentage labels placed at the middle of each arc */}
              {arcs.map((arc) => {
                if (arc.pct <= 0) return null;
                const angle = ((arc.offset + arc.pct / 2) / 100) * 2 * Math.PI - Math.PI / 2;
                const left = 50 + Math.cos(angle) * 38;
                const top = 50 + Math.sin(angle) * 38;
                return (
                  <span
                    key={`${arc.key}-label`}
                    className="absolute -translate-x-1/2 -translate-y-1/2 h-10 w-10 aspect-square rounded-full bg-white border border-gray-100 shadow-xs flex items-center justify-center text-[10px] font-bold text-gray-800"
                    style={{ left: `${left}%`, top: `${top}%` }}
                  >
                    {Math.round(arc.pct)}%
                  </span>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Right Bar Chart Card: Invited vs. Attendees */}
      <div className="lg:col-span-8 bg-white border border-gray-200/80 rounded-md p-6 shadow-xs relative space-y-4 flex flex-col justify-between min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Invited vs. Attendees</h3>
        </div>

        {/* Chart Legend */}
        <div className="flex items-center gap-4 text-[11px] font-medium text-gray-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5B22] inline-block" />
            <span>Invitees</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2D3139] inline-block" />
            <span>Attendees</span>
          </div>
        </div>

        {loading ? (
          <SkeletonRegion label="Loading chart" className="h-64 flex items-end gap-6 px-6 pb-2 border-l border-b border-gray-200">
            {[60, 90, 45, 75].map((h, i) => <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />)}
          </SkeletonRegion>
        ) : sessions.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-gray-500 font-medium border-l border-b border-gray-200">
            No sessions for this event yet
          </div>
        ) : (
          <div className="relative h-64 w-full pt-7 pb-2 border-l border-b border-gray-200 pl-8">
            <span className="absolute left-8 top-1 whitespace-nowrap bg-white px-0.5 text-[10px] font-semibold text-gray-500">Head Count</span>
            <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-gray-500 font-medium">
              {ticks.map((t, i) => (
                <span key={i}>{t}</span>
              ))}
            </div>

            <div className="absolute inset-x-0 top-4 bottom-6 flex flex-col justify-between pointer-events-none -z-0">
              <div className="border-b border-gray-100 w-full" />
              <div className="border-b border-gray-100 w-full" />
              <div className="border-b border-gray-100 w-full" />
              <div className="border-b border-gray-100 w-full" />
              <div className="border-b border-gray-100 w-full" />
            </div>

            {/* Scrolls horizontally inside the card when there are many sessions */}
            <div className="h-full overflow-x-auto overflow-y-hidden">
              <div className="h-full flex items-end justify-around gap-6 min-w-max px-2">
                {sessions.map((s, idx) => (
                  <div
                    key={s.id}
                    className={`flex flex-col items-center gap-2 z-10 ${idx > 0 ? "border-l border-gray-200 pl-6" : ""}`}
                  >
                    <div className="flex items-end gap-1.5 h-48">
                      <div
                        className="w-8 bg-[#FF5B22] rounded-t-xs"
                        style={{ height: `${maxValue > 0 ? (s.invited / maxValue) * 100 : 0}%` }}
                        title={`Invitees: ${s.invited}`}
                      />
                      <div
                        className="w-8 bg-[#2D3139] rounded-t-xs"
                        style={{ height: `${maxValue > 0 ? (s.attended / maxValue) * 100 : 0}%` }}
                        title={`Attendees: ${s.attended}`}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 max-w-[96px] truncate" title={s.name}>
                      {s.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
