import { describe, expect, it } from "vitest";
import { parseSheetAmount } from "./sheet";

describe("parseSheetAmount", () => {
  it("sums a single price written in the books column", () => {
    expect(parseSheetAmount("COMBO 1 💰₹790/-")).toBe(790);
  });

  it("sums multiple book prices", () => {
    expect(parseSheetAmount("ഖലീഫ ഉമർ 💰₹240/-, അലി ഫാത്തിമ 💰₹190/-")).toBe(430);
  });

  it("returns 0 when no price is listed", () => {
    expect(parseSheetAmount("Hirayil ninnu hridayathilek")).toBe(0);
  });
});
