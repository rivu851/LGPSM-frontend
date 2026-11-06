"use client";

import { csvCell } from "@/utils/csv";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { formatOrganizerId } from "@/utils/formatId";
import { InviteeLog, AccessLog, SessionReport, ReportSessionColumn } from "@/types/reports";
import ReportsHeaderControls from "@/components/reports/ReportsHeaderControls";
import ReportsStatsCards from "@/components/reports/ReportsStatsCards";
import ReportsCharts from "@/components/reports/ReportsCharts";
import ReportsLogsTable from "@/components/reports/ReportsLogsTable";
import { eventService } from "@/services/eventService";
import { userService } from "@/services/userService";
import { inviteeService } from "@/services/inviteeService";
import { checkInService, CheckInRecord } from "@/services/checkInService";
import { auditLogService } from "@/services/auditLogService";
import { reportService, EventReportData } from "@/services/reportService";
import { formatDateTime } from "@/utils/dateTime";
import { Skeleton, SkeletonRegion } from "@/components/common/Skeleton";
import DashedBorder from "@/components/common/DashedBorder";

const ACCESS_CONTROL_LABELS: Record<string, string> = {
  NO_RESTRICTION: "No Restrictions",
  ONLY_ONCE: "Only Once",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  ORGANIZER: "Event Organizer",
  SYSTEM_USER: "System User",
};

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [selectedOrganizer, setSelectedOrganizer] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");

  const [activeTab, setActiveTab] = useState<"checkins" | "invitees" | "access" | "sessions">("checkins");
  const [searchQuery, setSearchQuery] = useState("");
  const [tableSearch, setTableSearch] = useState("");

  const [organizerOptions, setOrganizerOptions] = useState<{ value: string; label: string }[]>([
    { value: "", label: "All Organizers" },
  ]);
  const [allEventsList, setAllEventsList] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Real Check-In state
  const [checkInLogs, setCheckInLogs] = useState<CheckInRecord[]>([]);
  const [loadingCheckIns, setLoadingCheckIns] = useState<boolean>(false);
  const [checkInPage, setCheckInPage] = useState<number>(1);
  const [checkInLimit] = useState<number>(20);
  const [checkInTotal, setCheckInTotal] = useState<number>(0);
  const [checkInTotalPages, setCheckInTotalPages] = useState<number>(1);
  const [methodFilter, setMethodFilter] = useState<string>("");

  // Event report state (all values come from the backend)
  const [eventReport, setEventReport] = useState<EventReportData | null>(null);
  const [inviteeLogs, setInviteeLogs] = useState<InviteeLog[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [sessionsReport, setSessionsReport] = useState<SessionReport[]>([]);
  const [sessionColumns, setSessionColumns] = useState<ReportSessionColumn[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingInviteeDetails, setLoadingInviteeDetails] = useState(false);
  const [loadingAccessDetails, setLoadingAccessDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // 1. Organizer filter options (admin only - organizers only see their own events)
  useEffect(() => {
    if (!isAdmin) return;
    userService.getUsers("ORGANIZER").then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setOrganizerOptions([
          { value: "", label: "All Organizers" },
          ...res.data
            .filter((u) => u.role === "ORGANIZER")
            .map((u) => ({ value: u._id, label: u.fullName || u.email })),
        ]);
      }
    });
  }, [isAdmin]);

  // 2. Events for the selected organizer
  useEffect(() => {
    let cancelled = false;
    async function loadEvents() {
      setLoadingEvents(true);
      setPageError(null);
      const res = await eventService.getEvents(selectedOrganizer ? { organizerId: selectedOrganizer } : undefined);
      if (cancelled) return;
      if (!res.success) {
        setPageError(res.message || "Failed to load events.");
        setAllEventsList([]);
      } else {
        setAllEventsList(Array.isArray(res.data) ? (res.data as any[]) : []);
      }
      setLoadingEvents(false);
    }
    loadEvents();
    return () => {
      cancelled = true;
    };
  }, [selectedOrganizer]);

  const eventOptions = allEventsList
    .filter((e) => !searchQuery.trim() || String(e.title || "").toLowerCase().includes(searchQuery.trim().toLowerCase()))
    .map((e) => ({ value: e._id || e.id, label: e.title || "Untitled Event" }));

  // Keep the selection valid for the current event list
  useEffect(() => {
    if (allEventsList.length === 0) {
      setSelectedEventId("");
      return;
    }
    if (!allEventsList.some((e) => (e._id || e.id) === selectedEventId)) {
      setSelectedEventId(allEventsList[0]._id || allEventsList[0].id);
    }
  }, [allEventsList, selectedEventId]);

  const selectedEvent = allEventsList.find((e) => (e._id || e.id) === selectedEventId) || null;
  const selectedEventTitle = selectedEvent?.title || "";
  const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : "TBD");

  // 3. Paginated check-in logs
  const loadCheckInLogs = useCallback(async () => {
    if (!selectedEventId) {
      setCheckInLogs([]);
      setCheckInTotal(0);
      setCheckInTotalPages(1);
      return;
    }
    setLoadingCheckIns(true);
    const res = await checkInService.getCheckIns(selectedEventId, {
      page: checkInPage,
      limit: checkInLimit,
      checkInMethod: methodFilter || undefined,
    });

    if (res?.success && Array.isArray(res.data)) {
      setCheckInLogs(res.data);
      setCheckInTotal(res.meta?.total ?? res.data.length);
      setCheckInTotalPages(res.meta?.totalPages || 1);
    } else {
      setCheckInLogs([]);
      setCheckInTotal(0);
      setCheckInTotalPages(1);
    }
    setLoadingCheckIns(false);
  }, [selectedEventId, checkInPage, checkInLimit, methodFilter]);

  useEffect(() => {
    loadCheckInLogs();
  }, [loadCheckInLogs]);

  // Reset page to 1 when event or method filter changes
  useEffect(() => {
    setCheckInPage(1);
  }, [selectedEventId, methodFilter]);

  // Load the compact event report up front. Heavy invitee and audit datasets are fetched only when their tab is opened.
  useEffect(() => {
    if (!selectedEventId) {
      setEventReport(null);
      setInviteeLogs([]);
      setSessionsReport([]);
      setSessionColumns([]);
      setAccessLogs([]);
      return;
    }

    let cancelled = false;
    async function loadEventDetails() {
      setLoadingDetails(true);
      setDetailsError(null);

      const reportRes = await reportService.getEventReport(selectedEventId);
      if (cancelled) return;

      if (!reportRes.success || !reportRes.data) {
        setDetailsError(reportRes.message || "Failed to load the event report.");
      }
      const report = reportRes.success ? reportRes.data || null : null;
      setEventReport(report);

      const sessions = report?.sessionReports || [];
      setSessionColumns(sessions.map((s) => ({ id: String(s.sessionId), name: s.name })));
      setSessionsReport(
        sessions.map((s, idx) => ({
          id: idx + 1,
          name: s.name,
          dateTime: s.schedule?.start
            ? `${formatDateTime(s.schedule.start)}${s.schedule.end ? ` – ${formatDateTime(s.schedule.end)}` : ""}`
            : "TBD",
          invitees: s.invitedCount ?? 0,
          attendees: s.attendeeCount ?? s.checkInCount ?? 0,
          accessControl: ACCESS_CONTROL_LABELS[s.accessControl || ""] || s.accessControl || "—",
          systemUsers: String(s.systemUsers ?? 0),
        }))
      );

      setLoadingDetails(false);
    }

    loadEventDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedEventId, reloadKey]);

  useEffect(() => {
    if (!selectedEventId || activeTab !== "invitees") {
      setInviteeLogs([]);
      return;
    }
    let cancelled = false;
    async function loadInviteeDetails() {
      setLoadingInviteeDetails(true);
      const [inviteesRes, allCheckInsRes] = await Promise.all([
        inviteeService.getInvitees(selectedEventId),
        checkInService.getAllCheckIns(selectedEventId),
      ]);
      if (cancelled) return;

      const checkIns: CheckInRecord[] = allCheckInsRes.success && Array.isArray(allCheckInsRes.data) ? allCheckInsRes.data : [];
      const byInvitee = new Map<string, CheckInRecord[]>();
      checkIns.forEach((ci) => {
        const id = ci.invitee?._id ? String(ci.invitee._id) : "";
        if (!id) return;
        const records = byInvitee.get(id) || [];
        records.push(ci);
        byInvitee.set(id, records);
      });

      const invitees: any[] = inviteesRes.success && Array.isArray(inviteesRes.data) ? inviteesRes.data : [];
      const sessionCount = eventReport?.sessionReports?.length || 0;
      // Events that do not ask guests to respond show "--" instead of a Pending RSVP
      const rsvpEnabled = (allEventsList.find((e) => (e._id || e.id) === selectedEventId) as { rsvp?: { enabled?: boolean } } | undefined)?.rsvp?.enabled !== false;
      setInviteeLogs(invitees.map((inv) => {
        const id = String(inv._id || inv.id);
        const records = byInvitee.get(id) || [];
        const sessionCheckIns: Record<string, boolean> = {};
        records.forEach((r) => { if (r.session?._id) sessionCheckIns[String(r.session._id)] = true; });
        const attendedSessions = Object.keys(sessionCheckIns).length;
        const latest = records.reduce<string | null>((acc, r) => (!acc || new Date(r.checkInAt) > new Date(acc) ? r.checkInAt : acc), null);
        const invitationStatus = String(inv.invitationStatus || "PENDING").toUpperCase();
        const rsvp = String(inv.rsvpStatus || "PENDING").toUpperCase();
        return {
          id,
          name: inv.name || "",
          mobile: inv.mobile || "—",
          invitationStatus: invitationStatus === "SENT" ? "Sent" : invitationStatus === "FAILED" ? "Failed" : "Pending",
          rsvpStatus: !rsvpEnabled ? "Not requested" : rsvp === "ACCEPTED" ? "Accepted" : rsvp === "DECLINED" ? "Declined" : "Pending",
          checkInStatus: records.length === 0 ? "Not Checked-in" : sessionCount > 0 && attendedSessions > 0 && attendedSessions < sessionCount ? "Partially Checked-in" : "Checked-in",
          lastCheckInTime: latest ? new Date(latest).toLocaleString() : "—",
          sessionCheckIns,
        } as InviteeLog;
      }));
      setLoadingInviteeDetails(false);
    }
    loadInviteeDetails();
    return () => { cancelled = true; };
  }, [selectedEventId, activeTab, reloadKey, eventReport]);

  useEffect(() => {
    if (!selectedEventId || activeTab !== "access") {
      setAccessLogs([]);
      return;
    }
    let cancelled = false;
    setLoadingAccessDetails(true);
    auditLogService.getAuditLogs({ eventId: selectedEventId, limit: 100 }).then((auditRes) => {
      if (cancelled) return;
      const logs: any[] = auditRes.success && Array.isArray(auditRes.data) ? auditRes.data : [];
      setAccessLogs(logs.map((log) => ({
        id: log._id,
        userType: ROLE_LABELS[log.actorType] || log.actorType || "—",
        dateTime: log.createdAt ? new Date(log.createdAt).toLocaleString() : "—",
        action: log.action,
        status: log.status === "FAILED" ? "failed" : "Successful",
        // the organizer on the log, else the event's own organizer
        ...(() => {
          const org = (log.organizerId && typeof log.organizerId === "object" ? log.organizerId : null) || (selectedEvent?.organizerId && typeof selectedEvent.organizerId === "object" ? selectedEvent.organizerId : null);
          const id = org?._id || (typeof log.organizerId === "string" ? log.organizerId : "") || (typeof selectedEvent?.organizerId === "string" ? selectedEvent.organizerId : "");
          return { organizerName: org?.profile?.organizationName || org?.fullName || "—", organizerCode: id ? formatOrganizerId(id) : "—" };
        })(),
      })));
      setLoadingAccessDetails(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedEvent follows selectedEventId
  }, [selectedEventId, activeTab, reloadKey]);

  const downloadReportCSV = () => {
    let content = "";
    if (activeTab === "checkins") {
      content = "Invitee,Session,Check-In Method,Check-In Time,Checked In By,RSVP Status\n" +
        checkInLogs.map(log => {
          const staff = typeof log.checkedInBy === "object" ? log.checkedInBy?.fullName || log.checkedInBy?.email : log.checkedInBy;
          return [
            log.invitee?.name,
            log.session?.name || "Event entry",
            log.checkInMethod,
            log.checkInAt ? new Date(log.checkInAt).toLocaleString() : "",
            staff,
            log.invitee?.rsvpStatus,
          ].map(csvCell).join(",");
        }).join("\n");
    } else if (activeTab === "invitees") {
      content = ["Invitee Name", "Mobile No.", "Invitation Status", "RSVP Status", "Check-in Status", "Last Check-in Time", ...sessionColumns.map((c) => c.name)].map(csvCell).join(",") + "\n" +
        inviteeLogs.map(i => [
          i.name, i.mobile, i.invitationStatus, i.rsvpStatus, i.checkInStatus, i.lastCheckInTime,
          ...sessionColumns.map((c) => (i.sessionCheckIns[c.id] ? "Yes" : "No")),
        ].map(csvCell).join(",")).join("\n");
    } else if (activeTab === "access") {
      content = "Organizer ID,Organizer / Organisation,User Type,Date & Time,Action,Status\n" +
        accessLogs.map(a => [a.organizerCode, a.organizerName, a.userType, a.dateTime, a.action, a.status].map(csvCell).join(",")).join("\n");
    } else {
      content = "#,Session Name,Date & Time,Invitees,Attendees,Access Control,System Users\n" +
        sessionsReport.map(s => [s.id, s.name, s.dateTime, s.invitees, s.attendees, s.accessControl, s.systemUsers].map(csvCell).join(",")).join("\n");
    }

    const blob = new Blob([content], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${activeTab}_logs.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredCheckInLogs = checkInLogs.filter(log => {
    if (!tableSearch) return true;
    const invName = (typeof log.invitee === "object" ? log.invitee?.name : "") || "";
    const invEmail = (typeof log.invitee === "object" ? log.invitee?.email : "") || "";
    const invMobile = (typeof log.invitee === "object" ? log.invitee?.mobile : "") || "";
    const query = tableSearch.toLowerCase();
    return (
      invName.toLowerCase().includes(query) ||
      invEmail.toLowerCase().includes(query) ||
      invMobile.includes(query)
    );
  });

  const filteredInviteeLogs = inviteeLogs.filter(i =>
    i.name.toLowerCase().includes(tableSearch.toLowerCase()) || i.mobile.includes(tableSearch)
  );

  const filteredAccessLogs = accessLogs.filter(a =>
    [a.userType, a.action, a.organizerName, a.organizerCode].some((v) => v.toLowerCase().includes(tableSearch.toLowerCase()))
  );

  const filteredSessions = sessionsReport.filter(s =>
    s.name.toLowerCase().includes(tableSearch.toLowerCase())
  );


  // Everything under the filters is one loading state: the events list, then the chosen event's report. Without this the
  // tiles, charts and logs each flipped from "empty" to filled at their own moment while data arrived.
  const bodyLoading = loadingEvents || loadingDetails || (!!selectedEventId && allEventsList.length > 0 && !eventReport && !detailsError);

  return (
    <div className="w-full min-h-full bg-white text-gray-900 font-sans select-none">
      {/* Admin frame 713:5982 is titled "Reports", the Organiser frame 217:23715 "Report" */}
      <PageHeader title={isAdmin ? "Reports" : "Report"} />

      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6 bg-white pb-24">
        <ReportsHeaderControls
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedOrganizer={selectedOrganizer}
          setSelectedOrganizer={setSelectedOrganizer}
          selectedEvent={selectedEventId}
          setSelectedEvent={setSelectedEventId}
          onDownloadReport={downloadReportCSV}
          organizerOptions={isAdmin ? organizerOptions : [{ value: "", label: user?.fullName || "Organizer name here" }]}
          eventOptions={eventOptions.length > 0 ? eventOptions : [{ value: "", label: loadingEvents ? "Loading events..." : "No events" }]}
        />

        {pageError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-medium break-words">{pageError}</div>
        )}

        {bodyLoading ? (
          <ReportSkeleton />
        ) : (
          <>
          {!loadingEvents && allEventsList.length === 0 && !pageError ? (
            <div className="relative rounded-md py-16 text-center text-sm font-medium text-gray-500">
            <DashedBorder width={1} className="text-gray-200" />
              No events found{selectedOrganizer ? " for this organizer" : ""}. Reports appear once an event exists.
            </div>
          ) : (
            <>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  {loadingEvents ? (
                    <Skeleton className="h-9 w-72 max-w-full" />
                  ) : (
                    <h2 className="text-[30px] leading-tight font-medium text-[#15191C] break-words min-w-0">{selectedEventTitle}</h2>
                  )}
                  {selectedEvent?.categoryId?.name && (
                    <span className="border border-orange-400 text-[#FF5B22] rounded-md px-2 py-0.5 text-[10px] font-semibold bg-orange-50/50">
                      {selectedEvent.categoryId.name}
                    </span>
                  )}
                  {selectedEventId && <Link href={`/events/${selectedEventId}`} className="text-xs font-semibold text-[#E5520F] underline underline-offset-2">Open event</Link>}
                </div>
                {selectedEvent && (
                  <p className="text-xs text-gray-500 font-medium">
                    <span className="font-semibold text-gray-700">Start:</span> {formatDate(selectedEvent.schedule?.start)} | <span className="font-semibold text-gray-700">End:</span> {formatDate(selectedEvent.schedule?.end)}
                  </p>
                )}
              </div>

              {detailsError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-xs font-medium flex items-center justify-between gap-3">
                  <span className="break-words min-w-0">{detailsError}</span>
                  <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="font-semibold shrink-0 cursor-pointer underline">
                    Retry
                  </button>
                </div>
              )}

              <ReportsStatsCards
                totalInvitees={eventReport?.totalInvitees ?? 0}
                totalAttendees={eventReport?.uniqueAttendees ?? 0}
                totalSessions={eventReport?.totalSessions ?? 0}
                systemUsers={eventReport?.totalSystemUsers ?? 0}
                loading={loadingEvents || (loadingDetails && !eventReport)}
              />

              <ReportsCharts
                loading={loadingDetails}
                delivery={eventReport?.deliverySummary}
                sessions={(eventReport?.sessionReports || []).map((sr) => ({
                  id: String(sr.sessionId),
                  name: sr.name,
                  invited: sr.invitedCount ?? 0,
                  attended: sr.attendeeCount ?? sr.checkInCount ?? 0,
                }))}
              />
            </>
          )}

          <ReportsLogsTable
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tableSearch={tableSearch}
            setTableSearch={setTableSearch}
            onDownloadCSV={downloadReportCSV}
            checkInLogs={filteredCheckInLogs}
            loadingCheckIns={loadingCheckIns}
            page={checkInPage}
            limit={checkInLimit}
            total={checkInTotal}
            totalPages={checkInTotalPages}
            onPageChange={(newPage) => setCheckInPage(newPage)}
            methodFilter={methodFilter}
            onMethodFilterChange={(m) => setMethodFilter(m)}
            inviteeLogs={filteredInviteeLogs}
            accessLogs={filteredAccessLogs}
            sessionsReport={filteredSessions}
            sessionColumns={sessionColumns}
            loadingDetails={loadingDetails || (activeTab === "invitees" && loadingInviteeDetails) || (activeTab === "access" && loadingAccessDetails)}
          />
          </>
        )}
      </div>

    </div>
  );
}

// Placeholder for the whole report body: event title, four tiles, the two charts and the logs card
function ReportSkeleton() {
  return (
    <SkeletonRegion label="Loading report" className="space-y-6">
      <div className="space-y-2"><Skeleton className="h-9 w-72 max-w-full" /><Skeleton className="h-4 w-64 max-w-full" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[158px] rounded-lg!" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[388px_1fr] gap-6">
        <Skeleton className="h-[374px] rounded-lg!" />
        <Skeleton className="h-[374px] rounded-lg!" />
      </div>
      <div className="border border-[#E0E0E0] rounded-lg p-6 space-y-4">
        <div className="flex gap-6"><Skeleton className="h-5 w-24" /><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-20" /></div>
        <Skeleton className="h-10" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
      </div>
    </SkeletonRegion>
  );
}
