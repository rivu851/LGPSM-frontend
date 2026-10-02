"use client";

import React, { useState, useEffect, useCallback } from "react";
import { userService } from "@/services/userService";
import { UserData } from "@/services/tokenStorage";
import UserNavDropdown from "@/components/common/UserNavDropdown";

export default function AddUserPage() {
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    userName: "",
    contactNo: "",
    email: "",
    password: "",
  });
  const [addedUserName, setAddedUserName] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [systemUsers, setSystemUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSystemUsers = useCallback(async () => {
    setLoadingUsers(true);
    setLoadError(null);
    const res = await userService.getUsers("SYSTEM_USER");
    if (res.success && Array.isArray(res.data)) {
      setSystemUsers(res.data.filter((u) => u.role === "SYSTEM_USER"));
    } else {
      setSystemUsers([]);
      setLoadError(res.message || "Failed to load system users.");
    }
    setLoadingUsers(false);
  }, []);

  useEffect(() => {
    loadSystemUsers();
  }, [loadSystemUsers]);

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userName.trim()) return;

    setIsSubmitting(true);
    setFormError(null);
    const res = await userService.createUser({
      fullName: formData.userName.trim(),
      email: formData.email.trim(),
      phone: formData.contactNo.trim() || undefined,
      password: formData.password,
      role: "SYSTEM_USER",
    });
    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.message || "Failed to create user.");
      return;
    }

    setAddedUserName(formData.userName.trim());
    setIsAddUserModalOpen(false);
    setFormData({ userName: "", contactNo: "", email: "", password: "" });
    await loadSystemUsers();
  };

  const query = searchQuery.trim().toLowerCase();
  const filteredUsers = systemUsers.filter((u) =>
    !query ||
    (u.fullName || "").toLowerCase().includes(query) ||
    (u.email || "").toLowerCase().includes(query) ||
    (u.phone || "").includes(query)
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <svg className="w-7 h-7 text-[#FF5B22] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <h1 className="text-sm sm:text-xl font-bold text-gray-900 truncate">Add User</h1>
          </div>
          <UserNavDropdown />
        </header>

        {/* Page Content */}
        <main className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8 flex-1 flex flex-col">
          {/* Controls Bar: Title + Search Bar on Left, + Add User Button on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 max-w-xl">
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
              onClick={() => setIsAddUserModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#FF5B22] hover:bg-[#E04B16] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 shadow-2xs w-fit self-start"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add User</span>
            </button>
          </div>

          {/* Success Notification Banner */}
          {addedUserName && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-semibold text-center animate-fadeIn break-words">
              User &quot;{addedUserName}&quot; added successfully!
            </div>
          )}

          {loadingUsers ? (
            <div className="flex-1 flex items-center justify-center py-16 text-xs font-semibold text-gray-500">
              Loading system users...
            </div>
          ) : loadError ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-3">
              <p className="text-sm font-semibold text-rose-600 text-center break-words">{loadError}</p>
              <button
                onClick={() => loadSystemUsers()}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-[#FF5B22] font-semibold text-xs rounded-md transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : systemUsers.length === 0 ? (
            /* Empty State Container (Image 1) */
            <div className="flex-1 flex flex-col items-center justify-center my-auto py-16 space-y-4">
              <div className="w-20 h-20 text-gray-300 flex items-center justify-center">
                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-600">
                No users added yet. Add users now.
              </p>
              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-[#FF5B22] font-semibold text-xs rounded-md transition-colors cursor-pointer"
              >
                Add User
              </button>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-md overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="py-3 px-4 font-medium">Name</th>
                    <th className="py-3 px-4 font-medium">Email</th>
                    <th className="py-3 px-4 font-medium">Contact No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-400">No users match your search.</td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u._id}>
                        <td className="py-3 px-4 font-semibold text-gray-900 break-words max-w-[240px]">{u.fullName}</td>
                        <td className="py-3 px-4 text-gray-600 break-all max-w-[280px]">{u.email}</td>
                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{u.phone || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>

      {/* Add User Modal (Image 2) */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-overlay">
          <div className="bg-white rounded-md border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden space-y-6 animate-modal">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Add User</h3>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddUserSubmit} className="px-6 space-y-5">
              {/* User Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  User Name<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter User Name"
                  value={formData.userName}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              {/* Contact No */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Contact No<span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Enter Contact No"
                  value={formData.contactNo}
                  onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Email<span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Enter Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              {/* Temporary Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800">
                  Temporary Password<span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FF5B22] transition-colors"
                />
              </div>

              {formError && (
                <p className="text-xs font-medium text-rose-600 break-words">{formError}</p>
              )}

              {/* Buttons */}
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
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-[#FF5B22] hover:bg-[#E04B16] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Adding..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
