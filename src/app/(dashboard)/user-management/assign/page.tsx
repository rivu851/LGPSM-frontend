"use client";

import React, { useState, useEffect } from "react";
import CustomDropdown from "@/components/common/CustomDropdown";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { userService } from "@/services/userService";
import { eventService } from "@/services/eventService";
import { useEventSessions } from "@/hooks/useEventSessions";
import SessionScopePicker from "@/components/common/SessionScopePicker";
import { assignmentService, AssignmentData } from "@/services/assignmentService";
import UserNavDropdown from "@/components/common/UserNavDropdown";
import { useAlert } from "@/context/AlertContext";
import { notifyDbUpdate } from "@/components/EventSubNav";

export interface AssignedSession {
  id: string;
  name: string;
  time?: string;
}

export interface AssignedEventCard {
  id: string;
  eventName: string;
  dateStr?: string;
  assignedBy?: string;
  assignedAt?: string;
  sessions: AssignedSession[];
}

export interface SystemUserRow {
  id: string; // User ID
  name: string;
  email: string;
  phone: string;
  role: string;
  assignments: {
    assignmentId: string;
    eventId: string;
    eventName: string;
    dateStr?: string;
    assignedBy?: string;
    assignedAt?: string;
    sessions: { id: string; name: string; time?: string }[];
  }[];
  assignedEvents?: AssignedEventCard[];
}

export const getAssignedCountText = (assignments: SystemUserRow["assignments"] = []): string => {
  const eventCount = assignments.length;
  let sessionCount = 0;
  assignments.forEach((a) => {
    sessionCount += a.sessions?.length || 0;
  });

  const eventLabel = eventCount === 1 ? "1 Event" : `${eventCount} Events`;
  const sessionLabel = sessionCount === 1 ? "1 Session" : `${sessionCount} Sessions`;
  return `${eventLabel} & ${sessionLabel}`;
};

