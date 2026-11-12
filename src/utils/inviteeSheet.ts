// The spreadsheet library is by far the largest thing these screens use (500 KB), and most visits never touch a spreadsheet: it loads when needed
const loadXlsx = () => import("xlsx");
import type { ExpectedColumn, InviteeFieldKey } from "@/utils/inviteeFields";

// Parses an invitee sheet with the same header rules as the backend import
// (Backend/src/services/invitee.service.ts processExcelImport), so the preview shows what will be imported.

export interface InviteeSheetRow {
  id: string; // row number in the sheet
  name: string;
  email: string;
  phone: string;
  company: string;
  identity?: string;
  identity2?: string;
  sessions?: Record<string, boolean>;
}

export interface ParsedInviteeSheet {
  rows: InviteeSheetRow[];
  // Rows the backend will reject, with the reason (same checks as the import)
  problems: { row: string; error: string }[];
  /** Columns this event expects (from its settings) that the sheet does not have; empty when it matches or no settings were given */
  missingColumns: string[];
}

export const missingColumnsMessage = (missing: string[]): string =>
  `The Excel you uploaded doesn't match the required fields (missing: ${missing.join(", ")}). Download the sample Excel and use its column names exactly when setting up this event's invitees.`;

const clean = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

export async function parseInviteeSheet(file: File, sessionNames: string[] = [], expected?: ExpectedColumn[]): Promise<ParsedInviteeSheet> {
  const XLSX = await loadXlsx();
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = sheet ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) : [];
  const nonBlank = raw.filter((r) => Array.isArray(r) && r.some((c) => clean(c) !== ""));
  if (nonBlank.length === 0) return { rows: [], problems: [], missingColumns: [] };

  let nameIdx = -1, emailIdx = -1, mobileIdx = -1, companyIdx = -1, identityIdx = -1, identity2Idx = -1;
  const sessionColumns = new Map<number, string>();
  const header = nonBlank[0].map((c) => clean(c).toLowerCase());
  const customIdentity = (expected?.find((c) => c.key === "identity")?.header || "").toLowerCase();
  const customIdentity2 = (expected?.find((c) => c.key === "identity2")?.header || "second identity").toLowerCase();
  const hasHeader = header.some((c) => c.includes("name") || c.includes("email") || c.includes("mobile") || c.includes("phone") || c.includes("company"));
  if (hasHeader) {
    header.forEach((c, i) => {
      if (!c) return;
      if (c === customIdentity2 || c === "second identity") identity2Idx = i;
      else if (c.includes("identity") || c.includes("designation") || (customIdentity && c === customIdentity)) identityIdx = i;
      else if (c.includes("company") || c.includes("organization") || c.includes("organisation")) companyIdx = i;
      else if (c.includes("name")) nameIdx = i;
      else if (c.includes("email") || c.includes("mail")) emailIdx = i;
      else if (c.includes("mobile") || c.includes("phone") || c.includes("contact") || c.includes("whatsapp")) mobileIdx = i;
      const sessionName = sessionNames.find((name) => name.trim().toLowerCase() === c);
      if (sessionName) sessionColumns.set(i, sessionName);
    });
  } else {
    nameIdx = 0; emailIdx = 1; mobileIdx = 2; companyIdx = 3;
  }

  const cell = (row: unknown[], i: number) => (i >= 0 ? clean(row[i]) : "");
  const dataRows = hasHeader ? nonBlank.slice(1) : nonBlank;
  const rows: InviteeSheetRow[] = [];
  const problems: ParsedInviteeSheet["problems"] = [];
  dataRows.forEach((r, i) => {
    const rowNo = String(i + (hasHeader ? 2 : 1));
    const sessionValues = sessionColumns.size ? Object.fromEntries([...sessionColumns].map(([idx, name]) => [name, !["N", "NO", "FALSE", "0"].includes(cell(r, idx).toUpperCase())])) : undefined;
    const row: InviteeSheetRow = { id: rowNo, name: cell(r, nameIdx), email: cell(r, emailIdx).toLowerCase(), phone: cell(r, mobileIdx), company: cell(r, companyIdx), identity: cell(r, identityIdx), identity2: cell(r, identity2Idx), sessions: sessionValues };
    const problem = rowProblem(row);
    if (problem) problems.push({ row: rowNo, error: problem });
    rows.push(row);
  });
  // The sheet needs a heading for every column the event's settings ask for (the sample Excel has exactly these)
  const found: Record<InviteeFieldKey, boolean> = { name: nameIdx >= 0, email: emailIdx >= 0, mobile: mobileIdx >= 0, company: companyIdx >= 0, identity: identityIdx >= 0, identity2: identity2Idx >= 0 };
  const missingColumns = expected ? expected.filter((c) => !hasHeader || !found[c.key]).map((c) => c.header) : [];
  return { rows, problems, missingColumns };
}

