"use client";

import React from "react";
import CustomDropdown from "@/components/common/CustomDropdown";
import Icon from "@/components/icons/Icon";

interface ReportsHeaderControlsProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedOrganizer: string;
  setSelectedOrganizer: (val: string) => void;
  selectedEvent: string;
  setSelectedEvent: (val: string) => void;
  onDownloadReport: () => void;
  organizerOptions?: { value: string; label: string }[];
  eventOptions?: { value: string; label: string }[];
  /** Organizers are only offered the event picker, admins also pick an organizer */
  showOrganizer?: boolean;
}

// The Figma toolbar (Report, 2092:1467): a grey search field, then flat pickers and "Download Report" separated by 32px hairlines.
// Search, caret and download glyphs are the design's own SVGs (public/icons/reports).
// the hairline sits 24px clear of each picker (on top of the picker's own padding), as in the design
const Divider = () => <span aria-hidden className="hidden md:block w-px h-8 bg-[#E5E5E5] shrink-0 mx-3" />;
const caret = <Icon name="reports/caret-down" width={14} height={8} />;

export default function ReportsHeaderControls({
  searchQuery,
  setSearchQuery,
  selectedOrganizer,
  setSelectedOrganizer,
  selectedEvent,
  setSelectedEvent,
  onDownloadReport,
  organizerOptions = [{ value: "", label: "All Organizers" }],
  eventOptions = [{ value: "", label: "Select Event" }],
  showOrganizer = true,
}: ReportsHeaderControlsProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 w-full">
      <label className="bg-[#FAFAFA] border border-[#E0E0E0] rounded-md h-[47px] px-4 flex flex-1 min-w-[220px] items-center gap-2.5 focus-within:border-black transition-colors">
        <span className="size-[22px] flex items-center justify-center shrink-0 text-[#6B6B6B]">
          <Icon name="reports/search" width={18.4} height={18.4} />
        </span>
        <input
          type="text"
          placeholder="Search..."
          aria-label="Search reports"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-xs font-medium text-[#15191C] placeholder-[#828282] focus:outline-none"
        />
      </label>

      <div className="flex flex-wrap md:flex-nowrap items-center gap-x-3 md:gap-x-0 gap-y-2">
        {showOrganizer && (
          <>
            <div className="min-w-[208px] max-w-[300px] [&_button]:w-full">
              <CustomDropdown
                variant="plain"
                plainTone="ink"
                caret={caret}
                value={selectedOrganizer}
                onChange={setSelectedOrganizer}
                options={organizerOptions}
                placeholder="Organizer name here"
                ariaLabel="Organizer"
                className="w-full! max-w-none!"
              />
            </div>
            <Divider />
          </>
        )}
        <div className="min-w-[208px] max-w-[300px] [&_button]:w-full">
          <CustomDropdown
            variant="plain"
            plainTone="ink"
            caret={caret}
            value={selectedEvent}
            onChange={setSelectedEvent}
            options={eventOptions}
            placeholder="Event name here"
            ariaLabel="Event"
            className="w-full! max-w-none!"
          />
        </div>
        <Divider />
        <button
          type="button"
          onClick={onDownloadReport}
          className="h-[47px] px-3 inline-flex items-center gap-2.5 text-xs font-medium text-black cursor-pointer shrink-0 rounded-md hover:bg-[#EEF3FF] transition-colors"
        >
          <Icon name="reports/download" width={15.83} height={19.22} />
          <span>Download Report</span>
        </button>
      </div>
    </div>
  );
}
