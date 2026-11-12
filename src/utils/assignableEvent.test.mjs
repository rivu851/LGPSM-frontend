import test from "node:test";
import assert from "node:assert/strict";
import { isAssignableEvent, defaultAssignableEventId } from "./assignableEvent.ts";

const ev = (id, status) => ({ id, title: id, status });

test("cancelled and completed events cannot take staff; published and unknown ones can", () => {
  assert.equal(isAssignableEvent({ status: "CANCELLED" }), false);
  assert.equal(isAssignableEvent({ status: "completed" }), false);
  assert.equal(isAssignableEvent({ status: "PUBLISHED" }), true);
  assert.equal(isAssignableEvent({}), true);
});
test("a closed event listed first is never the default", () => {
  assert.equal(defaultAssignableEventId([ev("closed", "COMPLETED"), ev("cancelled", "CANCELLED"), ev("live", "PUBLISHED")], ""), "live");
});
test("with several open events nothing is preselected: the person chooses", () => {
  assert.equal(defaultAssignableEventId([ev("a", "PUBLISHED"), ev("b", "PUBLISHED")], ""), "");
});
test("with no open events there is no default", () => {
  assert.equal(defaultAssignableEventId([ev("closed", "COMPLETED")], ""), "");
  assert.equal(defaultAssignableEventId([], ""), "");
});
test("an existing choice is kept while it is still open, and dropped when it is not", () => {
  assert.equal(defaultAssignableEventId([ev("a", "PUBLISHED"), ev("b", "PUBLISHED")], "b"), "b");
  assert.equal(defaultAssignableEventId([ev("a", "PUBLISHED"), ev("b", "COMPLETED")], "b"), "a");
  assert.equal(defaultAssignableEventId([ev("a", "PUBLISHED"), ev("b", "PUBLISHED"), ev("c", "CANCELLED")], "c"), "");
});
