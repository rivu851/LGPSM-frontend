import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// Next only runs this file from beside the app directory and only under this name. Anywhere else the build succeeds and every
// server-side redirect silently stops, which is why its place is pinned by a test.
const url = new URL("./proxy.ts", import.meta.url);

test("the proxy sits beside src/app and exports the handler Next looks for", () => {
  assert.ok(fs.existsSync(new URL("./app", import.meta.url)));
  const source = fs.readFileSync(url, "utf8");
  assert.match(source, /export function proxy\(/);
  assert.ok(!fs.existsSync(new URL("../proxy.ts", import.meta.url)), "a root proxy.ts is ignored when the app is in src/");
  assert.ok(!fs.existsSync(new URL("../middleware.ts", import.meta.url)), "middleware.ts is the deprecated name");
});

test("every private section is both protected and matched", () => {
  const source = fs.readFileSync(url, "utf8");
  for (const section of ["dashboard", "events", "user-management", "event-organizer", "earnings", "reports", "settings", "templates", "notification", "notifications", "billing"]) {
    assert.ok(source.includes(`"/${section}"`), `${section} is in the protected list`);
    assert.ok(source.includes(`"/${section}/:path*"`), `${section} is in the matcher`);
  }
});
