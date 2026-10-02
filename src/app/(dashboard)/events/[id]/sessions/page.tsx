"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { reportService } from "@/services/reportService";
import { inviteeService } from "@/services/inviteeService";
import { sessionService } from "@/services/sessionService";
import { eventService } from "@/services/eventService";
import { addHours, formatDateTime, isAfter, nextWholeHourIso } from "@/utils/dateTime";
import { downloadInviteeTemplate } from "@/utils/inviteeTemplate";
import DateTimePickerModal from "@/components/add-event/modals/DateTimePickerModal";
import EventSubNav from "@/components/EventSubNav";

import UserNavDropdown from "@/components/common/UserNavDropdown";
import CustomDropdown from "@/components/common/CustomDropdown";

const ACCESS_LABELS: Record<string, string> = { NO_RESTRICTION: "No Restrictions", ONLY_ONCE: "Only Once" };

export default function EventSessionsPage() {
  const params = useParams();
  const eventId = (params?.id as string) || "";
  const { user } = useAuth();

  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // DatePicker Modal State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState<"start" | "end">("start");

  const fetchSessions = async () => {
    if (!eventId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [res, reportRes] = await Promise.all([
        sessionService.getSessions(eventId),
        reportService.getEventReport(eventId),
      ]);
      // Invited counts per session come from the event report (sessionAccess-aware)
      const invitedBySession = new Map<string, number>(
        (reportRes.success && reportRes.data ? reportRes.data.sessionReports : []).map((r) => [String(r.sessionId), r.invitedCount ?? 0])
      );
      if (res?.success && Array.isArray(res.data)) {
        const mapped = res.data.map((s: any, idx: number) => {
          const id = s._id || s.id;
          const startVal = s.schedule?.start || s.startTime;
          const endVal = s.schedule?.end || s.endTime;

          return {
            _id: id,
            id: id,
            name: s.name || `Session ${idx + 1}`,
            startTime: formatDateTime(startVal, "N/A"),
            endTime: formatDateTime(endVal),
            accessControl: ACCESS_LABELS[s.accessControl] || "No Restrictions",
            speaker: s.speaker || "-",
            invitesCount: invitedBySession.get(String(id)) ?? 0,
            validateAgainstOtherSessions: s.validateAgainstOtherSessions || false,
          };
        });
        setSessions(mapped);
      } else {
        setSessions([]);
        setLoadError(res?.message || "Failed to load sessions.");
      }
    } catch (error) {
      console.error("Failed to fetch sessions from backend API:", error);
      setSessions([]);
      setLoadError("Could not reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [eventId]);

  // Form State for Add Session Modal
  const [sessionName, setSessionName] = useState("");
  // ISO values; default to the event's own window once it is known
  const [startTime, setStartTime] = useState<string>(() => nextWholeHourIso());
  const [endTime, setEndTime] = useState<string>(() => addHours(nextWholeHourIso(), 4));
  const [accessControl, setAccessControl] = useState<"NO_RESTRICTION" | "ONLY_ONCE">("NO_RESTRICTION");
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!eventId) return;
    eventService.getEvent(eventId).then((res) => {
      const schedule = res.success ? (res.data as any)?.schedule : null;
      if (schedule?.start && schedule?.end) {
        setStartTime(schedule.start);
        setEndTime(schedule.end);
      }
    });
  }, [eventId]);

  const handleOpenDatePicker = (field: "start" | "end") => {
    setActiveDateField(field);
    setIsDatePickerOpen(true);
  };

  const handleSaveDatePicker = (val: string) => {
    if (activeDateField === "start") {
      setStartTime(val);
    } else {
      setEndTime(val);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFileName(e.target.files[0].name);
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) return;
    setFormError(null);
    if (!isAfter(endTime, startTime)) {
      setFormError("Session end must be after its start.");
      return;
    }

    try {
      const res = await sessionService.createSession(eventId, {
        name: sessionName.trim(),
        schedule: { start: startTime, end: endTime },
        accessControl,
      });

      if (res.success) {
        // Invitees from the uploaded sheet are imported into this event through the backend
        if (uploadedFile) {
          const importRes = await inviteeService.importExcel(eventId, uploadedFile);
          if (!importRes.success) {
            alert(`Session created, but the invitee file could not be imported: ${importRes.message || "unknown error"}`);
          } else if (importRes.data && importRes.data.rejected > 0) {
            alert(`Session created. ${importRes.data.imported} invitee(s) imported, ${importRes.data.rejected} row(s) rejected.`);
          }
        }
        setSessionName("");
        setUploadedFileName("");
        setUploadedFile(null);
        setIsAddModalOpen(false);
        await fetchSessions();
      } else {
        setFormError(res.message || "Failed to create session on server.");
      }
    } catch (error: any) {
      alert(error.message || "Error creating session.");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const res = await sessionService.deleteSession(sessionId);
      if (res.success) {
        await fetchSessions();
      } else {
        alert(res.message || "Failed to delete session.");
      }
    } catch (e: any) {
      alert(e.message || "Failed to delete session.");
    }
  };

  const filteredSessions = sessions.filter((s) =>
    (s.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-full bg-white text-gray-900 font-sans">
      {/* Top Navigation Bar */}
      <header className="h-20 bg-white border-b border-gray-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <svg className="w-7 h-7 text-[#FF5B22] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-sm sm:text-xl font-bold text-gray-900 truncate">Event Sessions</h1>
        </div>
        <UserNavDropdown />
      </header>

      {/* Page Content - Directly on page background without card container */}
      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6 bg-white pb-24">
          {/* Sub-Navigation Tabs Bar */}
          <EventSubNav
            eventId={eventId}
            activeTab="sessions"
            sessionsCount={sessions.length}
          />

          {/* Controls Bar: Title, Search, Back, + Add Session */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6 flex-1 max-w-xl">
              <h2 className="text-xl font-bold text-gray-900 shrink-0">Sessions</h2>

              {/* Search Bar */}
              <div className="relative flex-1">
                <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search invitees"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 w-fit self-start">
              {/* Back to Dashboard */}
              <Link
                href={`/events/${eventId}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#FF5B22] text-[#FF5B22] hover:bg-[#FF5B22]/5 text-xs font-semibold rounded-md transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Dashboard</span>
              </Link>

              {/* + Add Session Button */}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF5B22] hover:bg-[#E04B16] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Session</span>
              </button>
            </div>
          </div>

          {/* Sessions Data Table matching Image 2 */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-medium text-[11px]">
                  <th className="py-3 px-3 w-12 font-medium">#</th>
                  <th className="py-3 px-4 font-medium">Session Title</th>
                  <th className="py-3 px-4 font-medium">Date & Time</th>
                  <th className="py-3 px-4 font-medium">Total Invitees</th>
                  <th className="py-3 px-4 font-medium">System Users</th>
                  <th className="py-3 px-4 font-medium">Access Control</th>
                  <th className="py-3 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-rose-600 break-words">
                      {loadError}
                    </td>
                  </tr>
                ) : filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No sessions found. Add a session to get started.
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((sess, index) => (
                    <tr key={sess._id || index} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-3 font-medium text-gray-400">{String(index + 1).padStart(2, "0")}</td>
                      <td className="py-4 px-4 font-medium text-gray-900">{sess.name}</td>
                      <td className="py-4 px-4 text-gray-600 font-normal">
                        {sess.startTime} {sess.endTime ? `to ${sess.endTime}` : ''}
                      </td>
                      <td className="py-4 px-4 font-normal text-gray-800">
                        {sess.invitesCount ?? sess.totalInvitees ?? sess.maxAttendees ?? 0}
                      </td>
                      <td className="py-4 px-4 font-normal text-gray-800">{sess.speaker || "-"}</td>
                      <td className="py-4 px-4 font-normal text-gray-700">{sess.accessControl || "No Restriction"}</td>
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteSession(sess._id || sess.id)}
                          className="text-rose-500 hover:text-rose-700 font-semibold cursor-pointer text-xs"
                          title="Delete Session"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Add Session Modal matching Image 1 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsAddModalOpen(false)}
          />

          <div className="relative bg-white rounded-md shadow-2xl max-w-lg w-full p-6 space-y-5 z-10">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Add Session</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-gray-800 mb-1">
                  <span>
                    Session Name<span className="text-[#FF5B22] ml-0.5">*</span>
                  </span>
                  <span className="text-gray-400 text-[10px]" title="Enter session name">ⓘ</span>
                </label>
                <input
                  type="text"
                  placeholder="Entry Session"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-gray-800 focus:outline-none focus:border-[#FF5B22]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="flex items-center justify-between text-[11px] font-semibold text-gray-800 mb-1">
                    <span>Start Time<span className="text-[#FF5B22] ml-0.5">*</span></span>
                    <span className="text-gray-400 text-[10px]">ⓘ</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatDateTime(startTime)}
                      readOnly
                      onClick={() => handleOpenDatePicker("start")}
                      className="w-full p-2 pr-7 border border-gray-200 rounded-md text-gray-800 text-[11px] focus:outline-none focus:border-[#FF5B22] cursor-pointer"
                    />
                    <svg
                      onClick={() => handleOpenDatePicker("start")}
                      className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer hover:text-[#FF5B22]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-[11px] font-semibold text-gray-800 mb-1">
                    <span>End Time<span className="text-[#FF5B22] ml-0.5">*</span></span>
                    <span className="text-gray-400 text-[10px]">ⓘ</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatDateTime(endTime)}
                      readOnly
                      onClick={() => handleOpenDatePicker("end")}
                      className="w-full p-2 pr-7 border border-gray-200 rounded-md text-gray-800 text-[11px] focus:outline-none focus:border-[#FF5B22] cursor-pointer"
                    />
                    <svg
                      onClick={() => handleOpenDatePicker("end")}
                      className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer hover:text-[#FF5B22]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-[11px] font-semibold text-gray-800 mb-1">
                    <span>Access Control</span>
                    <span className="text-gray-400 text-[10px]">ⓘ</span>
                  </label>
                  <CustomDropdown
                    value={accessControl}
                    onChange={(val) => setAccessControl(val as "NO_RESTRICTION" | "ONLY_ONCE")}
                    options={[
                      { value: "NO_RESTRICTION", label: "No Restrictions" },
                      { value: "ONLY_ONCE", label: "Only Once" },
                    ]}
                    placeholder="Access Control"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Add Invitees List
                </label>
                <div className="border border-gray-200 rounded-md p-2.5 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <label className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded cursor-pointer transition-colors">
                      Choose File
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-gray-500 truncate">
                      {uploadedFileName || "No file chosen"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 mt-2 text-xs">
                  <div className="w-4 h-4 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-[9px]">
                    X
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadInviteeTemplate()}
                    className="text-gray-800 font-semibold underline hover:text-[#FF5B22]"
                  >
                    Download Excel Sample
                  </button>
                  <span className="text-gray-400 text-[10px]">ⓘ</span>
                </div>
              </div>

              {formError && (
                <p role="alert" className="text-xs font-medium text-rose-600 break-words">{formError}</p>
              )}

              {/* Submit button: Orange outlined button + Add Session matching Image 1 */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 border border-[#FF5B22] text-[#FF5B22] hover:bg-[#FF5B22]/5 text-xs font-semibold rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5 bg-white"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Session</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DateTime Picker Modal */}
      <DateTimePickerModal
        key={isDatePickerOpen ? `picker-${activeDateField}-${activeDateField === "start" ? startTime : endTime}` : "picker-closed"}
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSave={handleSaveDatePicker}
        value={activeDateField === "start" ? startTime : endTime}
        title={activeDateField === "start" ? "Session start" : "Session end"}
      />
    </div>
  );
}
