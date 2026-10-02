"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";

interface DateTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (iso: string) => void;
  value?: string | null;
  title?: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")); // "01"–"12"
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));     // "00"–"59"
const AMPM    = ["AM", "PM"];

const ITEM_H  = 44; // px — height of each drum row
const VISIBLE = 5;  // rows shown per column

// ---------------------------------------------------------------------------
// DrumColumn — a single scrollable column of the time picker
// ---------------------------------------------------------------------------
interface DrumColProps {
  items: string[];
  selectedIndex: number;
  onChange: (i: number) => void;
  wrap?: boolean;
  colWidth?: string;
}

function DrumColumn({ items, selectedIndex, onChange, wrap = true, colWidth = "w-14" }: DrumColProps) {
  const n = items.length;

  const shift = useCallback((delta: number) => {
    if (wrap) {
      onChange(((selectedIndex + delta) % n + n) % n);
    } else {
      const next = selectedIndex + delta;
      if (next >= 0 && next < n) onChange(next);
    }
  }, [selectedIndex, n, onChange, wrap]);

  // Five visible slots: offsets -2 -1 0 +1 +2
  const slots = [-2, -1, 0, 1, 2].map((offset) => {
    const idx = wrap
      ? ((selectedIndex + offset) % n + n) % n
      : selectedIndex + offset;
    const inRange = idx >= 0 && idx < n;
    return { label: inRange ? items[idx] : "", offset, inRange };
  });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    shift(e.deltaY > 0 ? 1 : -1);
  }, [shift]);

  return (
    <div
      className={`relative flex flex-col items-center ${colWidth} select-none`}
      style={{ height: ITEM_H * VISIBLE }}
      onWheel={handleWheel}
    >
      {slots.map(({ label, offset, inRange }) => {
        const isCenter = offset === 0;
        const dist = Math.abs(offset);
        return (
          <button
            key={offset}
            type="button"
            onClick={() => inRange && offset !== 0 && shift(offset)}
            style={{ height: ITEM_H }}
            className={[
              "w-full flex items-center justify-center font-semibold transition-all duration-150 relative z-10",
              isCenter ? "text-[17px] text-gray-900 font-bold" : "",
              dist === 1 ? "text-[14px] text-gray-400" : "",
              dist === 2 ? "text-[12px] text-gray-300" : "",
              !isCenter && inRange ? "cursor-pointer hover:text-gray-600" : "cursor-default",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DrumTimePicker — three columns with a shared selection rail
// ---------------------------------------------------------------------------
interface DrumTimePickerProps {
  hourIdx: number;   // 0–11 → hours "01"–"12"
  minuteIdx: number; // 0–59
  ampmIdx: number;   // 0=AM 1=PM
  onHour: (i: number) => void;
  onMinute: (i: number) => void;
  onAmpm: (i: number) => void;
}

function DrumTimePicker({ hourIdx, minuteIdx, ampmIdx, onHour, onMinute, onAmpm }: DrumTimePickerProps) {
  return (
    <div className="relative flex items-center justify-center gap-1 py-1">
      {/* Shared highlight rail at the centre row */}
      <div
        className="absolute inset-x-0 bg-gray-100 rounded-xl pointer-events-none"
        style={{ top: ITEM_H * 2, height: ITEM_H }}
      />
      <DrumColumn items={HOURS}   selectedIndex={hourIdx}   onChange={onHour}   wrap />
      <span className="relative z-10 text-lg font-bold text-gray-400 pb-1">:</span>
      <DrumColumn items={MINUTES} selectedIndex={minuteIdx} onChange={onMinute} wrap />
      <DrumColumn items={AMPM}    selectedIndex={ampmIdx}   onChange={onAmpm}   wrap={false} colWidth="w-12" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------
export default function DateTimePickerModal({ isOpen, onClose, onSave, value, title }: DateTimePickerModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef   = useRef<HTMLDivElement>(null);

  const initial = (() => {
    const parsed = value ? new Date(value) : null;
    return parsed && !isNaN(parsed.getTime()) ? parsed : new Date();
  })();

  const [currentYear,  setCurrentYear]  = useState(() => initial.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => initial.getMonth());
  const [selectedDay,  setSelectedDay]  = useState(() => initial.getDate());

  // Drum-picker state
  const initH   = initial.getHours();
  const initH12 = initH % 12 || 12;
  const [hourIdx,   setHourIdx]   = useState(() => initH12 - 1);          // 0–11
  const [minuteIdx, setMinuteIdx] = useState(() => initial.getMinutes());  // 0–59
  const [ampmIdx,   setAmpmIdx]   = useState(() => (initH >= 12 ? 1 : 0));// 0=AM 1=PM

  useEffect(() => {
    if (isOpen && overlayRef.current && modalRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
        gsap.fromTo(
          modalRef.current,
          { scale: 0.8, opacity: 0, y: 15 },
          { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.2)" }
        );
      });
      return () => ctx.revert();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const daysInMonth    = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const prevMonthDays  = new Date(currentYear, currentMonth, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  const handleSave = () => {
    const hour12 = hourIdx + 1;
    const hour24 = ampmIdx === 1
      ? (hour12 === 12 ? 12 : hour12 + 12)
      : (hour12 === 12 ? 0  : hour12);
    const day = Math.min(selectedDay, daysInMonth);
    onSave(new Date(currentYear, currentMonth, day, hour24, minuteIdx, 0, 0).toISOString());
    onClose();
  };

  // Formatted display of selected time
  const displayTime = (() => {
    const h12 = (hourIdx + 1).toString().padStart(2, "0");
    const mm  = minuteIdx.toString().padStart(2, "0");
    return `${h12}:${mm} ${AMPM[ampmIdx]}`;
  })();

  // Build calendar cells
  const calendarCells: React.ReactNode[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    calendarCells.push(<span key={`prev-${d}`} className="text-[#FDBA74] py-1 cursor-default">{d < 10 ? `0${d}` : d}</span>);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const isSelected = day === Math.min(selectedDay, daysInMonth);
    calendarCells.push(
      <button
        key={`curr-${day}`}
        type="button"
        onClick={() => setSelectedDay(day)}
        className={`mx-auto flex items-center justify-center text-xs font-bold cursor-pointer transition-colors py-1 ${
          isSelected ? "text-[#2563EB] border-b-2 border-[#2563EB] pb-0.5" : "hover:text-[#FF5B22] text-gray-900"
        }`}
      >
        {day < 10 ? `0${day}` : day}
      </button>
    );
  }
  const remaining = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    calendarCells.push(<span key={`next-${i}`} className="text-[#FDBA74] py-1 cursor-default">{i < 10 ? `0${i}` : i}</span>);
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-md border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">{title || "Select Date & Time"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
          {/* Calendar */}
          <div className="sm:col-span-7 bg-[#F4F5F8] p-4 rounded-md border border-gray-200">
            <div className="flex items-center justify-between mb-3 px-1">
              <button type="button" onClick={handlePrevMonth} className="text-[#FF5B22] hover:opacity-80 text-sm font-bold cursor-pointer px-1">&lt;</button>
              <span className="text-xs font-bold text-gray-900">{MONTH_NAMES[currentMonth]} {currentYear}</span>
              <button type="button" onClick={handleNextMonth} className="text-[#FF5B22] hover:opacity-80 text-sm font-bold cursor-pointer px-1">&gt;</button>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-[#FF5B22] mb-2">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>
            <div className="grid grid-cols-7 text-center gap-y-1.5 text-xs font-medium text-gray-800">
              {calendarCells}
            </div>
          </div>

          {/* Time picker */}
          <div className="sm:col-span-5 flex flex-col gap-5">
            {/* Selected date summary */}
            <div className="bg-[#FF5B22]/5 border border-[#FF5B22]/20 rounded-lg p-3 text-center">
              <p className="text-[11px] text-gray-500 font-medium mb-0.5">Selected Date</p>
              <p className="text-sm font-bold text-gray-900">
                {Math.min(selectedDay, daysInMonth).toString().padStart(2, "0")} {MONTH_NAMES[currentMonth]} {currentYear}
              </p>
            </div>

            {/* Drum picker */}
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-700">Time</p>
              <div className="bg-[#F4F5F8] rounded-xl px-2 py-1 overflow-hidden">
                <DrumTimePicker
                  hourIdx={hourIdx}   onHour={setHourIdx}
                  minuteIdx={minuteIdx} onMinute={setMinuteIdx}
                  ampmIdx={ampmIdx}   onAmpm={setAmpmIdx}
                />
              </div>
              <p className="text-center text-xs font-semibold text-gray-400 pt-0.5">{displayTime}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-gray-900 font-bold text-xs rounded-lg transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} className="px-7 py-2 bg-[#FF5B22] hover:bg-[#E04B16] text-white font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
