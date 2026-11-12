// Billing data helpers. There is no payment provider yet, so there are no invoices; these keep the filtering and the
// statement export correct and testable for the day invoices exist.

export interface Invoice {
  id: string;
  invoiceId: string;
  eventName: string;
  invitees: number;
  /** ISO date or date-time of the payment */
  paymentDate: string;
  amount: number;
  currency?: string;
}

export interface DateRange { from: string; to: string }

const dayOf = (iso: string) => iso.slice(0, 10);

/** Inclusive on both ends; an empty side is open. Dates are compared as calendar days (YYYY-MM-DD). */
export function filterInvoices(invoices: Invoice[], range: Partial<DateRange>, search: string): Invoice[] {
  const q = search.trim().toLowerCase();
  return invoices.filter((i) => {
    const day = dayOf(i.paymentDate);
    if (range.from && day < range.from) return false;
    if (range.to && day > range.to) return false;
    return !q || [i.invoiceId, i.eventName].some((v) => v.toLowerCase().includes(q));
  });
}

export function validateRange(range: DateRange): string | null {
  if (!range.from) return "Choose a From date.";
  if (!range.to) return "Choose a To date.";
  if (range.from > range.to) return "The From date must not be after the To date.";
  return null;
}

const csvCell = (v: string | number) => {
  // a cell that starts like a formula is neutralised so a spreadsheet never runs it
  const text = String(v);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function statementCsv(invoices: Invoice[]): string {
  const rows = [["Invoice ID", "Event Name", "No Invitees", "Payment Date", "Amount (INR)"], ...invoices.map((i) => [i.invoiceId, i.eventName, i.invitees, dayOf(i.paymentDate), i.amount.toFixed(2)])];
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}
