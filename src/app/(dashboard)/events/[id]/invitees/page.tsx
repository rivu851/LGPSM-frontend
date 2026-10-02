"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import InviteesPreviewModal from "@/components/add-event/modals/InviteesPreviewModal";
import EditInviteeModal from "@/components/add-event/modals/EditInviteeModal";
import DeleteInviteeModal from "@/components/add-event/modals/DeleteInviteeModal";
import CardPreviewModal from "@/components/invitees/CardPreviewModal";
import PageHeader from "@/components/common/PageHeader";
import CustomDropdown from "@/components/common/CustomDropdown";
import EventSubNav, { notifyDbUpdate } from "@/components/EventSubNav";
import { eventService } from "@/services/eventService";
import { sessionService, SessionData } from "@/services/sessionService";
import { inviteeService } from "@/services/inviteeService";
import { invitationService, InvitationData } from "@/services/invitationService";
import { useAlert } from "@/context/AlertContext";
import { formatPhoneNumber } from "@/utils/eventUtils";
import { formatDateTime } from "@/utils/dateTime";
import { downloadInviteeTemplate } from "@/utils/inviteeTemplate";
import { InviteeSheetRow, parseInviteeSheet, rowsToSheetFile } from "@/utils/inviteeSheet";

interface Invitee {
  _id: string;
  name: string;
  email?: string;
  mobile?: string;
  companyName?: string;
  company?: string;
  dietaryPreference?: string;
  invitationStatus: "PENDING" | "SENT" | "FAILED";
  rsvpStatus: "PENDING" | "ACCEPTED" | "DECLINED";
  sessionAccess?: { sessionId: string; allowed: boolean }[];
}

type Channel = "EMAIL" | "WHATSAPP";
type Feedback = { type: "success" | "error" | "info"; message: string; details?: string[] } | null;

const pill = (cls: string, text: string) => <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{text}</span>;

// Access follows the source session for sessions that keep another session's invitees
function allowedIn(inv: Invitee, session: SessionData): boolean {
  if (!inv.sessionAccess || inv.sessionAccess.length === 0) return true;
  const target = session.inviteeSource === "COPY_SESSION" && session.sourceSessionId ? session.sourceSessionId : session._id;
  const entry = inv.sessionAccess.find((a) => String(a.sessionId) === String(target));
  return !!entry && entry.allowed !== false;
}

