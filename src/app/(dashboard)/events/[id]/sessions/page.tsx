"use client";

import { useAlert } from "@/context/AlertContext";
import { isHistoricalEvent } from "@/utils/eventUtils";
import ClosedEventNotice from "@/components/events/ClosedEventNotice";
import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { reportService } from "@/services/reportService";
import { inviteeService } from "@/services/inviteeService";
import { sessionService } from "@/services/sessionService";
import { eventService } from "@/services/eventService";
import { assignmentService } from "@/services/assignmentService";
import PageHeader from "@/components/common/PageHeader";
import { addHours, formatCompactDateTime, formatDateTime, formatTime, isAfter, nextWholeHourIso } from "@/utils/dateTime";

const sameDay = (a?: string, b?: string) => !!a && !!b && new Date(a).toDateString() === new Date(b).toDateString();
import { expectedColumnsFor } from "@/utils/inviteeFields";
import SampleReminderModal from "@/components/invitees/SampleReminderModal";
import { acknowledgeSampleReminder, sampleReminderAcknowledged } from "@/utils/sampleReminder";
import { excelColumnsFor } from "@/utils/inviteeFields";
import { missingColumnsMessage, parseInviteeSheet } from "@/utils/inviteeSheet";
import { downloadInviteeTemplate, templateColumnsFor, type TemplateColumns } from "@/utils/inviteeTemplate";
import DateTimePickerModal from "@/components/add-event/modals/DateTimePickerModal";
import EventSubNav from "@/components/EventSubNav";

import CustomDropdown from "@/components/common/CustomDropdown";
import { TableSkeletonRows } from "@/components/common/Skeleton";
import InfoTip from "@/components/common/InfoTip";
import Icon from "@/components/icons/Icon";

const ACCESS_LABELS: Record<string, string> = { NO_RESTRICTION: "No Restrictions", ONLY_ONCE: "Only Once" };

