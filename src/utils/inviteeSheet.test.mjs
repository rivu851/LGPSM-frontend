// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseInviteeSheet, rowsToSheetFile } from "./inviteeSheet.ts";
import { expectedColumnsFor } from "./inviteeFields.ts";

const fileOf = (rows) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Invitees");
  return new File([XLSX.write(wb, { type: "array", bookType: "xlsx" })], "list.xlsx");
};

test("the preview reads the Professional Identity column", async () => {
  const parsed = await parseInviteeSheet(fileOf([["Name", "Email", "Professional Identity"], ["Pia Roy", "pia@x.com", "Employee ID: 4521"], ["Quin Das", "quin@x.com", ""]]));
  assert.deepEqual(parsed.rows.map((r) => r.identity), ["Employee ID: 4521", ""]);
  assert.equal(parsed.problems.length, 0);
});

test("an edited preview row keeps its Professional Identity when it is turned back into a file", async () => {
  const parsed = await parseInviteeSheet(fileOf([["Name", "Email", "Professional Identity"], ["Pia Roy", "pia@x.com", "Licence 77"]]));
  const again = await parseInviteeSheet(await rowsToSheetFile(parsed.rows, "list.xlsx"));
  assert.equal(again.rows[0].identity, "Licence 77");
});

test("a sheet without the column still parses, with no identity", async () => {
  const parsed = await parseInviteeSheet(fileOf([["Name", "Email"], ["Pia Roy", "pia@x.com"]]));
  assert.equal(parsed.rows[0].identity, "");
});

test("a sheet is checked against the columns the event's settings ask for", async () => {
  const plain = { };
  const withExtras = { company: true, identity: true, dietary: true };
  const full = fileOf([["Name", "Email", "Mobile", "Company Name", "Professional Identity"], ["Pia Roy", "pia@x.com", "", "Acme", "ID 1"]]);
  assert.deepEqual((await parseInviteeSheet(full, [], expectedColumnsFor(withExtras))).missingColumns, []);
  // only the chosen Additional Information (Professional Identity) is asked for on top of the basics
  const basic = fileOf([["Name", "Email", "Mobile"], ["Pia Roy", "pia@x.com", ""]]);
  assert.deepEqual((await parseInviteeSheet(basic, [], expectedColumnsFor(plain))).missingColumns, []);
  assert.deepEqual((await parseInviteeSheet(basic, [], expectedColumnsFor({ identity: true }))).missingColumns, ["Professional Identity"]);
  assert.deepEqual((await parseInviteeSheet(basic, [], expectedColumnsFor(withExtras))).missingColumns, ["Professional Identity", "Company Name"]);
  // no heading row at all: every column counts as missing; with no settings given nothing is checked
  const noHeader = fileOf([["Pia Roy", "pia@x.com", "98765"]]);
  assert.equal((await parseInviteeSheet(noHeader, [], expectedColumnsFor(plain))).missingColumns.length, 3);
  assert.deepEqual((await parseInviteeSheet(noHeader)).missingColumns, []);
});

test("a sheet with the organizer's own title for the custom detail is read into that detail", async () => {
  const expected = expectedColumnsFor({ identity: true, identityLabel: "Badge Code" });
  const parsed = await parseInviteeSheet(fileOf([["Name", "Email", "Mobile", "Badge Code"], ["Pia Roy", "pia@x.com", "", "BC-9"]]), [], expected);
  assert.deepEqual(parsed.missingColumns, []);
  assert.equal(parsed.rows[0].identity, "BC-9");
  assert.deepEqual((await parseInviteeSheet(fileOf([["Name", "Email", "Mobile"], ["Pia Roy", "pia@x.com", ""]]), [], expected)).missingColumns, ["Badge Code"]);
});

test("two custom details are read into their own fields, and survive being rebuilt into a file", async () => {
  const expected = expectedColumnsFor({ identity: true, identityLabel: "Badge", identity2: true, identity2Label: "Table" });
  const parsed = await parseInviteeSheet(fileOf([["Name", "Email", "Mobile", "Badge", "Table"], ["Pia Roy", "pia@x.com", "", "B1", "T9"]]), [], expected);
  assert.deepEqual(parsed.missingColumns, []);
  assert.deepEqual([parsed.rows[0].identity, parsed.rows[0].identity2], ["B1", "T9"]);
  const again = await parseInviteeSheet(await rowsToSheetFile(parsed.rows, "list.xlsx"));
  assert.deepEqual([again.rows[0].identity, again.rows[0].identity2], ["B1", "T9"]);
});

import { sheetIssues } from "./inviteeSheet.ts";

test("sheetIssues separates invalid rows, repeated rows and importable rows", () => {
  const r = sheetIssues([
    { id: "2", name: "Sheet One", email: "sheet1@x.test", phone: "919877700011" },
    { id: "3", name: "Sheet Two", email: "sheet2@x.test", phone: "" },
    { id: "4", name: "Sheet Dup", email: "SHEET1@x.test", phone: "" },
    { id: "5", name: "No Mail Bad", email: "bad@@x", phone: "" },
    { id: "6", name: "Same Phone", email: "", phone: "9877700011" },
  ]);
  assert.deepEqual([...r.invalid.keys()], ["5"]);
  assert.deepEqual([...r.repeated.keys()], ["4", "6"]);
  assert.match(r.repeated.get("4"), /row 2/);
  assert.equal(r.importable, 2);
});
test("sheetIssues never treats two different people with the same name as a repeat", () => {
  const r = sheetIssues([{ id: "2", name: "Priya Sharma", email: "a@x.test", phone: "" }, { id: "3", name: "Priya Sharma", email: "b@x.test", phone: "" }]);
  assert.equal(r.repeated.size, 0);
  assert.equal(r.importable, 2);
});
test("sheetIssues: an invalid row does not make a later valid row a repeat", () => {
  const r = sheetIssues([{ id: "2", name: "X", email: "a@x.test", phone: "" }, { id: "3", name: "Good Name", email: "a@x.test", phone: "" }]);
  assert.deepEqual([...r.invalid.keys()], ["2"]);
  assert.equal(r.repeated.size, 0);
});
