"use client";

import { eventCanIssuePasses, isHistoricalEvent } from "@/utils/eventUtils";
import ClosedEventNotice from "@/components/events/ClosedEventNotice";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import InviteesPreviewModal from "@/components/add-event/modals/InviteesPreviewModal";
import InviteeListPreviewModal from "@/components/invitees/InviteeListPreviewModal";
import EditInviteeModal from "@/components/add-event/modals/EditInviteeModal";
import DeleteInviteeModal from "@/components/add-event/modals/DeleteInviteeModal";
import AddInviteeChooserModal from "@/components/add-event/modals/AddInviteeChooserModal";
import AddInviteeManualModal from "@/components/add-event/modals/AddInviteeManualModal";
import SendWarningModal from "@/components/invitees/SendWarningModal";
import InfoTip from "@/components/common/InfoTip";
import PageHeader from "@/components/common/PageHeader";
import ButtonIcon from "@/components/common/ButtonIcons";
import CustomDropdown from "@/components/common/CustomDropdown";
import EventSubNav, { notifyDbUpdate } from "@/components/EventSubNav";
import { eventService } from "@/services/eventService";
import { sessionService, SessionData } from "@/services/sessionService";
import { inviteeService, type ImportMode, type ImportPreview } from "@/services/inviteeService";
import { invitationService, InvitationData } from "@/services/invitationService";
import { useAlert } from "@/context/AlertContext";
import { formatPhoneNumber } from "@/utils/eventUtils";
import { formatDateTime } from "@/utils/dateTime";
import { downloadInviteeTemplate } from "@/utils/inviteeTemplate";
import { InviteeSheetRow, missingColumnsMessage, parseInviteeSheet, rowsToSheetFile } from "@/utils/inviteeSheet";
import SampleReminderModal from "@/components/invitees/SampleReminderModal";
import { acknowledgeSampleReminder, sampleReminderAcknowledged } from "@/utils/sampleReminder";
import ImportModeDialog from "@/components/invitees/ImportModeDialog";
import { ownListSessions, sessionPickOptionsFor, listIdFor } from "@/utils/sessionPick";
import InviteeListsModal from "@/components/invitees/InviteeListsModal";
import { canManageInviteeLists, previewDiscrepancy } from "@/utils/inviteeLists";
import { excelColumnsFor, expectedColumnsFor, headerFor, inviteeConfigFor, inviteeFieldsFor } from "@/utils/inviteeFields";
import { dietaryAnswer, dietaryQuestionTitles } from "@/utils/dietaryAnswers";
import { summarizeDelivery, type DeliveryOutcome } from "@/utils/deliverySummary.mjs";
import { TableSkeleton } from "@/components/common/Skeleton";
import Icon from "@/components/icons/Icon";
import PassActionModal from "@/components/invitees/PassActionModal";
import { credentialService, CredentialHistoryRow, CredentialStatus } from "@/services/credentialService";
import { STATUS_PILL, hasUnknown, hasUnsent, historyReason, historyTitle, noticeText, passRef, reasonLabel, replaceAvailability, revokeAvailability } from "@/utils/credentialUi";

interface Invitee {
  _id: string;
  name: string;
  email?: string;
  mobile?: string;
  companyName?: string;
  company?: string;
  dietaryPreference?: string;
  dietarySelections?: { title: string; value: string }[];
  invitationStatus: "PENDING" | "SENT" | "FAILED";
  rsvpStatus: "PENDING" | "ACCEPTED" | "DECLINED";
  sessionAccess?: { sessionId: string; allowed: boolean }[];
  // access pass: its own status, separate from delivery and RSVP
  credentialStatus?: CredentialStatus;
  credentialRevocation?: { category?: string; at?: string } | null;
}

const INVITEE_PAGE_SIZE = 50;

type Channel = "EMAIL" | "WHATSAPP" | "BOTH";
type Feedback = { type: "success" | "error" | "info"; message: string; details?: string[] } | null;

const pill = (cls: string, text: string) => <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>{text}</span>;

// Access follows the source session for sessions that keep another session's invitees
function allowedIn(inv: Invitee, session: SessionData): boolean {
  if (!inv.sessionAccess || inv.sessionAccess.length === 0) return true;
  const target = session.inviteeSource === "COPY_SESSION" && session.sourceSessionId ? session.sourceSessionId : session._id;
  const entry = inv.sessionAccess.find((a) => String(a.sessionId) === String(target));
  return !!entry && entry.allowed !== false;
}

// Status column (Figma 217:20587): delivery state, or the guest's answer once they have replied
function InviteeStatusPill({ invitationStatus, rsvpStatus }: { invitationStatus: Invitee["invitationStatus"]; rsvpStatus: Invitee["rsvpStatus"] }) {
  if (invitationStatus === "FAILED") return pill("bg-[#FFE3D7] text-[#FF651D]", "Sending Failed");
  if (invitationStatus === "PENDING") return pill("bg-[#EDEDED] text-[#6E6E6E]", "Not Yet Sent");
  if (rsvpStatus === "ACCEPTED") return pill("bg-[#CCD2FF] text-[#2C2EB5]", "Accepted");
  if (rsvpStatus === "DECLINED") return pill("bg-[#FFE9C0] text-[#9E8C00]", "Declined");
  return pill("bg-[#C0FFD5] text-[#1A9242]", "Successfully Sent");
}

