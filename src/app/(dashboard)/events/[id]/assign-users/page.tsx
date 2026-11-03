"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { sessionService } from "@/services/sessionService";
import { userService } from "@/services/userService";
import { assignmentService, AssignmentData } from "@/services/assignmentService";
import { eventService } from "@/services/eventService";
import EventSubNav, { notifyDbUpdate } from "@/components/EventSubNav";
import SessionScopePicker from "@/components/common/SessionScopePicker";
import PageHeader from "@/components/common/PageHeader";
import { getAssignedCountText, SystemUserRow, filterSystemUsers, USERS_ON_EVENT, ALL_SYSTEM_USERS } from "@/utils/systemUserRows";
import { useAlert } from "@/context/AlertContext";
import { TableSkeleton } from "@/components/common/Skeleton";
import CustomDropdown from "@/components/common/CustomDropdown";
import RowMenu, { EditIcon, TrashIcon } from "@/components/common/RowMenu";
import Icon from "@/components/icons/Icon";
import Pagination from "@/components/common/Pagination";
import { paginate } from "@/utils/pagination.mjs";
import { formatDateTime } from "@/utils/dateTime";

export default function EventAssignUsersPage() {
  const { confirm } = useAlert();
  const params = useParams();
  const eventId = (params?.id as string);
  const { user } = useAuth();

  const [users, setUsers] = useState<SystemUserRow[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [expandedUserIds, setExpandedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // Which staff to list: everyone on this event, the staff of one session, or every system user
  const [userFilter, setUserFilter] = useState<string>(USERS_ON_EVENT);
  const showAllSystemUsers = userFilter === ALL_SYSTEM_USERS;
  const [page, setPage] = useState(1);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  // Ticks that were there before a row's own "⋯ > Change sessions" borrowed the selection; put back if that is cancelled
  const [selectionBeforeRowAction, setSelectionBeforeRowAction] = useState<string[] | null>(null);
  const [isAssignSuccessModalOpen, setIsAssignSuccessModalOpen] = useState(false);
  // null = all sessions of this event
  const [sessionScope, setSessionScope] = useState<string[] | null>(null);
  // staff who are already on another of this organizer's events running at the same time, by user id
  const [overlaps, setOverlaps] = useState<Record<string, { eventId: string; title: string; start: string; end: string }[]>>({});
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const fetchAssignmentsAndSessions = async () => {
    try {
      setIsLoading(true);
      setErrorFeedback(null);

      // These resources are independent; load them together instead of serializing four network round trips.
      const [sessionsRes, eventRes, usersRes, assignRes, overlapRes] = await Promise.all([
        sessionService.getSessions(eventId),
        eventService.getEvent(eventId),
        userService.getUsers("SYSTEM_USER"),
        assignmentService.getAssignmentsByEvent(eventId),
        assignmentService.getOverlaps(eventId).catch(() => null),
      ]);
      const overlapMap: typeof overlaps = {};
      (overlapRes && overlapRes.success && Array.isArray(overlapRes.data) ? overlapRes.data : []).forEach((o) => { (overlapMap[o.userId] ||= []).push(o); });
      setOverlaps(overlapMap);
      const sessionList = Array.isArray(sessionsRes?.data) ? sessionsRes.data : [];
      setSessions(sessionList);
      if (eventRes.success && eventRes.data) setEventTitle(eventRes.data.title || "");

      // System users only (role === SYSTEM_USER)
      if (!usersRes.success) throw new Error(usersRes.message || "Failed to load system users.");
      const rawUsers = Array.isArray(usersRes?.data) ? usersRes.data : [];
      const systemUsersOnly = rawUsers.filter(u => u.role === "SYSTEM_USER");

      // Assignments for this event
      if (!assignRes.success) throw new Error(assignRes.message || "Failed to load assignments.");
      const assignmentsList: AssignmentData[] = Array.isArray(assignRes?.data) ? assignRes.data : [];

      const userAssignmentsMap: Record<string, SystemUserRow["assignments"]> = {};

      assignmentsList.forEach((asn) => {
        const userId = typeof asn.userId === "object" ? asn.userId?._id : asn.userId;
        if (!userId) return;

        if (!userAssignmentsMap[userId]) {
          userAssignmentsMap[userId] = [];
        }

        const sessItems = (asn.sessionIds || []).map((s: any) => ({
          id: typeof s === "object" ? s._id : s,
          name: typeof s === "object" ? (s.name || "Session") : "Session",
          time: typeof s === "object" && s.schedule?.startTime ? `${s.schedule.startTime}` : undefined,
        }));

        const eventObj = typeof asn.eventId === "object" ? asn.eventId : null;
        const eventTitle = eventObj?.title || "Event";

        const assignedByObj = typeof asn.assignedBy === "object" ? asn.assignedBy : null;
        const assignedByName = assignedByObj?.fullName || assignedByObj?.email || "Organizer";

        userAssignmentsMap[userId].push({
          assignmentId: asn._id,
          eventId: eventId,
          eventName: eventTitle,
          assignedBy: assignedByName,
          assignedAt: asn.createdAt ? new Date(asn.createdAt).toLocaleDateString() : undefined,
          sessions: sessItems,
        });
      });

      const formattedUserRows: SystemUserRow[] = systemUsersOnly.map((u: any) => ({
        id: u._id || u.id,
        name: u.fullName || u.name || "System User",
        email: u.email || "",
        phone: u.phone || u.contactNo || "--",
        role: u.role,
        assignments: userAssignmentsMap[u._id || u.id] || [],
      }));

      setUsers(formattedUserRows);
    } catch (err: any) {
      console.error("Error fetching event system user assignments:", err);
      setErrorFeedback(err.message || "Failed to load system user assignments.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchAssignmentsAndSessions();
    }
  }, [eventId]);

  // Someone already on this event is not assigned a second time: choosing them again changes which sessions they cover
  const selectedRows = users.filter((u) => selectedUserIds.includes(u.id));
  const alreadyOnEvent = selectedRows.filter((u) => u.assignments.some((a) => a.eventId === eventId)).length;
  const allAlreadyOnEvent = selectedRows.length > 0 && alreadyOnEvent === selectedRows.length;

  // Opening the popup starts from the selected user's current sessions (or "All sessions")
  const openAssignModal = () => {
    setErrorFeedback(null);
    const only = selectedUserIds.length === 1 ? users.find((u) => u.id === selectedUserIds[0]) : undefined;
    const current = only?.assignments.find((a) => a.eventId === eventId);
    setSessionScope(current && current.sessions.length > 0 ? current.sessions.map((s) => s.id) : null);
    setSelectionBeforeRowAction(null); // the bottom button works on the ticks as they are
    setIsAssignModalOpen(true);
  };

  const toggleExpand = (id: string) => {
    if (expandedUserIds.includes(id)) {
      setExpandedUserIds(expandedUserIds.filter((i) => i !== id));
    } else {
      setExpandedUserIds([...expandedUserIds, id]);
    }
  };

  const toggleSelectUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter((i) => i !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
    }
  };

  // The row's "⋯" menu works on that one person: change (or give) their sessions, or take them off this event
  const closeAssignModal = () => {
    setIsAssignModalOpen(false);
    if (selectionBeforeRowAction) setSelectedUserIds(selectionBeforeRowAction);
    setSelectionBeforeRowAction(null);
  };

  const openAssignFor = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    const current = user?.assignments.find((a) => a.eventId === eventId);
    setErrorFeedback(null);
    setSelectionBeforeRowAction(selectedUserIds);
    setSelectedUserIds([userId]);
    setSessionScope(current && current.sessions.length > 0 ? current.sessions.map((s) => s.id) : null);
    setIsAssignModalOpen(true);
  };

  // Handle unassigning via DELETE /api/v1/assignments/:assignmentId
  const handleUnassignAssignment = async (assignmentId: string) => {
    if (!(await confirm({ title: "Remove assignment?", message: "This system user will no longer be assigned to this event.", confirmText: "Remove", tone: "danger" }))) return;

    try {
      setErrorFeedback(null);
      const res = await assignmentService.deleteAssignment(assignmentId);
      if (res.success || (res as any).data?.deleted) {
        await fetchAssignmentsAndSessions();
        notifyDbUpdate();
      } else {
        setErrorFeedback(res.message || "Failed to unassign system user.");
      }
    } catch (err: any) {
      setErrorFeedback(err.message || "Error unassigning system user.");
    }
  };

  // Handle assign submission via POST /api/v1/events/:eventId/assignments
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) {
      setErrorFeedback("Please select at least one system user.");
      return;
    }
    if (sessionScope !== null && sessionScope.length === 0) {
      setErrorFeedback("Select at least one session, or choose \"All sessions\".");
      return;
    }

    // Putting someone on two events that run at the same time is allowed, but never by accident
    const clashes = selectedUserIds.flatMap((id) => (overlaps[id] || []).map((o) => `${users.find((x) => x.id === id)?.name || "A user"}: "${o.title}" (${formatDateTime(o.start)} – ${formatDateTime(o.end)})`));
    if (clashes.length > 0 && !(await confirm({ title: "Overlapping events", message: `Already assigned to another event at the same time:\n${clashes.join("\n")}\n\nAssign anyway?`, confirmText: "Assign anyway" }))) return;

    try {
      setSubmittingAssign(true);
      setErrorFeedback(null);

      const errors: string[] = [];

      for (const targetUserId of selectedUserIds) {
        const existing = users
          .find((u) => u.id === targetUserId)
          ?.assignments.find((a) => a.eventId === eventId);
        const res = await assignmentService.saveAssignment(eventId, targetUserId, sessionScope ?? [], existing?.assignmentId);

        if (!res.success) {
          errors.push(res.message || "Assignment failed.");
        }
      }

      if (errors.length > 0) {
        setErrorFeedback(errors.join(". "));
      }

      // Only confirm success when at least one assignment was actually saved
      setIsAssignModalOpen(false);
      setSelectionBeforeRowAction(null);
      // Never carry a previous selection or session scope into the next assignment
      setSelectedUserIds([]);
      setSessionScope(null);
      if (errors.length < selectedUserIds.length) {
        setIsAssignSuccessModalOpen(true);
      }
      await fetchAssignmentsAndSessions();
      notifyDbUpdate();
    } catch (err: any) {
      setErrorFeedback(err.message || "Error saving assignment.");
    } finally {
      setSubmittingAssign(false);
    }
  };

  const eventUsers = filterSystemUsers(users, eventId, userFilter);
  const filteredUsers = eventUsers.filter((u) => {
    return (
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery)
    );
  });

  const isAllSelected = selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0;
  // 10 people per page (the old bottom-left "1" was a fixed, inert button)
  const { current: currentPage, totalPages, rows: pageUsers } = paginate(filteredUsers, page, 10);
  // Figma 217:19768 shows only the empty state (no select-all row or table headers) when nobody is assigned yet
  const showEmptyAssigned = !isLoading && users.length > 0 && filteredUsers.length === 0 && userFilter === USERS_ON_EVENT && !searchQuery.trim();

  return (
    <div className="w-full min-h-full bg-white text-gray-900 font-sans select-none">
      <PageHeader title={user?.role === "ORGANIZER" ? "Event Management" : "Event"} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />

      {/* Page Content */}
      <div className="px-4 sm:px-6 pt-[30px] pb-24 w-full space-y-6 relative bg-white">
        {/* Sub-Navigation Tabs Bar */}
        <EventSubNav
          eventId={eventId}
          activeTab="assign-users"
          // Users assigned to this event (not to any event), once the list has loaded
          assignmentsCount={isLoading ? undefined : users.filter((u) => u.assignments.some((a) => a.eventId === eventId)).length}
          sessionsCount={isLoading ? undefined : sessions.length}
        />

        {/* Error Notification Banner */}
        {errorFeedback && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <span>{errorFeedback}</span>
            <button
              onClick={() => setErrorFeedback(null)}
              className="font-bold text-rose-600 hover:text-rose-800 ml-4 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Controls (Figma 217:19779): "System Users" + search, assigned/all filter, Add User. Assigning starts from
            the selected rows (bottom "Assign N users"), so the separate top "Assign Users" button is gone (organiser feedback). */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="flex flex-1 items-center gap-2.5 min-w-0">
            <label htmlFor="system-user-search" className="text-[17px] font-medium text-black shrink-0">System Users</label>
            <div className="relative flex-1 min-w-0">
              <Icon name="events/search" width={18} height={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60" />
              <input
                id="system-user-search"
                type="search"
                placeholder="Search system user"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full h-[47px] pl-12 pr-4 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs font-medium text-gray-900 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D]"
              />
            </div>
          </div>
          <div className="flex items-center shrink-0 w-fit">
            <CustomDropdown
              variant="plain"
              ariaLabel="Which system users to show"
              value={userFilter}
              onChange={(v) => { setUserFilter(v); setSelectedUserIds([]); setPage(1); }}
              options={[
                { value: USERS_ON_EVENT, label: "All sessions" },
                ...sessions.map((sess, idx) => ({ value: String(sess._id || sess.id), label: sess.name || `Session ${idx + 1}` })),
                { value: ALL_SYSTEM_USERS, label: "All system users" },
              ]}
            />
            <Link href={`/user-management/add?new=1&event=${eventId}`} className="inline-flex items-center gap-2 px-6 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg">
              <Icon name="events/add-white" width={24} height={24} />
              Add User
            </Link>
          </div>
        </div>

        {/* Select All Row */}
        <div className={`${showEmptyAssigned ? "hidden" : "flex"} items-center gap-2.5 text-sm text-[#4B4F52] font-medium pt-2 pb-2`}>
          <input
            type="checkbox"
            id="selectAll"
            checked={isAllSelected}
            onChange={handleSelectAll}
            className="rounded border-gray-300 text-[#FF5B22] focus:ring-[#FF5B22] cursor-pointer"
          />
          <label htmlFor="selectAll" className="cursor-pointer">
            Select All ({selectedUserIds.length} selected)
          </label>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={showEmptyAssigned ? "hidden" : undefined}>
              <tr className="border-b border-[#D3D3D3] text-[#828282] font-medium text-sm">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4 font-medium">User Name</th>
                <th className="py-3 px-4 font-medium">Assigned Event Sessions</th>
                <th className="py-3 px-4 font-medium">Email</th>
                <th className="py-3 px-4 font-medium">Phone Number</th>
                <th className="py-3 px-4 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-0"><TableSkeleton rows={5} cols={5} label="Loading system users" /></td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 text-sm">
                    {users.length === 0 ? (
                      <span>No SYSTEM_USER accounts found. <Link href={`/user-management/add?new=1&event=${eventId}`} className="font-semibold text-[#E5520F] underline">Add User</Link>.</span>
                    ) : userFilter !== USERS_ON_EVENT && userFilter !== ALL_SYSTEM_USERS && !searchQuery.trim() ? (
                      <span>No system users are assigned to this session yet. <button type="button" onClick={() => setUserFilter(ALL_SYSTEM_USERS)} className="font-semibold text-[#E5520F] underline cursor-pointer">Show all system users</button> to assign someone.</span>
                    ) : userFilter === USERS_ON_EVENT && !searchQuery.trim() ? (
                      // Figma 217:19798 empty state; "Assign User" lists every system user to pick from
                      <div className="flex flex-col items-center gap-[26px] py-16 max-w-[344px] mx-auto whitespace-normal">
                        <Icon name="events/users-empty" width={80} height={67} />
                        <p className="text-lg font-medium text-black/50">No system users assigned yet. Assign system users to your event now.</p>
                        <button type="button" onClick={() => setUserFilter(ALL_SYSTEM_USERS)} className="px-6 py-[11px] bg-[#F3F3F3] hover:bg-[#EAEAEA] rounded-lg text-base font-semibold text-[#FF651D] cursor-pointer">
                          Assign User
                        </button>
                      </div>
                    ) : (
                      "No system users match your search."
                    )}
                  </td>
                </tr>
              ) : (
                pageUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  const isExpanded = expandedUserIds.includes(u.id);
                  const countText = getAssignedCountText(u.assignments);

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors align-top">
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectUser(u.id)}
                          className="rounded border-gray-300 text-[#FF5B22] focus:ring-[#FF5B22] cursor-pointer mt-0.5"
                        />
                      </td>

                      <td className="py-4 px-4 font-medium text-gray-900">
                        <div>{u.name}</div>
                        <span className="text-[10px] font-mono text-[#FF5B22] bg-[#FF5B22]/10 px-1.5 py-0.5 rounded">
                          SYSTEM_USER
                        </span>
                        {(overlaps[u.id] || []).map((o) => (
                          <p key={o.eventId} className="mt-1.5 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 max-w-[260px] break-words">
                            Already on &quot;{o.title}&quot; at the same time ({formatDateTime(o.start)} – {formatDateTime(o.end)})
                          </p>
                        ))}
                      </td>

                      {/* Assigned Sessions */}
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => toggleExpand(u.id)}
                          className="flex items-center gap-2 font-bold text-gray-800 hover:text-[#FF5B22] transition-colors cursor-pointer"
                        >
                          <svg
                            className={`w-3.5 h-3.5 text-gray-700 transform transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          <span>{countText}</span>
                        </button>

                        {/* Expanded Cards View */}
                        {isExpanded && u.assignments && u.assignments.length > 0 && (
                          <div className="mt-3 space-y-3 max-w-sm text-left">
                            {u.assignments.map((asn) => (
                              <div
                                key={asn.assignmentId}
                                className="bg-white border border-gray-200 rounded-md p-3 shadow-2xs space-y-2 whitespace-normal"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-sm font-medium text-[#15191C]">
                                    {asn.eventName}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleUnassignAssignment(asn.assignmentId)}
                                    className="text-rose-600 underline text-xs font-semibold hover:text-rose-800 cursor-pointer"
                                  >
                                    Unassign
                                  </button>
                                </div>

                                {asn.assignedBy && (
                                  <div className="text-[10px] text-gray-500">
                                    Assigned by: <span className="font-medium text-gray-700">{asn.assignedBy}</span>
                                    {asn.assignedAt ? ` on ${asn.assignedAt}` : ""}
                                  </div>
                                )}

                                <div className="space-y-1.5 pt-1">
                                  {asn.sessions.length === 0 && (
                                    <div className="inline-flex items-center bg-[#FF5B22] text-white px-2.5 py-1 rounded-md text-[10px] font-bold">• All sessions</div>
                                  )}
                                  {asn.sessions.map((sess) => (
                                    <div key={sess.id} className="flex items-center gap-2 flex-wrap">
                                      <div className="inline-flex items-center bg-[#FF5B22] text-white px-2.5 py-1 rounded-md text-[10px] font-bold tracking-tight uppercase">
                                        • {sess.name} {sess.time ? `| ${sess.time}` : ""}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-gray-600">{u.email}</td>
                      <td className="py-4 px-4 text-gray-600">{u.phone}</td>

                      <td className="py-4 px-4 text-right">
                        {(() => {
                          const onThisEvent = u.assignments.find((a) => a.eventId === eventId);
                          return (
                            <RowMenu
                              label={`Actions for ${u.name}`}
                              items={[
                                { label: onThisEvent ? "Change sessions" : "Assign to this event", icon: EditIcon, onClick: () => openAssignFor(u.id) },
                                ...(onThisEvent ? [{ label: "Remove from this event", icon: TrashIcon, onClick: () => handleUnassignAssignment(onThisEvent.assignmentId) }] : []),
                              ]}
                            />
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Control Bar */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 text-xs">
            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} label="System user pages" />
          </div>

          {/* Nothing ticked, nothing to act on: the button appears once someone is selected */}
          {selectedUserIds.length > 0 && (
            <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={openAssignModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#FF5B22] text-[#FF5B22] hover:bg-[#FF5B22] hover:text-white font-bold text-xs rounded-md transition-colors cursor-pointer"
              >
                <span>{allAlreadyOnEvent ? `Change sessions for ${selectedUserIds.length} ${selectedUserIds.length === 1 ? "user" : "users"}` : `Assign ${selectedUserIds.length} ${selectedUserIds.length === 1 ? "user" : "users"}`}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Assign Sessions Modal ── */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-overlay">
          <div className="bg-white rounded-lg shadow-2xl max-w-[486px] w-full overflow-hidden animate-modal">
            <div className="px-6 py-5 border-b border-[#E0E0E0] flex items-center justify-between">
              <h3 className="text-base font-medium text-[#15191C]">{allAlreadyOnEvent ? "Change Sessions for Selected System Users" : "Assign Sessions to Selected System Users"}</h3>
              <button
                type="button"
                onClick={closeAssignModal}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="px-6 pt-5 space-y-5">
              {alreadyOnEvent > 0 && (
                <p className="p-3 rounded-md bg-[#FFF3EC] border border-[#FFE3D7] text-xs text-[#4B4F52]">
                  {allAlreadyOnEvent
                    ? `${selectedRows.length === 1 ? "This user is" : "These users are"} already assigned to this event, so nothing is added twice. Pick the sessions ${selectedRows.length === 1 ? "they" : "they each"} should cover; this replaces the current choice.`
                    : `${alreadyOnEvent} of the ${selectedRows.length} selected ${alreadyOnEvent === 1 ? "is" : "are"} already assigned to this event. Their sessions are replaced by what you pick here; the others are newly assigned.`}
                </p>
              )}
              <div>
                <label htmlFor="assign-event" className="block text-xs font-medium text-[#15191C] mb-1.5">Event</label>
                <select id="assign-event" disabled aria-readonly value={eventId} className="w-full h-[46px] px-3.5 bg-[#F4F4F4] border border-[#E0E0E0] rounded-md text-sm text-[#4B4F52] cursor-not-allowed appearance-none">
                  <option value={eventId}>{eventTitle || "This event"}</option>
                </select>
              </div>
              <SessionScopePicker
                sessions={sessions.map((sess, idx) => ({ id: String(sess._id || sess.id), name: sess.name || `Session ${idx + 1}` }))}
                value={sessionScope}
                onChange={setSessionScope}
              />

              {errorFeedback && (
                <p role="alert" className="text-xs font-medium text-rose-600 break-words">{errorFeedback}</p>
              )}

              <div className="-mx-6 mt-6 px-6 py-4 border-t border-[#E0E0E0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeAssignModal}
                  className="px-6 py-[11px] bg-white border border-[#E0E0E0] hover:bg-gray-50 text-[#15191C] text-base font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign}
                  className="px-6 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingAssign ? "Saving..." : allAlreadyOnEvent ? "Save" : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {isAssignSuccessModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-overlay">
          <div className="bg-white rounded-md border border-gray-200 shadow-2xl max-w-sm w-full p-8 text-center space-y-6 animate-modal">
            <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-gray-900">Assigned Successfully!</h3>

            <button
              onClick={() => setIsAssignSuccessModalOpen(false)}
              className="w-full py-2.5 bg-[#FF5B22] hover:bg-[#E04B16] text-white font-bold text-xs rounded-md transition-colors cursor-pointer shadow-xs"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