export function rowProblem(row: Pick<InviteeSheetRow, "name" | "email" | "phone">): string | null {
  if (!row.name || row.name.length < 2) return "Name must be at least 2 characters";
  if (row.name.length > 100) return "Name must be 100 characters or less";
  if (row.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(row.email)) return "Invalid email";
  const digits = row.phone.replace(/\D/g, "");
  if (row.phone && (digits.length < 7 || digits.length > 15)) return "Invalid mobile number";
  if (!row.email && !row.phone) return "Email or mobile is required";
  return null;
}

// The same person written twice in one file: the second row is skipped by the import. People are told apart by e-mail (any capitals) and by
// mobile number (digits only, a leading 0 or the country code 91 ignored), like the server's own duplicate check. Names are never compared.
const phoneKey = (phone: string): string => {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
};

export interface SheetIssues {
  /** rows the import will skip because they are invalid, by row number */
  invalid: Map<string, string>;
  /** rows the import will skip because an earlier row is the same person, by row number */
  repeated: Map<string, string>;
  /** rows that can be imported (the guests already on the event are checked by the server in the next step) */
  importable: number;
}

export function sheetIssues(rows: Pick<InviteeSheetRow, "id" | "name" | "email" | "phone">[]): SheetIssues {
  const invalid = new Map<string, string>();
  const repeated = new Map<string, string>();
  const byEmail = new Map<string, string>();
  const byPhone = new Map<string, string>();
  for (const row of rows) {
    const problem = rowProblem(row);
    if (problem) { invalid.set(row.id, problem); continue; }
    const email = row.email.trim().toLowerCase();
    const phone = row.phone ? phoneKey(row.phone) : "";
    const earlier = (email && byEmail.get(email)) || (phone && byPhone.get(phone)) || "";
    if (earlier) { repeated.set(row.id, `Same person as row ${earlier}: skipped`); continue; }
    if (email) byEmail.set(email, row.id);
    if (phone) byPhone.set(phone, row.id);
  }
  return { invalid, repeated, importable: rows.length - invalid.size - repeated.size };
}

// Rebuilds a sheet from (edited) rows so edits go through the same import as an uploaded file
export async function rowsToSheetFile(rows: InviteeSheetRow[], fileName: string, sessionNames: string[] = []): Promise<File> {
  const XLSX = await loadXlsx();
  const sheet = XLSX.utils.json_to_sheet(rows.map((r) => ({
    Name: r.name, Email: r.email, Mobile: r.phone, "Company Name": r.company, ...(r.identity ? { "Professional Identity": r.identity } : {}), ...(r.identity2 ? { "Second Identity": r.identity2 } : {}),
    ...Object.fromEntries(sessionNames.map((name) => [name, r.sessions?.[name] === false ? "N" : "Y"])),
  })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Invitees");
  const data = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([data], fileName.replace(/\.(xlsx|xls)$/i, "") + ".xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
