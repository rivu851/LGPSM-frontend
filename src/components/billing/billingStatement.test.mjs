// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { filterInvoices, validateRange, statementCsv } from "./billingStatement.ts";

const inv = (id, event, date, n = 5, amount = 1000) => ({ id, invoiceId: id, eventName: event, invitees: n, paymentDate: date, amount });
const list = [inv("A1", "Gala", "2026-01-04T10:00:00Z"), inv("B2", "Summit", "2026-01-20"), inv("C3", "Gala night", "2026-02-01")];

test("an empty list stays empty whatever is asked", () => {
  assert.deepEqual(filterInvoices([], { from: "2026-01-01", to: "2026-12-31" }, "x"), []);
});

test("the date range is inclusive on both ends and open when a side is empty", () => {
  assert.deepEqual(filterInvoices(list, { from: "2026-01-04", to: "2026-01-20" }, "").map((i) => i.id), ["A1", "B2"]);
  assert.deepEqual(filterInvoices(list, { from: "2026-01-21" }, "").map((i) => i.id), ["C3"]);
  assert.equal(filterInvoices(list, {}, "").length, 3);
});

test("search matches invoice id or event name, ignoring case", () => {
  assert.deepEqual(filterInvoices(list, {}, "gala").map((i) => i.id), ["A1", "C3"]);
  assert.deepEqual(filterInvoices(list, {}, "b2").map((i) => i.id), ["B2"]);
});

test("a statement range needs both dates, in order", () => {
  assert.match(validateRange({ from: "", to: "2026-01-02" }), /From/);
  assert.match(validateRange({ from: "2026-01-02", to: "" }), /To/);
  assert.match(validateRange({ from: "2026-02-01", to: "2026-01-01" }), /not be after/);
  assert.equal(validateRange({ from: "2026-01-01", to: "2026-01-01" }), null);
});

test("the statement CSV has a header, quotes commas and defuses formulas", () => {
  const csv = statementCsv([inv("A1", 'Gala, "big"', "2026-01-04"), inv("B2", "=HYPERLINK(1)", "2026-01-05")]);
  const lines = csv.split("\n");
  assert.equal(lines[0], "Invoice ID,Event Name,No Invitees,Payment Date,Amount (INR)");
  assert.equal(lines[1], 'A1,"Gala, ""big""",5,2026-01-04,1000.00');
  assert.ok(lines[2].includes("'=HYPERLINK(1)"));
});
