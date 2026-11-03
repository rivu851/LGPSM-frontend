// One cell of a downloaded CSV. Names, event titles and notes are typed by other people (guests in a spreadsheet, for example), and a
// spreadsheet program runs a cell that starts with = + - or @ as a formula: those are prefixed with an apostrophe so they stay text.
const FORMULA_START = /^[\s]*[=+\-@\t\r]/;
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (FORMULA_START.test(text) && !PLAIN_NUMBER.test(text.trim())) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export const csvRow = (cells: unknown[]): string => cells.map(csvCell).join(",");
