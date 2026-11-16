// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { profileCompleteness } from "./profileCompleteness.ts";

test("a Google sign-up has a name and an email only: half done, and asks for the type and phone", () => {
  const r = profileCompleteness({ fullName: "Sam Roy", email: "sam@gmail.com", phone: "", profile: {} });
  assert.deepEqual([r.percent, r.complete], [50, false]);
  assert.deepEqual(r.missing.map((m) => m.key), ["organizationType", "phone"]);
});
test("an individual with a phone number is complete", () => {
  const r = profileCompleteness({ fullName: "Sam Roy", email: "sam@gmail.com", phone: "9876543210", profile: { organizationType: "INDIVIDUAL" } });
  assert.deepEqual([r.percent, r.complete, r.total], [100, true, 4]);
});
test("an organization also needs its name, so it counts one more field", () => {
  const r = profileCompleteness({ fullName: "Sam Roy", email: "sam@gmail.com", phone: "9876543210", profile: { organizationType: "ORGANIZATION" } });
  assert.deepEqual([r.percent, r.complete, r.total], [80, false, 5]);
  assert.deepEqual(r.missing.map((m) => m.key), ["organizationName"]);
  assert.equal(profileCompleteness({ fullName: "Sam Roy", email: "s@x.com", phone: "+91 98765 43210", profile: { organizationType: "ORGANIZATION", organizationName: "Acme" } }).complete, true);
});
test("short or formatted phone numbers are judged by their digits", () => {
  assert.equal(profileCompleteness({ fullName: "Al", email: "a@x.com", phone: "12345", profile: { organizationType: "INDIVIDUAL" } }).complete, false);
  assert.equal(profileCompleteness({ fullName: "Al", email: "a@x.com", phone: "98765-43210", profile: { organizationType: "INDIVIDUAL" } }).complete, true);
});
test("nothing at all is 0%", () => {
  assert.equal(profileCompleteness(null).percent, 0);
});
