"use client";

import React, { useEffect, useState } from "react";
import CustomDropdown from "@/components/common/CustomDropdown";
import { inviteeService, type InviteeSetInfo, type InviteeSetMember } from "@/services/inviteeService";
import { listDisplayName } from "@/utils/inviteeLists";

interface Props {
  eventId: string;
  title?: string;
  subtitle?: string;
  showCompany?: boolean;
  onClose: () => void;
}

const PAGE_SIZE = 50;

// Read-only look at who is on the event's list. The guests are fetched from the server one page at a time, for one
// uploaded list, so an event with thousands of invitees never loads them all at once.
export default function InviteeListPreviewModal({ eventId, title = "Invitees List", subtitle, showCompany = true, onClose }: Props) {
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
    // the most recently uploaded list is shown first (lists come oldest to newest)
    inviteeService.getInviteeSets(eventId)
      .then((r) => {
        if (!live) return;
        const list = r.success && r.data ? r.data.sets : [];
        setSets(list);
        setSetId(list.length ? list[list.length - 1].id : "");
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
    ...(sets || []).map((s) => ({ value: s.id, label: `${listDisplayName(s.name)} (${s.total})` })),
  ];
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-overlay" role="dialog" aria-modal="true" aria-labelledby="list-preview-title">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] animate-modal">
        <div className="px-6 py-4 border-b border-[#E5E5E5]">
          <h2 id="list-preview-title" className="text-base font-medium text-gray-900">
            {title} <span className="text-sm font-normal text-[#828282]">({total} {total === 1 ? "invitee" : "invitees"})</span>
          </h2>
          {subtitle && <p className="text-xs text-[#828282] mt-0.5 break-words">{subtitle}</p>}
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
            <span className="block text-sm font-medium text-gray-900 mb-1.5">Uploaded list</span>
            <CustomDropdown portal value={setId ?? ""} onChange={(v) => { setSetId(v); setPage(1); }} placeholder="Loading lists…" emptyMessage="No lists yet" options={options} ariaLabel="Choose which uploaded list to preview" />
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-3 min-h-[200px]" aria-busy={loading}>
          {error ? (
            <p role="alert" className="py-10 text-center text-sm text-rose-600">{error} <button type="button" onClick={() => setTick((t) => t + 1)} className="underline cursor-pointer">Try again</button></p>
          ) : (
            <table className="w-full text-left text-sm min-w-[560px]">
              <thead className="text-[#828282] border-b border-[#D3D3D3]">
                <tr>
                  <th className="py-2.5 pr-3 font-medium w-12">#</th>
                  <th className="py-2.5 pr-3 font-medium">Name</th>
                  <th className="py-2.5 pr-3 font-medium">Email</th>
                  <th className="py-2.5 pr-3 font-medium">Mobile Number</th>
                  {showCompany && <th className="py-2.5 pr-3 font-medium">Company Name</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEEE] text-[#4B4F52]">
                {members.map((m, i) => (
                  <tr key={m.id}>
                    <td className="py-2.5 pr-3 text-[#828282]">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="py-2.5 pr-3 text-gray-900 break-words">{m.name}</td>
                    <td className="py-2.5 pr-3 break-all">{m.email || "—"}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">{m.mobile || "—"}</td>
                    {showCompany && <td className="py-2.5 pr-3 break-words">{m.company || "—"}</td>}
                  </tr>
                ))}
                {!loading && members.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-[#828282]">{term ? "No invitees match your search." : noLists ? "No lists yet. Upload an Excel file with Add Invitees." : "No invitees in this list."}</td></tr>
                )}
                {loading && members.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-[#828282]">Loading…</td></tr>
                )}
              </tbody>
            </table>
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
    </div>
  );
}
