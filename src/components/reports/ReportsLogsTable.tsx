"use client";

import React from "react";
import { InviteeLog, AccessLog, SessionReport, ReportSessionColumn } from "@/types/reports";
import { CheckInRecord } from "@/services/checkInService";
import Icon from "@/components/icons/Icon";
import CustomDropdown from "@/components/common/CustomDropdown";
import { TableSkeletonRows } from "@/components/common/Skeleton";
import { Skeleton, SkeletonRegion, TableSkeleton } from "@/components/common/Skeleton";
import { formatDateTime } from "@/utils/dateTime";

interface ReportsLogsTableProps {
  activeTab: "checkins" | "invitees" | "access" | "sessions";
  setActiveTab: (tab: "checkins" | "invitees" | "access" | "sessions") => void;
  tableSearch: string;
  setTableSearch: (val: string) => void;
  onDownloadCSV: () => void;
  // Real check-in props
  checkInLogs?: CheckInRecord[];
  loadingCheckIns?: boolean;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (newPage: number) => void;
  methodFilter?: string;
  onMethodFilterChange?: (method: string) => void;
  // Legacy reports props
  inviteeLogs?: InviteeLog[];
  accessLogs?: AccessLog[];
  sessionsReport?: SessionReport[];
  sessionColumns?: ReportSessionColumn[];
  loadingDetails?: boolean;
  /** how many Action Log entries exist for the event (the table holds the newest ones loaded so far) */
  accessTotal?: number;
  loadingMoreAccess?: boolean;
  onLoadMoreAccess?: () => void;
}

