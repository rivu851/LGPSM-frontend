"use client";

import ListControls, { addButtonClass } from "@/components/common/ListControls";
import PageHeader from "@/components/common/PageHeader";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { userService } from "@/services/userService";
import { eventService } from "@/services/eventService";
import { useEventSessions } from "@/hooks/useEventSessions";
import SessionScopePicker from "@/components/common/SessionScopePicker";
import CustomDropdown from "@/components/common/CustomDropdown";
import { assignableEvents, describeAssignResult, eligibleSelection, selectionLabel } from "@/utils/bulkAssign";
import { assignmentService, AssignmentData } from "@/services/assignmentService";
import { getAssignedCountText, SystemUserRow } from "@/utils/systemUserRows";
import { useAlert } from "@/context/AlertContext";
import { mapWithConcurrency } from "@/utils/mapWithConcurrency";
import { TableSkeleton } from "@/components/common/Skeleton";
import RowMenu, { EditIcon, TrashIcon } from "@/components/common/RowMenu";
import Icon from "@/components/icons/Icon";

export default function AllUsersPage() {
  const { confirm } = useAlert();
  const { user } = useAuth();
  const [users, setUsers] = useState<SystemUserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUserIds, setExpandedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const isAdminView = user?.role === "ADMIN";
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAssignSuccessModalOpen, setIsAssignSuccessModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUserRow | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", email: "", phone: "" });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Form selections
  const [eventsList, setEventsList] = useState<{ id: string; name: string; status?: string }[]>([]);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);
  const [assignPartial, setAssignPartial] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  // null = all sessions of the selected event
  const [sessionScope, setSessionScope] = useState<string[] | null>(null);
  const { sessions: eventSessionsList, loading: loadingSessions, error: sessionsError } = useEventSessions(selectedEventId);
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const fetchUsersAndAssignments = async () => {
    try {
      setIsLoading(true);
      setErrorFeedback(null);

      // 1. Fetch system users only (role === SYSTEM_USER)
      const [usersRes, eventsRes] = await Promise.all([
        userService.getUsers("SYSTEM_USER"),
        eventService.getEvents(),
      ]);
      if (!usersRes?.success) {
        setErrorFeedback(usersRes?.message || "Failed to load system users.");
      }
      const rawUsers = Array.isArray(usersRes?.data) ? usersRes.data : [];
      const systemUsersOnly = rawUsers.filter((u) => u.role === "SYSTEM_USER");

      // Events loaded alongside users above.
      const rawEvents = Array.isArray(eventsRes?.data) ? eventsRes.data : ((eventsRes?.data as any)?.events || []);
      const formattedEvents: { id: string; name: string; status?: string }[] = rawEvents.map((ev: any) => ({
        status: ev.status,
        id: String(ev._id || ev.id || ""),
        name: ev.title || ev.eventName || "Untitled Event",
      }));
      setEventsList(formattedEvents);
      const firstAssignable = assignableEvents(formattedEvents)[0];
      if (firstAssignable && !selectedEventId) {
        setSelectedEventId(firstAssignable.id);
      }

      // 3. Collect assignments across events
      const userAssignmentsMap: Record<string, SystemUserRow["assignments"]> = {};

      const assignmentResults = await mapWithConcurrency(formattedEvents, 8, async (ev) => {
        if (!ev.id) return { ev, assignmentsList: [] as AssignmentData[] };
        try {
          const assignRes = await assignmentService.getAssignmentsByEvent(ev.id);
          return { ev, assignmentsList: Array.isArray(assignRes?.data) ? assignRes.data : [] };
        } catch {
          return { ev, assignmentsList: [] as AssignmentData[] };
        }
      });

      for (const { ev, assignmentsList } of assignmentResults) {
          assignmentsList.forEach((asn) => {
            const userId = typeof asn.userId === "object" ? asn.userId?._id : asn.userId;
            if (!userId) return;

            if (!userAssignmentsMap[userId]) {
              userAssignmentsMap[userId] = [];
            }

            const sessions = (asn.sessionIds || []).map((s: any) => ({
              id: typeof s === "object" ? s._id : s,
              name: typeof s === "object" ? (s.name || "Session") : "Session",
              time: typeof s === "object" && s.schedule?.startTime ? `${s.schedule.startTime}` : undefined,
            }));

            const assignedByObj = typeof asn.assignedBy === "object" ? asn.assignedBy : null;
            const assignedByName = assignedByObj?.fullName || assignedByObj?.email || "Organizer";

            userAssignmentsMap[userId].push({
              assignmentId: asn._id,
              eventId: ev.id,
              eventName: ev.name,
              assignedBy: assignedByName,
              assignedAt: asn.createdAt ? new Date(asn.createdAt).toLocaleDateString() : undefined,
              sessions,
            });
          });
      }

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
      console.error("Error loading system users:", err);
      setErrorFeedback(err.message || "Failed to load system users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndAssignments();
  }, []);

  const toggleExpand = (id: string) => {
    if (expandedUserIds.includes(id)) {
      setExpandedUserIds(expandedUserIds.filter((i) => i !== id));
    } else {
      setExpandedUserIds([...expandedUserIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map((u) => u.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    // functional update: two quick clicks must both count
    setSelectedIds((current) => (current.includes(id) ? current.filter((i) => i !== id) : [...current, id]));
  };

  const handleUnassignAssignment = async (assignmentId: string) => {
    if (!(await confirm({ title: "Unassign user?", message: "This system user will be removed from the assignment.", confirmText: "Unassign", tone: "danger" }))) return;

    try {
      setErrorFeedback(null);
      const res = await assignmentService.deleteAssignment(assignmentId);
      if (res.success || (res as any).data?.deleted) {
        await fetchUsersAndAssignments();
      } else {
        setErrorFeedback(res.message || "Failed to unassign user.");
      }
    } catch (err: any) {
      setErrorFeedback(err.message || "Error unassigning user.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!(await confirm({ title: "Delete users?", message: `${selectedIds.length} selected user(s) will be deleted. This cannot be undone.`, confirmText: "Delete", tone: "danger" }))) return;

    try {
      setErrorFeedback(null);
      const failures: string[] = [];
      for (const id of selectedIds) {
        const res = await userService.deleteUser(id);
        if (!res.success) failures.push(res.message || "Failed to delete user.");
      }
      if (failures.length > 0) {
        setErrorFeedback(`${failures.length} user(s) could not be deleted: ${failures[0]}`);
      }
      setSelectedIds([]);
      await fetchUsersAndAssignments();
    } catch (err: any) {
      setErrorFeedback(err.message || "Failed to delete users.");
    }
  };

  const handleDeleteUser = async (target: SystemUserRow) => {
    if (!(await confirm({ title: "Remove user?", message: `${target.name} will be permanently deleted. This cannot be undone.`, confirmText: "Remove", tone: "danger" }))) return;
    try {
      setErrorFeedback(null);
      const res = await userService.deleteUser(target.id);
      if (!res.success) {
        setErrorFeedback(res.message || "Failed to remove user.");
        return;
      }
      setSelectedIds((ids) => ids.filter((id) => id !== target.id));
      await fetchUsersAndAssignments();
    } catch (err: any) {
      setErrorFeedback(err.message || "Failed to remove user.");
    }
  };

  const handleOpenEdit = (u: SystemUserRow) => {
    setEditingUser(u);
    setEditFormData({
      name: u.name,
      email: u.email,
      phone: u.phone === "--" ? "" : u.phone,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setSubmittingEdit(true);
      setErrorFeedback(null);

      const res = await userService.updateUser(editingUser.id, {
        fullName: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone,
      });

      if (res.success) {
        setIsEditModalOpen(false);
        setEditingUser(null);
        await fetchUsersAndAssignments();
      } else {
        setErrorFeedback(res.message || "Failed to update user.");
      }
    } catch (err: any) {
      setErrorFeedback(err.message || "Error updating user.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // only users still in the list are assigned; an empty or stale selection does nothing
    const ids = eligibleSelection(selectedIds, users.map((u) => u.id));
    if (ids.length === 0 || !selectedEventId) return;
    if (sessionScope !== null && sessionScope.length === 0) {
      setErrorFeedback("Select at least one session, or choose \"All sessions\".");
      return;
    }

    try {
      setSubmittingAssign(true);
      setErrorFeedback(null);

      const failures: { name: string; message: string }[] = [];
      for (const userId of ids) {
        const person = users.find((u) => u.id === userId);
        const existing = person?.assignments.find((a) => a.eventId === selectedEventId);
        try {
          const res = await assignmentService.saveAssignment(selectedEventId, userId, sessionScope ?? [], existing?.assignmentId);
          if (!res.success) failures.push({ name: person?.name || "User", message: res.message || "Assignment failed." });
        } catch (err) {
          failures.push({ name: person?.name || "User", message: err instanceof Error ? err.message : "Assignment failed." });
        }
      }

      const outcome = describeAssignResult(ids.length, failures);
      if (outcome.kind === "failure") {
        setErrorFeedback(outcome.message); // stay in the dialog so the choice can be changed
      } else {
        setIsAssignModalOpen(false);
        setAssignMessage(outcome.message);
        setAssignPartial(outcome.kind === "partial");
        if (outcome.kind === "partial") setErrorFeedback(outcome.message);
        setIsAssignSuccessModalOpen(true);
        setSelectedIds([]);
      }
      await fetchUsersAndAssignments();
    } catch (err) {
      setErrorFeedback(err instanceof Error ? err.message : "Error assigning system users.");
    } finally {
      setSubmittingAssign(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery)
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white select-none font-sans">
      {/* Header */}
      <PageHeader title={user?.role === "ORGANIZER" ? "User Management" : "All Users"} />

      {/* Page Content */}
      <main className="px-4 sm:px-6 pt-[30px] w-full space-y-6 bg-white pb-24">
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

        {/* Controls (Figma 450:6796 / 217:23029) */}
        <ListControls label="System Users" searchId="system-user-search" placeholder="Search..." value={searchQuery} onChange={setSearchQuery}>
          <Link href="/user-management/add?new=1" className={addButtonClass}>
            <Icon name="events/add-white" width={24} height={24} />
            Add User
          </Link>
        </ListControls>

        {/* Custom Green/White Tick Select All Checkbox */}
        <div className="flex items-center justify-between gap-2 text-sm text-[#828282] pt-1">
          <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSelectAll}
            className={`w-4 h-4 rounded-sm flex items-center justify-center transition-colors border cursor-pointer ${
              selectedIds.length === filteredUsers.length && filteredUsers.length > 0
                ? "bg-[#10B981] border-[#10B981] text-white"
                : "bg-white border-gray-300 hover:border-gray-400"
            }`}
          >
            {selectedIds.length === filteredUsers.length && filteredUsers.length > 0 && (
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <span onClick={toggleSelectAll} className="cursor-pointer">
            Select All
          </span>
          </div>
          {/* Organizer (Figma 217:23029): only the trash icon, top right. The admin page has no icon here: its trash and
              "Assign N users" sit in a bar under the table (Figma 453:7298). Organizers assign staff from an event
              (Assign System Users on the event page), as in the Organizer designs. */}
          {!isAdminView && (
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={selectedIds.length === 0}
              aria-label="Delete selected users"
              title="Delete selected users"
              className="p-1 rounded text-[#4B4F52] hover:text-red-600 disabled:opacity-40 disabled:hover:text-[#4B4F52] cursor-pointer disabled:cursor-not-allowed"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
            </button>
          )}
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 text-[#828282] font-medium text-sm">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4 font-medium">User Name</th>
                <th className="py-3 px-4 font-medium">Assigned Events & Sessions</th>
                <th className="py-3 px-4 font-medium">Email</th>
                <th className="py-3 px-4 font-medium">Phone Number</th>
                <th className="py-3 px-4 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-[#4B4F52]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-0"><TableSkeleton rows={5} cols={5} label="Loading system users" /></td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                    No SYSTEM_USER accounts found. Add users using the Add User button.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isExpanded = expandedUserIds.includes(u.id);
                  const isSelected = selectedIds.includes(u.id);
                  const countText = getAssignedCountText(u.assignments);

                  return (
                    <tr key={u.id} className={`transition-colors align-top ${isExpanded ? "bg-[#F4F4F4]" : "hover:bg-gray-50/80"}`}>
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSelectRow(u.id)}
                          className={`w-4 h-4 rounded-sm flex items-center justify-center transition-colors border cursor-pointer mt-0.5 ${
                            isSelected ? "bg-[#10B981] border-[#10B981] text-white" : "bg-white border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      </td>

                      {/* User Name Only (No SYSTEM_USER role badge) */}
                      <td className="py-4 px-4">
                        <div>{u.name}</div>
                      </td>

                      {/* Assigned Events & Sessions */}
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => toggleExpand(u.id)}
                          className="flex items-center gap-2 font-medium text-[#15191C] hover:text-[#FF5B22] transition-colors cursor-pointer"
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
                        <RowMenu
                          label={`Actions for ${u.name}`}
                          items={[
                            { label: "Edit User", icon: EditIcon, onClick: () => handleOpenEdit(u) },
                            { label: "Remove User", icon: TrashIcon, onClick: () => handleDeleteUser(u) },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Admin selection bar (Figma 453:7298): trash + "Assign N users →" under the table */}
        {isAdminView && (
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={selectedIds.length === 0}
              aria-label="Delete selected users"
              title="Delete selected users"
              className="p-2.5 text-[#FF5B22] hover:text-red-600 hover:bg-red-50 border border-transparent disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => { setErrorFeedback(null); setIsAssignModalOpen(true); }}
              disabled={selectedIds.length === 0}
              className="inline-flex items-center gap-2 px-4 py-[11px] border border-[#FF651D] text-[#FF651D] hover:bg-[#FF651D] hover:text-white font-medium text-base rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#FF651D] disabled:cursor-not-allowed"
            >
              <span>Assign {selectedIds.length} {selectedIds.length === 1 ? "user" : "users"}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        )}
      </main>

      {/* ── Edit User Modal ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 animate-overlay">
          <div className="bg-white rounded-lg shadow-2xl max-w-[486px] w-full overflow-hidden animate-modal">
            <div className="px-6 py-5 border-b border-[#E0E0E0] flex items-center justify-between">
              <h3 className="text-base font-medium text-[#15191C]">Edit System User</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="px-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#15191C]">
                  User Name<span className="text-[#FF5B22]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full min-h-[47px] px-3.5 py-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#15191C]">
                  Email<span className="text-[#FF5B22]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full min-h-[47px] px-3.5 py-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#15191C]">Contact No</label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full min-h-[47px] px-3.5 py-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D] transition-colors"
                />
              </div>

              <div className="-mx-6 mt-6 px-6 py-4 border-t border-[#E0E0E0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-[11px] bg-white border border-[#E0E0E0] hover:bg-gray-50 text-[#15191C] text-base font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-6 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign User Modal ── */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 animate-overlay">
          <div className="bg-white rounded-lg shadow-2xl max-w-[486px] w-full overflow-hidden animate-modal">
            <div className="px-6 py-5 border-b border-[#E0E0E0] flex items-center justify-between">
              <h3 className="text-base font-medium text-[#15191C]">Assign System User</h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="px-6 pt-5 space-y-5">
              <p className="text-sm text-[#4B4F52]">{selectionLabel(selectedIds.length)}. They will be assigned to the event you choose below.</p>
              {assignableEvents(eventsList).length === 0 && (
                <p role="status" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">There is no active event to assign staff to. Cancelled and completed events are not offered.</p>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#15191C]">
                  Event<span className="text-[#FF5B22]">*</span>
                </label>
                <CustomDropdown
                  value={selectedEventId}
                  onChange={(v) => { setSelectedEventId(v); setSessionScope(null); }}
                  options={assignableEvents(eventsList).map((evt) => ({ value: evt.id, label: evt.name }))}
                  ariaLabel="Select event"
                />
              </div>

              <SessionScopePicker
                sessions={eventSessionsList}
                loading={loadingSessions}
                error={sessionsError}
                value={sessionScope}
                onChange={setSessionScope}
              />

              {errorFeedback && (
                <p role="alert" className="text-xs font-medium text-rose-600 break-words">{errorFeedback}</p>
              )}

              <div className="-mx-6 mt-6 px-6 py-4 border-t border-[#E0E0E0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-6 py-[11px] bg-white border border-[#E0E0E0] hover:bg-gray-50 text-[#15191C] text-base font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign || selectedIds.length === 0 || !selectedEventId || assignableEvents(eventsList).length === 0}
                  className="px-6 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingAssign ? "Saving..." : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {isAssignSuccessModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 animate-overlay">
          <div className="bg-white rounded-md border border-gray-200 shadow-2xl max-w-sm w-full p-8 text-center space-y-6 animate-modal">
            <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-gray-900">{assignPartial ? "Partly assigned" : "Assigned Successfully!"}</h3>
            {assignMessage && <p role="status" className="text-sm text-[#4B4F52] break-words">{assignMessage}</p>}

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
