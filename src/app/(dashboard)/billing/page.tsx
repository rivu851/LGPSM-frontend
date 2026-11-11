"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import Icon from "@/components/icons/Icon";
import BillingDateField, { formatDay } from "@/components/billing/BillingDateField";
import { Invoice, filterInvoices, statementCsv, validateRange } from "@/components/billing/billingStatement";

// Organiser Billing (Figma 217:24385 list, 217:23316 filter, and the Download Statement dialog).
//
// Online payments are not integrated yet, so there are no invoices and the list is deliberately empty: nothing here is invented.
// The page is built for real data (search, date filter, selection, per-invoice and statement download all work on `invoices`);
// when a payment provider and its invoices endpoint exist, only this array needs to be filled from it.
const NO_INVOICES: Invoice[] = [];

const money = (amount: number, currency = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 1 }).format(amount);

function saveCsv(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BillingPage() {
  const invoices = NO_INVOICES; // see note above
  const [search, setSearch] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState(range);
  const [statementOpen, setStatementOpen] = useState(false);
  const [statement, setStatement] = useState({ from: "", to: "" });
  const [statementError, setStatementError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const filterRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => filterInvoices(invoices, range, search), [invoices, range, search]);
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));
  const filtering = !!(range.from || range.to || search.trim());

  useEffect(() => {
    if (!filterOpen) return;
    const close = (e: MouseEvent) => { if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setFilterOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [filterOpen]);

  const downloadStatement = () => {
    const problem = validateRange(statement);
    if (problem) { setStatementError(problem); return; }
    const inRange = filterInvoices(invoices, statement, "");
    if (inRange.length === 0) { setStatementError("There are no invoices between these dates, so there is nothing to download."); return; }
    saveCsv(`statement-${statement.from}-to-${statement.to}.csv`, statementCsv(inRange));
    setStatementOpen(false);
  };

  const openStatement = () => { setStatement({ from: "", to: "" }); setStatementError(null); setStatementOpen(true); };

  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader title="Billing" />
      <div className="px-4 sm:px-6 pt-[30px] pb-24 w-full space-y-6">
        {/* Controls: label, a compact search, then the statement action and the date filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2.5 min-w-0 sm:flex-1">
            <label htmlFor="billing-search" className="text-[17px] font-medium text-black shrink-0">Billing</label>
            <div className="relative w-full sm:max-w-[198px]">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#828282]"><Icon name="reports/search" width={16} height={16} /></span>
              <input
                id="billing-search"
                type="search"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-[47px] pl-11 pr-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs font-medium text-gray-900 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D]"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0 relative" ref={filterRef}>
            <button type="button" onClick={openStatement} className="h-[46px] px-6 bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg cursor-pointer">
              Download Statement
            </button>
            <button
              type="button"
              aria-label="Filter by date"
              aria-expanded={filterOpen}
              onClick={() => { setDraft(range); setFilterOpen((o) => !o); }}
              className={`size-[22px] flex items-center justify-center cursor-pointer text-[#15191C] ${filterOpen || range.from || range.to ? "opacity-100" : "opacity-50 hover:opacity-80"}`}
            >
              <Icon name="billing/filter" width={22} height={13.2} />
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-[279px] max-w-[calc(100vw-2rem)] z-30" role="dialog" aria-label="Filter by date">
                <div className="flex justify-end px-[21px]" aria-hidden>
                  <svg width="19.5" height="8.5" viewBox="0 0 19.5 8.5" fill="none"><path d="M0 8.5L10 0L19.5 8.5H0Z" fill="#F4F4F4" /></svg>
                </div>
                <div className="bg-[#F4F4F4] rounded-lg shadow-lg overflow-hidden">
                  <div className="px-6 py-5 border-b border-[#E0E0E0] text-base font-medium text-[#15191C]">Filter by date</div>
                  <div className="p-6 space-y-4">
                    <div className="space-y-2">
                      <BillingDateField label="From date" placeholder="From" value={draft.from} onChange={(from) => setDraft((d) => ({ ...d, from, to: d.to && from > d.to ? from : d.to }))} />
                      <BillingDateField label="To date" placeholder="To" value={draft.to} min={draft.from || undefined} onChange={(to) => setDraft((d) => ({ ...d, to }))} />
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setFilterOpen(false)} className="flex-1 py-1.5 bg-white border border-[#DDD] rounded text-[13px] font-semibold text-black cursor-pointer">Cancel</button>
                      <button type="button" onClick={() => { setRange(draft); setFilterOpen(false); }} className="flex-1 py-1.5 bg-[#FF651D] hover:bg-[#E5520F] rounded text-[13px] font-semibold text-white cursor-pointer">Apply</button>
                    </div>
                    {(range.from || range.to) && (
                      <button type="button" onClick={() => { setRange({ from: "", to: "" }); setDraft({ from: "", to: "" }); setFilterOpen(false); }} className="w-full text-xs text-[#FF651D] underline cursor-pointer">Clear dates</button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {(range.from || range.to) && (
          <p className="text-xs text-[#4B4F52]">
            Showing payments {range.from ? `from ${formatDay(range.from)}` : ""}{range.from && range.to ? " " : ""}{range.to ? `to ${formatDay(range.to)}` : ""}
          </p>
        )}

        <div className="flex items-center gap-2 text-sm text-[#828282]">
          <input
            id="billing-select-all"
            type="checkbox"
            checked={allSelected}
            disabled={rows.length === 0}
            onChange={() => setSelected(allSelected ? [] : rows.map((r) => r.id))}
            className="size-4 rounded-sm border-gray-300 cursor-pointer disabled:cursor-not-allowed check-orange"
          />
          <label htmlFor="billing-select-all" className={rows.length === 0 ? "" : "cursor-pointer"}>Select All</label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#E0E0E0] text-[#828282] font-medium text-sm">
                <th className="py-3 px-4 w-10" aria-label="Select" />
                <th className="py-3 px-4 font-medium">Invoice ID</th>
                <th className="py-3 px-4 font-medium">Event Name</th>
                <th className="py-3 px-4 font-medium">Invites No.</th>
                <th className="py-3 px-4 font-medium">Payment Date</th>
                <th className="py-3 px-4 font-medium">Amount</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-[#4B4F52]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center whitespace-normal">
                    <p className="text-base font-medium text-[#15191C]">{filtering ? "No invoices match your search or dates" : "No invoices yet"}</p>
                    <p className="mt-1 text-sm text-[#828282] max-w-md mx-auto">
                      {filtering
                        ? "Try a different search or clear the dates."
                        : "Online payments are not available yet. When they go live, your invoices and payment history will be listed here."}
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-[#E0E0E0] h-[46px]">
                    <td className="px-4">
                      <input
                        type="checkbox"
                        aria-label={`Select invoice ${r.invoiceId}`}
                        checked={selected.includes(r.id)}
                        onChange={() => setSelected((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))}
                        className="size-4 rounded-sm border-gray-300 cursor-pointer check-orange"
                      />
                    </td>
                    <td className="px-4">{r.invoiceId}</td>
                    <td className="px-4">{r.eventName}</td>
                    <td className="px-4">{r.invitees}</td>
                    <td className="px-4">{formatDay(r.paymentDate.slice(0, 10))}</td>
                    <td className="px-4">{money(r.amount, r.currency)}</td>
                    <td className="px-4 text-right">
                      <button
                        type="button"
                        aria-label={`Download invoice ${r.invoiceId}`}
                        onClick={() => saveCsv(`invoice-${r.invoiceId}.csv`, statementCsv([r]))}
                        className="group inline-flex items-center justify-center size-6 cursor-pointer text-[#4B4F52]"
                      >
                        <span className="group-hover:hidden opacity-70"><Icon name="billing/download" width={15.83} height={19.22} /></span>
                        <span className="hidden group-hover:block"><Icon name="billing/download-active" width={15.83} height={19.22} /></span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {statementOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="statement-title">
          <div className="bg-white border border-[#E5E5E5] rounded-lg w-full max-w-[488px] overflow-y-auto max-h-[calc(100dvh-2rem)]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E5E5]">
              <h2 id="statement-title" className="text-base font-medium text-[#15191C]">Download Statement</h2>
              <button type="button" onClick={() => setStatementOpen(false)} aria-label="Close" className="text-[#15191C] cursor-pointer"><Icon name="billing/close" width={16} height={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="block text-xs font-medium text-[#15191C] mb-2">From<span className="text-[#FF651D]">*</span></span>
                <BillingDateField label="Statement from date" placeholder="Select Date" value={statement.from} onChange={(from) => { setStatement((s) => ({ ...s, from, to: s.to && from > s.to ? from : s.to })); setStatementError(null); }} />
              </div>
              <div>
                <span className="block text-xs font-medium text-[#15191C] mb-2">To<span className="text-[#FF651D]">*</span></span>
                <BillingDateField label="Statement to date" placeholder="Select Date" value={statement.to} min={statement.from || undefined} onChange={(to) => { setStatement((s) => ({ ...s, to })); setStatementError(null); }} />
              </div>
              {statementError && <p role="alert" className="text-sm text-rose-600">{statementError}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E5E5E5]">
              <button type="button" onClick={() => setStatementOpen(false)} className="px-6 py-2.5 bg-white border border-[#DDD] rounded-md text-base font-semibold text-black cursor-pointer">Cancel</button>
              <button type="button" onClick={downloadStatement} className="px-6 py-2.5 bg-[#FF651D] hover:bg-[#E5520F] rounded-md text-base font-semibold text-white cursor-pointer">Download Statement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
