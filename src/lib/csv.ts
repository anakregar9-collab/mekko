/**
 * CSV for spreadsheet apps used in Slovenia (Excel with Slovene locale expects ";").
 * Cells that a spreadsheet could run as a formula are prefixed with an apostrophe.
 */
export function csvCell(value: string | number | null | undefined): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[";\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  // BOM so Excel reads č, š, ž correctly.
  return "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n") + "\r\n";
}
