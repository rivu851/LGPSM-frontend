// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { toAccessLogRow } from "./accessLogRows.ts";

const base = { _id: "c1", eventId: "e1", checkInMethod: "QR", checkInAt: "2026-10-31T05:00:00.000Z" };

test("a row shows the guest, session, entry time and the staff member", () => {
  const row = toAccessLogRow({ ...base, invitee: { _id: "i1", name: "Devon Lane", mobile: "9876543210" }, session: { _id: "s1", name: "Entry Session" }, checkedInBy: { _id: "u1", fullName: "Moloy Roy", role: "SYSTEM_USER" } });
  assert.deepEqual(row, { id: "c1", guest: "Devon Lane", mobile: "9876543210", session: "Entry Session", entryAt: base.checkInAt, exitAt: null, staff: "Moloy Roy" });
});

test("there is never an exit time until check-out exists", () => {
  assert.equal(toAccessLogRow({ ...base, invitee: { _id: "i", name: "A" } }).exitAt, null);
});

test("a recorded check-out, if one ever exists, is shown as is", () => {
  assert.equal(toAccessLogRow({ ...base, checkOutAt: "2026-10-31T09:00:00.000Z" }).exitAt, "2026-10-31T09:00:00.000Z");
});

test("missing details fall back to neutral wording, not to audit text", () => {
  const row = toAccessLogRow({ ...base, invitee: null, session: null, checkedInBy: "u1" });
  assert.equal(row.guest, "Guest");
  assert.equal(row.mobile, "—");
  assert.equal(row.session, "Whole event");
  assert.equal(row.staff, "—");
});
