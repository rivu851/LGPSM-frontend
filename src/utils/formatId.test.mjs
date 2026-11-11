// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { formatEventId, formatOrganizerId, formatUserId } from "./formatId.ts";

test("display IDs carry a readable prefix; organizer IDs use the last 8 characters, the others the last 4", () => {
  assert.equal(formatOrganizerId("6aed5738d0f4b7579e8d0088"), "ORG_9E8D0088");
  assert.equal(formatUserId("6aed5738d0f4b7579e8d0088"), "USR_0088");
  assert.equal(formatEventId("6aed5738d0f4b7579e8d00ab"), "EVT_00AB");
  assert.equal(formatOrganizerId(""), "—");
  assert.equal(formatOrganizerId(undefined), "—");
});
