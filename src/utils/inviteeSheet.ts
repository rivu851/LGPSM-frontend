import * as XLSX from "xlsx";

// Parses an invitee sheet with the same header rules as the backend import
// (Backend/src/services/invitee.service.ts processExcelImport), so the preview shows what will be imported.

export interface InviteeSheetRow {
  id: string; // row number in the sheet
  name: string;
  email: string;
  phone: string;
  company: string;
}

export interface ParsedInviteeSheet {
  rows: InviteeSheetRow[];
  // Rows the backend will reject, with the reason (same checks as the import)
  problems: { row: string; error: string }[];
}

const clean = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

export async function parseInviteeSheet(file: File): Promise<ParsedInviteeSheet> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = sheet ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) : [];
  const nonBlank = raw.filter((r) => Array.isArray(r) && r.some((c) => clean(c) !== ""));
  if (nonBlank.length === 0) return { rows: [], problems: [] };

  let nameIdx = -1, emailIdx = -1, mobileIdx = -1, companyIdx = -1;
  const header = nonBlank[0].map((c) => clean(c).toLowerCase());
  const hasHeader = header.some((c) => c.includes("name") || c.includes("email") || c.includes("mobile") || c.includes("phone") || c.includes("company"));
  if (hasHeader) {
    header.forEach((c, i) => {
      if (!c) return;
      if (c.includes("company") || c.includes("organization") || c.includes("organisation")) companyIdx = i;
      else if (c.includes("name")) nameIdx = i;
      else if (c.includes("email") || c.includes("mail")) emailIdx = i;
      else if (c.includes("mobile") || c.includes("phone") || c.includes("contact") || c.includes("whatsapp")) mobileIdx = i;
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
    const row: InviteeSheetRow = { id: rowNo, name: cell(r, nameIdx), email: cell(r, emailIdx).toLowerCase(), phone: cell(r, mobileIdx), company: cell(r, companyIdx) };
    const problem = rowProblem(row);
    if (problem) problems.push({ row: rowNo, error: problem });
    rows.push(row);
  });
  return { rows, problems };
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

// Rebuilds a sheet from (edited) rows so edits go through the same import as an uploaded file
export function rowsToSheetFile(rows: InviteeSheetRow[], fileName: string): File {
  const sheet = XLSX.utils.json_to_sheet(rows.map((r) => ({ Name: r.name, Email: r.email, Mobile: r.phone, "Company Name": r.company })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Invitees");
  const data = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([data], fileName.replace(/\.(xlsx|xls)$/i, "") + ".xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
