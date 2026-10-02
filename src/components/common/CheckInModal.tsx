"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import jsQR from "jsqr";
import { sessionService, SessionData } from "@/services/sessionService";
import { eventService } from "@/services/eventService";
import { assignmentService, AssignmentData } from "@/services/assignmentService";
import { useAuth } from "@/context/AuthContext";
import { checkInService, CheckInResponseData } from "@/services/checkInService";
import { ApiResponse } from "@/services/apiClient";
import { formatDateTime, formatTime } from "@/utils/dateTime";

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string;
  eventName?: string;
  onCheckInSuccess?: (data: CheckInResponseData) => void;
}

type Mode = "QR" | "MANUAL";
type EventOption = { id: string; title: string; sessionIds?: string[] };

// Three different failures the operator must be able to tell apart
type Problem =
  | { kind: "decode"; message: string } // the image holds no readable QR
  | { kind: "pass"; message: string } // QR read, but it is not a valid / current invitation pass
  | { kind: "denied"; message: string } // pass valid, but a check-in rule refused entry
  | { kind: "input"; message: string }; // something missing before we can submit

type UploadState =
  | { status: "idle" }
  | { status: "decoding"; fileName: string }
  | { status: "ready"; fileName: string; payload: string }
  | { status: "failed"; fileName: string };

// Backend codes for a QR that was read but is not a usable pass (see backend checkIn.controller)
const PASS_CODES = new Set(["QR_PAYLOAD_REQUIRED", "QR_FORMAT_UNSUPPORTED", "QR_URL_UNTRUSTED", "QR_PREVIEW_SAMPLE", "QR_TOKEN_SUPERSEDED", "INVALID_QR_TOKEN"]);

const PROBLEM_TITLE: Record<Problem["kind"], string> = {
  decode: "QR code not found",
  pass: "Pass not valid",
  denied: "Check-in denied",
  input: "Almost there",
};

// Only the tail of a pass is ever shown; the full value is never logged or rendered.
const passHint = (payload: string) => `•••• ${payload.trim().replace(/\/+$/, "").slice(-4)}`;

async function decodeQrFromFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    // Try the original size first, then a downscaled copy (very large photos decode better smaller)
    const scales = [1, ...[1600, 1000].map((max) => Math.min(1, max / Math.max(bitmap.width, bitmap.height))).filter((s) => s < 1)];
    for (const scale of scales) {
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.fillStyle = "#fff"; // transparent PNGs decode as black otherwise
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);
      const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "attemptBoth" });
      if (code?.data) return code.data;
    }
    return null;
  } finally {
    bitmap.close();
  }
}

// The dialog body mounts only while open, so every opening starts from a clean state.
export default function CheckInModal(props: CheckInModalProps) {
  return props.isOpen ? <CheckInDialog {...props} /> : null;
}

