// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { resolveInvitationTheme, DEFAULT_INVITATION_THEME, readableOn, tint, themeCssVars } from "./invitationTheme.ts";

test("falls back to the default look when the API sends no theme", () => {
  assert.deepEqual(resolveInvitationTheme(undefined), { ...DEFAULT_INVITATION_THEME, design: undefined });
});

test("only #RRGGBB colours reach CSS; anything else is replaced", () => {
  const t = resolveInvitationTheme({ primary: "url(javascript:alert(1))", accent: "red", background: "#fff", ink: "#101820", heading: "serif" });
  assert.equal(t.primary, DEFAULT_INVITATION_THEME.primary);
  assert.equal(t.accent, DEFAULT_INVITATION_THEME.accent);
  assert.equal(t.background, DEFAULT_INVITATION_THEME.background);
  assert.equal(t.ink, "#101820");
  assert.equal(t.heading, "serif");
});

test("text on a colour is chosen for contrast", () => {
  assert.equal(readableOn("#FEE715"), "#15191C");
  assert.equal(readableOn("#660410"), "#FFFFFF");
  assert.equal(readableOn("#DC320F"), "#FFFFFF");
});

test("tint moves toward white and stays valid", () => {
  assert.equal(tint("#000000", 1), "#ffffff");
  assert.match(tint("#123C8F", 0.9), /^#[0-9a-f]{6}$/);
});

test("css variables are produced for every theme token", () => {
  const vars = themeCssVars(resolveInvitationTheme({ primary: "#660410", heading: "serif" }));
  assert.equal(vars["--inv-primary"], "#660410");
  assert.equal(vars["--inv-on-primary"], "#FFFFFF");
  assert.match(vars["--inv-heading"], /serif/);
});

test("a light card palette (dark theme) never makes the page text unreadable", () => {
  const t = resolveInvitationTheme({ ink: "#FFFFFF", accent: "#FEE715" });
  assert.equal(t.ink, DEFAULT_INVITATION_THEME.ink);
  const vars = themeCssVars(t);
  assert.notEqual(vars["--inv-accent-text"], "#FEE715");
});

import { accessiblePrimary, contrastRatio } from "./invitationTheme.ts";

test("a primary colour whose text would be hard to read is darkened just enough (white text 4.5:1)", () => {
  const out = accessiblePrimary("#FF651D");
  assert.notEqual(out, "#FF651D");
  assert.ok(contrastRatio(out, readableOn(out)) >= 4.5);
});
test("a primary that already reads well is left exactly as it is", () => {
  assert.equal(accessiblePrimary("#123C8F"), "#123C8F");
});
test("a light primary gets dark text and, when needed, is lightened rather than darkened", () => {
  const out = accessiblePrimary("#F4D35E");
  assert.equal(readableOn(out), "#15191C");
  assert.ok(contrastRatio(out, "#15191C") >= 4.5);
});
