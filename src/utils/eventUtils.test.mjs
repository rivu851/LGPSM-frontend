import test from "node:test";
import assert from "node:assert/strict";
import { eventDisplayStatus, contactWithCountryCode } from "./eventUtils.ts";

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

test("the event contact number carries the country code the form shows", () => {
  assert.equal(contactWithCountryCode("9007000891"), "+91 90070 00891");
  assert.equal(contactWithCountryCode("09007000891"), "+91 90070 00891");
  assert.equal(contactWithCountryCode("919007000891"), "+91 90070 00891");
  assert.equal(contactWithCountryCode("90070 00891"), "+91 90070 00891");
  assert.equal(contactWithCountryCode("123456789"), "+91 123456789");
  // typed with a country code of its own: left as typed
  assert.equal(contactWithCountryCode("+44 20 7946 0958"), "+44 20 7946 0958");
  assert.equal(contactWithCountryCode(""), "");
  assert.equal(contactWithCountryCode(undefined), "");
});
