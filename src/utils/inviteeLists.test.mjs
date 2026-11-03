// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { canManageInviteeLists, howAdded, stateExplanation, restoreOutcome, previewLines, previewDiscrepancy, alreadyUploadedAndSent, listDisplayName } from "./inviteeLists.ts";

test("only organizers and admins manage invitee lists; System Users and anyone else do not", () => {
  assert.equal(canManageInviteeLists("ORGANIZER"), true);
  assert.equal(canManageInviteeLists("ADMIN"), true);
  assert.equal(canManageInviteeLists("SYSTEM_USER"), false);
  assert.equal(canManageInviteeLists(undefined), false);
});

test("how a list was added", () => {
  assert.equal(howAdded({ source: "EXCEL", mode: "REPLACE" }), "Replaced list");
  assert.equal(howAdded({ source: "EXCEL", mode: "APPEND" }), "Added to list");
  assert.match(howAdded({ source: "MANUAL", mode: "APPEND" }), /by hand/);
});

test("a locked list says what locked it and that unsent guests are kept too", () => {
  const t = stateExplanation({ locked: true, lockReasons: { sentGuests: 2, answeredRsvp: 1, checkedIn: 0 }, failed: 0, unknown: 0, replaceableGuests: 0 });
  assert.match(t, /^Locked: 2 invitations sent, 1 RSVP answered\./);
  assert.match(t, /including guests who have not been sent anything yet/);
});

test("an open list with failed or unresolved sends keeps them and says so", () => {
  const t = stateExplanation({ locked: false, lockReasons: null, failed: 1, unknown: 2, replaceableGuests: 3 });
  assert.match(t, /^Open:/);
  assert.match(t, /1 guest has a failed send \(kept, can be retried\)/);
  assert.match(t, /2 guests have unresolved deliveries/);
  assert.match(t, /set aside 3 guests who were never invited/);
});

test("restore outcome names the guest they clash with and never promises an invitation", () => {
  const res = { restored: 1, alreadyActive: 0, refused: 1, notFound: 0, results: [{ id: "a", status: "RESTORED" }, { id: "b", status: "DUPLICATE_ACTIVE", conflictsWith: { name: "Rival Ray", matchedOn: "mobile" } }] };
  const out = restoreOutcome(res, (id) => (id === "b" ? "Dee Draft" : "x"));
  assert.equal(out.tone, "warning");
  assert.match(out.message, /1 guest restored as Not sent \(no invitation was sent and no access pass was created\)/);
  assert.equal(out.conflicts.length, 1);
  assert.match(out.conflicts[0], /Dee Draft was not restored: Rival Ray on the active list has the same mobile number/);
});

test("when nothing could be restored the outcome is an error", () => {
  const out = restoreOutcome({ restored: 0, alreadyActive: 0, refused: 1, notFound: 0, results: [{ id: "b", status: "DUPLICATE_ACTIVE", conflictsWith: { name: "R", matchedOn: "email" } }] }, () => "G");
  assert.equal(out.tone, "error");
});

const PREVIEW = { totalRows: 6, validNew: 2, duplicateRows: 1, matchedExistingGuests: 1, existingActive: 8, lockedGuestsKept: 2, failedKept: 1, unknownKept: 1, wouldSetAside: 4, rejectedRows: 3, errors: [] };

test("Replace preview says what is added, set aside and kept", () => {
  const l = previewLines(PREVIEW, "REPLACE");
  assert.deepEqual(l, [
    "2 guests will be added",
    "1 already on the list, 1 repeated in the file (not added again)",
    "2 rows have a problem and will be skipped",
    "4 guests who were never invited will be set aside",
    "2 guests in already-sent lists stay exactly as they are",
    "1 guest with a failed send stays and can be retried",
    "1 guest with an unresolved delivery stays (they may have received it)",
  ]);
});

test("Append preview never mentions setting anyone aside", () => {
  const l = previewLines({ ...PREVIEW, wouldSetAside: 0 }, "APPEND");
  assert.ok(!l.some((x) => /set aside/.test(x)));
  assert.equal(l[l.length - 1], "All 8 current guests stay");
});

test("Replace preview with nobody to set aside says so", () => {
  assert.ok(previewLines({ ...PREVIEW, wouldSetAside: 0 }, "REPLACE").includes("No one will be set aside"));
});

test("a result that matches the preview raises no warning; one that differs is explained", () => {
  assert.equal(previewDiscrepancy(PREVIEW, { imported: 2, archived: 4 }), null);
  assert.equal(previewDiscrepancy(null, { imported: 1, archived: 0 }), null);
  const d = previewDiscrepancy(PREVIEW, { imported: 1, archived: 3 });
  assert.match(d, /changed while you were deciding/);
  assert.match(d, /1 guest added \(previewed 2\)/);
  assert.match(d, /3 guests set aside \(previewed 4\)/);
});

test("the same list uploaded again after it was sent is recognised; unsent or partly new files are not", () => {
  assert.equal(alreadyUploadedAndSent({ validNew: 0, matchedExistingGuests: 5, alreadyInvited: 5 }), true);
  assert.equal(alreadyUploadedAndSent({ validNew: 0, matchedExistingGuests: 5, alreadyInvited: 3 }), false);
  assert.equal(alreadyUploadedAndSent({ validNew: 2, matchedExistingGuests: 5, alreadyInvited: 5 }), false);
  assert.equal(alreadyUploadedAndSent({ validNew: 0, matchedExistingGuests: 0, alreadyInvited: 0 }), false);
  assert.equal(alreadyUploadedAndSent(null), false);
});

test("a list is shown by its file name without the spreadsheet extension", () => {
  assert.equal(listDisplayName("Guests May.xlsx"), "Guests May");
  assert.equal(listDisplayName("a.b.XLS"), "a.b");
  assert.equal(listDisplayName("Earlier invitees"), "Earlier invitees");
});

test("the Replace preview tells already-invited guests apart from not-yet-invited guests of a sent list, in the same words as the header", () => {
  const l = previewLines({ ...PREVIEW, wouldSetAside: 1, lockedGuestsKept: 3, lockedInvitedKept: 1, lockedNotInvitedKept: 2 }, "REPLACE");
  assert.ok(l.includes("1 guest who was never invited will be set aside"));
  assert.ok(l.includes("1 guest already invited stays exactly as it is"));
  assert.ok(l.includes("2 guests not yet invited in an already-sent list also stay (a sent list is kept whole)"));
  assert.ok(!l.some((x) => x.includes("in already-sent lists stay")));
});