export default function EventSessionsPage() {
  const params = useParams();
  const eventId = (params?.id as string) || "";
  const { user } = useAuth();
  const { confirm, showAlert } = useAlert();

  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assignedUsers, setAssignedUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [eventStatus, setEventStatus] = useState<string | undefined>();
  const historical = isHistoricalEvent(eventStatus);

  // DatePicker Modal State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState<"start" | "end">("start");

  // The skeleton is for the first load of an event; a refresh after adding or deleting a session keeps the rows on screen
  const loadedFor = useRef<string | null>(null);
  const fetchSessions = async () => {
    if (!eventId) return;
    if (loadedFor.current !== eventId) setIsLoading(true);
    setLoadError(null);
    try {
      const [res, assignRes, eventRes] = await Promise.all([
        sessionService.getSessions(eventId),
        assignmentService.getEventAssignments(eventId),
        eventService.getEvent(eventId),
      ]);
      setEventStatus((eventRes.data as { status?: string } | undefined)?.status);
      // "System Users" column (Figma 217:22014): staff assigned to each session
      const assignments = assignRes.success && Array.isArray(assignRes.data) ? assignRes.data : [];
      setAssignedUsers(assignments.length);
      const staffBySession = new Map<string, number>();
      assignments.forEach((a) => a.sessionIds.forEach((sid) => {
        const key = String(typeof sid === "object" ? sid._id : sid);
        staffBySession.set(key, (staffBySession.get(key) ?? 0) + 1);
      }));
      // Invited counts per session come from the event report (sessionAccess-aware). That report is the slowest call here, so the
      // table shows at once with a placeholder in that column and the counts fill in when the report arrives.
      void reportService.getEventReport(eventId).then((reportRes) => {
        const invitedBySession = new Map<string, number>(
          (reportRes.success && reportRes.data ? reportRes.data.sessionReports : []).map((r) => [String(r.sessionId), r.invitedCount ?? 0])
        );
        setSessions((rows) => rows.map((row) => ({ ...row, invitesCount: invitedBySession.get(String(row._id)) ?? 0 })));
      });
      if (res?.success && Array.isArray(res.data)) {
        const mapped = res.data.map((s: any, idx: number) => {
          const id = s._id || s.id;
          const startVal = s.schedule?.start || s.startTime;
          const endVal = s.schedule?.end || s.endTime;

          return {
            _id: id,
            id: id,
            name: s.name || `Session ${idx + 1}`,
            // Figma 217:22014: "5/1/2026  10:30 AM to 03:00 PM" — the end date only when the session runs into another day
            startTime: formatCompactDateTime(startVal, "N/A"),
            endTime: endVal ? (sameDay(startVal, endVal) ? formatTime(endVal) : formatCompactDateTime(endVal)) : "",
            accessControl: ACCESS_LABELS[s.accessControl] || "No Restrictions",
            systemUsers: assignRes.success ? staffBySession.get(String(id)) ?? 0 : null,
            invitesCount: null as number | null,
            validateAgainstOtherSessions: s.validateAgainstOtherSessions || false,
          };
        });
        setSessions(mapped);
        loadedFor.current = eventId;
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
  const [accessControl, setAccessControl] = useState<"NO_RESTRICTION" | "ONLY_ONCE">("ONLY_ONCE");
  const [formError, setFormError] = useState<string | null>(null);
  const [sampleColumns, setSampleColumns] = useState<TemplateColumns>({});
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  // "Keep same invitees as": the new session shares another session's guest list instead of getting its own
  const fileInput = useRef<HTMLInputElement>(null);
  const [sampleReminder, setSampleReminder] = useState(false);
  const [copyOn, setCopyOn] = useState(false);
  const [copySourceId, setCopySourceId] = useState("");
  const copyOptions = sessions
    .filter((x) => x.inviteeSource !== "COPY_SESSION")
    .map((x, i) => ({ value: String(x._id || x.id), label: x.name || `Session ${i + 1}` }));

  useEffect(() => {
    if (!eventId) return;
    eventService.getEvent(eventId).then((res) => {
      const ev = res.success ? (res.data as any) : null;
      const schedule = ev?.schedule;
      if (ev) setSampleColumns(templateColumnsFor({ cardInfo: ev.cardInfo, dietaryEnabled: !!ev.dietaryPreference?.enabled, corporate: /corporate/i.test(typeof ev.categoryId === "object" ? ev.categoryId?.name || "" : "") }));
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFormError(null);
    try {
      const parsed = await parseInviteeSheet(file, [], expectedColumnsFor(sampleColumns));
      if (parsed.missingColumns.length > 0) {
        setUploadedFileName("");
        setUploadedFile(null);
        setFormError(missingColumnsMessage(parsed.missingColumns));
        return;
      }
    } catch {
      // an unreadable file is reported by the import itself
    }
    setUploadedFileName(file.name);
    setUploadedFile(file);
  };

  // The columns are specific to this event, so remind the organizer to start from its sample before choosing a file
  const sampleColumnNames = excelColumnsFor(sampleColumns);
  const askForFile = () => {
    if (sampleReminderAcknowledged(eventId, sampleColumnNames)) fileInput.current?.click();
    else setSampleReminder(true);
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
        ...(copyOn && copySourceId ? { inviteeSource: "COPY_SESSION" as const, sourceSessionId: copySourceId } : {}),
      });

      if (res.success) {
        // Invitees from the uploaded sheet are imported into this event through the backend
        if (uploadedFile && !copyOn) {
          const importRes = await inviteeService.importExcel(eventId, uploadedFile, undefined, "APPEND");
          if (!importRes.success) {
            showAlert(`Session created, but the invitee file could not be imported: ${importRes.message || "unknown error"}`);
          } else if (importRes.data && importRes.data.rejected > 0) {
            showAlert(`Session created. ${importRes.data.imported} invitee(s) imported, ${importRes.data.rejected} row(s) rejected.`);
          }
        }
        setSessionName("");
        setUploadedFileName("");
        setUploadedFile(null);
        setCopyOn(false);
        setCopySourceId("");
        setIsAddModalOpen(false);
        await fetchSessions();
      } else {
        setFormError(res.message || "Failed to create session on server.");
      }
    } catch (error: any) {
      showAlert(error.message || "Error creating session.");
    }
  };

  const handleDeleteSession = async (sessionId: string, name?: string) => {
    if (!(await confirm({ title: "Delete session?", message: `"${name || "This session"}" will be removed from the event and from every guest's access. This cannot be undone.`, confirmText: "Delete Session", tone: "danger" }))) return;
    try {
      const res = await sessionService.deleteSession(sessionId);
      if (res.success) {
        await fetchSessions();
      } else {
        showAlert(res.message || "Failed to delete session.");
      }
    } catch (e: any) {
      showAlert(e.message || "Failed to delete session.");
    }
  };

  const filteredSessions = sessions.filter((s) =>
    (s.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-full bg-white text-gray-900 font-sans">
      {/* Organiser frame 217:22014 says "Event Sessions"; the Super Admin frame 2114:5996 keeps "Event" */}
      <PageHeader title={user?.role === "ADMIN" ? "Event" : "Event Sessions"} />

      {/* Page Content - Directly on page background without card container */}
      <div className="px-4 sm:px-6 pt-[30px] pb-24 w-full space-y-8 bg-white">
          {/* Sub-Navigation Tabs Bar */}
          <EventSubNav
            eventId={eventId}
            activeTab="sessions"
            sessionsCount={isLoading ? undefined : sessions.length}
            assignmentsCount={isLoading ? undefined : assignedUsers}
          />

          {/* Controls (Figma 217:22091): "Sessions" label + search, Add Session */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 lg:gap-[139px]">
            <div className="flex flex-1 items-center gap-2.5 min-w-0">
              <label htmlFor="session-search" className="text-[17px] font-medium text-black shrink-0">Sessions</label>
              <div className="relative flex-1 min-w-0">
                <Icon name="events/search" width={18} height={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60" />
                <input
                  id="session-search"
                  type="search"
                  placeholder="Search sessions"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-[47px] pl-12 pr-4 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs font-medium text-gray-900 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              disabled={historical}
              title={historical ? "This event can no longer be changed" : undefined}
              className="disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 px-4 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg cursor-pointer shrink-0 w-fit"
            >
              <Icon name="events/add-white" width={24} height={24} />
              Add Session
            </button>
          </div>

          <ClosedEventNotice status={eventStatus} />

          {/* Sessions Data Table matching Image 2 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-medium whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#D3D3D3] text-[#828282]">
                  <th className="h-[46px] p-2.5 w-[43px] font-medium">#</th>
                  <th className="h-[46px] p-2.5 w-[270px] font-medium">Session Title</th>
                  <th className="h-[46px] p-2.5 w-[348px] font-medium">Date & Time</th>
                  <th className="h-[46px] p-2.5 w-[143px] font-medium">Total Invitees</th>
                  <th className="h-[46px] p-2.5 w-[145px] font-medium">System Users</th>
                  <th className="h-[46px] p-2.5 font-medium">Access Control</th>
                  <th className="h-[46px] p-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D3D3D3] text-[#4B4F52] border-b border-[#D3D3D3]">
                {isLoading ? (
                  <TableSkeletonRows rows={4} cols={7} />
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
                      <td className="h-[46px] p-2.5">{String(index + 1).padStart(2, "0")}</td>
                      <td className="h-[46px] p-2.5">{sess.name}</td>
                      <td className="h-[46px] p-2.5">
                        {sess.startTime} {sess.endTime ? `to ${sess.endTime}` : ''}
                      </td>
                      <td className="h-[46px] p-2.5">
                        {sess.invitesCount === null ? <span role="status" aria-label="Loading" className="inline-block h-3 w-6 rounded bg-gray-200 animate-pulse align-middle" /> : sess.invitesCount ?? sess.totalInvitees ?? sess.maxAttendees ?? 0}
                      </td>
                      <td className="h-[46px] p-2.5">{sess.systemUsers === null || sess.systemUsers === undefined ? "—" : String(sess.systemUsers).padStart(2, "0")}</td>
                      <td className="h-[46px] p-2.5">{sess.accessControl || "No Restriction"}</td>
                      <td className="h-[46px] p-2.5 text-right">
                        {!historical && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSession(sess._id || sess.id, sess.name)}
                            className="text-rose-500 hover:text-rose-700 font-semibold cursor-pointer text-sm"
                            title="Delete Session"
                            aria-label={`Delete session ${sess.name}`}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Add Session popup (Figma 217:22172): no title bar; one bordered card holding the fields, then the outlined Add Session button */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Add Session">
          <div
            className="absolute inset-0 bg-black/60 transition-opacity"
            onClick={() => setIsAddModalOpen(false)}
          />

          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-[672px] p-4 z-10">
            {/* the close button sits inside the card, top right (it used to float above the card, on the dark backdrop) */}
            <div className="flex justify-end -mt-1 mb-1">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close"
                className="text-gray-400 hover:text-gray-700 p-1 rounded-md cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="border border-[#E0E0E0] rounded-lg p-5 space-y-5">
                <div>
                  <label className="flex items-center justify-between gap-2 text-sm font-medium text-[#15191C] mb-1.5">
                    <span>Session Name<span className="text-[#FF651D] ml-0.5">*</span></span>
                    <InfoTip label="About the session name" text="Guests and system users see this name for the session, for example Entry or Lunch." />
                  </label>
                  <input
                    type="text"
                    placeholder="Entry Session"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    required
                    className="w-full h-[47px] px-3.5 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(["start", "end"] as const).map((field) => (
                    <div key={field} className="min-w-0">
                      <label className="flex items-center justify-between gap-2 text-sm font-medium text-[#15191C] mb-1.5">
                        <span>{field === "start" ? "Start Time" : "End Time"}<span className="text-[#FF651D] ml-0.5">*</span></span>
                        <InfoTip
                          label={`About the session ${field} time`}
                          text={field === "start" ? "When this session opens for check-in. It must fall within the event's dates." : "When this session closes. It must be after the start time."}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleOpenDatePicker(field)}
                        className="w-full h-[47px] px-3 flex items-center justify-between gap-2 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 hover:border-[#FF651D] cursor-pointer text-left"
                      >
                        <span className="truncate">{formatDateTime(field === "start" ? startTime : endTime)}</span>
                        <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  ))}

                  <div className="min-w-0">
                    <label className="flex items-center justify-between gap-2 text-sm font-medium text-[#15191C] mb-1.5">
                      <span>Access Control</span>
                      <InfoTip label="About access control" text="If the invitees are allowed access to the Session any number of times, set No Restrictions." />
                    </label>
                    <CustomDropdown
                      compact
                      value={accessControl}
                      onChange={(val) => setAccessControl(val as "NO_RESTRICTION" | "ONLY_ONCE")}
                      options={[
                        { value: "ONLY_ONCE", label: "Only Once" },
                        { value: "NO_RESTRICTION", label: "No Restrictions" },
                      ]}
                      placeholder="Access Control"
                    />
                  </div>
                </div>

                {copyOptions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="session-copy" className="inline-flex items-center gap-2.5 cursor-pointer select-none text-sm text-[#4B4F52]">
                      <input
                        id="session-copy"
                        type="checkbox"
                        checked={copyOn}
                        onChange={(e) => {
                          setCopyOn(e.target.checked);
                          setCopySourceId(e.target.checked ? copyOptions[0].value : "");
                          if (e.target.checked) { setUploadedFile(null); setUploadedFileName(""); }
                        }}
                        className="size-4 rounded border-gray-300 accent-[#16A34A] cursor-pointer"
                      />
                      Keep same invitees as
                    </label>
                    <div className="w-48">
                      <CustomDropdown
                        value={copyOn ? copySourceId : ""}
                        onChange={(v) => setCopySourceId(v)}
                        options={copyOptions}
                        disabled={!copyOn}
                        placeholder={copyOptions[0]?.label || "Session"}
                        ariaLabel="Session to copy invitees from"
                        portal
                      />
                    </div>
                  </div>
                )}

                {!copyOn && (
                <div>
                  <label className="block text-sm font-medium text-[#15191C] mb-1.5">Add Invitees List</label>
                  <div className="border border-[#E0E0E0] rounded-md flex items-center bg-[#FAFAFA] overflow-hidden min-h-[47px]">
                    <button type="button" onClick={askForFile} className="self-stretch flex items-center px-4 bg-[#EDEDED] hover:bg-[#E3E3E3] text-[#4B4F52] text-xs font-medium cursor-pointer transition-colors border-r border-[#E0E0E0]">
                      Choose File
                    </button>
                    <input ref={fileInput} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                    <span className="px-3 text-xs text-[#828282] truncate">{uploadedFileName || "No file chosen"}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-[#828282]">The invitees are added to this event's existing list. Nobody already on it is removed, and people already invited are not imported again.</p>

                  <div className="flex items-center justify-end gap-2 mt-2 text-sm">
                    <div className="w-4 h-4 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-[9px]">X</div>
                    <button type="button" onClick={() => downloadInviteeTemplate(sampleColumns)} className="text-[#15191C] font-medium underline hover:text-[#FF651D] cursor-pointer">
                      Download Excel Sample
                    </button>
                    <InfoTip label="About the Excel sample" text="Download the sample template from the link and enter your invitees in the same format. There are three main columns - Name, Email and Mobile. Name and Mobile are mandatory fields. All numbers must be with country code, for e.g. +91xxxxxxxxxx, without any space in between." />
                  </div>
                </div>
                )}
              </div>

              {formError && (
                <p role="alert" className="text-xs font-medium text-rose-600 break-words">{formError}</p>
              )}

              <button
                type="submit"
                className="px-4 py-2.5 border border-[#FF651D] text-[#FF651D] hover:bg-[#FF651D]/5 text-sm font-medium rounded-md transition-colors cursor-pointer inline-flex items-center gap-2 bg-white"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Session</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {sampleReminder && (
        <SampleReminderModal
          columns={sampleColumnNames}
          onCancel={() => setSampleReminder(false)}
          onDownload={() => downloadInviteeTemplate(sampleColumns)}
          onContinue={() => { acknowledgeSampleReminder(eventId, sampleColumnNames); setSampleReminder(false); fileInput.current?.click(); }}
        />
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
