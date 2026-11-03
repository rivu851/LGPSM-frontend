"use client";

import PageHeader from "@/components/common/PageHeader";
import ListControls, { addButtonClass } from "@/components/common/ListControls";
import React, { useState, useEffect } from "react";
import CustomDropdown from "@/components/common/CustomDropdown";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { userService } from "@/services/userService";
import { eventService } from "@/services/eventService";
import { useEventSessions } from "@/hooks/useEventSessions";
import SessionScopePicker from "@/components/common/SessionScopePicker";
import { assignmentService, AssignmentData } from "@/services/assignmentService";
import { useAlert } from "@/context/AlertContext";
import { notifyDbUpdate } from "@/components/EventSubNav";
import { mapWithConcurrency } from "@/utils/mapWithConcurrency";
import { formatDateTime } from "@/utils/dateTime";
import { TableSkeleton } from "@/components/common/Skeleton";
import RowMenu, { EditIcon, TrashIcon } from "@/components/common/RowMenu";

import { SystemUserRow, getAssignedCountText } from "@/utils/systemUserRows";

export default function AssignedSystemUsersPage() {
  const { user } = useAuth();
  const { showAlert, confirm } = useAlert();
  const [users, setUsers] = useState<SystemUserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUserIds, setExpandedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  // Modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAssignSuccessModalOpen, setIsAssignSuccessModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUserRow | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", email: "", phone: "" });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Form states
  const [addUserData, setAddUserData] = useState({ userName: "", contactNo: "", email: "", password: "" });
  const [eventsList, setEventsList] = useState<{ id: string; title: string }[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  // null = all sessions of the selected event
  const [sessionScope, setSessionScope] = useState<string[] | null>(null);
  const { sessions: eventSessionsList, loading: loadingSessions, error: sessionsError } = useEventSessions(selectedEventId);
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);

  // Fetch real SYSTEM_USER accounts and their MongoDB assignments
  const loadData = async () => {
    try {
      setIsLoading(true);
      setErrorFeedback(null);

      // 1. Fetch system users only (role === SYSTEM_USER)
      const [usersRes, eventsRes] = await Promise.all([
        userService.getUsers("SYSTEM_USER"),
        eventService.getEvents(),
      ]);
      const rawUsers = Array.isArray(usersRes?.data) ? usersRes.data : [];

      // Filter out ADMIN & ORGANIZER strictly as UX defense
      const systemUsersOnly = rawUsers.filter((u) => u.role === "SYSTEM_USER");

      // Events loaded alongside users above.
      const rawEvents = Array.isArray(eventsRes?.data) ? eventsRes.data : ((eventsRes?.data as any)?.events || []);
      const formattedEvents: { id: string; title: string }[] = rawEvents.map((ev: any) => ({
        id: String(ev._id || ev.id || ""),
        title: ev.title || ev.eventName || "Untitled Event",
      }));
      setEventsList(formattedEvents);
      if (formattedEvents.length > 0 && !selectedEventId) {
        setSelectedEventId(formattedEvents[0].id);
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
              eventName: ev.title,
              assignedBy: assignedByName,
              assignedAt: asn.createdAt ? new Date(asn.createdAt).toLocaleDateString() : undefined,
              sessions,
            });
          });
      }

      // Format final SystemUserRow list - FILTER strictly for ASSIGNED users on this page!
      const formattedUserRows: SystemUserRow[] = systemUsersOnly
        .map((u: any) => ({
          id: u._id || u.id,
          name: u.fullName || u.name || "System User",
          email: u.email || "",
          phone: u.phone || u.contactNo || "--",
          role: u.role,
          assignments: userAssignmentsMap[u._id || u.id] || [],
        }))
        .filter((u) => u.assignments.length > 0); // SHOW ONLY ASSIGNED SYSTEM USERS

      setUsers(formattedUserRows);
    } catch (err: any) {
      console.error("Error loading system users and assignments:", err);
      setErrorFeedback(err.message || "Failed to load system user assignments.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle adding new SYSTEM_USER account via backend API
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserData.userName || !addUserData.email) return;
    if (!addUserData.password || addUserData.password.length < 8) {
      setErrorFeedback("Please set a password of at least 8 characters for the new user.");
      return;
    }

    try {
      setSubmittingUser(true);
      setErrorFeedback(null);

      const res = await userService.createUser({
        fullName: addUserData.userName,
        email: addUserData.email,
        phone: addUserData.contactNo || undefined,
        password: addUserData.password,
        role: "SYSTEM_USER",
      });

      if (res.success) {
        setIsAddUserModalOpen(false);
        setAddUserData({ userName: "", contactNo: "", email: "", password: "" });
        await loadData();
      } else {
        setErrorFeedback(res.message || "Failed to create system user account.");
      }
    } catch (err: any) {
      setErrorFeedback(err.message || "Error creating system user.");
    } finally {
      setSubmittingUser(false);
    }
  };

  // Handle editing user
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
        await loadData();
      } else {
        setErrorFeedback(res.message || "Failed to update user.");
      }
    } catch (err: any) {
      setErrorFeedback(err.message || "Error updating user.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Handle assigning selected users to selected event & sessions via backend API
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0 || !selectedEventId) {
      showAlert("Please select at least one system user and an event.", "warning");
      return;
    }
    if (sessionScope !== null && sessionScope.length === 0) {
      showAlert("Select at least one session, or choose \"All sessions\".", "warning");
      return;
    }

    // Putting someone on two events that run at the same time is allowed, but never by accident (same check as the event's own Assign tab)
    try {
      const overlapRes = await assignmentService.getOverlaps(selectedEventId);
      const clashes = (overlapRes.success && Array.isArray(overlapRes.data) ? overlapRes.data : [])
        .filter((o) => selectedIds.includes(o.userId))
        .map((o) => `${users.find((x) => x.id === o.userId)?.name || "A user"}: "${o.title}" (${formatDateTime(o.start)} – ${formatDateTime(o.end)})`);
      if (clashes.length > 0 && !(await confirm({ title: "Overlapping events", message: `Already assigned to another event at the same time:\n${clashes.join("\n")}\n\nAssign anyway?`, confirmText: "Assign anyway" }))) return;
    } catch {
      // the warning is advisory: if it cannot be checked, the assignment itself is still validated by the server
    }

    try {
      setSubmittingAssign(true);
      setErrorFeedback(null);

      const errorMessages: string[] = [];

      for (const targetUserId of selectedIds) {
        const existing = users
          .find((u) => u.id === targetUserId)
          ?.assignments.find((a) => a.eventId === selectedEventId);
        const res = await assignmentService.saveAssignment(selectedEventId, targetUserId, sessionScope ?? [], existing?.assignmentId);

        if (!res.success) {
          errorMessages.push(res.message || "Assignment failed.");
        }
      }

      if (errorMessages.length > 0) {
        setErrorFeedback(errorMessages.join(". "));
      }

      // Only confirm success when at least one assignment was actually saved
      setIsAssignModalOpen(false);
      const savedAny = errorMessages.length < selectedIds.length;
      // Never carry a previous selection or session scope into the next assignment
      setSelectedIds([]);
      setSessionScope(null);
      if (savedAny) {
        setIsAssignSuccessModalOpen(true);
      }
      await loadData();
      notifyDbUpdate();
    } catch (err: any) {
      setErrorFeedback(err.message || "Failed to save assignment.");
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Handle unassigning assignment via backend DELETE /api/v1/assignments/:assignmentId
  const handleUnassignAssignment = async (assignmentId: string) => {
    if (!(await confirm({ title: "Remove assignment?", message: "This system user will be removed from the assignment.", confirmText: "Remove", tone: "danger" }))) return;

    try {
      setErrorFeedback(null);
      const res = await assignmentService.deleteAssignment(assignmentId);
      if (res.success || (res as any).data?.deleted) {
        await loadData();
        notifyDbUpdate();
      } else {
        setErrorFeedback(res.message || "Failed to delete assignment.");
      }
    } catch (err: any) {
      setErrorFeedback(err.message || "Error removing assignment.");
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
      await loadData();
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
      await loadData();
      notifyDbUpdate();
    } catch (err: any) {
      setErrorFeedback(err.message || "Failed to remove user.");
    }
  };

  const toggleExpandUser = (id: string) => {
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
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
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
      <PageHeader title="Assign System Users" />

      {/* Page Content */}
      <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6 bg-white pb-24">
        {/* Error Feedback Banner */}
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

        <ListControls label="System Users" searchId="assign-user-search" placeholder="Search..." value={searchQuery} onChange={setSearchQuery}>
          <button type="button" onClick={() => setIsAddUserModalOpen(true)} className={`${addButtonClass} cursor-pointer`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </ListControls>

        {/* Custom Green/White Tick Select All Checkbox */}
        <div className="flex items-center gap-2 text-sm text-[#828282] pt-1">
          <button
            type="button"
            onClick={toggleSelectAll}
role="checkbox"
aria-checked={selectedIds.length === filteredUsers.length && filteredUsers.length > 0}
aria-label="Select all"
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

        {/* Loading state — outside the scrollable table so it always centers on screen */}
        {isLoading && (
          <TableSkeleton rows={5} cols={5} label="Loading assigned system users" />
        )}

        {/* Table Container */}
        {!isLoading && (
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
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                    No assigned system users found. Assign users from the All Users tab.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedIds.includes(u.id);
                  const isExpanded = expandedUserIds.includes(u.id);
                  const countText = getAssignedCountText(u.assignments);

                  return (
                    <tr key={u.id} className={`transition-colors align-top ${isExpanded ? "bg-[#F4F4F4]" : "hover:bg-gray-50/80"}`}>
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSelectRow(u.id)}
role="checkbox"
aria-checked={isSelected}
aria-label={`Select ${u.name}`}
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

                      {/* User Name Only (No SYSTEM_USER badge) */}
                      <td className="py-4 px-4">
                        <div>{u.name}</div>
                      </td>

                      {/* Assigned Events & Sessions Cards */}
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => toggleExpandUser(u.id)}
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
        )}

        {/* Bottom Control Bar with Trash Can icon beside Assign users button */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={selectedIds.length === 0}
            className="p-2.5 text-[#FF5B22] hover:text-red-600 hover:bg-red-50 border border-transparent disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition-colors cursor-pointer"
            title="Delete Selected Users"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => { setSessionScope(null); setErrorFeedback(null); setIsAssignModalOpen(true); }}
            disabled={selectedIds.length === 0}
            className="inline-flex items-center gap-2 px-4 py-[11px] border border-[#FF651D] text-[#FF651D] hover:bg-[#FF651D] hover:text-white font-medium text-base rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#FF5B22]"
          >
            <span>Assign {selectedIds.length} users</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Edit User Modal ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 animate-overlay">
          <div className="bg-white rounded-lg shadow-2xl max-w-[486px] w-full overflow-y-auto animate-modal max-h-[calc(100dvh-2rem)]">
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

      {/* ── Add User Modal ── */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 animate-overlay">
          <div className="bg-white rounded-lg shadow-2xl max-w-[486px] w-full overflow-y-auto animate-modal max-h-[calc(100dvh-2rem)]">
            <div className="px-6 py-5 border-b border-[#E0E0E0] flex items-center justify-between">
              <h3 className="text-base font-medium text-[#15191C]">Add System User</h3>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="px-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#15191C]">
                  User Name<span className="text-[#FF651D] ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter Full Name"
                  value={addUserData.userName}
                  onChange={(e) => setAddUserData({ ...addUserData, userName: e.target.value })}
                  className="w-full min-h-[47px] px-3.5 py-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#15191C]">
                  Contact No<span className="text-[#FF651D] ml-0.5">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Enter Contact No"
                  value={addUserData.contactNo}
                  onChange={(e) => setAddUserData({ ...addUserData, contactNo: e.target.value })}
                  className="w-full min-h-[47px] px-3.5 py-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#15191C]">
                  Email<span className="text-[#FF651D] ml-0.5">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Enter Email"
                  value={addUserData.email}
                  onChange={(e) => setAddUserData({ ...addUserData, email: e.target.value })}
                  className="w-full min-h-[47px] px-3.5 py-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#15191C]">
                  Password<span className="text-[#FF651D] ml-0.5">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter Initial Password"
                  value={addUserData.password}
                  onChange={(e) => setAddUserData({ ...addUserData, password: e.target.value })}
                  className="w-full min-h-[47px] px-3.5 py-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs text-gray-800 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D] transition-colors"
                />
              </div>

              <div className="-mx-6 mt-6 px-6 py-4 border-t border-[#E0E0E0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-6 py-[11px] bg-white border border-[#E0E0E0] hover:bg-gray-50 text-[#15191C] text-base font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-6 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingUser ? "Creating..." : "Add System User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Attendees Modal ── */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 animate-overlay">
          <div className="bg-white rounded-lg shadow-2xl max-w-[486px] w-full overflow-y-auto animate-modal max-h-[calc(100dvh-2rem)]">
            <div className="px-6 py-5 border-b border-[#E0E0E0] flex items-center justify-between">
              <h3 className="text-base font-medium text-[#15191C]">Assign System Users to Event</h3>
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
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#15191C]">
                  Event<span className="text-[#FF5B22]">*</span>
                </label>
                <CustomDropdown portal
                  value={selectedEventId}
                  onChange={(v) => {
                    setSelectedEventId(v);
                    setSessionScope(null);
                  }}
                  options={eventsList.map((evt) => ({ value: evt.id, label: evt.title }))}
                  placeholder="Select an event"
                  emptyMessage="No events yet"
                  ariaLabel="Event"
                />
              </div>

              <SessionScopePicker
                sessions={eventSessionsList}
                loading={loadingSessions}
                error={sessionsError}
                value={sessionScope}
                onChange={setSessionScope}
              />

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
                  disabled={submittingAssign}
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
          <div className="bg-white rounded-md border border-gray-200 shadow-2xl max-w-sm w-full p-8 text-center space-y-6 animate-modal overflow-y-auto max-h-[calc(100dvh-2rem)]">
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
