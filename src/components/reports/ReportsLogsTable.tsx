"use client";

import React from "react";
import { InviteeLog, AccessLog, SessionReport, ReportSessionColumn } from "@/types/reports";
import { CheckInRecord } from "@/services/checkInService";
import CustomDropdown from "@/components/common/CustomDropdown";

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
  onOpenCheckInModal?: () => void;
  // Legacy reports props
  inviteeLogs?: InviteeLog[];
  accessLogs?: AccessLog[];
  sessionsReport?: SessionReport[];
  sessionColumns?: ReportSessionColumn[];
  loadingDetails?: boolean;
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
  onOpenCheckInModal,
  inviteeLogs = [],
  accessLogs = [],
  sessionsReport = [],
  sessionColumns = [],
  loadingDetails = false,
}: ReportsLogsTableProps) {
  const statusRow = (colSpan: number, text: string) => (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-gray-400 font-medium">
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
            Access Logs
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

        {/* Check-In Action Button */}
        {onOpenCheckInModal && (
          <button
            type="button"
            onClick={onOpenCheckInModal}
            className="mb-2 px-3 py-1.5 bg-[#FF5B22] hover:bg-[#E04B16] text-white font-bold text-xs rounded-md shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Perform Check-In</span>
          </button>
        )}
        </div>
      </div>

      {/* Table Filters & Actions Bar */}
      <div className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <div className="relative flex-1">
              <svg
                className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search logs..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
              />
            </div>

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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF5B22] hover:text-[#E04B16] cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4 text-[#FF5B22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download CSV</span>
          </button>
        </div>

        {/* Table Render */}
        <div className="overflow-x-auto">
          {/* REAL CHECK-IN LOGS TAB */}
          {activeTab === "checkins" && (
            <div>
              {loadingCheckIns ? (
                <div className="py-12 text-center text-xs text-gray-500 flex justify-center items-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#FF5B22] border-t-transparent rounded-full animate-spin" />
                  <span>Loading real check-in records...</span>
                </div>
              ) : checkInLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  No check-in records found for this event/session filter.
                </div>
              ) : (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
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
                      const checkInTime = log.checkInAt ? new Date(log.checkInAt).toLocaleString() : "—";
                      const staffName = checkedInByObj?.fullName || checkedInByObj?.email || String(log.checkedInBy || "Staff");
                      const rsvp = inviteeObj?.rsvpStatus || "—";

                      return (
                        <tr key={log._id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-4 px-4 font-semibold text-gray-900">
                            <div>{inviteeName}</div>
                            {inviteeContact && (
                              <div className="text-[11px] text-gray-400 font-normal">{inviteeContact}</div>
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
              <thead>
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
                        <span className="border border-emerald-500 text-emerald-600 px-3 py-1 rounded-full text-[11px] font-semibold inline-block bg-emerald-50/30">
                          Partially Checked-in
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-600">{log.lastCheckInTime}</td>
                    {sessionColumns.map((col) => (
                      <td key={col.id} className="py-4 px-4 text-center">
                        {log.sessionCheckIns[col.id] ? (
                          <svg className="w-4 h-4 text-emerald-600 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-medium text-[11px]">
                  <th className="py-3 px-4 font-medium">User Type</th>
                  <th className="py-3 px-4 font-medium">Date & Time</th>
                  <th className="py-3 px-4 font-medium">Action</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-800">
                {loadingDetails && statusRow(4, "Loading activity...")}
                {!loadingDetails && accessLogs.length === 0 && statusRow(4, "No recorded activity for this event yet.")}
                {!loadingDetails && accessLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
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
                <thead>
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
      </div>
    </div>
  );
}