function CheckInDialog({ onClose, eventId: propEventId, eventName: propEventName, onCheckInSuccess }: CheckInModalProps) {
  const { user } = useAuth();
  const ids = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("QR");

  // Context: event + session
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventsState, setEventsState] = useState<"idle" | "loading" | "error">(propEventId ? "idle" : "loading");
  const [eventsError, setEventsError] = useState("");
  const [eventId, setEventId] = useState(propEventId || "");
  const [eventName, setEventName] = useState(propEventName || "");
  // Sessions are remembered per event so a stale list is never shown for a newly chosen event
  const [loadedSessions, setLoadedSessions] = useState<{ eventId: string; list: SessionData[]; failed: boolean } | null>(null);
  const [sessionId, setSessionId] = useState("");

  // Verification inputs
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const [pastedLink, setPastedLink] = useState("");
  const [manualType, setManualType] = useState<"email" | "mobile">("email");
  const [manualValue, setManualValue] = useState("");

  // Outcome
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [result, setResult] = useState<CheckInResponseData | null>(null);

  const isStaff = user?.role === "SYSTEM_USER";

  const resetVerification = useCallback(() => {
    setUpload({ status: "idle" });
    setPastedLink("");
    setManualValue("");
    setProblem(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Events this user may check guests into (staff: their assignments)
  useEffect(() => {
    if (propEventId) return;
    let cancelled = false;
    (async () => {
      let list: EventOption[] = [];
      let error = "";
      if (isStaff) {
        const res = await assignmentService.getMyAssignments();
        if (res.success && Array.isArray(res.data)) {
          list = res.data
            .map((a: AssignmentData): EventOption | null =>
              typeof a.eventId === "object" && a.eventId
                ? { id: a.eventId._id, title: a.eventId.title || "Untitled event", sessionIds: (a.sessionIds || []).map((s) => (typeof s === "string" ? s : s._id)) }
                : null
            )
            .filter((e): e is EventOption => !!e);
        } else error = res.message || "Your assigned events could not be loaded.";
      } else {
        const res = await eventService.getEvents();
        if (res.success && Array.isArray(res.data)) {
          list = (res.data as { _id?: string; id?: string; title?: string; status?: string }[])
            .filter((e) => String(e.status || "").toUpperCase() !== "CANCELLED")
            .map((e) => ({ id: String(e._id || e.id), title: e.title || "Untitled event" }));
        } else error = res.message || "Events could not be loaded.";
      }
      if (cancelled) return;
      setEvents(list);
      setEventsError(error);
      setEventsState(error ? "error" : "idle");
      if (list.length === 1) {
        setEventId(list[0].id);
        setEventName(list[0].title);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propEventId, isStaff]);

  // Sessions of the chosen event (staff only see the sessions they are assigned to, when restricted)
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    (async () => {
      const res = await sessionService.getSessions(eventId);
      if (cancelled) return;
      const ok = res.success && Array.isArray(res.data);
      const allowed = events.find((e) => e.id === eventId)?.sessionIds;
      const list = ok ? (res.data as SessionData[]).filter((s) => !!s._id && (!allowed?.length || allowed.includes(s._id))) : [];
      setLoadedSessions({ eventId, list, failed: !ok });
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, events]);

  // Escape closes; focus moves into the dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !submitting && onClose();
    document.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const sessionsReady = !!eventId && loadedSessions?.eventId === eventId;
  const sessions = sessionsReady ? loadedSessions.list : [];
  const sessionsState: "idle" | "loading" | "error" = !eventId ? "idle" : !sessionsReady ? "loading" : loadedSessions.failed ? "error" : "idle";

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    resetVerification();
  };

  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = mode === "QR" ? "MANUAL" : "QR";
      switchMode(next);
      document.getElementById(`${ids}-tab-${next}`)?.focus();
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setProblem(null);
    setResult(null);
    setPastedLink("");
    if (!file.type.startsWith("image/")) {
      setUpload({ status: "failed", fileName: file.name });
      setProblem({ kind: "decode", message: "That file is not an image. Upload a PNG or JPG of the invitation card or QR pass." });
      return;
    }
    setUpload({ status: "decoding", fileName: file.name });
    try {
      const payload = await decodeQrFromFile(file);
      if (payload) {
        setUpload({ status: "ready", fileName: file.name, payload });
      } else {
        setUpload({ status: "failed", fileName: file.name });
        setProblem({ kind: "decode", message: "No QR code could be read from this image. Use a sharper, uncropped image of the card or pass." });
      }
    } catch {
      setUpload({ status: "failed", fileName: file.name });
      setProblem({ kind: "decode", message: "This image could not be opened. Try exporting it again as PNG or JPG." });
    }
  };

  const classify = (res: ApiResponse): Problem => {
    const message = res.message || "Check-in could not be completed.";
    if (res.code && PASS_CODES.has(res.code)) return { kind: "pass", message };
    return { kind: "denied", message };
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProblem(null);
    setResult(null);
    if (!eventId) {
      setProblem({ kind: "input", message: "Choose the event you are checking guests into." });
      return;
    }

    let request: Promise<ApiResponse<CheckInResponseData>>;
    if (mode === "QR") {
      const payload = upload.status === "ready" ? upload.payload : pastedLink.trim();
      if (!payload) {
        setProblem({ kind: "input", message: "Upload the guest's QR pass or paste their invitation link." });
        return;
      }
      request = checkInService.scanCheckIn({ qrCode: payload, eventId, sessionId: sessionId || undefined });
    } else {
      const value = manualValue.trim();
      const valid = manualType === "email" ? /^\S+@\S+\.\S+$/.test(value) : /^\+?[\d\s-]{6,}$/.test(value);
      if (!valid) {
        setProblem({ kind: "input", message: manualType === "email" ? "Enter the guest's email address." : "Enter the guest's mobile number." });
        return;
      }
      request = checkInService.manualCheckIn({ eventId, sessionId: sessionId || undefined, ...(manualType === "email" ? { email: value } : { mobile: value }) });
    }

    setSubmitting(true);
    try {
      const res = await request;
      if (res.success && res.data) {
        setResult(res.data);
        onCheckInSuccess?.(res.data);
      } else {
        setProblem(classify(res));
      }
    } catch {
      setProblem({ kind: "denied", message: "The server could not be reached. Check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const checkInAnother = () => {
    resetVerification();
    requestAnimationFrame(() => document.getElementById(`${ids}-tab-${mode}`)?.focus());
  };

  const confirmedEventName = result ? (String(result.eventId) === eventId ? eventName : events.find((ev) => ev.id === String(result.eventId))?.title) : "";
  const selectedSession = sessions.find((s) => s._id === sessionId);
  const contextReady = !!eventId;
  const qrReady = upload.status === "ready" || !!pastedLink.trim();
  const canSubmit = contextReady && !submitting && (mode === "QR" ? qrReady : !!manualValue.trim());

  const selectClass =
    "w-full h-10 px-3 bg-white border border-[#E0E0E0] rounded-lg text-sm text-[#15191C] focus:outline-none focus:border-[#FF651D] focus:ring-2 focus:ring-[#FF651D]/15 disabled:bg-gray-50 disabled:text-gray-400";
  const inputClass =
    "w-full h-10 px-3 bg-white border border-[#E0E0E0] rounded-lg text-sm text-[#15191C] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FF651D] focus:ring-2 focus:ring-[#FF651D]/15";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
        className="bg-white w-full sm:max-w-[520px] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] outline-none"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-[#EEEEEE] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={`${ids}-title`} className="text-lg font-semibold text-[#15191C]">Check in a guest</h2>
            <p className="text-xs text-[#828282] mt-0.5 truncate">{eventName ? eventName : "Choose an event, then verify the guest's pass"}</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Close check-in" className="shrink-0 -mr-1 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer disabled:opacity-40">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {result ? (
            /* Step 3 — backend-confirmed result */
            <section aria-live="polite" className="text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <span className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-[#15191C]">Checked in</h3>
              <p className="text-sm text-[#828282]">Recorded at {formatTime(result.checkInAt, "—")}</p>
              <dl className="mt-5 text-left rounded-xl border border-[#EEEEEE] divide-y divide-[#EEEEEE] text-sm">
                {[
                  ["Guest", result.invitee?.name || "—"],
                  ["Contact", result.invitee?.email || result.invitee?.mobile || "—"],
                  ["Event", confirmedEventName || "—"],
                  ["Session", result.session?.name || "Event entry (no specific session)"],
                  ["Method", result.checkInMethod === "QR" ? "QR pass" : "Manual entry"],
                  ["Time", formatDateTime(result.checkInAt, "—")],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5">
                    <dt className="text-[#828282] shrink-0">{label}</dt>
                    <dd className="font-medium text-[#15191C] text-right break-words min-w-0">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : (
            <>
              {/* Step 1 — context */}
              <section aria-labelledby={`${ids}-step1`} className="space-y-3">
                <h3 id={`${ids}-step1`} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#828282]">
                  <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${contextReady ? "bg-[#FF651D] text-white" : "bg-gray-100 text-gray-500"}`}>1</span>
                  Where
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <label htmlFor={`${ids}-event`} className="block text-xs font-medium text-[#15191C]">Event</label>
                    {propEventId ? (
                      <div id={`${ids}-event`} className="h-10 px-3 flex items-center bg-gray-50 border border-[#EEEEEE] rounded-lg text-sm text-[#15191C] truncate">{eventName || "Selected event"}</div>
                    ) : eventsState === "loading" ? (
                      <div className="h-10 rounded-lg bg-gray-100 animate-pulse" aria-label="Loading events" />
                    ) : eventsState === "error" ? (
                      <p role="alert" className="text-xs text-rose-600">{eventsError}</p>
                    ) : events.length === 0 ? (
                      <p className="text-xs text-[#828282] py-2.5">{isStaff ? "You have no event assignments yet." : "No events are available for check-in."}</p>
                    ) : (
                      <select
                        id={`${ids}-event`}
                        value={eventId}
                        onChange={(e) => {
                          setEventId(e.target.value);
                          setSessionId("");
                          setEventName(events.find((ev) => ev.id === e.target.value)?.title || "");
                          resetVerification();
                        }}
                        className={selectClass}
                      >
                        <option value="">Select event</option>
                        {events.map((ev) => (
                          <option key={ev.id} value={ev.id}>{ev.title}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <label htmlFor={`${ids}-session`} className="block text-xs font-medium text-[#15191C]">Session</label>
                    {sessionsState === "loading" ? (
                      <div className="h-10 rounded-lg bg-gray-100 animate-pulse" aria-label="Loading sessions" />
                    ) : (
                      <select
                        id={`${ids}-session`}
                        value={sessionId}
                        disabled={!eventId}
                        onChange={(e) => {
                          setSessionId(e.target.value);
                          setProblem(null);
                        }}
                        className={selectClass}
                      >
                        <option value="">Event entry (no specific session)</option>
                        {sessions.map((s) => (
                          <option key={s._id} value={s._id as string}>
                            {s.name}
                            {s.schedule?.start ? ` · ${formatTime(s.schedule.start)}` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                    {sessionsState === "error" && <p className="text-xs text-rose-600">Sessions could not be loaded.</p>}
                    {selectedSession?.accessControl === "ONLY_ONCE" && <p className="text-[11px] text-[#828282]">Guests can enter this session only once.</p>}
                  </div>
                </div>
              </section>

              {/* Step 2 — verify */}
              <section aria-labelledby={`${ids}-step2`} className="space-y-3">
                <h3 id={`${ids}-step2`} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#828282]">
                  <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${contextReady ? "bg-[#FF651D] text-white" : "bg-gray-100 text-gray-500"}`}>2</span>
                  Verify guest
                </h3>

                <div role="tablist" aria-label="Verification method" className="grid grid-cols-2 p-1 bg-[#F4F5F8] rounded-lg" onKeyDown={onTabKey}>
                  {(["QR", "MANUAL"] as Mode[]).map((m) => (
                    <button
                      key={m}
                      id={`${ids}-tab-${m}`}
                      type="button"
                      role="tab"
                      aria-selected={mode === m}
                      aria-controls={`${ids}-panel`}
                      tabIndex={mode === m ? 0 : -1}
                      onClick={() => switchMode(m)}
                      className={`h-9 rounded-md text-sm font-medium transition-colors cursor-pointer ${mode === m ? "bg-white text-[#FF651D] shadow-sm" : "text-[#5F6368] hover:text-[#15191C]"}`}
                    >
                      {m === "QR" ? "QR pass" : "Manual entry"}
                    </button>
                  ))}
                </div>

                <form id={`${ids}-form`} onSubmit={submit} noValidate>
                  <div id={`${ids}-panel`} role="tabpanel" aria-labelledby={`${ids}-tab-${mode}`} className="space-y-3">
                    {mode === "QR" ? (
                      <>
                        <input
                          ref={fileInputRef}
                          id={`${ids}-file`}
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          tabIndex={-1}
                          onChange={(e) => handleFile(e.target.files?.[0])}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                          }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOver(false);
                            handleFile(e.dataTransfer.files?.[0]);
                          }}
                          disabled={submitting}
                          aria-describedby={`${ids}-upload-status`}
                          className={`w-full rounded-xl border-2 border-dashed px-4 py-5 flex items-center gap-4 text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${
                            dragOver
                              ? "border-[#FF651D] bg-[#FFF3EC]"
                              : upload.status === "ready"
                              ? "border-emerald-300 bg-emerald-50/60"
                              : upload.status === "failed"
                              ? "border-rose-300 bg-rose-50/60"
                              : "border-[#E0E0E0] bg-[#FAFAFA] hover:border-[#FF651D]/60 hover:bg-[#FFF8F4]"
                          }`}
                        >
                          <span
                            className={`shrink-0 w-11 h-11 rounded-lg flex items-center justify-center ${
                              upload.status === "ready" ? "bg-emerald-500 text-white" : upload.status === "failed" ? "bg-rose-100 text-rose-600" : "bg-[#FFE6D9] text-[#FF651D]"
                            }`}
                          >
                            {upload.status === "decoding" ? (
                              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />
                            ) : upload.status === "ready" ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V5a1 1 0 011-1h2M17 4h2a1 1 0 011 1v2M20 17v2a1 1 0 01-1 1h-2M7 20H5a1 1 0 01-1-1v-2M8 8h3v3H8zM13 13h3v3h-3zM13 8h3M8 13v3" />
                              </svg>
                            )}
                          </span>
                          <span id={`${ids}-upload-status`} className="min-w-0" aria-live="polite">
                            <span className="block text-sm font-medium text-[#15191C] truncate">
                              {upload.status === "idle" && "Upload QR pass or invitation card"}
                              {upload.status === "decoding" && "Reading QR code…"}
                              {upload.status === "ready" && "Pass detected"}
                              {upload.status === "failed" && "Couldn't read a QR code"}
                            </span>
                            <span className="block text-xs text-[#828282] truncate">
                              {upload.status === "idle" && "Drop an image here or click to browse · PNG, JPG"}
                              {upload.status === "decoding" && upload.fileName}
                              {upload.status === "ready" && `${upload.fileName} · ${passHint(upload.payload)}`}
                              {upload.status === "failed" && `${upload.fileName} · click to try another image`}
                            </span>
                          </span>
                        </button>

                        <div className="flex items-center gap-3 text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                          <span className="h-px flex-1 bg-[#EEEEEE]" />
                          or
                          <span className="h-px flex-1 bg-[#EEEEEE]" />
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor={`${ids}-link`} className="block text-xs font-medium text-[#15191C]">Invitation link</label>
                          <input
                            id={`${ids}-link`}
                            type="text"
                            inputMode="url"
                            autoComplete="off"
                            spellCheck={false}
                            value={pastedLink}
                            onChange={(e) => {
                              setPastedLink(e.target.value);
                              if (upload.status !== "idle") setUpload({ status: "idle" });
                              setProblem(null);
                            }}
                            placeholder="Paste the link from the invitation"
                            className={inputClass}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div role="radiogroup" aria-label="Find guest by" className="flex gap-2">
                          {(["email", "mobile"] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              role="radio"
                              aria-checked={manualType === t}
                              onClick={() => {
                                setManualType(t);
                                setManualValue("");
                                setProblem(null);
                              }}
                              className={`px-3.5 h-8 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                                manualType === t ? "border-[#FF651D] bg-[#FFF3EC] text-[#FF651D]" : "border-[#E0E0E0] text-[#5F6368] hover:border-gray-300"
                              }`}
                            >
                              {t === "email" ? "Email" : "Mobile"}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor={`${ids}-manual`} className="block text-xs font-medium text-[#15191C]">
                            Guest {manualType === "email" ? "email address" : "mobile number"}
                          </label>
                          <input
                            id={`${ids}-manual`}
                            type={manualType === "email" ? "email" : "tel"}
                            autoComplete="off"
                            value={manualValue}
                            onChange={(e) => {
                              setManualValue(e.target.value);
                              setProblem(null);
                            }}
                            placeholder={manualType === "email" ? "guest@example.com" : "+91 98765 43210"}
                            className={inputClass}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </form>
              </section>

              {problem && (
                <div
                  role="alert"
                  className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm ${
                    problem.kind === "input" ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="min-w-0 break-words">
                    <span className="font-semibold">{PROBLEM_TITLE[problem.kind]}.</span> {problem.message}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-[#EEEEEE] flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button type="button" onClick={onClose} disabled={submitting} className="h-10 px-4 rounded-lg border border-[#E0E0E0] text-sm font-medium text-[#15191C] hover:bg-gray-50 cursor-pointer disabled:opacity-50">
            {result ? "Done" : "Cancel"}
          </button>
          {result ? (
            <button type="button" onClick={checkInAnother} className="h-10 px-5 rounded-lg bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-semibold cursor-pointer">
              Check in another guest
            </button>
          ) : (
            <button
              type="submit"
              form={`${ids}-form`}
              disabled={!canSubmit}
              className="h-10 px-5 rounded-lg bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />}
              {submitting ? "Verifying…" : "Verify & check in"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
