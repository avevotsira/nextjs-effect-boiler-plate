import { describe, expect, it } from "vitest";

import {
  dateDigitsOf,
  dateValueOf,
  formatDateDigits,
  toDateDigits,
} from "./date-input-util";

describe("DateInput text rules", () => {
  it("keeps digits, Khmer ones too, and refuses anything else", () => {
    expect(toDateDigits("25/12/2024")).toBe("25122024");
    expect(toDateDigits("២៥/១២")).toBe("2512");
    expect(toDateDigits("25-12")).toBeNull();
    expect(toDateDigits("")).toBe("");
  });

  it("shows DD/MM/YYYY, adding a slash only before a digit", () => {
    expect(formatDateDigits("2")).toBe("2");
    expect(formatDateDigits("25")).toBe("25");
    expect(formatDateDigits("251")).toBe("25/1");
    expect(formatDateDigits("25122024")).toBe("25/12/2024");
  });

  it("gives the form an ISO date only when the date is complete", () => {
    expect(dateValueOf("25122024")).toBe("2024-12-25");
    expect(dateValueOf("2512")).toBe("25/12");
    expect(dateValueOf("")).toBe("");
  });

  it("reads back what it gave the form", () => {
    for (const digits of ["25122024", "2512", "2", ""])
      expect(dateDigitsOf(dateValueOf(digits))).toBe(digits);
  });
});
