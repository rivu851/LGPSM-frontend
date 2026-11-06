// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { limitPhone } from "./phoneInput.ts";

test("phone fields keep at most 10 digits", () => {
  assert.equal(limitPhone("9876543210"), "9876543210");
  assert.equal(limitPhone("98765432101234"), "9876543210");
  assert.equal(limitPhone("98765 43210"), "9876543210");
  assert.equal(limitPhone("+91 98765 43210"), "9876543210");
  assert.equal(limitPhone("+919876543210"), "9876543210");
  assert.equal(limitPhone("09876543210"), "9876543210");
  assert.equal(limitPhone("98ab76"), "9876");
  assert.equal(limitPhone(""), "");
});
