// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { limitPhone, readPhone, readDigits, NOT_DIGITS_MESSAGE, TOO_MANY_DIGITS_MESSAGE } from "./phoneInput.ts";

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

test("letters and symbols never stay in a phone field, and the person is told why", () => {
  for (const typed of ["abc", "98765abc", "98765-4321x", "98765-43210", "98765@43210", "9876*", "①②③"]) {
    const r = readPhone(typed);
    assert.match(r.value, /^\d*$/, typed);
    assert.equal(r.message, NOT_DIGITS_MESSAGE, typed);
  }
  assert.equal(readPhone("abc").value, "");
  assert.equal(readPhone("98765abc43210").value, "9876543210");
});

test("plain digits, spaces in a number and a pasted country code are fine, with no message", () => {
  for (const typed of ["", "9", "9876543210", "98765 43210", "+91 98765 43210", "+919876543210", "09876543210"]) {
    assert.equal(readPhone(typed).message, null, typed);
  }
});

test("typing an 11th digit says a phone number has 10 digits", () => {
  const r = readPhone("98765432101");
  assert.equal(r.value, "9876543210");
  assert.equal(r.message, TOO_MANY_DIGITS_MESSAGE);
});

test("digit-only fields (codes, counts) drop everything else and say so", () => {
  assert.deepEqual(readDigits("12a4"), { value: "124", message: NOT_DIGITS_MESSAGE });
  assert.deepEqual(readDigits("123456", 4), { value: "1234", message: null });
  assert.deepEqual(readDigits("", 6), { value: "", message: null });
  assert.deepEqual(readDigits("x", 1), { value: "", message: NOT_DIGITS_MESSAGE });
});
