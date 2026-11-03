import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, csvRow } from "./csv.ts";

test("text that a spreadsheet would run as a formula stays text", () => {
  for (const evil of ['=HYPERLINK("http://evil.test","x")', "+1+1", "-2+3", "@SUM(A1)", "\t=1+1", " =1+1"]) {
    assert.ok(csvCell(evil).startsWith(`"'`), evil);
  }
});

test("quotes, commas and line breaks stay inside the cell", () => {
  assert.equal(csvCell('Ann "Bee", Inc'), '"Ann ""Bee"", Inc"');
  assert.equal(csvRow(["a,b", 2]), '"a,b","2"');
});

test("ordinary values and negative numbers are unchanged", () => {
  assert.equal(csvCell("Priya"), '"Priya"');
  assert.equal(csvCell(-12.5), '"-12.5"');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(undefined), '""');
});
