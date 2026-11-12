"use client";

import React, { useState, useEffect, useRef } from "react";
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

// ---------------------------------------------------------------------------
// TimeStepper — hour, minute and AM/PM, each moved with its own up / down buttons (no scrolling)
// ---------------------------------------------------------------------------
interface StepColProps {
  label: string;
  value: string;
  onUp: () => void;
  onDown: () => void;
}

const chevron = (up: boolean) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={up ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
  </svg>
);

function StepColumn({ label, value, onUp, onDown }: StepColProps) {
  const btn = "w-full h-8 flex items-center justify-center rounded-md text-[#C44200] hover:bg-[#FF5B22]/10 cursor-pointer transition-colors";
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-col items-center gap-1.5 w-[46px] select-none"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") { e.preventDefault(); onUp(); }
        if (e.key === "ArrowDown") { e.preventDefault(); onDown(); }
      }}
    >
      <button type="button" aria-label={`Increase ${label}`} onClick={onUp} className={btn}>{chevron(true)}</button>
      <span aria-live="polite" className="w-full h-[38px] flex items-center justify-center text-lg font-semibold text-gray-900 bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.06)]">{value}</span>
      <button type="button" aria-label={`Decrease ${label}`} onClick={onDown} className={btn}>{chevron(false)}</button>
    </div>
  );
}

interface TimeStepperProps {
  hourIdx: number;   // 0–11 → hours "01"–"12"
  minuteIdx: number; // 0–59
  ampmIdx: number;   // 0=AM 1=PM
  onHour: (i: number) => void;
  onMinute: (i: number) => void;
  onAmpm: (i: number) => void;
}

function TimeStepper({ hourIdx, minuteIdx, ampmIdx, onHour, onMinute, onAmpm }: TimeStepperProps) {
  const wrap = (i: number, n: number) => ((i % n) + n) % n;
  return (
    <div className="flex items-center justify-center gap-1.5">
      <StepColumn label="hour" value={HOURS[hourIdx]} onUp={() => onHour(wrap(hourIdx + 1, 12))} onDown={() => onHour(wrap(hourIdx - 1, 12))} />
      <span className="text-lg font-bold text-gray-500" aria-hidden>:</span>
      <StepColumn label="minute" value={MINUTES[minuteIdx]} onUp={() => onMinute(wrap(minuteIdx + 1, 60))} onDown={() => onMinute(wrap(minuteIdx - 1, 60))} />
      <StepColumn label="AM or PM" value={AMPM[ampmIdx]} onUp={() => onAmpm(ampmIdx === 0 ? 1 : 0)} onDown={() => onAmpm(ampmIdx === 0 ? 1 : 0)} />
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
    calendarCells.push(<span key={`prev-${d}`} className="text-[#FDBA74] py-1.5 cursor-default">{d < 10 ? `0${d}` : d}</span>);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const isSelected = day === Math.min(selectedDay, daysInMonth);
    calendarCells.push(
      <button
        key={`curr-${day}`}
        type="button"
        onClick={() => setSelectedDay(day)}
        aria-pressed={isSelected}
        className={`mx-auto flex items-center justify-center text-[13px] font-semibold cursor-pointer transition-colors py-1.5 ${
          isSelected ? "text-[#2563EB] border-b-2 border-[#2563EB]" : "hover:text-[#A83800] text-gray-900"
        }`}
      >
        {day < 10 ? `0${day}` : day}
      </button>
    );
  }
  const remaining = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    calendarCells.push(<span key={`next-${i}`} className="text-[#FDBA74] text-[13px] font-semibold py-1.5 cursor-default">{i < 10 ? `0${i}` : i}</span>);
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-md shadow-2xl max-w-[480px] w-full overflow-hidden flex flex-col my-auto"
      >
        {/* Header: title and close */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E5]">
          <h2 className="text-base font-medium text-[#15191C]">{title || "Select Date & Time"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-600 transition-colors p-1 rounded-md cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body: the calendar on the left; the time and the chosen date and time on the right */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-[1.45fr_1fr] gap-4 items-stretch">
          <div className="bg-[#F3F4F7] p-4 rounded-lg border border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-3 px-1">
              <button type="button" onClick={handlePrevMonth} aria-label="Previous month" className="text-[#C44200] hover:opacity-80 text-sm font-bold cursor-pointer px-1">&lt;</button>
              <span className="text-[13px] font-semibold text-gray-900">{MONTH_NAMES[currentMonth]} {currentYear}</span>
              <button type="button" onClick={handleNextMonth} aria-label="Next month" className="text-[#C44200] hover:opacity-80 text-sm font-bold cursor-pointer px-1">&gt;</button>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[#C44200] mb-1.5">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>
            <div className="grid grid-cols-7 text-center gap-y-1 text-[13px] font-semibold text-gray-800">
              {calendarCells}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Time: hour, minute and AM/PM, each with its own up and down buttons */}
            <div className="flex-1 flex items-center justify-center bg-[#F3F4F7] rounded-lg border border-[#E5E7EB] px-2 py-4">
              <TimeStepper
                hourIdx={hourIdx}   onHour={setHourIdx}
                minuteIdx={minuteIdx} onMinute={setMinuteIdx}
                ampmIdx={ampmIdx}   onAmpm={setAmpmIdx}
              />
            </div>
            <div className="bg-[#FFF4EE] border border-[#FFD6C2] rounded-lg px-3 py-3 text-center">
              <p className="text-[11px] text-gray-500 font-medium mb-1">Selected Date &amp; Time</p>
              <p className="text-[13px] font-semibold text-gray-900">
                {Math.min(selectedDay, daysInMonth).toString().padStart(2, "0")} {MONTH_NAMES[currentMonth]} {currentYear}, {displayTime}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#E5E5E5] flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2 border border-[#E0E0E0] hover:bg-gray-50 text-[#15191C] font-semibold text-sm rounded-lg transition-colors cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="px-7 py-2 bg-[#C65318] hover:bg-[#A83800] text-white font-semibold text-sm rounded-lg transition-all cursor-pointer">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
