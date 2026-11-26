import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell", () => {
  it("keeps plain text", () => expect(csvCell("Ana Novak")).toBe("Ana Novak"));
  it("quotes separators, quotes and newlines", () => {
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell('rekla "ja"')).toBe('"rekla ""ja"""');
    expect(csvCell("vrstica\nnova")).toBe('"vrstica\nnova"');
  });
  it("neutralises formulas", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+386")).toBe("'+386");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@x")).toBe("'@x");
  });
  it("handles empty and numbers", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(3)).toBe("3");
  });
});

describe("toCsv", () => {
  it("adds a BOM and CRLF rows", () => {
    expect(
      toCsv([
        ["Ime", "Število"],
        ["Žan", 2],
      ]),
    ).toBe("﻿Ime;Število\r\nŽan;2\r\n");
  });
});
