import { describe, expect, it } from "vitest";

import { formatTimestamp, formatUsd } from "./utils";

describe("formatTimestamp and formatUsd", () => {
  it("shows a time as DD/MM/YYYY HH:mm in Cambodia (UTC+7)", () => {
    expect(formatTimestamp("2026-10-05T09:30:00.000Z")).toBe(
      "05/10/2026 16:30",
    );
    // Late in the UTC day is already tomorrow in Cambodia.
    expect(formatTimestamp("2026-12-31T20:05:00.000Z")).toBe(
      "01/01/2027 03:05",
    );
  });

  it("shows USD the same way in both languages", () => {
    expect(formatUsd(1_200_000)).toBe("$1,200,000.00");
    expect(formatUsd(0.5)).toBe("$0.50");
  });
});
