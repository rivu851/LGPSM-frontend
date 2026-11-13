import test from "node:test";
import assert from "node:assert/strict";
import { formatDate, formatDayMonth, formatDateAndTime, formatDateTime, formatCompactDateTime } from "./dateTime.ts";

const withTz = (tz, fn) => { const old = process.env.TZ; process.env.TZ = tz; try { fn(); } finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; } };

test("a date is written 12 Nov 2026", () => {
  assert.equal(formatDate("2026-11-12"), "12 Nov 2026");
  assert.equal(formatDate(new Date(2026, 10, 12, 18, 0)), "12 Nov 2026");
});
test("a date with no time is a calendar day: it never moves to the day before or after, in any time zone", () => {
  for (const tz of ["Etc/GMT+12", "Pacific/Kiritimati", "Asia/Kolkata", "America/Los_Angeles", "UTC"]) {
    withTz(tz, () => {
      assert.equal(formatDate("2026-11-12"), "12 Nov 2026", tz);
      assert.equal(formatDate("2026-01-01"), "1 Jan 2026", tz);
      assert.equal(formatDate("2026-12-31"), "31 Dec 2026", tz);
    });
  }
});
test("a full timestamp is shown in the viewer's own time zone", () => {
  withTz("Asia/Kolkata", () => assert.equal(formatDate("2026-11-12T20:00:00.000Z"), "13 Nov 2026"));
  withTz("America/Los_Angeles", () => assert.equal(formatDate("2026-11-12T20:00:00.000Z"), "12 Nov 2026"));
});
test("nothing, nonsense and impossible dates give the fallback, never 'Invalid Date'", () => {
  assert.equal(formatDate(null, "—"), "—");
  assert.equal(formatDate(undefined), "");
  assert.equal(formatDate("soon", "—"), "—");
  assert.equal(formatDate("2026-02-31", "—"), "—");
  assert.equal(formatDayMonth("nope", "—"), "—");
  assert.equal(formatDateAndTime("nope", "—"), "—");
});
test("day and month, and date with time", () => {
  withTz("Asia/Kolkata", () => {
    assert.equal(formatDayMonth("2026-11-12T10:00:00.000Z"), "12 Nov");
    assert.equal(formatDateAndTime("2026-11-12T04:12:00.000Z"), "12 Nov 2026 | 09:42 am");
  });
});
test("the two shared formatters keep their format", () => {
  withTz("Asia/Kolkata", () => {
    assert.match(formatDateTime("2026-09-26T05:00:00.000Z"), /^26 Sept? 2026, 10:30 (am|AM)$/i);
    assert.equal(formatCompactDateTime("2026-12-25T05:30:00.000Z"), "25/12/26 11:00 AM");
  });
});