export default function ReportsLogsTable({
  activeTab,
  setActiveTab,
  tableSearch,
  setTableSearch,
  onDownloadCSV,
  checkInLogs = [],
  loadingCheckIns = false,
  page = 1,
  limit = 20,
  total = 0,
  totalPages = 1,
  onPageChange,
  methodFilter = "",
  onMethodFilterChange,
  inviteeLogs = [],
  accessLogs = [],
  sessionsReport = [],
  sessionColumns = [],
  loadingDetails = false,
  accessTotal,
  loadingMoreAccess = false,
  onLoadMoreAccess,
}: ReportsLogsTableProps) {
  const statusRow = (colSpan: number, text: string) =>
    /^Loading/.test(text) ? (
      <TableSkeletonRows rows={4} cols={colSpan} />
    ) : (
      <tr>
        <td colSpan={colSpan} className="py-10 text-center text-gray-500 font-medium">
          {text}
        </td>
      </tr>
    );

  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-2xs overflow-hidden">
      {/* Tabs Header */}
      <div className="border-b border-gray-200 px-4 sm:px-6 pt-4 text-xs">
        <div className="flex items-center justify-between gap-3 mb-0">
        <div className="flex items-center gap-5 sm:gap-8 overflow-x-auto flex-1 min-w-0 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("checkins")}
            className={`pb-3 font-semibold transition-colors cursor-pointer relative whitespace-nowrap shrink-0 ${
              activeTab === "checkins"
                ? "text-gray-900 border-b-2 border-[#FF5B22]"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Check-In Logs
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("invitees")}
            className={`pb-3 font-semibold transition-colors cursor-pointer relative whitespace-nowrap shrink-0 ${
              activeTab === "invitees"
                ? "text-gray-900 border-b-2 border-[#FF5B22]"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Invitee List
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("access")}
            className={`pb-3 font-semibold transition-colors cursor-pointer relative whitespace-nowrap shrink-0 ${
              activeTab === "access"
                ? "text-gray-900 border-b-2 border-[#FF5B22]"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Action Log
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={`pb-3 font-semibold transition-colors cursor-pointer relative whitespace-nowrap shrink-0 ${
              activeTab === "sessions"
                ? "text-gray-900 border-b-2 border-[#FF5B22]"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Sessions
          </button>
        </div>

        </div>
      </div>

      {/* Table Filters & Actions Bar */}
      <div className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <label className="bg-[#FAFAFA] border border-[#E0E0E0] rounded-md h-[47px] px-4 flex flex-1 items-center gap-2.5 focus-within:border-[#FF651D] transition-colors">
              <span className="size-[22px] flex items-center justify-center shrink-0 text-[#6B6B6B]">
                <Icon name="reports/search" width={18.4} height={18.4} />
              </span>
              <input
                type="text"
                placeholder="Search..."
                aria-label="Search logs"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-xs font-medium text-[#15191C] placeholder-[#828282] focus:outline-none"
              />
            </label>

            {activeTab === "checkins" && onMethodFilterChange && (
              <div className="w-40 shrink-0">
                <CustomDropdown
                  value={methodFilter ?? ""}
                  onChange={onMethodFilterChange}
                  options={[
                    { value: "", label: "All Methods" },
                    { value: "QR", label: "QR Code" },
                    { value: "MANUAL", label: "Manual" },
                  ]}
                  ariaLabel="Filter by check-in method"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onDownloadCSV}
            className="h-[47px] px-3 inline-flex items-center gap-2.5 text-xs font-medium text-black cursor-pointer shrink-0 rounded-md hover:bg-[#FFF3EC] transition-colors"
          >
            <Icon name="reports/download" width={15.83} height={19.22} />
            <span>Download List</span>
          </button>
        </div>

        {/* Table Render */}
        {/* long tables scroll inside the card (header stays in view), wide ones scroll sideways */}
        <div className="overflow-auto max-h-[min(65vh,620px)]" tabIndex={0} role="region" aria-label="Scrollable table">
          {/* REAL CHECK-IN LOGS TAB */}
          {activeTab === "checkins" && (
            <div>
              {loadingCheckIns ? (
                <TableSkeleton rows={5} cols={6} label="Loading check-in records" />
              ) : checkInLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  No check-in records found for this event/session filter.
                </div>
              ) : (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="sticky top-0 z-[1] bg-white shadow-[0_1px_0_0_#E5E7EB]">
                    <tr className="border-b border-gray-200 text-gray-500 font-medium text-[11px]">
                      <th className="py-3 px-4 font-medium">Invitee</th>
                      <th className="py-3 px-4 font-medium">Session</th>
                      <th className="py-3 px-4 font-medium">Method</th>
                      <th className="py-3 px-4 font-medium">Check-In Time</th>
                      <th className="py-3 px-4 font-medium">Checked In By</th>
                      <th className="py-3 px-4 font-medium">RSVP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-800">
                    {checkInLogs.map((log) => {
                      const inviteeObj = typeof log.invitee === "object" ? log.invitee : null;
                      const sessionObj = typeof log.session === "object" ? log.session : null;
                      const checkedInByObj = typeof log.checkedInBy === "object" ? log.checkedInBy : null;

                      const inviteeName = inviteeObj?.name || "Attendee";
                      const inviteeContact = inviteeObj?.email || inviteeObj?.mobile || "";
                      const sessionName = sessionObj?.name || "Event entry";

                      const method = log.checkInMethod || "QR";
                      const checkInTime = formatDateTime(log.checkInAt, "—");
                      const staffName = checkedInByObj?.fullName || checkedInByObj?.email || String(log.checkedInBy || "Staff");
                      const rsvp = inviteeObj?.rsvpStatus || "—";

                      return (
                        <tr key={log._id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-4 px-4 font-semibold text-gray-900">
                            <div>{inviteeName}</div>
                            {inviteeContact && (
                              <div className="text-[11px] text-gray-500 font-normal">{inviteeContact}</div>
                            )}
                          </td>
                          <td className="py-4 px-4 font-medium text-gray-700">{sessionName}</td>
                          <td className="py-4 px-4">
                            {method === "QR" ? (
                              <span className="bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                                QR SCAN
                              </span>
                            ) : (
                              <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                                MANUAL
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-gray-600 font-medium">{checkInTime}</td>
                          <td className="py-4 px-4 text-gray-700 font-medium">{staffName}</td>
                          <td className="py-4 px-4">
                            <span className="bg-emerald-100/70 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              {rsvp}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* REAL BACKEND PAGINATION CONTROLS */}
              {totalPages > 1 && onPageChange && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                  <div>
                    Showing page <span className="font-bold text-gray-900">{page}</span> of{" "}
                    <span className="font-bold text-gray-900">{totalPages}</span> ({total} total records)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => onPageChange(page - 1)}
                      className="px-3 py-1 bg-white border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => onPageChange(page + 1)}
                      className="px-3 py-1 bg-white border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INVITEE LOGS TAB */}
          {activeTab === "invitees" && (
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-[1] bg-white shadow-[0_1px_0_0_#E5E7EB]">
                <tr className="border-b border-gray-200 text-gray-500 font-medium text-[11px]">
                  <th className="py-3 px-4 font-medium">Invitee Name</th>
                  <th className="py-3 px-4 font-medium">Mobile No.</th>
                  <th className="py-3 px-4 font-medium">Invitation Status</th>
                  <th className="py-3 px-4 font-medium">RSVP Status</th>
                  <th className="py-3 px-4 font-medium">Check-in Status</th>
                  <th className="py-3 px-4 font-medium">Last Check-in Time</th>
                  {sessionColumns.map((col) => (
                    <th key={col.id} className="py-3 px-4 font-medium text-center max-w-[140px] truncate" title={col.name}>
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-800">
                {loadingDetails && statusRow(6 + sessionColumns.length, "Loading invitees...")}
                {!loadingDetails && inviteeLogs.length === 0 && statusRow(6 + sessionColumns.length, "No invitees found for this event.")}
                {!loadingDetails && inviteeLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-4 font-semibold text-gray-900 max-w-[220px] truncate" title={log.name}>{log.name}</td>
                    <td className="py-4 px-4 text-gray-600">{log.mobile}</td>
                    <td className="py-4 px-4">
                      {log.invitationStatus === "Sent" && (
                        <span className="bg-emerald-100/70 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-semibold inline-block">
                          Successfully Sent
                        </span>
                      )}
                      {log.invitationStatus === "Failed" && (
                        <span className="bg-orange-100/70 text-orange-700 px-3 py-1 rounded-full text-[11px] font-semibold inline-block">
                          Sending failed
                        </span>
                      )}
                      {log.invitationStatus === "Pending" && (
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[11px] font-semibold inline-block">
                          Not sent yet
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {log.rsvpStatus === "Accepted" && (
                        <span className="bg-blue-100/70 text-blue-700 px-3 py-1 rounded-full text-[11px] font-semibold inline-block">
                          Accepted
                        </span>
                      )}
                      {log.rsvpStatus === "Pending" && (
                        <span className="bg-amber-100/70 text-amber-700 px-3 py-1 rounded-full text-[11px] font-semibold inline-block">
                          Pending
                        </span>
                      )}
                      {log.rsvpStatus === "Declined" && (
                        <span className="bg-red-100/70 text-red-700 px-3 py-1 rounded-full text-[11px] font-semibold inline-block">
                          Declined
                        </span>
                      )}
                      {log.rsvpStatus === "Not requested" && <span className="text-[#6B6B6B]" aria-label="RSVP not requested">--</span>}
                    </td>
                    <td className="py-4 px-4">
                      {log.checkInStatus === "Checked-in" && (
                        <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[11px] font-semibold inline-block">
                          Checked-in
                        </span>
                      )}
                      {log.checkInStatus === "Not Checked-in" && (
                        <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-[11px] font-semibold inline-block">
                          Not Checked-in
                        </span>
                      )}
                      {log.checkInStatus === "Partially Checked-in" && (
                        <span className="border border-emerald-500 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-semibold inline-block bg-emerald-50/30">
                          Partially Checked-in
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-600">{log.lastCheckInTime}</td>
                    {sessionColumns.map((col) => (
                      <td key={col.id} className="py-4 px-4 text-center">
                        {log.sessionCheckIns[col.id] ? (
                          <svg className="w-4 h-4 text-emerald-700 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-orange-500 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ACCESS LOGS TAB */}
          {activeTab === "access" && (
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="sticky top-0 z-[1] bg-white shadow-[0_1px_0_0_#E5E7EB]">
                <tr className="border-b border-gray-200 text-gray-500 font-medium text-[11px]">
                  <th className="py-3 px-4 font-medium">Organizer ID</th>
                  <th className="py-3 px-4 font-medium">Organizer / Organisation</th>
                  <th className="py-3 px-4 font-medium">User Type</th>
                  <th className="py-3 px-4 font-medium">Date & Time</th>
                  <th className="py-3 px-4 font-medium">Action</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-800">
                {loadingDetails && statusRow(6, "Loading activity...")}
                {!loadingDetails && accessLogs.length === 0 && statusRow(6, "No recorded activity for this event yet.")}
                {!loadingDetails && accessLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-4 text-gray-600">{log.organizerCode}</td>
                    <td className="py-4 px-4 text-gray-700 max-w-[200px] truncate" title={log.organizerName}>{log.organizerName}</td>
                    <td className="py-4 px-4 font-semibold text-gray-900">{log.userType}</td>
                    <td className="py-4 px-4 text-gray-600">{log.dateTime}</td>
                    <td className="py-4 px-4 text-gray-700 font-medium max-w-[280px] truncate" title={log.action}>{log.action}</td>
                    <td className="py-4 px-4">
                      {log.status === "Successful" ? (
                        <span className="bg-emerald-100/70 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-semibold inline-block">
                          Successful
                        </span>
                      ) : (
                        <span className="bg-orange-100/70 text-orange-700 px-3 py-1 rounded-full text-[11px] font-semibold inline-block">
                          failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* SESSIONS TAB */}
          {activeTab === "sessions" && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-900">Sessions</h4>
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="sticky top-0 z-[1] bg-white shadow-[0_1px_0_0_#E5E7EB]">
                  <tr className="border-b border-gray-200 text-gray-500 font-medium text-[11px]">
                    <th className="py-3 px-4 font-medium w-12">#</th>
                    <th className="py-3 px-4 font-medium">Session Name</th>
                    <th className="py-3 px-4 font-medium">Date & Time</th>
                    <th className="py-3 px-4 font-medium">Invitees</th>
                    <th className="py-3 px-4 font-medium">Attendees</th>
                    <th className="py-3 px-4 font-medium">Access Control</th>
                    <th className="py-3 px-4 font-medium">System Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800">
                  {loadingDetails && statusRow(7, "Loading sessions...")}
                  {!loadingDetails && sessionsReport.length === 0 && statusRow(7, "No sessions for this event.")}
                  {!loadingDetails && sessionsReport.map((sess) => (
                    <tr key={sess.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-4 font-semibold text-gray-600">{sess.id}</td>
                      <td className="py-4 px-4 font-semibold text-gray-900 max-w-[220px] truncate" title={sess.name}>{sess.name}</td>
                      <td className="py-4 px-4 text-gray-600">{sess.dateTime}</td>
                      <td className="py-4 px-4 font-medium text-gray-900">{sess.invitees}</td>
                      <td className="py-4 px-4 font-medium text-gray-900">{sess.attendees}</td>
                      <td className="py-4 px-4 text-gray-700 font-medium">{sess.accessControl}</td>
                      <td className="py-4 px-4 font-medium text-gray-900">{sess.systemUsers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* the Action Log holds the newest entries first; older ones are fetched on request */}
        {activeTab === "access" && accessTotal !== undefined && !loadingDetails && accessLogs.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-xs text-gray-600">
            <span>{accessLogs.length < accessTotal ? `Showing the newest ${accessLogs.length} of ${accessTotal} entries` : `Showing all ${accessTotal} ${accessTotal === 1 ? "entry" : "entries"}`}</span>
            {onLoadMoreAccess && accessLogs.length < accessTotal && (
              <button type="button" onClick={onLoadMoreAccess} disabled={loadingMoreAccess} className="rounded-md border border-[#E0E0E0] px-3.5 py-1.5 font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50 cursor-pointer">
                {loadingMoreAccess ? "Loading…" : "Load older entries"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
