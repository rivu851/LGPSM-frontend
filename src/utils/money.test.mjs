import test from "node:test";
import assert from "node:assert/strict";
import { formatMoney, PLATFORM_CURRENCY } from "./money.ts";

test("the platform currency is the rupee", () => {
  assert.equal(PLATFORM_CURRENCY, "INR");
});
test("amounts are written in rupees with Indian digit grouping, and are not converted", () => {
  assert.equal(formatMoney(12), "₹12.00");
  assert.equal(formatMoney(1234567.5), "₹12,34,567.50");
  assert.equal(formatMoney(0), "₹0.00");
});
test("decimals and compact forms for cards", () => {
  assert.equal(formatMoney(900, { maxFractionDigits: 0 }), "₹900");
  assert.equal(formatMoney(1234567, { compact: true, maxFractionDigits: 1 }), "₹12.3L");
  assert.equal(formatMoney(1.5, { minFractionDigits: 1, maxFractionDigits: 1 }), "₹1.5");
});
test("a missing amount is a dash, never a currency symbol with nothing", () => {
  assert.equal(formatMoney(null), "—");
  assert.equal(formatMoney(undefined), "—");
  assert.equal(formatMoney(Number.NaN), "—");
});
test("no dollar sign can come out whatever the amount", () => {
  for (const n of [0, 1, 10, 20, 1234.56, -5]) assert.doesNotMatch(formatMoney(n), /\$/);
});
