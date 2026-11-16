// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { sessionTimeProblem, sessionsOutsideEvent } from "./sessionWindow.ts";

const ev = { eventStart: "2026-11-26T06:30:00.000Z", eventEnd: "2026-11-27T06:30:00.000Z" };

test("a time inside the event is fine", () => {
  assert.equal(sessionTimeProblem({ field: "start", value: "2026-11-26T08:00:00.000Z", ...ev }), null);
  assert.equal(sessionTimeProblem({ field: "end", value: "2026-11-27T06:30:00.000Z", start: "2026-11-26T08:00:00.000Z", ...ev }), null); // exactly at the end is allowed
});
test("a session cannot start before the event or after it ends", () => {
  assert.match(sessionTimeProblem({ field: "start", value: "2026-11-25T08:00:00.000Z", ...ev }), /cannot start before the event begins/);
  assert.match(sessionTimeProblem({ field: "start", value: "2026-11-28T08:00:00.000Z", ...ev }), /cannot start after the event ends/);
});
test("a session cannot end after the event or before it begins", () => {
  assert.match(sessionTimeProblem({ field: "end", value: "2026-11-27T09:00:00.000Z", start: "2026-11-26T08:00:00.000Z", ...ev }), /cannot end after the event ends/);
  assert.match(sessionTimeProblem({ field: "end", value: "2026-11-25T09:00:00.000Z", ...ev }), /cannot end before the event begins/);
});
test("an end that is not after the start is refused with its own message", () => {
  assert.match(sessionTimeProblem({ field: "end", value: "2026-11-26T08:00:00.000Z", start: "2026-11-26T09:00:00.000Z", ...ev }), /end must be after its start/);
});
test("missing event dates never block", () => {
  assert.equal(sessionTimeProblem({ field: "start", value: "2026-11-25T08:00:00.000Z" }), null);
});
test("sessions left outside the event's dates are found", () => {
  const list = [
    { name: "in", start: "2026-11-26T08:00:00.000Z", end: "2026-11-26T10:00:00.000Z" },
    { name: "early", start: "2026-11-25T08:00:00.000Z", end: "2026-11-26T10:00:00.000Z" },
    { name: "late", start: "2026-11-26T08:00:00.000Z", end: "2026-11-28T10:00:00.000Z" },
  ];
  assert.deepEqual(sessionsOutsideEvent(list, ev.eventStart, ev.eventEnd).map((s) => s.name), ["early", "late"]);
});
