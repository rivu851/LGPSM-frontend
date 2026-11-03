"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { inviteeService, type InviteeSetInfo, type InviteeSetMember, type RestoreResult, type SetAsideGuest } from "@/services/inviteeService";
import { formatDateTime } from "@/utils/dateTime";
import { DELIVERY_LABEL, listDisplayName, restoreErrorMessage, restoreOutcome, stateExplanation } from "@/utils/inviteeLists";

type Tab = "lists" | "aside";

interface Props {
  eventId: string;
  initialTab?: Tab;
  /** Called after guests were restored, so the page can reload its active list */
  onRestored: () => void;
  onClose: () => void;
}

// Shown only once every guest in the list has been sent their invitation: one time when they all went together, otherwise the first and the latest
const allSentLine = (s: { total: number; sent: number; firstSentAt?: string | null; lastSentAt?: string | null }): string | null => {
  if (s.total === 0 || s.sent < s.total) return null;
  if (!s.firstSentAt || !s.lastSentAt) return null;
  const first = formatDateTime(s.firstSentAt, "");
  const last = formatDateTime(s.lastSentAt, "");
  if (!first || !last) return null;
  return first === last ? first : `${first} – ${last}`;
};
const pill = (cls: string, text: string, title?: string, icon?: React.ReactNode) => <span title={title} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>{icon}{text}</span>;
const Lock = () => <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z" /></svg>;

