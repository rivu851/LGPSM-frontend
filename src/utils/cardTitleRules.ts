// The rules for the custom titles under "Additional Information" (see columnMeaning.ts). The sample Excel always has Name, Email and Mobile
// columns, so a custom title that means one of them cannot become a column of its own:
//  - if what it means is already on the card (Invitee Name chosen, or Company Name chosen) it is refused: "already included";
//  - otherwise it is allowed only if the organizer agrees that it renames that Excel column.
import { meaningOf, type ColumnMeaning } from "./columnMeaning.ts";

export interface TitleSlot { slot: "primary" | "secondary"; title: string }
export interface TitleRulesResult {
  /** the titles are refused: say why and make the organizer try something different */
  blocked: string | null;
  /** the titles that would rename an Excel column: ask before keeping them */
  renames: { slot: "primary" | "secondary"; title: string; column: "Name" | "Email" | "Mobile" }[];
}

const COLUMN: Record<"name" | "email" | "mobile", "Name" | "Email" | "Mobile"> = { name: "Name", email: "Email", mobile: "Mobile" };
const SAY: Record<ColumnMeaning, string> = { name: "the invitee's name", email: "the invitee's email", mobile: "the invitee's mobile number", company: "the company name" };

export function checkCardTitles(opts: { nameChosen: boolean; companyChosen: boolean; custom: TitleSlot[] }): TitleRulesResult {
  const out: TitleRulesResult = { blocked: null, renames: [] };
  const seen = new Map<string, string>(); // meaning or text -> the first title that had it
  for (const { slot, title } of opts.custom) {
    const t = title.trim();
    if (!t) continue;
    const m = meaningOf(t);
    const key = m ?? `text:${t.toLowerCase().replace(/\s+/g, " ")}`;
    if (seen.has(key)) {
      out.blocked = m
        ? `"${t}" and "${seen.get(key)}" mean the same thing (${SAY[m]}). This information is already included, so try something different.`
        : "The two custom details need different titles: each one becomes its own Excel column.";
      return out;
    }
    seen.set(key, t);
    if (m === "name" && opts.nameChosen) { out.blocked = `"${t}" is ${SAY.name}, which is already included in the additional information. Try something different.`; return out; }
    if (m === "company") {
      out.blocked = opts.companyChosen
        ? `"${t}" is ${SAY.company}, which is already included in the additional information. Try something different.`
        : `"${t}" means ${SAY.company}: choose Company Name from the list instead of typing it as a custom title.`;
      return out;
    }
    if (m === "name" || m === "email" || m === "mobile") out.renames.push({ slot, title: t, column: COLUMN[m] });
  }
  return out;
}
