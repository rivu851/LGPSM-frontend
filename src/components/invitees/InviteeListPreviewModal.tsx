"use client";

import React, { useEffect, useState } from "react";
import CustomDropdown from "@/components/common/CustomDropdown";
import { inviteeService, type InviteeSetInfo, type InviteeSetMember } from "@/services/inviteeService";
import { listDisplayName } from "@/utils/inviteeLists";
import EditInviteeModal from "@/components/add-event/modals/EditInviteeModal";
import { useAlert } from "@/context/AlertContext";

interface Props {
  eventId: string;
  title?: string;
  subtitle?: string;
  showCompany?: boolean;
  onClose: () => void;
  /** Called after guests were edited or deleted here, so the page behind can refresh */
  onChanged?: () => void;
  /** Past or cancelled events are records: their guests are shown but not changed */
  readOnly?: boolean;
}

const ALL = "all";

const PAGE_SIZE = 50;

// Who is on the event's list, one dataset (uploaded list) or all of them, fetched one page at a time so an event with thousands of
// invitees never loads them all at once. Guests can be edited or deleted here. Deleting a guest nothing has happened to erases them;
// a guest who was already invited, answered or attended is set aside instead (their history is kept, their pass stops working, and
// they can be restored from Uploaded Lists > Set-aside guests). The confirmation says which of the two will happen.
export default function InviteeListPreviewModal({ eventId, title = "Invitee Preview List", subtitle, showCompany = true, onClose, onChanged, readOnly = false }: Props) {
  const { confirm, showAlert } = useAlert();
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ id: string; name: string; email: string; phone: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sets, setSets] = useState<InviteeSetInfo[] | null>(null);
  const [setId, setSetId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  // the page that was last fetched, tagged with the request it answers; "loading" is simply "no answer for the current request yet"
  const [result, setResult] = useState<{ key: string; members: InviteeSetMember[]; total: number; error: string | null } | null>(null);
  const key = `${setId}|${page}|${term}|${tick}`;
  const noLists = setId === "";
  const loading = !noLists && result?.key !== key;
  const members = noLists ? [] : result?.members ?? [];
  const total = noLists ? 0 : result?.total ?? 0;
  const error = result && result.key === key ? result.error : null;

  useEffect(() => {
    let live = true;
    inviteeService.getInviteeSets(eventId)
      .then((r) => {
        if (!live) return;
        const list = r.success && r.data ? r.data.sets : [];
        setSets(list);
        // opens on "All" (every guest of the event); a single dataset can be chosen from the dropdown
        setSetId(list.length ? ALL : "");
      })
      .catch(() => { if (live) { setSets([]); setSetId(""); } });
    return () => { live = false; };
  }, [eventId]);

  // the search waits for a pause in typing, then goes back to the first page
  useEffect(() => {
    const t = setTimeout(() => { setTerm(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!setId) return; // still looking up the lists, or the event has none
    let live = true;
    inviteeService.getSetMembers(eventId, setId, page, term)
      .then((res) => {
        if (!live) return;
        if (!res.success || !res.data) throw new Error(res.message || "Could not load the list.");
        setResult({ key, members: res.data.members, total: res.data.total, error: null });
      })
      .catch((e) => { if (live) setResult({ key, members: [], total: 0, error: e instanceof Error ? e.message : "Could not load the list." }); });
    return () => { live = false; };
  }, [eventId, setId, page, term, key]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const options = [
    // "All" is always offered, even when there is only one dataset
    ...(sets && sets.length > 0 ? [{ value: ALL, label: `All (${sets.reduce((n, x) => n + x.total, 0)})` }] : []),
    ...(sets || []).map((s) => ({ value: s.id, label: `${listDisplayName(s.name)} (${s.total})` })),
  ];
  // every guest can be edited and deleted (unless the page is read-only); a guest something has happened to is set aside, not erased
  const untouched = (m: InviteeSetMember) => m.delivery === "NOT_SENT" && m.rsvpStatus === "PENDING" && !m.checkedIn;
  const canDelete = (m: InviteeSetMember) => !readOnly && !!m.id;
  const canEdit = () => !readOnly;
  const deletable = members.filter(canDelete);
  const allOnPage = deletable.length > 0 && deletable.every((m) => selected.includes(m.id));
  const refresh = () => { setSelected([]); setTick((t) => t + 1); onChanged?.(); };

  const removeOne = async (m: InviteeSetMember) => {
    const message = untouched(m)
      ? `Delete ${m.name} from this event?`
      : `${m.name} has already been invited. Deleting removes them from the guest list and their QR pass stops working. Their invitation history is kept under Set-aside guests, where they can be restored.`;
    if (!(await confirm({ title: "Delete invitee", message, confirmText: "Delete", tone: "danger" }))) return;
    const res = await inviteeService.deleteInvitee(m.id);
    if (!res.success) return showAlert(res.message || "The invitee could not be deleted.", "error");
    showAlert(untouched(m) ? "Invitee deleted." : `${m.name} removed. Their history is kept under Set-aside guests.`, "success");
    refresh();
  };

  const removeSelected = async () => {
    const ids = selected.slice();
    if (!ids.length) return;
    const invited = members.filter((m) => ids.includes(m.id) && !untouched(m)).length;
    const note = invited ? ` ${invited} of them ${invited === 1 ? "has" : "have"} already been invited: their QR ${invited === 1 ? "pass stops" : "passes stop"} working and their history is kept under Set-aside guests.` : "";
    if (!(await confirm({ title: "Delete selected invitees", message: `Delete ${ids.length} selected ${ids.length === 1 ? "invitee" : "invitees"} from this event?${note}`, confirmText: "Delete all", tone: "danger" }))) return;
    setBusy(true);
    let failed = 0;
    for (const id of ids) {
      const res = await inviteeService.deleteInvitee(id);
      if (!res.success) failed += 1;
    }
    setBusy(false);
    if (failed) showAlert(`${ids.length - failed} deleted; ${failed} could not be deleted. Please try again.`, "warning");
    else showAlert(`${ids.length} ${ids.length === 1 ? "invitee" : "invitees"} deleted.`, "success");
    refresh();
  };

  const saveEdit = async (row: { id: string; name: string; email: string; phone: string }) => {
    const res = await inviteeService.updateInvitee(row.id, { name: row.name, email: row.email, mobile: row.phone });
    if (!res.success) return showAlert(res.message || "The invitee could not be updated.", "error");
    showAlert("Invitee updated.", "success");
    setEditing(null);
    refresh();
  };
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-overlay" role="dialog" aria-modal="true" aria-labelledby="list-preview-title">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] animate-modal">
        <div className="px-6 py-4 border-b border-[#E5E5E5]">
          <h2 id="list-preview-title" className="text-base font-medium text-gray-900">
            {title} <span className="text-sm font-normal text-[#6B6B6B]">({total} {total === 1 ? "invitee" : "invitees"})</span>
          </h2>
          {subtitle && <p className="text-xs text-[#6B6B6B] mt-0.5 break-words">{subtitle}</p>}
        </div>

        <div className="px-6 pt-4 grid grid-cols-1 sm:grid-cols-[1fr_260px] gap-3">
          <div>
            <label htmlFor="list-preview-search" className="block text-sm font-medium text-gray-900 mb-1.5">Search</label>
            <input
              id="list-preview-search"
              type="search"
              placeholder="Search by name, email or mobile"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-[#E0E0E0] rounded-md bg-[#FAFAFA] focus:outline-none focus:border-[#FF651D]"
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-900 mb-1.5">Invitees dataset</span>
            <CustomDropdown portal value={setId ?? ""} onChange={(v) => { setSetId(v); setPage(1); setSelected([]); }} placeholder="Loading lists…" emptyMessage="No lists yet" options={options} ariaLabel="Choose which invitees dataset to preview" />
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-3 min-h-[200px]" aria-busy={loading}>
          {error ? (
            <p role="alert" className="py-10 text-center text-sm text-rose-600">{error} <button type="button" onClick={() => setTick((t) => t + 1)} className="underline cursor-pointer">Try again</button></p>
          ) : (
            <>
            {!readOnly && (
              <div className="flex items-center justify-between gap-3 py-2">
                <p className="text-xs text-[#6B6B6B]">Select invitees to delete them together. Guests who were already invited are set aside with their history, and their pass stops working.</p>
                <button type="button" onClick={() => void removeSelected()} disabled={!selected.length || busy} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-md border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5h6v2m-8 0l1 12h8l1-12" /></svg>
                  {busy ? "Deleting…" : `Delete all selected${selected.length ? ` (${selected.length})` : ""}`}
                </button>
              </div>
            )}
            <table className="w-full text-left text-sm min-w-[640px]">
              <thead className="text-[#6B6B6B] border-b border-[#D3D3D3]">
                <tr>
                  {!readOnly && (
                    <th className="py-2.5 pr-2 w-8">
                      <input type="checkbox" aria-label="Select all invitees on this page that can be deleted" checked={allOnPage} disabled={!deletable.length} onChange={(e) => setSelected(e.target.checked ? Array.from(new Set([...selected, ...deletable.map((m) => m.id)])) : selected.filter((id) => !deletable.some((m) => m.id === id)))} className="size-4 check-orange cursor-pointer disabled:cursor-not-allowed" />
                    </th>
                  )}
                  <th className="py-2.5 pr-3 font-medium w-12">#</th>
                  <th className="py-2.5 pr-3 font-medium">Name</th>
                  <th className="py-2.5 pr-3 font-medium">Email</th>
                  <th className="py-2.5 pr-3 font-medium">Mobile Number</th>
                  {showCompany && <th className="py-2.5 pr-3 font-medium">Company Name</th>}
                  {!readOnly && <th className="py-2.5 font-medium text-right w-20">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEEE] text-[#4B4F52]">
                {members.map((m, i) => (
                  <tr key={m.id} className={selected.includes(m.id) ? "bg-orange-50/60" : undefined}>
                    {!readOnly && (
                      <td className="py-2.5 pr-2">
                        <input type="checkbox" aria-label={`Select ${m.name}`} checked={selected.includes(m.id)} disabled={!canDelete(m)}  onChange={(e) => setSelected(e.target.checked ? [...selected, m.id] : selected.filter((x) => x !== m.id))} className="size-4 check-orange cursor-pointer disabled:cursor-not-allowed disabled:opacity-40" />
                      </td>
                    )}
                    <td className="py-2.5 pr-3 text-[#6B6B6B]">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="py-2.5 pr-3 text-gray-900 break-words">{m.name}</td>
                    <td className="py-2.5 pr-3 break-all">{m.email || "—"}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">{m.mobile || "—"}</td>
                    {showCompany && <td className="py-2.5 pr-3 break-words">{m.company || "—"}</td>}
                    {!readOnly && (
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <button type="button" onClick={() => setEditing({ id: m.id, name: m.name, email: m.email || "", phone: m.mobile || "" })} disabled={!canEdit()} aria-label={`Edit ${m.name}`} title="Edit" className="inline-flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a2.5 2.5 0 00-3.536-3.536L4.5 16.5V20z" /></svg>
                        </button>
                        <button type="button" onClick={() => void removeOne(m)} disabled={!canDelete(m)} aria-label={`Delete ${m.name}`} title="Delete" className="inline-flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5h6v2m-8 0l1 12h8l1-12" /></svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {!loading && members.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-[#6B6B6B]">{term ? "No invitees match your search." : noLists ? "No lists yet. Upload an Excel file with Add Invitees." : "No invitees in this list."}</td></tr>
                )}
                {loading && members.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-[#6B6B6B]">Loading…</td></tr>
                )}
              </tbody>
            </table>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E5E5E5] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-[#4B4F52]">
            <span>{total === 0 ? "No invitees" : `Showing ${from}–${to} of ${total}`}</span>
            {pageCount > 1 && (
              <span className="inline-flex items-center gap-2">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="px-2.5 py-1 border border-[#E0E0E0] rounded disabled:opacity-40 cursor-pointer">Previous</button>
                <span>Page {page} of {pageCount}</span>
                <button type="button" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount || loading} className="px-2.5 py-1 border border-[#E0E0E0] rounded disabled:opacity-40 cursor-pointer">Next</button>
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} className="px-5 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-800 hover:bg-gray-50 cursor-pointer">Close</button>
        </div>
      </div>
      <EditInviteeModal isOpen={!!editing} onClose={() => setEditing(null)} invitee={editing} onSave={(row) => void saveEdit(row)} />
    </div>
  );
}