export default function InviteesManagementPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeId = (params?.id as string) || "";
  // The sidebar "Add Invitees" flow lives under /events/select/invitees and keeps its own context
  const sidebarFlow = routeId === "select";
  const eventId = sidebarFlow ? searchParams.get("event") || "" : routeId;
  const { showAlert } = useAlert();

  const [eventsOptions, setEventsOptions] = useState<{ value: string; label: string }[]>([]);
  const [event, setEvent] = useState<{ title?: string; categoryId?: { name?: string } | string; dietaryPreference?: { enabled?: boolean } } | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [history, setHistory] = useState<InvitationData[]>([]);
  const [loading, setLoading] = useState(!!eventId);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [busy, setBusy] = useState<null | "send" | "resend" | "import" | "access">(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [upload, setUpload] = useState<{ file: File; rows: InviteeSheetRow[] } | null>(null);
  const [showListPreview, setShowListPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [cardFor, setCardFor] = useState<Invitee | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string; email: string; phone: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sidebarFlow) return;
    eventService.getEvents().then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setEventsOptions(list.filter((e) => e.status !== "CANCELLED").map((e) => ({ value: e._id || e.id || "", label: e.title || "Untitled event" })));
    });
  }, [sidebarFlow]);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setLoadError(null);
    const [evtRes, sessRes, invRes, histRes] = await Promise.all([
      eventService.getEvent(eventId),
      sessionService.getSessions(eventId),
      inviteeService.getInvitees(eventId),
      invitationService.getInvitations(eventId),
    ]);
    if (!evtRes.success || !evtRes.data) {
      setLoadError(evtRes.message || "Event not found or you do not have access to it.");
      setLoading(false);
      return;
    }
    setEvent(evtRes.data as never);
    setSessions(sessRes.success && Array.isArray(sessRes.data) ? sessRes.data : []);
    if (invRes.success && Array.isArray(invRes.data)) setInvitees(invRes.data as unknown as Invitee[]);
    else setLoadError(invRes.message || "Failed to load invitees.");
    const h = histRes.success && histRes.data ? (Array.isArray(histRes.data) ? histRes.data : (histRes.data as { invitations?: InvitationData[] }).invitations || []) : [];
    setHistory(h);
    setSelectedIds((prev) => prev.filter((id) => (invRes.data as unknown as Invitee[] | undefined)?.some((i) => i._id === id)));
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const categoryName = event && typeof event.categoryId === "object" ? event.categoryId?.name || "" : "";
  const isCorporate = /corporate/i.test(categoryName);
  // The invitation lifecycle has started once any guest was sent (or attempted) an invitation
  const lifecycleStarted = invitees.some((i) => i.invitationStatus !== "PENDING") || history.length > 0;
  const notInvited = invitees.filter((i) => i.invitationStatus === "PENDING");
  const historyByInvitee = new Map(history.map((h) => [String(typeof h.inviteeId === "object" ? h.inviteeId?._id : h.inviteeId), h]));
  const selected = invitees.filter((i) => selectedIds.includes(i._id));
  const resendTargets = selected.map((i) => historyByInvitee.get(i._id)).filter((h): h is InvitationData => !!h?._id);
  const ownListSessions = sessions.filter((s) => s.inviteeSource !== "COPY_SESSION");

  const filterSession = sessions.find((s) => s._id === sessionFilter);
  const term = search.trim().toLowerCase();
  const visible = invitees.filter(
    (i) =>
      (!term || [i.name, i.email, i.mobile, i.companyName].some((v) => (v || "").toLowerCase().includes(term))) &&
      (!filterSession || allowedIn(i, filterSession))
  );
  const allVisibleSelected = visible.length > 0 && visible.every((i) => selectedIds.includes(i._id));

  const summarize = (results: { status: string; failureReason?: string }[], verb: string): Feedback => {
    const sent = results.filter((r) => r.status === "SENT").length;
    const failed = results.filter((r) => r.status === "FAILED");
    if (results.length === 0) return { type: "error", message: `Nothing was ${verb}.` };
    if (failed.length === 0) return { type: "success", message: `${sent} invitation(s) ${verb}.` };
    const reasons = [...new Set(failed.map((f) => f.failureReason || "Unknown error"))];
    return { type: "error", message: `${sent} ${verb}, ${failed.length} failed.`, details: reasons };
  };

  const handleSend = async () => {
    // Selected guests who were never invited, or every not-yet-invited guest when nothing is selected
    const targets = (selected.length ? selected : notInvited).filter((i) => i.invitationStatus === "PENDING");
    if (targets.length === 0) {
      showAlert(selected.length ? "The selected guests were already invited. Use Resend Invitation." : "Everyone on the list has been invited.", "info");
      return;
    }
    setBusy("send");
    setFeedback(null);
    const res = await invitationService.sendInvitations(eventId, { inviteeIds: targets.map((t) => t._id), channel });
    const results = (res.data?.results || (res as { results?: { status: string; failureReason?: string }[] }).results || []) as { status: string; failureReason?: string }[];
    setFeedback(res.success || results.length ? summarize(results, "sent") : { type: "error", message: res.message || "Invitations could not be sent." });
    setSelectedIds([]);
    setBusy(null);
    await load();
    notifyDbUpdate();
  };

  const handleResend = async () => {
    if (resendTargets.length === 0) return;
    setBusy("resend");
    setFeedback(null);
    const res = await invitationService.resendInvitations(eventId, { invitationIds: resendTargets.map((h) => h._id), channel });
    const results = (res.data?.results || (res as { results?: { status: string; failureReason?: string }[] }).results || []) as { status: string; failureReason?: string }[];
    setFeedback(res.success || results.length ? summarize(results, "resent") : { type: "error", message: res.message || "Invitations could not be resent." });
    setSelectedIds([]);
    setBusy(null);
    await load();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = await parseInviteeSheet(file);
      if (parsed.rows.length === 0) {
        setFeedback({ type: "error", message: "The sheet has no invitee rows." });
        return;
      }
      setUpload({ file, rows: parsed.rows });
    } catch {
      setFeedback({ type: "error", message: "The file could not be read. Upload an .xlsx or .xls sheet." });
    }
  };

  const handleImport = async (rows: InviteeSheetRow[]) => {
    if (!upload) return;
    setBusy("import");
    setFeedback(null);
    const res = await inviteeService.importExcel(eventId, rowsToSheetFile(rows, upload.file.name));
    setBusy(null);
    setUpload(null);
    if (!res.success || !res.data) {
      setFeedback({ type: "error", message: res.message || "The invitee list could not be imported." });
      return;
    }
    const d = res.data;
    const parts = [`${d.imported} added`, `${d.updated ?? 0} updated`];
    if (d.removed) parts.push(`${d.removed} removed (not in the new file)`);
    if (d.rejected) parts.push(`${d.rejected} rejected`);
    setFeedback({
      type: d.rejected ? "error" : "success",
      message: `Invitee list imported: ${parts.join(", ")}.`,
      details: (d.errors || []).slice(0, 8).map((e) => `Row ${e.row}: ${e.error}`),
    });
    await load();
    notifyDbUpdate();
  };

  const handleGrantAccess = async () => {
    if (!filterSession || selectedIds.length === 0) return;
    setBusy("access");
    const res = await inviteeService.bulkUpdateSessionAccess(eventId, { inviteeIds: selectedIds, sessionAccess: [{ sessionId: filterSession._id!, allowed: true }] });
    setBusy(null);
    if (res.success) {
      setFeedback({ type: "success", message: `${selectedIds.length} guest(s) can now access ${filterSession.name}.` });
      setSelectedIds([]);
      await load();
    } else {
      setFeedback({ type: "error", message: res.message || "Session access could not be updated." });
    }
  };

  const saveEdit = async (row: { id: string; name: string; email: string; phone: string }) => {
    const res = await inviteeService.updateInvitee(row.id, { name: row.name, email: row.email, mobile: row.phone });
    if (!res.success) {
      showAlert(res.message || "Failed to update invitee.", "error");
      return;
    }
    showAlert("Invitee updated.", "success");
    await load();
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const res = await inviteeService.deleteInvitee(deletingId);
    setDeletingId(null);
    if (!res.success) {
      showAlert(res.message || "Failed to remove invitee.", "error");
      return;
    }
    showAlert("Invitee removed.", "success");
    await load();
    notifyDbUpdate();
  };

  const btn = "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const showCompany = isCorporate;
  const showDietary = lifecycleStarted && !!event?.dietaryPreference?.enabled;

  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader title={sidebarFlow ? "Add Invitees" : event?.title || "Event"} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-5 pb-24">
        {!sidebarFlow && eventId && <EventSubNav eventId={eventId} activeTab="invitees" inviteesCount={invitees.length} />}

        {sidebarFlow && (
          <div className="max-w-md">
            <span className="block text-sm font-medium text-gray-900 mb-1.5">Event</span>
            <CustomDropdown
              value={eventId}
              onChange={(v) => router.replace(`/events/select/invitees?from=sidebar${v ? `&event=${v}` : ""}`)}
              options={eventsOptions}
              placeholder="Select an event"
              emptyMessage="No events yet"
              ariaLabel="Event"
            />
          </div>
        )}

        {feedback && (
          <div role={feedback.type === "error" ? "alert" : "status"} className={`p-3.5 rounded-md border text-sm flex items-start justify-between gap-3 ${feedback.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : feedback.type === "info" ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
            <div className="min-w-0">
              <p className="font-medium break-words">{feedback.message}</p>
              {feedback.details && feedback.details.length > 0 && (
                <ul className="list-disc pl-5 mt-1 text-xs space-y-0.5">
                  {feedback.details.map((d, i) => <li key={i} className="break-words">{d}</li>)}
                </ul>
              )}
            </div>
            <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss" className="shrink-0 cursor-pointer opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {!eventId ? (
          <p className="py-16 text-center text-sm text-[#828282]">Select an event to add invitees and send invitations.</p>
        ) : loadError ? (
          <div role="alert" className="py-12 text-center space-y-3">
            <p className="text-sm text-rose-600 break-words">{loadError}</p>
            <button type="button" onClick={load} className="text-sm font-medium underline cursor-pointer">Retry</button>
          </div>
        ) : (
          <>
            <div className="flex flex-col lg:flex-row lg:items-end gap-3">
              <div className="flex-1 min-w-0">
                <label htmlFor="invitee-search" className="block text-sm font-medium text-gray-900 mb-1.5">Search</label>
                <input
                  id="invitee-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, mobile or company"
                  className="w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:border-[#FF651D]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 lg:w-[380px]">
                <div>
                  <span className="block text-sm font-medium text-gray-900 mb-1.5">Session</span>
                  <CustomDropdown value={sessionFilter} onChange={setSessionFilter} options={[{ value: "", label: "All Sessions" }, ...sessions.map((s) => ({ value: s._id!, label: s.name }))]} ariaLabel="Filter by session" />
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-900 mb-1.5">Send via</span>
                  <CustomDropdown
                    value={channel}
                    onChange={(v) => setChannel(v as Channel)}
                    ariaLabel="Delivery channel"
                    options={[
                      {
                        value: "EMAIL", label: "Email",
                        icon: (
                          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden>
                            <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-.01 0-.02.002-.03l6.966 5.226.001.001 4.397 3.297 4.397-3.297.001-.001L22 5.427c.001.01.002.02.002.03z" fill="#EA4335"/>
                            <path d="M23.927 5L12 13.5.073 5C.494 4.382 1.21 4 2 4h20c.79 0 1.506.382 1.927 1z" fill="#FBBC04"/>
                          </svg>
                        ),
                      },
                      {
                        value: "WHATSAPP", label: "WhatsApp",
                        icon: (
                          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden fill="#25D366">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        ),
                      },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <input ref={fileInput} type="file" accept=".xlsx,.xls" className="sr-only" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
              <button type="button" onClick={() => fileInput.current?.click()} disabled={busy !== null} className={`${btn} bg-[#FF651D] hover:bg-[#E5520F] text-white`}>
                + Add Invitees
              </button>
              <button type="button" onClick={() => downloadInviteeTemplate()} className={`${btn} border border-[#E0E0E0] text-gray-800 hover:bg-gray-50`}>
                Download Excel Sample
              </button>
              <button type="button" onClick={() => setShowListPreview(true)} disabled={invitees.length === 0} className={`${btn} border border-[#E0E0E0] text-gray-800 hover:bg-gray-50`}>
                Preview List
              </button>
              <span className="flex-1" />
              <button type="button" onClick={handleSend} disabled={busy !== null || notInvited.length === 0} className={`${btn} border border-[#FF651D] text-[#E5520F] hover:bg-orange-50`}>
                {busy === "send" ? "Sending..." : selected.some((i) => i.invitationStatus === "PENDING") ? `Send Invitation (${selected.filter((i) => i.invitationStatus === "PENDING").length})` : `Send Invitation${notInvited.length ? ` (${notInvited.length})` : ""}`}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={busy !== null || resendTargets.length === 0}
                title={lifecycleStarted ? (resendTargets.length ? undefined : "Select guests who were already invited") : "Available after invitations have been sent"}
                className={`${btn} border border-[#E0E0E0] text-gray-800 hover:bg-gray-50`}
              >
                {busy === "resend" ? "Resending..." : `Resend Invitation${resendTargets.length ? ` (${resendTargets.length})` : ""}`}
              </button>
              <button type="button" onClick={() => setShowHistory(true)} disabled={history.length === 0} className={`${btn} border border-[#E0E0E0] text-gray-800 hover:bg-gray-50`}>
                History
              </button>
            </div>

            <p className="text-sm text-[#4B4F52]">
              {invitees.length} invitee{invitees.length === 1 ? "" : "s"}
              {lifecycleStarted && <> · {invitees.length - notInvited.length} invited · {notInvited.length} not yet invited</>}
              {selectedIds.length > 0 && <> · {selectedIds.length} selected</>}
            </p>

            {filterSession && selectedIds.length > 0 && ownListSessions.some((s) => s._id === filterSession._id) && (
              <button type="button" onClick={handleGrantAccess} disabled={busy !== null} className={`${btn} bg-[#262A2D] text-white hover:bg-black`}>
                Give selected access to {filterSession.name}
              </button>
            )}

            {loading ? (
              <p className="py-16 text-center text-sm text-[#828282]">Loading invitees...</p>
            ) : invitees.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <p className="text-sm text-[#828282]">No invitees yet. Upload an Excel sheet to add your guest list.</p>
                <button type="button" onClick={() => fileInput.current?.click()} className={`${btn} bg-[#FFF3EC] text-[#E5520F] hover:bg-[#FFE3D7]`}>Add Invitees</button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#E0E0E0] rounded-md">
                <table className="w-full text-left text-sm min-w-[640px]">
                  <thead className="text-[#828282] border-b border-[#D3D3D3]">
                    <tr>
                      <th className="py-3 px-3 w-10">
                        <input
                          type="checkbox"
                          aria-label="Select all visible invitees"
                          checked={allVisibleSelected}
                          onChange={(e) => setSelectedIds(e.target.checked ? [...new Set([...selectedIds, ...visible.map((i) => i._id)])] : selectedIds.filter((id) => !visible.some((v) => v._id === id)))}
                          className="size-4 accent-[#FF651D] cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3 font-medium">Name</th>
                      <th className="py-3 px-3 font-medium">Email</th>
                      <th className="py-3 px-3 font-medium">Mobile Number</th>
                      {showCompany && <th className="py-3 px-3 font-medium">Company Name</th>}
                      {lifecycleStarted && <th className="py-3 px-3 font-medium">Delivery</th>}
                      {lifecycleStarted && <th className="py-3 px-3 font-medium">RSVP</th>}
                      {showDietary && <th className="py-3 px-3 font-medium">Dietary</th>}
                      <th className="py-3 px-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEEEEE] text-[#4B4F52]">
                    {visible.map((i) => {
                      const failure = historyByInvitee.get(i._id)?.failureReason;
                      return (
                        <tr key={i._id} className="hover:bg-gray-50/70">
                          <td className="py-3 px-3">
                            <input
                              type="checkbox"
                              aria-label={`Select ${i.name}`}
                              checked={selectedIds.includes(i._id)}
                              onChange={() => setSelectedIds((p) => (p.includes(i._id) ? p.filter((x) => x !== i._id) : [...p, i._id]))}
                              className="size-4 accent-[#FF651D] cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3 text-gray-900 font-medium break-words max-w-[220px]">{i.name}</td>
                          <td className="py-3 px-3 break-all max-w-[240px]">{i.email || "—"}</td>
                          <td className="py-3 px-3 whitespace-nowrap">{formatPhoneNumber(i.mobile) || "—"}</td>
                          {showCompany && <td className="py-3 px-3 break-words">{i.companyName || i.company || "—"}</td>}
                          {lifecycleStarted && (
                            <td className="py-3 px-3">
                              {i.invitationStatus === "SENT" ? pill("bg-[#C0FFD5] text-[#1A9242]", "Sent") : i.invitationStatus === "FAILED" ? (
                                <span className="flex flex-col gap-0.5">{pill("bg-rose-100 text-rose-700", "Failed")}{failure && <span className="text-xs text-rose-600 break-words max-w-[200px]">{failure}</span>}</span>
                              ) : pill("bg-gray-100 text-gray-700", "Not sent")}
                            </td>
                          )}
                          {lifecycleStarted && (
                            <td className="py-3 px-3">
                              {i.rsvpStatus === "ACCEPTED" ? pill("bg-[#C0FFD5] text-[#1A9242]", "Accepted") : i.rsvpStatus === "DECLINED" ? pill("bg-rose-100 text-rose-700", "Declined") : pill("bg-[#FFE9C0] text-[#9E8C00]", "Pending")}
                            </td>
                          )}
                          {showDietary && <td className="py-3 px-3">{i.dietaryPreference || "—"}</td>}
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-end gap-1">
                              <button type="button" onClick={() => setCardFor(i)} aria-label={`Preview card for ${i.name}`} title="Preview card" className="p-1.5 rounded text-[#E5520F] hover:bg-orange-50 cursor-pointer">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              </button>
                              <button type="button" onClick={() => setEditing({ id: i._id, name: i.name, email: i.email || "", phone: i.mobile || "" })} aria-label={`Edit ${i.name}`} title="Edit" className="p-1.5 rounded text-gray-600 hover:bg-gray-100 cursor-pointer">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button type="button" onClick={() => setDeletingId(i._id)} aria-label={`Remove ${i.name}`} title="Remove" className="p-1.5 rounded text-rose-600 hover:bg-rose-50 cursor-pointer">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {visible.length === 0 && (
                      <tr><td colSpan={9} className="py-10 text-center text-[#828282]">No invitees match the current filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {upload && (
        <InviteesPreviewModal
          title="Invitees List Preview"
          subtitle={`${upload.file.name} · Importing replaces the current not-yet-invited list. Guests who were already invited are kept.`}
          rows={upload.rows}
          showCompany={isCorporate || upload.rows.some((r) => r.company)}
          onClose={() => setUpload(null)}
          onSave={handleImport}
        />
      )}
      {showListPreview && (
        <InviteesPreviewModal
          title="Invitees List"
          subtitle={event?.title}
          rows={invitees.map((i, idx) => ({ id: String(idx + 1), name: i.name, email: i.email || "", phone: i.mobile || "", company: i.companyName || i.company || "" }))}
          showCompany={showCompany}
          onClose={() => setShowListPreview(false)}
        />
      )}
      {cardFor && <CardPreviewModal eventId={eventId} inviteeId={cardFor._id} inviteeName={cardFor.name} onClose={() => setCardFor(null)} />}
      <EditInviteeModal isOpen={!!editing} onClose={() => setEditing(null)} invitee={editing} onSave={saveEdit} />
      <DeleteInviteeModal isOpen={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={confirmDelete} />

      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="history-title">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <h2 id="history-title" className="text-base font-medium text-gray-900">Invitation Delivery History</h2>
              <button type="button" onClick={() => setShowHistory(false)} aria-label="Close" className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <table className="w-full text-left text-sm min-w-[560px]">
                <thead className="text-[#828282] border-b border-[#D3D3D3]">
                  <tr><th className="py-2 pr-3 font-medium">Invitee</th><th className="py-2 pr-3 font-medium">Channel</th><th className="py-2 pr-3 font-medium">Status</th><th className="py-2 pr-3 font-medium">Reason</th><th className="py-2 font-medium">When</th></tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEEE] text-[#4B4F52]">
                  {history.map((h) => (
                    <tr key={h._id}>
                      <td className="py-2.5 pr-3 text-gray-900">{typeof h.inviteeId === "object" && h.inviteeId ? h.inviteeId.name : "—"}</td>
                      <td className="py-2.5 pr-3">{h.channel}</td>
                      <td className="py-2.5 pr-3">{h.status === "SENT" ? pill("bg-[#C0FFD5] text-[#1A9242]", "Sent") : h.status === "FAILED" ? pill("bg-rose-100 text-rose-700", "Failed") : pill("bg-gray-100 text-gray-700", h.status)}</td>
                      <td className="py-2.5 pr-3 text-rose-600 text-xs break-words max-w-[220px]">{h.failureReason || "—"}</td>
                      <td className="py-2.5 text-xs whitespace-nowrap">{formatDateTime(h.sentAt || h.createdAt, "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
