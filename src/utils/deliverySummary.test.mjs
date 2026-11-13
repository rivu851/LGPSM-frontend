import test from "node:test";
import assert from "node:assert/strict";
import { summarizeDelivery } from "./deliverySummary.mjs";

test("All delivery reports per-channel counts and guests skipped for having no contact", () => {
  const r = summarizeDelivery([
    { status: "SENT", emailStatus: "SENT" },
    { status: "SENT", whatsappStatus: "SENT" },
    { status: "SENT", emailStatus: "SENT", whatsappStatus: "FAILED" },
    { status: "SKIPPED", failureReason: "No email address or WhatsApp number" },
  ], "sent", "BOTH");
  assert.equal(r.message, "3 sent, 0 failed, 1 skipped (no email or WhatsApp number). Not delivered: 1 on WhatsApp.");
  assert.equal(r.type, "info");
  assert.deepEqual(r.details.slice(0, 2), ["Email: 2 sent, 0 failed, 2 skipped", "WhatsApp: 1 sent, 1 failed, 2 skipped"]);
});

test("a partial failure lists each distinct reason once", () => {
  const r = summarizeDelivery([{ status: "SENT" }, { status: "FAILED", failureReason: "MISSING_EMAIL" }, { status: "FAILED", failureReason: "MISSING_EMAIL" }], "resent", "EMAIL");
  assert.equal(r.message, "1 resent, 2 failed.");
  assert.deepEqual(r.details, ["MISSING_EMAIL"]);
});

test("nothing to report is an error, everything sent is a success", () => {
  assert.equal(summarizeDelivery([], "sent", "EMAIL").type, "error");
  assert.deepEqual(summarizeDelivery([{ status: "SENT" }], "sent", "WHATSAPP"), { type: "success", message: "1 invitation(s) sent." });
});

test("guests who were already invited are reported as left alone, not as missing contacts", () => {
  const out = summarizeDelivery(
    [
      { status: "SKIPPED", failureReason: "Already invited" },
      { status: "SENT" },
    ],
    "sent",
    "EMAIL"
  );
  assert.equal(out.type, "info");
  assert.match(out.message, /1 invitation\(s\) sent, 1 already invited \(not sent again\)/);
  assert.doesNotMatch(out.message, /no email or WhatsApp/);
});

test("e-mail succeeded but WhatsApp failed for every guest: never reported as plain success", () => {
  const r = summarizeDelivery([
    { status: "SENT", emailStatus: "SENT", whatsappStatus: "FAILED", failureReason: "WhatsApp is not configured" },
    { status: "SENT", emailStatus: "SENT", whatsappStatus: "FAILED", failureReason: "WhatsApp is not configured" },
  ], "sent", "BOTH");
  assert.notEqual(r.type, "success");
  assert.equal(r.type, "info");
  assert.match(r.message, /2 sent, 0 failed\. Not delivered: 2 on WhatsApp\./);
  assert.deepEqual(r.details.slice(0, 2), ["Email: 2 sent, 0 failed, 0 skipped", "WhatsApp: 0 sent, 2 failed, 0 skipped"]);
});

test("both channels delivered is a success", () => {
  const r = summarizeDelivery([{ status: "SENT", emailStatus: "SENT", whatsappStatus: "SENT" }], "sent", "BOTH");
  assert.equal(r.type, "success");
  assert.doesNotMatch(r.message, /Not delivered/);
});

test("every channel failing for every guest is an error", () => {
  const r = summarizeDelivery([{ status: "FAILED", emailStatus: "FAILED", whatsappStatus: "FAILED", failureReason: "x" }], "sent", "BOTH");
  assert.equal(r.type, "error");
});

test("an e-mail only send with a failure is an error and says how many failed", () => {
  const r = summarizeDelivery([{ status: "FAILED", failureReason: "SMTP timeout" }, { status: "FAILED", failureReason: "SMTP timeout" }], "sent", "EMAIL");
  assert.equal(r.type, "error");
  assert.equal(r.message, "0 sent, 2 failed.");
});
