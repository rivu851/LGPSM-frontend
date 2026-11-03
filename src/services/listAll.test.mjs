import test from "node:test";
import assert from "node:assert/strict";
import { listAllPages } from "./listAll.ts";

const server = (rows, size, failOn) => async (page) => {
  if (page === failOn) return { success: false, message: "boom", status: 503 };
  const data = rows.slice((page - 1) * size, page * size);
  return { success: true, data, meta: { total: rows.length, totalPages: Math.ceil(rows.length / size), limit: size, page } };
};
const rows = Array.from({ length: 2345 }, (_, i) => i);

test("a list longer than the API's page size comes back whole and in order", async () => {
  const res = await listAllPages(server(rows, 100));
  assert.equal(res.success, true);
  assert.deepEqual(res.data, rows);
});

test("a list that fits on one page needs one request", async () => {
  let calls = 0;
  const fetchPage = server(rows.slice(0, 40), 100);
  const res = await listAllPages((p) => { calls++; return fetchPage(p); });
  assert.equal(calls, 1);
  assert.equal(res.data.length, 40);
});

test("a page that fails fails the whole list instead of showing part of it as if it were all", async () => {
  const res = await listAllPages(server(rows, 100, 7));
  assert.equal(res.success, false);
  assert.equal(res.message, "boom");
  assert.equal(res.data, undefined);
});

test("a failure on the first page is passed on", async () => {
  const res = await listAllPages(server(rows, 100, 1));
  assert.equal(res.success, false);
});

test("responses that report only a total are still followed", async () => {
  const res = await listAllPages(async (page) => ({ success: true, data: rows.slice((page - 1) * 100, page * 100), meta: { total: rows.length, page, limit: 100 } }));
  assert.equal(res.data.length, rows.length);
});
