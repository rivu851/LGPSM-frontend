import test from "node:test";
import assert from "node:assert/strict";
import { createSingleFlight } from "./singleFlight.ts";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

test("a second call while the first is running is ignored", async () => {
  const flight = createSingleFlight();
  let runs = 0;
  const task = async () => { runs++; await delay(30); return "done"; };
  const [a, b, c] = await Promise.all([flight.run(task), flight.run(task), flight.run(task)]);
  assert.equal(runs, 1);
  assert.equal(a, "done");
  assert.equal(b, undefined);
  assert.equal(c, undefined);
});

test("it reports busy only while running", async () => {
  const flight = createSingleFlight();
  assert.equal(flight.busy, false);
  const p = flight.run(() => delay(20));
  assert.equal(flight.busy, true);
  await p;
  assert.equal(flight.busy, false);
});

test("after it finishes, the action can run again", async () => {
  const flight = createSingleFlight();
  let runs = 0;
  await flight.run(async () => { runs++; });
  await flight.run(async () => { runs++; });
  assert.equal(runs, 2);
});

test("after a failure the action can be tried again, and the failure still reaches the caller", async () => {
  const flight = createSingleFlight();
  await assert.rejects(flight.run(async () => { throw new Error("boom"); }), /boom/);
  assert.equal(flight.busy, false);
  assert.equal(await flight.run(async () => "ok"), "ok");
});