export default function AssignedSystemUsersPage() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [users, setUsers] = useState<SystemUserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUserIds, setExpandedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
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
      const usersRes = await userService.getUsers("SYSTEM_USER");
      const rawUsers = Array.isArray(usersRes?.data) ? usersRes.data : [];

      // Filter out ADMIN & ORGANIZER strictly as UX defense
      const systemUsersOnly = rawUsers.filter((u) => u.role === "SYSTEM_USER");

      // 2. Fetch events
      const eventsRes = await eventService.getEvents();
      const rawEvents = Array.isArray(eventsRes?.data) ? eventsRes.data : ((eventsRes?.data as any)?.events || []);
      const formattedEvents = rawEvents.map((ev: any) => ({
        id: ev._id || ev.id,
        title: ev.title || ev.eventName || "Untitled Event",
      }));
      setEventsList(formattedEvents);
      if (formattedEvents.length > 0 && !selectedEventId) {
        setSelectedEventId(formattedEvents[0].id);
      }

      // 3. Collect assignments across events
      const userAssignmentsMap: Record<string, SystemUserRow["assignments"]> = {};

      for (const ev of formattedEvents) {
        if (!ev.id) continue;
        try {
          const assignRes = await assignmentService.getAssignmentsByEvent(ev.id);
          const assignmentsList: AssignmentData[] = Array.isArray(assignRes?.data) ? assignRes.data : [];

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
        } catch (e) {
          // Ignore individual event assignment fetch errors
        }
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
    if (!addUserData.password || addUserData.password.length < 6) {
      setErrorFeedback("Please set a password of at least 6 characters for the new user.");
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
    setActiveActionId(null);
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
    if (!confirm("Are you sure you want to remove this system user assignment?")) return;

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
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected user(s)?`)) return;

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
      <header className="h-20 bg-white border-b border-gray-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <svg className="w-7 h-7 text-[#FF5B22] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h1 className="text-xl font-bold text-gray-900">Assigned System Users</h1>
        </div>
        <UserNavDropdown />
      </header>

      {/* Page Content */}
      <main className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6 bg-white pb-24">
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

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            <h2 className="text-lg font-bold text-gray-900 shrink-0">System Users</h2>
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
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddUserModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF5B22] hover:bg-[#E04B16] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add User</span>
          </button>
        </div>

        {/* Custom Green/White Tick Select All Checkbox */}
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 pt-1">
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

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-medium text-[11px]">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4 font-medium">User Name</th>
                <th className="py-3 px-4 font-medium">Assigned Events & Sessions</th>
                <th className="py-3 px-4 font-medium">Email</th>
                <th className="py-3 px-4 font-medium">Phone Number</th>
                <th className="py-3 px-4 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 text-sm">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-6 h-6 border-2 border-[#FF5B22] border-t-transparent rounded-full animate-spin"></div>
                      <p>Loading assigned system users...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                    No assigned system users found. Assign users from the All Users tab.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedIds.includes(u.id);
                  const isExpanded = expandedUserIds.includes(u.id);
                  const isActionActive = activeActionId === u.id;
                  const countText = getAssignedCountText(u.assignments);

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors align-top">
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

                      {/* User Name Only (No SYSTEM_USER badge) */}
                      <td className="py-4 px-4 font-medium text-gray-900">
                        <div>{u.name}</div>
                      </td>

                      {/* Assigned Events & Sessions Cards */}
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => toggleExpandUser(u.id)}
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
                                  <div className="text-xs font-semibold text-gray-800">
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

                      <td className="py-4 px-4 text-right relative">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="p-1 text-gray-500 hover:text-[#FF5B22] transition-colors cursor-pointer"
                            title="Edit User"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveActionId(isActionActive ? null : u.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 10a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z" />
                            </svg>
                          </button>
                        </div>

                        {isActionActive && (
                          <div className="absolute right-4 top-12 z-30 bg-[#1E232A] text-white text-xs font-semibold px-3 py-2 rounded-md shadow-xl border border-gray-700 flex flex-col gap-1 cursor-pointer">
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="flex items-center gap-2 hover:text-[#FF5B22] transition-colors w-full text-left py-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                              <span>Edit User</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#FF5B22] text-[#FF5B22] hover:bg-[#FF5B22] hover:text-white font-bold text-xs rounded-md transition-colors cursor-pointer shrink-0"
          >
            <span>Assign {selectedIds.length} users</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </main>

      {/* ── Edit User Modal ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-md border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden space-y-6">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Edit System User</h3>
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
                <label className="text-xs font-semibold text-gray-800">
                  User Name<span className="text-[#FF5B22]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Email<span className="text-[#FF5B22]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">Contact No</label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              <div className="pt-2 pb-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-6 py-2 bg-[#FF5B22] hover:bg-[#E04B16] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-50"
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
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-md border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden space-y-6">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Add System User</h3>
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
                <label className="text-xs font-semibold text-gray-800">
                  User Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter Full Name"
                  value={addUserData.userName}
                  onChange={(e) => setAddUserData({ ...addUserData, userName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Contact No<span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Enter Contact No"
                  value={addUserData.contactNo}
                  onChange={(e) => setAddUserData({ ...addUserData, contactNo: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Email<span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Enter Email"
                  value={addUserData.email}
                  onChange={(e) => setAddUserData({ ...addUserData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Password<span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter Initial Password"
                  value={addUserData.password}
                  onChange={(e) => setAddUserData({ ...addUserData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              <div className="pt-2 pb-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-6 py-2 bg-[#FF5B22] hover:bg-[#E04B16] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-50"
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
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-md border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden space-y-6">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Assign System Users to Event</h3>
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

            <form onSubmit={handleAssignSubmit} className="px-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Event<span className="text-[#FF5B22]">*</span>
                </label>
                <CustomDropdown
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

              <div className="pt-2 pb-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign}
                  className="px-6 py-2 bg-[#FF5B22] hover:bg-[#E04B16] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-50"
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
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-md border border-gray-200 shadow-2xl max-w-sm w-full p-8 text-center space-y-6">
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