// "⋯" row menu (Figma 217:20587: dark panel with a pointer). Edit and Resend as designed; card preview and remove kept.
function InviteeRowMenu({ name, onEdit, onResend, onReplace, onRevoke, replaceNote, revokeNote, onRemove }: { name: string; onEdit?: () => void; onResend?: () => void; onReplace?: () => void; onRevoke?: () => void; replaceNote?: string; revokeNote?: string; onRemove?: () => void }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!position) return;
    const close = (e: MouseEvent) => {
      if (!buttonRef.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) setPosition(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [position]);
  const MENU_WIDTH = 176;
  const toggle = () => {
    if (position) { setPosition(null); return; }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const height = 8 + 24 + (onResend ? 5 : 4) * 28;
    const below = rect.bottom + height + 8 <= window.innerHeight;
    setPosition({ top: below ? rect.bottom + 4 : Math.max(8, rect.top - height - 4), left: Math.max(8, Math.min(rect.left + rect.width / 2 - MENU_WIDTH / 2, window.innerWidth - MENU_WIDTH - 8)) });
  };
  const run = (action: () => void) => () => { setPosition(null); action(); };
  const base = "flex items-center gap-1.5 py-1 text-sm font-medium cursor-pointer text-left";
  const item = `${base} text-white hover:text-[#FFB08A]`;
  const off = "flex items-center gap-1.5 py-1 text-sm font-medium text-left text-[#7C8185] cursor-not-allowed";
  return (
    <>
      <button ref={buttonRef} type="button" onClick={toggle} aria-label={`Actions for ${name}`} aria-expanded={!!position} className="px-2 py-1 rounded hover:bg-gray-100 cursor-pointer">
        <span aria-hidden className="text-[10px] text-[#3B3B3B] tracking-[1px]">●●●</span>
      </button>
      {position && createPortal(
        <div ref={menuRef} style={{ position: "fixed", ...position, width: MENU_WIDTH }} className="z-[9999] flex flex-col items-center">
          <Icon name="events/menu-arrow" width={16} height={8} />
          <div className="w-full bg-[#15191C] rounded-xl px-4 py-3 flex flex-col gap-[3px]" role="menu">
            {onEdit && <button type="button" role="menuitem" onClick={run(onEdit)} className={item}><Icon name="events/edit" width={16} height={16} />Edit</button>}
            {onResend && <button type="button" role="menuitem" onClick={run(onResend)} className={item}><Icon name="events/send" width={16} height={16} />Resend Invitation</button>}
            {onReplace
              ? <button type="button" role="menuitem" onClick={run(onReplace)} className={item}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12a9 9 0 0 0-15-6.7L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/><path d="M21 21v-5h-5"/></svg>Replace Access Pass</button>
              : <span role="menuitem" aria-disabled="true" title={replaceNote} className={off}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12a9 9 0 0 0-15-6.7L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/><path d="M21 21v-5h-5"/></svg>Replace Access Pass</span>}
            {onRevoke
              ? <button type="button" role="menuitem" onClick={run(onRevoke)} className={item}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>Revoke Access Pass</button>
              : <span role="menuitem" aria-disabled="true" title={revokeNote} className={off}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>Revoke Access Pass</span>}
            {onRemove && <button type="button" role="menuitem" onClick={run(onRemove)} className={`${base} text-rose-300 hover:text-rose-200`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/></svg>Remove</button>}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Borderless picker from Figma 217:21076 ("Product Launch Event 2026 ▾", "All Session ▾"): 12px medium grey text
function PlainSelect({ value, onChange, options, ariaLabel, placeholder, disabled }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; ariaLabel: string; placeholder?: string; disabled?: boolean }) {
  return <CustomDropdown variant="plain" value={value} onChange={onChange} options={options} ariaLabel={ariaLabel} placeholder={placeholder} disabled={disabled} />;
}

export default function InviteesManagementPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeId = (params?.id as string) || "";
  // The sidebar "Add Invitees" flow lives under /events/select/invitees and keeps its own context
  const sidebarFlow = routeId === "select";
  const eventId = sidebarFlow ? searchParams.get("event") || "" : routeId;
  const { showAlert, confirm } = useAlert();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [eventsOptions, setEventsOptions] = useState<{ value: string; label: string }[]>([]);
  const [event, setEvent] = useState<{ title?: string; status?: string; schedule?: { start?: string; end?: string }; categoryId?: { name?: string } | string; dietaryPreference?: { enabled?: boolean; title?: string; options?: unknown[] }; cardInfo?: { primary?: string | null; secondary?: string | null } } | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [history, setHistory] = useState<InvitationData[]>([]);
  const [loading, setLoading] = useState(!!eventId);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteePage, setInviteePage] = useState(1);
  const [search, setSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [invitationFilter, setInvitationFilter] = useState<"" | "SENT" | "NOT_SENT">("");
  const [channel, setChannel] = useState<Channel>("BOTH");
  const [busy, setBusy] = useState<null | "send" | "resend" | "import" | "access" | "clear">(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [importChoice, setImportChoice] = useState<{ rows: InviteeSheetRow[]; fileName: string; sentSets: number | null; previews: { replace: ImportPreview | null; append: ImportPreview | null } | null; previewError: string | null } | null>(null);
  const [upload, setUpload] = useState<{ file: File; rows: InviteeSheetRow[] } | null>(null);
  const [showListPreview, setShowListPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [listsTab, setListsTab] = useState<"lists" | "aside" | null>(null);
  const [passAction, setPassAction] = useState<{ action: "REVOKE" | "REPLACE"; invitee: Invitee; needsReview?: boolean } | null>(null);
  const [passHistory, setPassHistory] = useState<CredentialHistoryRow[] | null>(null);
  const [passHistoryError, setPassHistoryError] = useState<string | null>(null);
  const [ackDuplicate, setAckDuplicate] = useState(false);
  const [retryingNotices, setRetryingNotices] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; email: string; phone: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showChooser, setShowChooser] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  // Which session the guests being added belong to ("" = the whole event); only asked when sessions keep their own lists
  const [targetSessionId, setTargetSessionId] = useState("");
  const [sampleReminder, setSampleReminder] = useState(false);
  const [confirmFirstSend, setConfirmFirstSend] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const sendInFlight = useRef(false);
  const resendInFlight = useRef(false);
  const importInFlight = useRef(false);

  // Figma 217:21076 has an event picker beside the search in both the sidebar flow and an event's own tab
  useEffect(() => {
    eventService.getEvents().then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setEventsOptions(list.filter((e) => e.status !== "CANCELLED").map((e) => ({ value: e._id || e.id || "", label: e.title || "Untitled event" })));
    });
  }, []);

  // The skeleton is for the first load of an event; a refresh after an action keeps the rows on screen and swaps the data in
  const loadedFor = useRef<string | null>(null);
  const load = useCallback(async () => {
    if (!eventId) return;
    if (loadedFor.current !== eventId) setLoading(true);
    setLoadError(null);
    // The delivery history only adds retry buttons and failure reasons: it is requested together with the rest, but the guest list
    // is shown as soon as the guests themselves arrive instead of waiting for it.
    const historyRequest = invitationService.getAllInvitations(eventId);
    const [evtRes, sessRes, invRes] = await Promise.all([
      eventService.getEvent(eventId),
      sessionService.getSessions(eventId),
      inviteeService.getInvitees(eventId),
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
    setSelectedIds((prev) => prev.filter((id) => (invRes.data as unknown as Invitee[] | undefined)?.some((i) => i._id === id)));
    loadedFor.current = eventId;
    setLoading(false);
    void historyRequest.then((histRes) => {
      if (loadedFor.current !== eventId) return; // another event was opened meanwhile
      const h = histRes.success && histRes.data ? (Array.isArray(histRes.data) ? histRes.data : (histRes.data as { invitations?: InvitationData[] }).invitations || []) : [];
      setHistory(h);
    });
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadPassHistory = useCallback(async () => {
    try {
      const res = await credentialService.history(eventId);
      if (res.success && Array.isArray(res.data)) { setPassHistory(res.data); setPassHistoryError(null); }
      else setPassHistoryError(res.message || "The pass history could not be loaded.");
    } catch (e) {
      setPassHistoryError(e instanceof Error ? e.message : "The pass history could not be loaded.");
    }
  }, [eventId]);
  useEffect(() => { if (showHistory) void Promise.resolve().then(loadPassHistory); }, [showHistory, loadPassHistory]);

  const retryPassNotices = async (includeUnknown: boolean) => {
    setRetryingNotices(true);
    await credentialService.retryNotices(eventId, { includeUnknown }).catch(() => undefined);
    setAckDuplicate(false);
    await loadPassHistory();
    setRetryingNotices(false);
  };

  // Super Admin frame 2114:6535 shows RSVP as its own column; "--" when the event does not ask guests to respond
  const rsvpEnabled = (event as { rsvp?: { enabled?: boolean } } | null)?.rsvp?.enabled !== false;
  const categoryName = event && typeof event.categoryId === "object" ? event.categoryId?.name || "" : "";
  const isCorporate = /corporate/i.test(categoryName);
  // The invitation lifecycle has started once any guest was sent (or attempted) an invitation
  const lifecycleStarted = invitees.some((i) => i.invitationStatus !== "PENDING") || history.length > 0;
  // Cleared entries stay in `history` (Resend needs their ids) but are not shown in the delivery history
  const visibleHistory = history.filter((h) => !h.clearedAt);
  const historical = isHistoricalEvent(event?.status);
  const canIssue = eventCanIssuePasses(event);
  const notInvited = invitees.filter((i) => i.invitationStatus === "PENDING");
  // The list is newest-first, so keep the first record seen per guest: the latest delivery is the one to resend
  // and the one whose failure reason is shown
  const historyByInvitee = new Map<string, InvitationData>();
  for (const h of history) {
    const key = String(typeof h.inviteeId === "object" ? h.inviteeId?._id : h.inviteeId);
    if (!historyByInvitee.has(key)) historyByInvitee.set(key, h);
  }
  const selected = invitees.filter((i) => selectedIds.includes(i._id));
  const resendTargets = selected.map((i) => historyByInvitee.get(i._id)).filter((h): h is InvitationData => !!h?._id);
  const ownLists = ownListSessions(sessions);
  // the choice of session is only needed when more than one session has its own invitee list
  const sessionPickOptions = sessionPickOptionsFor(sessions);
  // The server wants the session that owns the guest list; a session that shares another's list resolves to that owner
  const targetListId = listIdFor(sessionPickOptions, targetSessionId);

  const filterSession = sessions.find((s) => s._id === sessionFilter);
  const term = search.trim().toLowerCase();
  const filteredInvitees = invitees.filter(
    (i) =>
      (!term || [i.name, i.email, i.mobile, i.companyName].some((v) => (v || "").toLowerCase().includes(term))) &&
      (!filterSession || allowedIn(i, filterSession)) &&
      (!invitationFilter || (invitationFilter === "SENT") === (i.invitationStatus === "SENT"))
  );
  const inviteePageCount = Math.max(1, Math.ceil(filteredInvitees.length / INVITEE_PAGE_SIZE));
  const visible = filteredInvitees.slice((inviteePage - 1) * INVITEE_PAGE_SIZE, inviteePage * INVITEE_PAGE_SIZE);
  const allVisibleSelected = visible.length > 0 && visible.every((i) => selectedIds.includes(i._id));

  useEffect(() => {
    setInviteePage(1);
  }, [term, sessionFilter, invitationFilter]);

  useEffect(() => {
    if (inviteePage > inviteePageCount) setInviteePage(inviteePageCount);
  }, [inviteePage, inviteePageCount]);

  const summarize = (results: DeliveryOutcome[], verb: string): Feedback => summarizeDelivery(results, verb, channel);

  // Who "Send Invitation" goes to: the ticked guests, or everyone shown by the "Not sent" filter. Guests already invited are always left out.
  const sendTargets = (selected.length ? selected : invitationFilter === "NOT_SENT" ? filteredInvitees : []).filter((i) => i.invitationStatus === "PENDING");

  const handleSend = async () => {
    if (sendInFlight.current) return;
    const targets = sendTargets;
    if (targets.length === 0) {
      showAlert(selected.length ? "The selected guests were already invited. Use Resend Invitation." : "Everyone on the list has been invited.", "info");
      return;
    }
    setBusy("send");
    sendInFlight.current = true;
    setFeedback(null);
    try {
      const res = await invitationService.sendInvitations(eventId, { inviteeIds: targets.map((t) => t._id), channel });
      const results = (res.data?.results || (res as { results?: { status: string; failureReason?: string; emailStatus?: string; whatsappStatus?: string }[] }).results || []) as { status: string; failureReason?: string; emailStatus?: string; whatsappStatus?: string }[];
      setFeedback(res.success || results.length ? summarize(results, "sent") : { type: "error", message: res.message || "Invitations could not be sent." });
      if (res.success || results.length) setSelectedIds([]);
      await load();
      notifyDbUpdate();
    } catch {
      setFeedback({ type: "error", message: "The invitation request could not reach the server. Your selections are kept; please retry." });
    } finally {
      sendInFlight.current = false;
      setBusy(null);
    }
  };

  // The first send locks the event, so it goes through the Figma warning (2001:2443); later sends go straight out
  const requestSend = () => {
    if (lifecycleStarted) handleSend();
    else setConfirmFirstSend(true);
  };

  const handleResend = async (targets: InvitationData[] = resendTargets) => {
    if (targets.length === 0 || resendInFlight.current) return;
    setBusy("resend");
    resendInFlight.current = true;
    setFeedback(null);
    try {
      const res = await invitationService.resendInvitations(eventId, { invitationIds: targets.map((h) => h._id), channel });
      const results = (res.data?.results || (res as { results?: { status: string; failureReason?: string; emailStatus?: string; whatsappStatus?: string }[] }).results || []) as { status: string; failureReason?: string; emailStatus?: string; whatsappStatus?: string }[];
      setFeedback(res.success || results.length ? summarize(results, "resent") : { type: "error", message: res.message || "Invitations could not be resent." });
      if (res.success || results.length) setSelectedIds([]);
      await load();
    } catch {
      setFeedback({ type: "error", message: "The resend request could not reach the server. Your selections are kept; please retry." });
    } finally {
      resendInFlight.current = false;
      setBusy(null);
    }
  };

  const handleClearHistory = async () => {
    const confirmed = await confirm({
      title: "Clear delivery history?",
      message: "This only clears the history list. Invitations already sent stay valid and you can still resend them. New deliveries will appear here again.",
      confirmText: "Clear history",
      tone: "danger",
    });
    if (!confirmed) return;
    setBusy("clear");
    const res = await invitationService.clearHistory(eventId);
    setBusy(null);
    if (!res.success) {
      showAlert(res.message || "The history could not be cleared. Please try again.", "error");
      return;
    }
    // Mark the local copy as cleared instead of refetching: the records stay (Resend needs their ids)
    const now = new Date().toISOString();
    setHistory((prev) => prev.map((h) => (h.clearedAt ? h : { ...h, clearedAt: now })));
    setShowHistory(false);
    showAlert("Delivery history cleared.", "success");
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = await parseInviteeSheet(file, ownLists.map((session) => session.name), expectedColumnsFor(fieldConfig));
      if (parsed.missingColumns.length > 0) {
        setFeedback({ type: "error", message: missingColumnsMessage(parsed.missingColumns) });
        return;
      }
      if (parsed.rows.length === 0) {
        setFeedback({ type: "error", message: "The sheet has no invitee rows." });
        return;
      }
      setUpload({ file, rows: parsed.rows });
    } catch {
      setFeedback({ type: "error", message: "The file could not be read. Upload an .xlsx or .xls sheet." });
    }
  };

  // With nobody on the list yet there is nothing to replace; otherwise the organizer chooses Add or Replace first
  const handleImport = async (rows: InviteeSheetRow[]) => {
    if (!upload || importInFlight.current) return;
    if (rows.length > 1000) {
      setFeedback({ type: "error", message: "A sheet can contain at most 1,000 invitees. Remove some rows or split the upload." });
      return;
    }
    if (invitees.length === 0) {
      await runImport(rows, upload.file.name, "REPLACE");
      return;
    }
    setImportChoice({ rows, fileName: upload.file.name, sentSets: null, previews: null, previewError: null });
    const sets = await inviteeService.getInviteeSets(eventId).catch(() => null);
    // if the lookup fails, say nothing misleading: the dialog still explains that invited guests are never removed
    setImportChoice((cur) => (cur ? { ...cur, sentSets: sets?.success && sets.data ? sets.data.sets.filter((x) => x.locked).length : 0 } : cur));
    // what each choice would do, from the server (writes nothing); the real import checks everything again
    try {
      const file = await rowsToSheetFile(rows, upload.file.name, ownLists.map((session) => session.name));
      const [rep, app] = await Promise.all([
        inviteeService.importExcel(eventId, file, targetListId || undefined, "REPLACE", { dryRun: true }),
        inviteeService.importExcel(eventId, file, targetListId || undefined, "APPEND", { dryRun: true }),
      ]);
      setImportChoice((cur) => (cur ? { ...cur, previews: rep.success && app.success && rep.data?.preview && app.data?.preview ? { replace: rep.data.preview, append: app.data.preview } : null, previewError: rep.success && app.success ? null : "The preview is not available right now; the import will still check everything before changing anything." } : cur));
    } catch {
      setImportChoice((cur) => (cur ? { ...cur, previewError: "The preview is not available right now; the import will still check everything before changing anything." } : cur));
    }
  };

  const runImport = async (rows: InviteeSheetRow[], fileName: string, mode: ImportMode, forecast?: ImportPreview | null) => {
    if (importInFlight.current) return;
    setBusy("import");
    importInFlight.current = true;
    setFeedback(null);
    let res: Awaited<ReturnType<typeof inviteeService.importExcel>>;
    try {
      res = await inviteeService.importExcel(eventId, await rowsToSheetFile(rows, fileName, ownLists.map((session) => session.name)), targetListId || undefined, mode);
    } catch {
      setFeedback({ type: "error", message: "The import request could not reach the server. Existing invitees are unchanged; please retry." });
      return;
    } finally {
      importInFlight.current = false;
      setBusy(null);
    }
    setImportChoice(null);
    setUpload(null);
    if (!res.success || !res.data) {
      setFeedback({ type: "error", message: res.message || "The invitee list could not be imported." });
      return;
    }
    const d = res.data;
    const drift = previewDiscrepancy(forecast, { imported: d.imported, archived: d.archived });
    const parts = [`${d.imported} added`];
    if (d.updated) parts.push(`${d.updated} already on the list`);
    if (d.alreadyInvited) parts.push(`${d.alreadyInvited} already invited (not imported again)`);
    if (d.archived) parts.push(`${d.archived} never-invited guest(s) of the earlier list set aside (see Uploaded Lists > Set-aside guests)`);
    if (d.preservedSets) parts.push(`${d.preservedSets} previously sent list(s) preserved`);
    if (d.failedKept) parts.push(`${d.failedKept} guest(s) with failed sends kept (they can be retried)`);
    if (d.unknownKept) parts.push(`${d.unknownKept} guest(s) with an unresolved delivery kept`);
    if (d.duplicateCount) parts.push(`${d.duplicateCount} duplicate row(s) skipped`);
    if (d.rejected) parts.push(`${d.rejected} rejected`);
    setFeedback({
      type: d.rejected ? "error" : "success",
      message: `Invitee list imported: ${parts.join(", ")}.${drift ? ` ${drift}` : ""}`,
      // Row-level summary: rejected rows first, then rows whose existing guest details were kept
      details: [...(d.errors || []).map((e) => `Row ${e.row}: ${e.error}`), ...(d.notices || []).map((n) => `Row ${n.row}: ${n.message}`)].slice(0, 10),
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
  // Figma send button: outlined orange, 16px semibold, washed out until something can be sent
  const primaryOutline = "inline-flex items-center gap-2 px-6 py-[11px] border border-[#FF651D] text-[#FF651D] bg-white hover:bg-orange-50 text-base font-semibold rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  // one definition of the event's invitee fields drives the Excel sample, this preview, and the manual Add Invitee form
  const fieldConfig = inviteeConfigFor({ cardInfo: event?.cardInfo, dietaryEnabled: !!event?.dietaryPreference?.enabled, corporate: isCorporate });
  const sampleColumns = excelColumnsFor(fieldConfig);
  const showCompany = fieldConfig.company;
  // One column per question asked on the digital access card, filled from what each guest chose there
  const dietaryTitles = lifecycleStarted ? dietaryQuestionTitles(event?.dietaryPreference) : [];

  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader title={user?.role === "ORGANIZER" ? "Invitees Management" : sidebarFlow ? "Add Invitees" : "Event"} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
      <div className="px-4 sm:px-6 py-4 sm:py-6 w-full space-y-5 pb-24">
        {!sidebarFlow && eventId && <EventSubNav eventId={eventId} activeTab="invitees" inviteesCount={loading ? undefined : invitees.length} />}

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
          // Figma 431:550 (Add Invitation step 1): the toolbar with nothing chosen yet, then the "No invitees yet" state
          <>
            <div className="flex flex-col xl:flex-row xl:items-center gap-3">
              <div className="flex flex-1 items-center gap-2.5 min-w-0">
                <label htmlFor="invitee-search-empty" className="text-[17px] font-medium text-black shrink-0">Invitees</label>
                <div className="relative flex-1 min-w-0">
                  <Icon name="events/search" width={18} height={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60" />
                  <input id="invitee-search-empty" type="search" value="" readOnly disabled placeholder="Search invitees" className="w-full h-[47px] pl-12 pr-4 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs font-medium placeholder:text-[#828282] cursor-not-allowed" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <PlainSelect
                  ariaLabel="Select event"
                  value=""
                  placeholder="Select Event"
                  onChange={(v) => router.replace(`/events/select/invitees?from=sidebar${v ? `&event=${v}` : ""}`)}
                  options={eventsOptions}
                />
                <PlainSelect ariaLabel="Select session" value="" placeholder="Select Session" onChange={() => {}} options={[]} disabled />
                <button type="button" onClick={() => showAlert("Select an event first, then add its invitees.", "info")} className="inline-flex items-center gap-2 px-6 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg cursor-pointer">
                  <Icon name="events/add-white" width={24} height={24} />
                  Add Invitees
                </button>
                <button type="button" disabled className={primaryOutline}>
                  <ButtonIcon name="send" />
                  Send Invitation
                </button>
              </div>
            </div>
            <div className="py-[110px] flex flex-col items-center text-center gap-4">
              <svg className="w-20 h-20 text-[#BDBDBD]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
              <p className="max-w-[300px] text-base text-[#4B4F52]">No invitees yet. Add invitees to your event to get started.</p>
              <button type="button" onClick={() => showAlert("Select an event first, then add its invitees.", "info")} className="px-6 py-2 rounded-md bg-[#F6F6F6] hover:bg-gray-200 text-base font-medium text-[#FF651D] cursor-pointer">Add Invitees</button>
            </div>
          </>
        ) : loadError ? (
          <div role="alert" className="py-12 text-center space-y-3">
            <p className="text-sm text-rose-600 break-words">{loadError}</p>
            <button type="button" onClick={load} className="text-sm font-medium underline cursor-pointer">Retry</button>
          </div>
        ) : (
          <>
            <ClosedEventNotice status={event?.status} />
            {/* Controls (Figma 217:21076 / 217:20587): Invitees + search, event, session, Add Invitees, then Send — or Resend
                once everyone has been invited */}
            <div className="flex flex-col 2xl:flex-row 2xl:items-center gap-3">
              <div className="flex flex-1 items-center gap-2.5 min-w-0">
                <label htmlFor="invitee-search" className="text-[17px] font-medium text-black shrink-0">Invitees</label>
                <div className="relative flex-1 min-w-0">
                  <Icon name="events/search" width={18} height={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60" />
                  <input
                    id="invitee-search"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search invitees"
                    className="w-full h-[47px] pl-12 pr-4 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs font-medium text-gray-900 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D]"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* The Super Admin frame (2114:6535) has no event picker on an event's own tab */}
                {sidebarFlow && eventsOptions.length > 0 && (
                  <PlainSelect
                    ariaLabel="Event"
                    value={eventId}
                    onChange={(v) => router.replace(`/events/select/invitees?from=sidebar${v ? `&event=${v}` : ""}`)}
                    options={eventsOptions}
                  />
                )}
                {!sidebarFlow && !isAdmin && eventsOptions.length > 0 && (
                  <PlainSelect
                    ariaLabel="Event"
                    value={eventId}
                    onChange={(v) => router.push(`/events/${v}/invitees`)}
                    options={eventsOptions.some((o) => o.value === eventId) ? eventsOptions : [{ value: eventId, label: event?.title || "This event" }, ...eventsOptions]}
                  />
                )}
                <PlainSelect ariaLabel="Filter by session" value={sessionFilter} onChange={setSessionFilter} options={[{ value: "", label: "All Session" }, ...sessions.map((s) => ({ value: s._id!, label: s.name }))]} />
                <PlainSelect ariaLabel="Filter by invitation" value={invitationFilter} onChange={(v) => setInvitationFilter(v as "" | "SENT" | "NOT_SENT")} options={[{ value: "", label: "All Invitations" }, { value: "SENT", label: "Invitation Sent" }, { value: "NOT_SENT", label: "Not Sent" }]} />
                {!historical && (
                <button type="button" onClick={() => setShowChooser(true)} disabled={busy !== null || !event} className="inline-flex items-center gap-2 px-6 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg cursor-pointer disabled:opacity-50">
                  <Icon name="events/add-white" width={24} height={24} />
                  Add Invitees
                </button>
                )}
                {notInvited.length > 0 || !lifecycleStarted ? (
                  <button type="button" onClick={requestSend} disabled={!canIssue || busy !== null || sendTargets.length === 0} title={!canIssue ? "This event is over, so invitations can no longer be sent" : sendTargets.length ? undefined : "Tick the guests to invite, or filter by Not Sent"} className={`${primaryOutline}`}>
                    <ButtonIcon name={busy === "send" ? "spinner" : "send"} />
                    {busy === "send" ? "Sending..." : sendTargets.length ? `Send Invitation (${sendTargets.length})` : "Send Invitation"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleResend()}
                    disabled={!canIssue || busy !== null || resendTargets.length === 0}
                    title={!canIssue ? "This event is over, so invitations can no longer be sent" : resendTargets.length ? undefined : "Select guests to resend to"}
                    className={`${primaryOutline}`}
                  >
                    <ButtonIcon name={busy === "resend" ? "spinner" : "resend"} />
                    {busy === "resend" ? "Resending..." : `Resend Invitation${resendTargets.length ? ` (${resendTargets.length})` : ""}`}
                  </button>
                )}
              </div>
            </div>

            {/* Working tools the frames do not show are kept in a secondary row */}
            <div className="flex flex-wrap items-center gap-2.5">
              <input ref={fileInput} type="file" accept=".xlsx,.xls" aria-label="Upload invitee Excel file" className="sr-only" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
              <div className="w-[230px]">
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
                      { value: "BOTH", label: "All (Email + WhatsApp)" },
                    ]}
                />
              </div>
              <button type="button" onClick={() => downloadInviteeTemplate(fieldConfig)} className={`${btn} border border-[#E0E0E0] text-gray-800 hover:bg-gray-50`}>
                <ButtonIcon name="download" />
                Download Excel Sample
              </button>
              <button type="button" onClick={() => setShowListPreview(true)} disabled={invitees.length === 0} className={`${btn} border border-[#E0E0E0] text-gray-800 hover:bg-gray-50`}>
                <ButtonIcon name="eye" />
                Preview List
              </button>
              {canManageInviteeLists(user?.role) && (
                <span className="inline-flex items-center gap-1.5">
                  <button type="button" onClick={() => setListsTab("lists")} className={`${btn} border border-[#E0E0E0] text-gray-800 hover:bg-gray-50`}>
                    <ButtonIcon name="history" />
                    Uploaded Lists
                  </button>
                  <InfoTip label="About Uploaded Lists" text="Every Excel file you upload becomes a list. Open this to see each file, how many guests came from it and whether invitations were sent. You can replace a list that has not been sent yet, or bring back guests that were set aside." align="left" />
                </span>
              )}
              {(notInvited.length > 0 || !lifecycleStarted) && (
                <button
                  type="button"
                  onClick={() => handleResend()}
                  disabled={!canIssue || busy !== null || resendTargets.length === 0}
                  title={!canIssue ? "This event is over, so invitations can no longer be sent" : lifecycleStarted ? (resendTargets.length ? undefined : "Select guests who were already invited") : "Available after invitations have been sent"}
                  className={`${btn} border border-[#E0E0E0] text-gray-800 hover:bg-gray-50`}
                >
                  <ButtonIcon name={busy === "resend" ? "spinner" : "resend"} />
                  {busy === "resend" ? "Resending..." : `Resend Invitation${resendTargets.length ? ` (${resendTargets.length})` : ""}`}
                </button>
              )}
              <button type="button" onClick={() => setShowHistory(true)} disabled={visibleHistory.length === 0 && !invitees.some((i) => i.credentialStatus && i.credentialStatus !== "NOT_ISSUED")} className={`${btn} border border-[#E0E0E0] text-gray-800 hover:bg-gray-50`}>
                <ButtonIcon name="history" />
                History
              </button>
            </div>

            {invitees.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#4B4F52]">
                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Select all visible invitees"
                    checked={allVisibleSelected}
                    onChange={(e) => setSelectedIds(e.target.checked ? [...new Set([...selectedIds, ...visible.map((i) => i._id)])] : selectedIds.filter((id) => !visible.some((v) => v._id === id)))}
                    className="size-4 cursor-pointer check-orange"
                  />
                  Select All
                </label>
                <span>
              {invitees.length} invitee{invitees.length === 1 ? "" : "s"}
              {lifecycleStarted && <> · {invitees.length - notInvited.length} invited · {notInvited.length} not yet invited</>}
              {selectedIds.length > 0 && <> · {selectedIds.length} selected</>}
            </span>
              </div>
            )}

            {filterSession && selectedIds.length > 0 && ownLists.some((s) => s._id === filterSession._id) && (
              <button type="button" onClick={handleGrantAccess} disabled={busy !== null} className={`${btn} bg-[#262A2D] text-white hover:bg-black`}>
                Give selected access to {filterSession.name}
              </button>
            )}

            {loading ? (
              <TableSkeleton rows={6} cols={7} label="Loading invitees" />
            ) : invitees.length === 0 ? (
              // Figma 217:17674: grey people mark, 16px message and a light "Add Invitees" button, centred in the page
              <div className="py-[120px] flex flex-col items-center text-center gap-4">
                <svg className="w-20 h-20 text-[#BDBDBD]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
                <p className="max-w-[300px] text-base text-[#4B4F52]">No invitees yet. Add invitees manually or upload an Excel sheet to get started.</p>
                <button type="button" onClick={() => setShowChooser(true)} disabled={!event || historical} className="px-6 py-2 rounded-md bg-[#F6F6F6] hover:bg-gray-200 text-base font-medium text-[#FF651D] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">Add Invitees</button>
              </div>
            ) : (
              <div>
              <div className="overflow-x-auto">
                {/* Figma 217:20587: one Status pill (delivery, or the guest's RSVP once given), Dietary, a ✓/✗ column per
                    session and a "⋯" menu */}
                <table className="w-full text-left text-sm min-w-[760px]">
                  <thead className="text-[#828282] border-b border-[#D3D3D3]">
                    <tr>
                      <th className="h-[46px] px-2.5 w-10" aria-label="Selection" />
                      <th className="h-[46px] px-2.5 font-medium">Name</th>
                      <th className="h-[46px] px-2.5 font-medium">Email</th>
                      <th className="h-[46px] px-2.5 font-medium whitespace-nowrap">Phone Number</th>
                      {showCompany && <th className="h-[46px] px-2.5 font-medium whitespace-nowrap">Company Name</th>}
                      <th className="h-[46px] px-2.5 font-medium">Status</th>
                      {isAdmin && <th className="h-[46px] px-2.5 font-medium whitespace-nowrap">RSVP Status</th>}
                      <th className="h-[46px] px-2.5 font-medium whitespace-nowrap">Access Pass</th>
                      {dietaryTitles.map((title) => <th key={title} className="h-[46px] px-2.5 font-medium text-center min-w-[96px] max-w-[130px] leading-tight break-words">{title}</th>)}
                      {sessions.map((sess) => <th key={sess._id} className="h-[46px] px-2.5 font-medium whitespace-nowrap">{sess.name.replace(/\s+session$/i, "")}</th>)}
                      <th className="h-[46px] px-2.5 font-medium text-right sticky right-0 bg-white shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D3D3D3] text-[#15191C] border-b border-[#D3D3D3]">
                    {visible.map((i) => {
                      const failure = historyByInvitee.get(i._id)?.failureReason;
                      const sentRecord = historyByInvitee.get(i._id);
                      return (
                        <tr key={i._id} className="group hover:bg-gray-50/70">
                          <td className="py-3 px-2.5">
                            <input
                              type="checkbox"
                              aria-label={`Select ${i.name}`}
                              checked={selectedIds.includes(i._id)}
                              onChange={() => setSelectedIds((p) => (p.includes(i._id) ? p.filter((x) => x !== i._id) : [...p, i._id]))}
                              className="size-4 cursor-pointer check-orange"
                            />
                          </td>
                          <td className="py-3 px-2.5 whitespace-nowrap">{i.name}</td>
                          <td className="py-3 px-2.5 whitespace-nowrap">{i.email || "—"}</td>
                          <td className="py-3 px-2.5 whitespace-nowrap">{formatPhoneNumber(i.mobile) || "—"}</td>
                          {showCompany && <td className="py-3 px-2.5 whitespace-nowrap">{i.companyName || i.company || "—"}</td>}
                          <td className="py-3 px-2.5">
                            <span className="flex flex-col gap-0.5 items-start">
                              <InviteeStatusPill invitationStatus={i.invitationStatus} rsvpStatus={isAdmin ? "PENDING" : i.rsvpStatus} />
                              {/* One line keeps the row height steady; the full reason is on hover */}
                              {i.invitationStatus === "FAILED" && failure && <span title={failure} className="text-xs text-rose-600 truncate max-w-[200px]">{failure}</span>}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="py-3 px-2.5">
                              {!rsvpEnabled ? <span className="text-[#828282]" aria-label="RSVP not requested">--</span>
                                : i.rsvpStatus === "ACCEPTED" ? pill("bg-[#CCD2FF] text-[#2C2EB5]", "Accepted")
                                : i.rsvpStatus === "DECLINED" ? pill("bg-[#FFE9C0] text-[#9E8C00]", "Declined")
                                : pill("bg-[#FFF3C4] text-[#B38A00]", "Pending")}
                            </td>
                          )}
                          <td className="py-3 px-2.5">
                            {i.credentialStatus
                              ? <span title={i.credentialStatus === "REVOKED" ? `Revoked: ${reasonLabel(i.credentialRevocation?.category)}` : undefined}>{pill(STATUS_PILL[i.credentialStatus].cls, STATUS_PILL[i.credentialStatus].label)}</span>
                              : <span className="text-[#828282]">—</span>}
                          </td>
                          {dietaryTitles.map((title) => {
                            const answer = dietaryAnswer(i, title, dietaryTitles);
                            return (
                              <td key={title} className="py-3 px-2.5 text-center whitespace-nowrap">
                                {answer ? <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-[#D3D3D3] rounded-full text-xs"><span className="size-1 rounded-full bg-[#15191C]" />{answer}</span> : "--"}
                              </td>
                            );
                          })}
                          {sessions.map((sess) => (
                            <td key={sess._id} className="py-3 px-2.5">
                              {allowedIn(i, sess)
                                ? <span role="img" aria-label={`Has access to ${sess.name}`} className="text-[#1A9242] font-bold">✓</span>
                                : <span role="img" aria-label={`No access to ${sess.name}`} className="text-[#FF651D] font-bold">✕</span>}
                            </td>
                          ))}
                          <td className="py-3 px-2.5 text-right sticky right-0 bg-white group-hover:bg-gray-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                            <InviteeRowMenu
                              name={i.name}
                              onEdit={historical ? undefined : () => setEditing({ id: i._id, name: i.name, email: i.email || "", phone: i.mobile || "" })}
                              onResend={canIssue && sentRecord?._id && i.invitationStatus !== "PENDING" ? () => handleResend([sentRecord]) : undefined}
                              onReplace={replaceAvailability(i, event?.status).allowed ? () => setPassAction({ action: "REPLACE", invitee: i, needsReview: replaceAvailability(i, event?.status).needsReview }) : undefined}
                              onRevoke={revokeAvailability(i, event?.status).allowed ? () => setPassAction({ action: "REVOKE", invitee: i }) : undefined}
                              replaceNote={replaceAvailability(i, event?.status).why}
                              revokeNote={revokeAvailability(i, event?.status).why}
                              onRemove={historical ? undefined : () => setDeletingId(i._id)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {visible.length === 0 && (
                      <tr><td colSpan={10 + sessions.length + dietaryTitles.length} className="py-10 text-center text-[#828282]">No invitees match the current filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E0E0E0] px-3 py-2.5 text-xs text-[#4B4F52]">
                  <span>
                    {filteredInvitees.length === 0 ? "No matching invitees" : `Showing ${(inviteePage - 1) * INVITEE_PAGE_SIZE + 1}–${Math.min(inviteePage * INVITEE_PAGE_SIZE, filteredInvitees.length)} of ${filteredInvitees.length}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setInviteePage((page) => Math.max(1, page - 1))} disabled={inviteePage <= 1} className="rounded border border-[#E0E0E0] px-2.5 py-1.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                    <span>Page {inviteePage} of {inviteePageCount}</span>
                    <button type="button" onClick={() => setInviteePage((page) => Math.min(inviteePageCount, page + 1))} disabled={inviteePage >= inviteePageCount} className="rounded border border-[#E0E0E0] px-2.5 py-1.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {importChoice && (
        <ImportModeDialog
          fileName={importChoice.fileName}
          rowCount={importChoice.rows.length}
          sentSets={importChoice.sentSets}
          previews={importChoice.previews}
          previewError={importChoice.previewError}
          busy={busy === "import"}
          onCancel={() => setImportChoice(null)}
          onChoose={(mode) => runImport(importChoice.rows, importChoice.fileName, mode, mode === "REPLACE" ? importChoice.previews?.replace : importChoice.previews?.append)}
        />
      )}
      {upload && (
        <InviteesPreviewModal
          title="Invitees List Preview"
          subtitle={`${upload.file.name} · Invitees who are already on the list or already invited are never imported twice.`}
          rows={upload.rows}
          showCompany={fieldConfig.company || upload.rows.some((r) => r.company)}
          showIdentity={fieldConfig.identity || upload.rows.some((r) => r.identity)}
          identityLabel={fieldConfig.identityLabel}
          identity2Label={fieldConfig.identity2 ? headerFor("identity2", fieldConfig) : undefined}
          onClose={() => setUpload(null)}
          onSave={handleImport}
        />
      )}
      {showListPreview && (
        <InviteeListPreviewModal eventId={eventId} subtitle={event?.title} showCompany={showCompany} onClose={() => setShowListPreview(false)} />
      )}
      {confirmFirstSend && (
        <SendWarningModal
          eventId={eventId}
          eventTitle={event?.title || "this event"}
          onCancel={() => setConfirmFirstSend(false)}
          onConfirm={() => { setConfirmFirstSend(false); handleSend(); }}
        />
      )}
      {passAction && (
        <PassActionModal
          key={`${passAction.action}-${passAction.invitee._id}`}
          action={passAction.action}
          invitee={passAction.invitee}
          needsReview={passAction.needsReview}
          onClose={() => setPassAction(null)}
          onDone={async (message) => { setPassAction(null); setFeedback({ type: "success", message }); await load(); await loadPassHistory(); }}
        />
      )}
      <EditInviteeModal isOpen={!!editing} onClose={() => setEditing(null)} invitee={editing} onSave={saveEdit} />
      <DeleteInviteeModal isOpen={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={confirmDelete} />
      {sampleReminder && (
        <SampleReminderModal
          columns={sampleColumns}
          onCancel={() => setSampleReminder(false)}
          onDownload={() => downloadInviteeTemplate(fieldConfig)}
          onContinue={() => { acknowledgeSampleReminder(eventId, sampleColumns); setSampleReminder(false); fileInput.current?.click(); }}
        />
      )}
      <AddInviteeChooserModal
        isOpen={showChooser}
        onClose={() => setShowChooser(false)}
        sessionOptions={sessionPickOptions}
        sessionId={targetSessionId}
        onSessionChange={setTargetSessionId}
        onChooseExcel={() => { setShowChooser(false); if (sampleReminderAcknowledged(eventId, sampleColumns)) fileInput.current?.click(); else setSampleReminder(true); }}
        onChooseManual={() => { setShowChooser(false); setShowManualAdd(true); }}
      />
      <AddInviteeManualModal
        isOpen={showManualAdd}
        eventId={eventId}
        existingInvitees={invitees}
        fields={inviteeFieldsFor(fieldConfig)}
        sessionOptions={sessionPickOptions}
        sessionId={targetSessionId}
        onSessionChange={setTargetSessionId}
        identityLabel={fieldConfig.identityLabel}
        identity2Label={fieldConfig.identity2 ? headerFor("identity2", fieldConfig) : undefined}
        onClose={() => setShowManualAdd(false)}
        onSaved={async () => { await load(); notifyDbUpdate(); }}
      />

      {listsTab && (
        <InviteeListsModal eventId={eventId} initialTab={listsTab} onClose={() => setListsTab(null)} onRestored={async () => { await load(); notifyDbUpdate(); }} />
      )}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="history-title">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <h2 id="history-title" className="text-base font-medium text-gray-900">Delivery History</h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  disabled={busy !== null || visibleHistory.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ButtonIcon name={busy === "clear" ? "spinner" : "trash"} className="w-3.5 h-3.5" />
                  {busy === "clear" ? "Clearing..." : "Clear history"}
                </button>
                <button type="button" onClick={() => setShowHistory(false)} aria-label="Close" className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
              </div>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <table className="w-full text-left text-sm min-w-[560px]">
                <thead className="text-[#828282] border-b border-[#D3D3D3]">
                  <tr><th className="py-2 pr-3 font-medium">Invitee</th><th className="py-2 pr-3 font-medium">Channel</th><th className="py-2 pr-3 font-medium">Status</th><th className="py-2 pr-3 font-medium">Reason</th><th className="py-2 font-medium">When</th></tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEEE] text-[#4B4F52]">
                  {visibleHistory.map((h) => (
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

              {/* Access Pass History: credential events only. Message delivery states above and pass states here are never mixed. */}
              <section aria-labelledby="pass-history-title" className="mt-8 pt-6 border-t border-[#E5E5E5]">
                <h3 id="pass-history-title" className="text-base font-medium text-gray-900">Access Pass History</h3>
                <p className="mt-1 text-xs text-[#828282]">Passes issued, replaced and revoked, with the reason and what happened to the message sent to the guest. “Accepted by the provider” is not proof of delivery.</p>
                {passHistoryError && <p role="alert" className="mt-3 text-sm text-rose-600">{passHistoryError}</p>}
                {!passHistory && !passHistoryError && <p className="mt-3 text-sm text-[#828282]">Loading…</p>}
                {passHistory && passHistory.length === 0 && <p className="mt-3 text-sm text-[#828282]">No access pass has been issued, replaced or revoked yet.</p>}
                {passHistory && passHistory.length > 0 && (
                  <>
                    <table className="mt-3 w-full text-left text-sm min-w-[560px]">
                      <thead className="text-[#828282] border-b border-[#D3D3D3]"><tr><th className="py-2 pr-3 font-medium">Guest</th><th className="py-2 pr-3 font-medium">What happened</th><th className="py-2 pr-3 font-medium">Reason</th><th className="py-2 pr-3 font-medium">Message to the guest</th><th className="py-2 font-medium">When</th></tr></thead>
                      <tbody className="divide-y divide-[#EEEEEE] text-[#4B4F52]">
                        {passHistory.map((r) => (
                          <tr key={r._id} className="align-top">
                            <td className="py-2.5 pr-3 text-gray-900">{r.inviteeName}</td>
                            <td className="py-2.5 pr-3">{historyTitle(r)}{passRef(r.credentialId) ? <span className="block text-xs text-[#828282]" title="Reference of this pass (not its code)">pass {passRef(r.credentialId)}{r.previousCredentialId ? ` replaced ${passRef(r.previousCredentialId)}` : ""}</span> : null}{r.derived ? <span className="block text-xs text-[#828282]">follows from the event, not an action</span> : null}{r.actor ? <span className="block text-xs text-[#828282]">by {r.actor}</span> : null}</td>
                            <td className="py-2.5 pr-3 text-xs break-words max-w-[200px]">{historyReason(r)}{r.note ? <span className="block text-[#828282]">{r.note}</span> : null}{r.reviewConfirmed ? <span className="block text-[#828282]">Reviewed before replacing</span> : null}</td>
                            <td className="py-2.5 pr-3 text-xs">
                              {[noticeText("Email", r.notice?.email), noticeText("WhatsApp", r.notice?.whatsapp)].filter(Boolean).map((t) => <span key={t} className="block">{t}</span>) }
                              {!r.notice && "—"}
                            </td>
                            <td className="py-2.5 text-xs whitespace-nowrap">{formatDateTime(r.at, "—")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 flex flex-wrap items-start gap-4">
                      {hasUnsent(passHistory) && (
                        <button type="button" onClick={() => retryPassNotices(false)} disabled={retryingNotices} className="px-4 py-2 border border-[#FF651D] text-[#FF651D] hover:bg-[#FFF3EC] rounded-md text-sm font-medium cursor-pointer disabled:opacity-50">{retryingNotices ? "Retrying…" : "Retry unsent messages"}</button>
                      )}
                      {hasUnknown(passHistory) && (
                        <div role="group" aria-label="Messages with an unknown outcome" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 space-y-2 max-w-md">
                          <p>For some messages the app does not know whether they were sent. The guest may already have received them; retrying can send a second one.</p>
                          <label className="flex items-start gap-2 cursor-pointer"><input type="checkbox" checked={ackDuplicate} onChange={(e) => setAckDuplicate(e.target.checked)} className="mt-0.5 size-4 accent-rose-600" /><span>I understand a guest may receive a message twice.</span></label>
                          <button type="button" onClick={() => retryPassNotices(true)} disabled={retryingNotices || !ackDuplicate} className="px-4 py-2 border border-rose-600 text-rose-700 hover:bg-rose-100 rounded-md text-sm font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">Retry these anyway</button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