// The same shell as the Delivery History dialog: centred modal, title bar with close, table body.
// A list's Open/Locked state (a property of the list, decided by the server) is kept apart from each guest's delivery state.
export default function InviteeListsModal({ eventId, initialTab = "lists", onRestored, onClose }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sets, setSets] = useState<InviteeSetInfo[] | null>(null);
  const [setsError, setSetsError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, { rows: InviteeSetMember[]; total: number; page: number } | "loading" | string>>({});

  const [aside, setAside] = useState<{ guests: SetAsideGuest[]; total: number; restorable: boolean; notRestorableReason: string | null } | null>(null);
  const [asideError, setAsideError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [outcome, setOutcome] = useState<{ tone: "success" | "warning" | "error"; message: string; conflicts: string[] } | null>(null);

  const loadSets = useCallback(async () => {
    setSetsError(null);
    try {
      const res = await inviteeService.getInviteeSets(eventId);
      if (res.success && res.data) setSets(res.data.sets);
      else setSetsError(res.message || "The invitee lists could not be loaded.");
    } catch { setSetsError("The invitee lists could not be loaded. Check your connection and try again."); }
  }, [eventId]);

  const loadAside = useCallback(async (search: string) => {
    setAsideError(null);
    try {
      const res = await inviteeService.getSetAside(eventId, { q: search });
      if (res.success && res.data) { setAside(res.data); setPicked((p) => p.filter((id) => res.data!.guests.some((g) => g.id === id))); }
      else setAsideError(res.message || "The set-aside guests could not be loaded.");
    } catch { setAsideError("The set-aside guests could not be loaded. Check your connection and try again."); }
  }, [eventId]);

  useEffect(() => { void Promise.resolve().then(loadSets); }, [loadSets]);
  useEffect(() => {
    if (tab !== "aside") return;
    const t = setTimeout(() => { void loadAside(q); }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [tab, q, loadAside]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !confirm) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, confirm]);

  const toggleSet = async (id: string) => {
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    if (members[id] && members[id] !== "loading" && typeof members[id] !== "string") return;
    setMembers((m) => ({ ...m, [id]: "loading" }));
    try {
      const res = await inviteeService.getSetMembers(eventId, id);
      setMembers((m) => ({ ...m, [id]: res.success && res.data ? { rows: res.data.members, total: res.data.total, page: res.data.page } : res.message || "The guests of this list could not be loaded." }));
    } catch { setMembers((m) => ({ ...m, [id]: "The guests of this list could not be loaded." })); }
  };

  const nameOf = useMemo(() => {
    const map = new Map((aside?.guests || []).map((g) => [g.id, g.name]));
    return (id: string) => map.get(id) || "This guest";
  }, [aside]);

  const doRestore = async () => {
    if (!confirm) return;
    setRestoring(true);
    try {
      const res = await inviteeService.restoreSetAside(eventId, confirm);
      if (res.success && res.data) {
        const r: RestoreResult = res.data;
        setOutcome(restoreOutcome(r, nameOf));
        if (r.restored) onRestored();
      } else setOutcome({ tone: "error", message: restoreErrorMessage(res.message), conflicts: [] });
    } catch { setOutcome({ tone: "error", message: "The restore request could not reach the server. Nothing was changed.", conflicts: [] }); }
    setConfirm(null);
    setPicked([]);
    setRestoring(false);
    await Promise.all([loadAside(q), loadSets()]);
  };

  const tabBtn = (id: Tab, label: string, count?: number) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`px-4 py-2 text-sm font-medium border-b-2 cursor-pointer ${tab === id ? "border-[#FF651D] text-[#FF651D]" : "border-transparent text-[#4B4F52] hover:text-gray-900"}`}>
      {label}{count !== undefined ? ` (${count})` : ""}
    </button>
  );
  const asideTotal = sets ? sets.reduce((n, s) => n + s.setAside, 0) : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="lists-title">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
          <h2 id="lists-title" className="text-base font-medium text-gray-900">Uploaded Lists</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
        </div>
        <div role="tablist" className="px-6 border-b border-[#E5E5E5] flex gap-2">
          {tabBtn("lists", "Uploaded lists", sets?.length)}
          {tabBtn("aside", "Set-aside guests", asideTotal)}
        </div>

        <div className="p-6 overflow-auto flex-1">
          {outcome && (
            <div role="status" className={`mb-4 rounded-md border px-4 py-3 text-sm ${outcome.tone === "success" ? "border-green-200 bg-green-50 text-green-800" : outcome.tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              <p>{outcome.message}</p>
              {outcome.conflicts.map((c) => <p key={c} className="mt-1">{c}</p>)}
            </div>
          )}

          {tab === "lists" && (
            <>
              {setsError && <p role="alert" className="text-sm text-rose-600">{setsError} <button type="button" onClick={loadSets} className="underline cursor-pointer">Try again</button></p>}
              {!sets && !setsError && <p className="text-sm text-[#828282]">Loading…</p>}
              {sets && sets.length === 0 && <p className="text-sm text-[#828282]">No lists yet. Upload an Excel file with Add Invitees.</p>}
              {sets && sets.length > 0 && (
                <table className="w-full text-left text-sm min-w-[760px]">
                  <thead className="text-[#828282] border-b border-[#D3D3D3]">
                    <tr>
                      <th className="py-2 pr-3 font-medium">List</th>
                      <th className="py-2 pr-3 font-medium">Guests</th>
                      <th className="py-2 pr-3 font-medium">Delivery of invitations</th>
                      <th className="py-2 pr-3 font-medium">Set aside</th>
                      <th className="py-2 font-medium">List state</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEEEEE] text-[#4B4F52]">
                    {sets.map((s) => (
                      <React.Fragment key={s.id}>
                        <tr className="align-top">
                          <td className="py-3 pr-3 max-w-[220px]">
                            <button type="button" onClick={() => toggleSet(s.id)} aria-expanded={open === s.id} className="text-left text-gray-900 font-medium hover:text-[#FF651D] cursor-pointer break-words" title={s.name}>{listDisplayName(s.name)}</button>
                            {s.createdAt && <span className="block text-xs text-[#828282]">{s.source === "MANUAL" ? "Added" : "Uploaded"} {formatDateTime(s.createdAt, "")}{s.uploadedBy ? ` · by ${s.uploadedBy.name}` : ""}</span>}
                            <span className="sm:hidden mt-1 inline-block">{s.locked ? pill("bg-[#EDEDED] text-[#4B4F52]", "Locked") : pill("border border-[#1A9242] text-[#1A9242] bg-white", "Open")}</span>
                          </td>
                          <td className="py-3 pr-3 whitespace-nowrap">{s.total}{s.importedCount !== null ? <span className="block text-xs text-[#828282]">{s.importedCount} added by this upload</span> : null}</td>
                          <td className="py-3 pr-3 text-xs space-y-0.5">
                            {allSentLine(s) && <span className="block mb-1"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E6F6EC] text-[#1A9242] font-medium">Invitations sent</span><span className="block text-[#828282] mt-0.5">{allSentLine(s)}</span></span>}
                            <span className="block">Sent <b className="text-[#1A9242]">{s.sent}</b> · Not sent <b>{s.notSent}</b></span>
                            <span className="block">Failed <b className={s.failed ? "text-rose-600" : ""}>{s.failed}</b> · Unknown <b className={s.unknown ? "text-amber-700" : ""} title="Delivery was attempted but the outcome was never settled. The guest may have received it.">{s.unknown}</b></span>
                          </td>
                          <td className="py-3 pr-3">{s.setAside}</td>
                          <td className="py-3">
                            {s.locked ? pill("bg-[#EDEDED] text-[#4B4F52]", "Locked", "Invitations were sent, a guest answered, or a guest checked in. This list is kept as it is.", <Lock />) : pill("border border-[#1A9242] text-[#1A9242] bg-white", "Open", "No invitation has been sent successfully from this list.")}
                          </td>
                        </tr>
                        {open === s.id && (
                          <tr>
                            <td colSpan={6} className="pb-4">
                              <div className="rounded-md bg-[#F8F8F8] border border-[#E5E5E5] p-4 text-sm">
                                <p className="text-[#4B4F52]">{stateExplanation(s)}</p>
                                <GuestTable state={members[s.id]} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {tab === "aside" && (
            <>
              <p className="text-xs text-[#828282] mb-3">Guests a Replace set aside because they had never been invited. They are kept, apart from your active list, and can be restored.</p>
              {aside && !aside.restorable && <p role="note" className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{aside.notRestorableReason}</p>}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search set-aside guests" aria-label="Search set-aside guests" className="w-64 max-w-full px-3 py-2 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:border-[#FF651D]" />
                <button type="button" disabled={!picked.length || !aside?.restorable} onClick={() => { setOutcome(null); setConfirm(picked); }} className="px-4 py-2 bg-[#FF651D] hover:bg-[#E5520F] text-white rounded-md text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">Restore selected ({picked.length})</button>
              </div>
              {asideError && <p role="alert" className="text-sm text-rose-600">{asideError} <button type="button" onClick={() => loadAside(q)} className="underline cursor-pointer">Try again</button></p>}
              {!aside && !asideError && <p className="text-sm text-[#828282]">Loading…</p>}
              {aside && aside.guests.length === 0 && <p className="text-sm text-[#828282]">{q ? "No set-aside guest matches your search." : "No guests have been set aside."}</p>}
              {aside && aside.guests.length > 0 && (
                <table className="w-full text-left text-sm min-w-[760px]">
                  <thead className="text-[#828282] border-b border-[#D3D3D3]">
                    <tr>
                      <th className="py-2 pr-2 w-8"><input type="checkbox" aria-label="Select all set-aside guests" disabled={!aside.restorable} checked={picked.length === aside.guests.length} onChange={(e) => setPicked(e.target.checked ? aside.guests.map((g) => g.id) : [])} className="size-4 check-orange" /></th>
                      <th className="py-2 pr-3 font-medium">Guest</th>
                      <th className="py-2 pr-3 font-medium">From list</th>
                      <th className="py-2 pr-3 font-medium">Set aside</th>
                      <th className="py-2 pr-3 font-medium">Reason</th>
                      <th className="py-2 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEEEEE] text-[#4B4F52]">
                    {aside.guests.map((g) => (
                      <tr key={g.id} className="align-top">
                        <td className="py-3 pr-2"><input type="checkbox" aria-label={`Select ${g.name}`} disabled={!aside.restorable} checked={picked.includes(g.id)} onChange={() => setPicked((p) => (p.includes(g.id) ? p.filter((x) => x !== g.id) : [...p, g.id]))} className="size-4 check-orange" /></td>
                        <td className="py-3 pr-3 text-gray-900">{g.name}<span className="block text-xs text-[#828282] break-all">{g.email || g.mobile || "—"}</span></td>
                        <td className="py-3 pr-3 max-w-[180px] break-words">{g.fromSet.name}</td>
                        <td className="py-3 pr-3 text-xs whitespace-nowrap">{formatDateTime(g.setAsideAt, "—")}{g.setAsideBy ? <span className="block text-[#828282]">by {g.setAsideBy.name}</span> : null}</td>
                        <td className="py-3 pr-3 text-xs">{g.reasonText || "Reason not recorded"}{g.replacedBy ? <span className="block text-[#828282]">by “{listDisplayName(g.replacedBy.name)}”</span> : null}</td>
                        <td className="py-3 text-right"><button type="button" disabled={!aside.restorable} onClick={() => { setOutcome(null); setConfirm([g.id]); }} aria-label={`Restore ${g.name}`} className="px-3 py-1.5 border border-[#FF651D] text-[#FF651D] hover:bg-[#FFF3EC] rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">Restore</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="restore-title">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl space-y-4 overflow-y-auto max-h-[calc(100dvh-2rem)]">
            <h3 id="restore-title" className="text-base font-semibold text-gray-900">Restore {confirm.length === 1 ? nameOf(confirm[0]) : `${confirm.length} guests`}?</h3>
            <p className="text-sm text-[#4B4F52]">{confirm.length === 1 ? "This guest returns" : "These guests return"} to the active list as <b>Not sent</b>, in the list {confirm.length === 1 ? "they" : "they each"} came from. No invitation will be sent and no access pass will be created. Anyone whose email or mobile number is already on the active list will not be restored.</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setConfirm(null)} disabled={restoring} className="px-4 py-2 border border-[#E0E0E0] rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50">Cancel</button>
              <button type="button" onClick={doRestore} disabled={restoring} className="px-4 py-2 bg-[#FF651D] hover:bg-[#E5520F] text-white rounded-md text-sm font-medium cursor-pointer disabled:opacity-60">{restoring ? "Restoring…" : "Restore"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GuestTable({ state }: { state: { rows: InviteeSetMember[]; total: number; page: number } | "loading" | string | undefined }) {
  if (!state || state === "loading") return <p className="mt-3 text-[#828282]">Loading guests…</p>;
  if (typeof state === "string") return <p role="alert" className="mt-3 text-rose-600">{state}</p>;
  if (state.rows.length === 0) return <p className="mt-3 text-[#828282]">No active guests in this list.</p>;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-xs min-w-[520px]">
        <thead className="text-[#828282] border-b border-[#D3D3D3]"><tr><th className="py-1.5 pr-3 font-medium">Guest</th><th className="py-1.5 pr-3 font-medium">Invitation</th><th className="py-1.5 pr-3 font-medium">RSVP</th><th className="py-1.5 font-medium">Checked in</th></tr></thead>
        <tbody className="divide-y divide-[#EEEEEE]">
          {state.rows.map((m) => (
            <tr key={m.id}>
              <td className="py-1.5 pr-3 text-gray-900">{m.name}<span className="block text-[#828282] break-all">{m.email || m.mobile || "—"}</span></td>
              <td className="py-1.5 pr-3">{m.delivery === "SENT" ? pill("bg-[#C0FFD5] text-[#1A9242]", DELIVERY_LABEL.SENT) : m.delivery === "FAILED" ? pill("bg-rose-100 text-rose-700", DELIVERY_LABEL.FAILED) : m.delivery === "UNKNOWN" ? pill("bg-amber-100 text-amber-800", DELIVERY_LABEL.UNKNOWN, "The guest may already have received it") : pill("bg-[#EDEDED] text-[#6E6E6E]", DELIVERY_LABEL.NOT_SENT)}</td>
              <td className="py-1.5 pr-3">{m.rsvpStatus === "PENDING" ? "—" : m.rsvpStatus === "ACCEPTED" ? "Accepted" : "Declined"}</td>
              <td className="py-1.5">{m.checkedIn ? "Yes" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {state.total > state.rows.length && <p className="mt-2 text-[#828282]">Showing the first {state.rows.length} of {state.total} guests.</p>}
    </div>
  );
}
