import test from "node:test";
import assert from "node:assert/strict";
import { eventDisplayStatus } from "./eventUtils.ts";

const running = { start: new Date(Date.now() - 3600e3).toISOString(), end: new Date(Date.now() + 3600e3).toISOString() };

test("a closed event reads Completed even before its end time", () => {
  assert.equal(eventDisplayStatus({ status: "COMPLETED", schedule: running }), "Completed");
});
test("a cancelled event reads Cancelled whatever its dates", () => {
  assert.equal(eventDisplayStatus({ status: "CANCELLED", schedule: running }), "Cancelled");
});
test("a published event follows its dates", () => {
  assert.equal(eventDisplayStatus({ status: "PUBLISHED", schedule: running }), "Ongoing");
  assert.equal(eventDisplayStatus({ status: "PUBLISHED", schedule: { start: new Date(Date.now() + 3600e3).toISOString(), end: new Date(Date.now() + 7200e3).toISOString() } }), "Upcoming");
  assert.equal(eventDisplayStatus({ status: "PUBLISHED", schedule: { start: new Date(Date.now() - 7200e3).toISOString(), end: new Date(Date.now() - 3600e3).toISOString() } }), "Completed");
});
