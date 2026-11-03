import test from "node:test";
import assert from "node:assert/strict";
import { refreshOutcome } from "./refreshOutcome.ts";

test("only the server saying the session is over ends it", () => {
  for (const s of [400, 401, 403]) assert.equal(refreshOutcome(s, false), "ended");
});

test("an outage, a server error or rate limiting keep the session", () => {
  for (const s of [null, 429, 500, 502, 503, 504]) assert.equal(refreshOutcome(s, false), "unavailable", String(s));
});

test("success needs a token", () => {
  assert.equal(refreshOutcome(200, true), "ok");
  assert.equal(refreshOutcome(200, false), "unavailable");
});
