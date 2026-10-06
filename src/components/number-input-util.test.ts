import { describe, expect, it } from "vitest";

import {
  formatRawNumber,
  numberTypingError,
  parseRawNumber,
  rawNumberOf,
  toRawNumber,
} from "./number-input-util";

describe("NumberInput text rules", () => {
  it("reads Khmer digits and drops group separators", () => {
    expect(toRawNumber("១,២៣៤.៥")).toBe("1234.5");
    expect(toRawNumber("1 250 000")).toBe("1250000");
  });

  it("groups the whole part and keeps what is being typed", () => {
    expect(formatRawNumber("1234567.5")).toBe("1,234,567.5");
    expect(formatRawNumber("-1234")).toBe("-1,234");
    expect(formatRawNumber("1234.")).toBe("1,234.");
    expect(formatRawNumber("-")).toBe("-");
    expect(formatRawNumber("")).toBe("");
  });

  it("gives the form a number, or null while there is no digit", () => {
    expect(parseRawNumber("1234.5")).toBe(1234.5);
    expect(parseRawNumber("12.")).toBe(12);
    expect(parseRawNumber("0")).toBe(0);
    expect(parseRawNumber("")).toBeNull();
    expect(parseRawNumber("-")).toBeNull();
    expect(rawNumberOf(null)).toBe("");
    expect(rawNumberOf(0)).toBe("0");
  });

  it("refuses letters, a minus where none is allowed, and extra decimals", () => {
    const money = { decimals: 2, allowNegative: false };
    const whole = { decimals: 0, allowNegative: false };
    const degrees = { allowNegative: true };
    expect(numberTypingError("12a", money)).toBe("not_a_number");
    expect(numberTypingError("1.2.3", money)).toBe("not_a_number");
    expect(numberTypingError("-5", money)).toBe("negative");
    expect(numberTypingError("1.234", money)).toBe("decimals");
    expect(numberTypingError("12.", whole)).toBe("decimals");
    expect(numberTypingError("1.25", money)).toBeNull();
    expect(numberTypingError("-10.123456789", degrees)).toBeNull();
  });
});
