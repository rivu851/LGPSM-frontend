import test from "node:test";
import assert from "node:assert/strict";
import { checkCardTitles } from "./cardTitleRules.ts";

const run = (nameChosen, companyChosen, ...titles) => checkCardTitles({ nameChosen, companyChosen, custom: titles.map((title, i) => ({ slot: i ? "secondary" : "primary", title })) });

test("Invitee Name is chosen, so a custom title that means the name is refused", () => {
  for (const t of ["Invitee Name", "name", "Guest Name", "Full Name", "Name of Guest", "Attendee", "Nme of guest"]) {
    const r = run(true, false, t);
    assert.ok(r.blocked && /already included/.test(r.blocked), t);
  }
});
test("a title that is about something else is fine, and asks for nothing", () => {
  for (const t of ["Designation", "Badge No.", "Employee ID", "Table No", "Guest Type"]) {
    assert.deepEqual(run(true, false, t), { blocked: null, renames: [] }, t);
  }
});
test("a title that means a standard column, with the name not chosen, asks to rename that column", () => {
  const r = run(false, false, "Name", "Mobile No");
  assert.equal(r.blocked, null);
  assert.deepEqual(r.renames.map((x) => x.column), ["Name", "Mobile"]);
});
test("every way of saying phone is caught, whatever the spelling", () => {
  for (const t of ["telephone no", "contact no", "ph no", "Ph. No.", "phone no", "Mobile Number", "Cell", "WhatsApp", "Telphone", "Tel", "Contact Number", "PHONE"]) {
    const r = run(true, false, t);
    assert.deepEqual(r.renames.map((x) => x.column), ["Mobile"], t);
  }
});
test("email in any form", () => {
  for (const t of ["Email", "e-mail", "Mail ID", "email address", "Emial"]) assert.deepEqual(run(true, false, t).renames.map((x) => x.column), ["Email"], t);
});
test("two titles that mean the same thing are refused", () => {
  assert.ok(run(false, false, "Phone", "Contact No").blocked);
  assert.ok(run(false, false, "Badge", "badge").blocked);
});
test("company: refused whether or not Company Name is chosen, with the right advice", () => {
  assert.match(run(true, true, "Organization").blocked, /already included/);
  assert.match(run(true, false, "Company").blocked, /choose Company Name/);
});
