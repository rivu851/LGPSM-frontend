// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { matchesEventFilters } from "./eventFilters.ts";

const none = { name: "", organizer: "", category: "", sessions: "", status: "", from: "", to: "" };
const E = (id, o = {}) => ({ id, name: id, organizer: "Org A", displayId: `EV-${id}`, category: "Corporate", categoryId: "c1", start: "2026-11-10T10:00:00.000Z", status: "Upcoming", phase: "Upcoming", sessionsCount: 1, ...o });
const events = [
  E("sent-upcoming"),
  E("unsent-upcoming", { status: "Invitation not sent", phase: "Upcoming" }),
  E("running", { status: "Ongoing", phase: "Ongoing", organizer: "Org B", categoryId: "c2", category: "Personal", sessionsCount: 3, start: "2026-11-15T10:00:00.000Z" }),
  E("old", { status: "Past", phase: "Past", sessionsCount: 0, start: "2026-10-01T10:00:00.000Z" }),
  E("dropped", { status: "Cancelled", phase: "Cancelled", sessionsCount: 8, start: "2026-12-01T10:00:00.000Z" }),
];
const ids = (f, term = "") => events.filter((e) => matchesEventFilters(e, { ...none, ...f }, term)).map((e) => e.id);

test("no filter shows everything", () => assert.equal(ids({}).length, 5));
test("status filters work alone", () => {
  assert.deepEqual(ids({ status: "Upcoming" }), ["sent-upcoming", "unsent-upcoming"]); // an upcoming event is upcoming whether or not invitations went out
  assert.deepEqual(ids({ status: "Ongoing" }), ["running"]);
  assert.deepEqual(ids({ status: "Past" }), ["old"]);
  assert.deepEqual(ids({ status: "Cancelled" }), ["dropped"]);
  assert.deepEqual(ids({ status: "Invitation not sent" }), ["unsent-upcoming"]);
});
test("category, organizer and name filters work alone", () => {
  assert.deepEqual(ids({ category: "c2" }), ["running"]);
  assert.deepEqual(ids({ organizer: "org b" }), ["running"]);
  assert.deepEqual(ids({ name: "UPCOMING" }), ["sent-upcoming", "unsent-upcoming"]);
});
test("session count filters work alone", () => {
  assert.deepEqual(ids({ sessions: "0" }), ["old"]);
  assert.deepEqual(ids({ sessions: "1" }), ["sent-upcoming", "unsent-upcoming"]);
  assert.deepEqual(ids({ sessions: "2-5" }), ["running"]);
  assert.deepEqual(ids({ sessions: "6+" }), ["dropped"]);
});
test("date range filters work alone and inclusively", () => {
  assert.deepEqual(ids({ from: "2026-11-15" }), ["running", "dropped"]);
  assert.deepEqual(ids({ to: "2026-10-01" }), ["old"]);
  assert.deepEqual(ids({ from: "2026-11-10", to: "2026-11-10" }), ["sent-upcoming", "unsent-upcoming"]);
});
test("the search box matches name, organizer, id and category", () => {
  assert.deepEqual(ids({}, "personal"), ["running"]);
  assert.deepEqual(ids({}, "ev-old"), ["old"]);
});
test("filters combine by narrowing", () => {
  assert.deepEqual(ids({ status: "Upcoming", category: "c1", sessions: "1" }), ["sent-upcoming", "unsent-upcoming"]);
  assert.deepEqual(ids({ status: "Upcoming", organizer: "Org B" }), []);
});
