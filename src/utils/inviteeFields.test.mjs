// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { expectedColumnsFor, excelColumnsFor, inviteeConfigFor, inviteeFieldsFor, templateRow, EXCEL_HEADER } from "./inviteeFields.ts";

const configs = [
  {},
  { company: true },
  { identity: true },
  { dietary: true },
  { company: true, identity: true, dietary: true },
];

test("the generated Excel columns are exactly the fields the manual form shows, for every configuration", () => {
  for (const c of configs) {
    const fromForm = inviteeFieldsFor(c).map((k) => EXCEL_HEADER[k]);
    assert.deepEqual(Object.keys(templateRow(c)), fromForm);
    assert.deepEqual(excelColumnsFor(c), fromForm);
  }
});

test("Professional Identity appears only when the card uses it, in both the sample and the form", () => {
  assert.ok(!inviteeFieldsFor({}).includes("identity"));
  assert.ok(!("Professional Identity" in templateRow({})));
  const cfg = inviteeConfigFor({ cardInfo: { primary: "INVITEE_NAME", secondary: "PROFESSIONAL_IDENTITY" } });
  assert.ok(inviteeFieldsFor(cfg).includes("identity"));
  assert.ok("Professional Identity" in templateRow(cfg));
});

test("Company Name is offered, and required in a sheet, only when it is chosen for the card", () => {
  assert.ok(!inviteeFieldsFor({}).includes("company"));
  assert.ok(!("Company Name" in templateRow({})));
  assert.ok(!expectedColumnsFor({}).some((c) => c.key === "company"));
  assert.ok(inviteeFieldsFor({ company: true }).includes("company"));
  assert.ok(expectedColumnsFor({ company: true }).some((c) => c.key === "company"));
});

test("company is required only when chosen for the card, never because the event is corporate; dietary is no column", () => {
  assert.ok(!inviteeConfigFor({ corporate: true }).company);
  assert.ok(inviteeConfigFor({ cardInfo: { primary: "COMPANY_NAME", secondary: null } }).company);
  assert.ok(!inviteeConfigFor({ cardInfo: { primary: "INVITEE_NAME", secondary: null } }).company);
  assert.ok(!inviteeConfigFor({}).dietary);
  assert.ok(inviteeConfigFor({ dietaryEnabled: true }).dietary);
});

test("the food choice is never a column or a form field, even when the event asks guests for one", () => {
  const cfg = inviteeConfigFor({ dietaryEnabled: true });
  assert.ok(!excelColumnsFor(cfg).some((h) => /diet|food/i.test(h)));
  assert.ok(!("Dietary Preference" in templateRow(cfg)));
});

test("name, email and mobile are always the first three columns", () => {
  assert.deepEqual(excelColumnsFor({ company: true, identity: true, dietary: true }).slice(0, 3), ["Name", "Email", "Mobile"]);
});

test("the organizer's own title for the custom detail becomes its column title and form label", () => {
  const cfg = inviteeConfigFor({ cardInfo: { primary: "INVITEE_NAME", secondary: "PROFESSIONAL_IDENTITY", identityLabel: "  Designation " } });
  assert.equal(cfg.identityLabel, "Designation");
  assert.deepEqual(excelColumnsFor(cfg), ["Name", "Email", "Mobile", "Designation"]);
  assert.ok("Designation" in templateRow(cfg));
  assert.deepEqual(expectedColumnsFor(cfg).map((c) => c.header), ["Name", "Email", "Mobile", "Designation"]);
  // without a title, or when the detail is not on the card, the standard title applies
  assert.deepEqual(excelColumnsFor(inviteeConfigFor({ cardInfo: { primary: "INVITEE_NAME", secondary: "PROFESSIONAL_IDENTITY" } })).slice(-1), ["Professional Identity"]);
  assert.equal(inviteeConfigFor({ cardInfo: { primary: "INVITEE_NAME", secondary: null, identityLabel: "Designation" } }).identityLabel, undefined);
});

test("the sample is the three standard columns plus exactly what Additional Information chose, in that order", () => {
  assert.deepEqual(excelColumnsFor(inviteeConfigFor({ corporate: true })), ["Name", "Email", "Mobile"]);
  assert.deepEqual(excelColumnsFor(inviteeConfigFor({ cardInfo: { primary: "INVITEE_NAME", secondary: null } })), ["Name", "Email", "Mobile"]);
  assert.deepEqual(excelColumnsFor(inviteeConfigFor({ cardInfo: { primary: "COMPANY_NAME", secondary: null } })), ["Name", "Email", "Mobile", "Company Name"]);
  const cfg = inviteeConfigFor({ cardInfo: { primary: "PROFESSIONAL_IDENTITY", secondary: "SECONDARY_IDENTITY", identityLabel: "MTG-B4000", secondaryIdentityLabel: "Table No" } });
  assert.deepEqual(excelColumnsFor(cfg), ["Name", "Email", "Mobile", "MTG-B4000", "Table No"]);
  assert.equal(templateRow(cfg)["MTG-B4000"], "Sample value");
  assert.deepEqual(expectedColumnsFor(cfg).map((c) => c.key), ["name", "email", "mobile", "identity", "identity2"]);
});
