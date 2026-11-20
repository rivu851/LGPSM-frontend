"use client";

import React from "react";
import { Skeleton, SkeletonRegion } from "@/components/common/Skeleton";
import Icon from "@/components/icons/Icon";
import ReportClockIcon from "./ReportClockIcon";

interface ReportsStatsCardsProps {
  totalInvitees?: number;
  totalAttendees?: number;
  totalSessions?: number;
  systemUsers?: number;
  loading?: boolean;
}

// Figma report tiles (Report, 2092:1467): a 48px tinted circle holding the design's own icon, the count, the label.
// The icons are the SVGs copied from the design (public/icons/reports, and ReportClockIcon for the gradient one).
const TILE_ICONS = {
  invitees: <Icon name="reports/tile-invitees" width={24.4} height={20.2} />,
  attendees: <Icon name="reports/tile-attendees" width={26} height={26} />,
  sessions: <ReportClockIcon size={32} />,
  staff: <Icon name="reports/tile-staff" width={24.4} height={20.2} />,
};

function Tile({ value, label, icon, tone }: { value: string | number; label: string; icon: keyof typeof TILE_ICONS; tone: string }) {
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg p-5 flex flex-col gap-3 min-w-0">
      <span className={`size-12 rounded-full flex items-center justify-center ${tone}`}>{TILE_ICONS[icon]}</span>
      <div>
        <p className="text-[40px] leading-none font-medium text-black">{value}</p>
        <p className="mt-1.5 text-base font-medium text-[#15191C]">{label}</p>
      </div>
    </div>
  );
}

export default function ReportsStatsCards({
  totalInvitees = 0,
  totalAttendees = 0,
  totalSessions = 0,
  systemUsers = 0,
  loading = false,
}: ReportsStatsCardsProps) {
  if (loading) {
    return (
      <SkeletonRegion label="Loading report totals" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[158px] rounded-lg!" />)}
      </SkeletonRegion>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <Tile value={totalInvitees} label="Total Invitees" icon="invitees" tone="bg-[#D6E4FF]" />
      <Tile value={totalAttendees} label="Total Attendees" icon="attendees" tone="bg-[#C9F6E6]" />
      <Tile value={String(totalSessions).padStart(2, "0")} label="Total Sessions" icon="sessions" tone="bg-[#DCE1FF]" />
      <Tile value={systemUsers} label="System Users" icon="staff" tone="bg-[#EBDDFF]" />
    </div>
  );
}
