import test from "node:test";
import assert from "node:assert/strict";
import { sessionPickOptionsFor, listIdFor, ownListSessions } from "./sessionPick.ts";

const s = (id, name, inviteeSource = "NEW_LIST", sourceSessionId = null) => ({ _id: id, name, inviteeSource, sourceSessionId });

test("one session, or none: nothing to choose, so no field", () => {
  assert.deepEqual(sessionPickOptionsFor([]), []);
  assert.deepEqual(sessionPickOptionsFor([s("1", "Entry")]), []);
});

test("every session of a multi-session event is offered", () => {
  const options = sessionPickOptionsFor([s("1", "Entry"), s("2", "Exit")]);
  assert.deepEqual(options, [{ id: "1", name: "Entry", listId: "1" }, { id: "2", name: "Exit", listId: "2" }]);
});

test("sessions that all share Entry's list are still offered, labelled, and resolve to Entry", () => {
  const options = sessionPickOptionsFor([s("1", "Entry"), s("2", "Lunch", "COPY_SESSION", "1"), s("3", "Dinner", "COPY_SESSION", "1")]);
  assert.deepEqual(options.map((o) => o.name), ["Entry", "Lunch (same guest list as Entry)", "Dinner (same guest list as Entry)"]);
  assert.equal(listIdFor(options, "2"), "1");
  assert.equal(listIdFor(options, "3"), "1");
  assert.equal(listIdFor(options, "1"), "1");
});

test("a populated source reference (an object) is understood too", () => {
  const options = sessionPickOptionsFor([s("1", "Entry"), s("2", "Lunch", "COPY_SESSION", { _id: "1" })]);
  assert.equal(options[1].listId, "1");
});

test("a copy whose source is unknown keeps its own id rather than inventing one", () => {
  const options = sessionPickOptionsFor([s("1", "Entry"), s("2", "Lunch", "COPY_SESSION", "missing")]);
  assert.deepEqual(options[1], { id: "2", name: "Lunch", listId: "2" });
});

test("the whole event ('') stays the whole event", () => {
  assert.equal(listIdFor(sessionPickOptionsFor([s("1", "A"), s("2", "B")]), ""), "");
});

test("ownListSessions still excludes copies (used for per-session Excel columns)", () => {
  assert.equal(ownListSessions([s("1", "Entry"), s("2", "Lunch", "COPY_SESSION", "1")]).length, 1);
});
