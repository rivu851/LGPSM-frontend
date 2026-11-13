import test from "node:test";
import assert from "node:assert/strict";
import { isAccountInactiveResponse } from "./accountInactive.ts";

test("the inactive-account answer is recognised by its code", () => {
  assert.equal(isAccountInactiveResponse(403, { code: "ACCOUNT_INACTIVE", message: "User account is inactive." }), true);
});
test("and, for a server not yet updated, by its message", () => {
  assert.equal(isAccountInactiveResponse(403, { message: "User account is inactive." }), true);
  assert.equal(isAccountInactiveResponse(403, { message: "user account is inactive" }), true);
});
test("an ordinary 403 does not end the session", () => {
  assert.equal(isAccountInactiveResponse(403, { message: "Forbidden. Insufficient permissions." }), false);
  assert.equal(isAccountInactiveResponse(403, { code: "EVENT_LOCKED", message: "This event can’t be edited after invitations have been sent." }), false);
  assert.equal(isAccountInactiveResponse(403, {}), false);
  assert.equal(isAccountInactiveResponse(403, null), false);
});
test("only a 403 counts", () => {
  assert.equal(isAccountInactiveResponse(401, { code: "ACCOUNT_INACTIVE" }), false);
  assert.equal(isAccountInactiveResponse(500, { message: "User account is inactive." }), false);
  assert.equal(isAccountInactiveResponse(undefined, { code: "ACCOUNT_INACTIVE" }), false);
});
