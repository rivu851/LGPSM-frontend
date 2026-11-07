// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { startsWithin, settleRange, startOfDayMs, endOfDayMs } from "./dateRange.ts";

const at = (y, m, d, h = 12, mi = 0, s = 0, ms = 0) => new Date(y, m - 1, d, h, mi, s, ms).toISOString(); // a local time, as an ISO string

test("both ends of the range are included, to the last millisecond of the To day", () => {
  assert.equal(startsWithin(at(2026, 11, 10, 0, 0, 0, 0), "2026-11-10", "2026-11-12"), true); // the first instant of From
  assert.equal(startsWithin(at(2026, 11, 12, 23, 59, 59, 500), "2026-11-10", "2026-11-12"), true); // late on the To day
  assert.equal(startsWithin(at(2026, 11, 12, 23, 59, 59, 999), "2026-11-10", "2026-11-12"), true);
  assert.equal(startsWithin(at(2026, 11, 9, 23, 59, 59, 999), "2026-11-10", "2026-11-12"), false); // the day before
  assert.equal(startsWithin(at(2026, 11, 13, 0, 0, 0, 0), "2026-11-10", "2026-11-12"), false); // the day after
});

test("one end alone is a limit on that side only; no dates means no limit", () => {
  assert.equal(startsWithin(at(2026, 11, 1), "2026-11-10", ""), false);
  assert.equal(startsWithin(at(2030, 1, 1), "2026-11-10", ""), true);
  assert.equal(startsWithin(at(2030, 1, 1), "", "2026-11-12"), false);
  assert.equal(startsWithin(at(2026, 11, 1), "", "2026-11-12"), true);
  assert.equal(startsWithin(at(2030, 1, 1), "", ""), true);
});

test("a single day shows everything on that day and nothing else", () => {
  assert.equal(startsWithin(at(2026, 11, 7, 0, 5), "2026-11-07", "2026-11-07"), true);
  assert.equal(startsWithin(at(2026, 11, 7, 23, 55), "2026-11-07", "2026-11-07"), true);
  assert.equal(startsWithin(at(2026, 11, 6, 23, 55), "2026-11-07", "2026-11-07"), false);
  assert.equal(startsWithin(at(2026, 11, 8, 0, 5), "2026-11-07", "2026-11-07"), false);
});

test("a half-typed date has no value and is no limit; something with no start date matches only when no range is set", () => {
  assert.ok(Number.isNaN(startOfDayMs("")) && Number.isNaN(startOfDayMs("12")) && Number.isNaN(endOfDayMs("2026-1")));
  assert.equal(startsWithin(at(2026, 11, 10), "12", ""), true);
  assert.equal(startsWithin(undefined, "", ""), true);
  assert.equal(startsWithin("not a date", "", ""), true);
  assert.equal(startsWithin(undefined, "2026-11-10", ""), false);
});

test("the range can never end before it starts: the date just changed wins and the other follows", () => {
  assert.deepEqual(settleRange({ from: "2026-11-20", to: "2026-11-12" }, "from"), { from: "2026-11-20", to: "2026-11-20" });
  assert.deepEqual(settleRange({ from: "2026-11-10", to: "2026-11-05" }, "to"), { from: "2026-11-05", to: "2026-11-05" });
  assert.deepEqual(settleRange({ from: "2026-11-10", to: "2026-11-12" }, "from"), { from: "2026-11-10", to: "2026-11-12" });
  assert.deepEqual(settleRange({ from: "2026-11-10", to: "" }, "from"), { from: "2026-11-10", to: "" });
  assert.deepEqual(settleRange({ from: "", to: "2026-11-10" }, "to"), { from: "", to: "2026-11-10" });
});
