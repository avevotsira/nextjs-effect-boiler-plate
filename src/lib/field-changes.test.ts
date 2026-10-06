import { describe, expect, it } from "vitest";

import { diffFields } from "./field-changes";

/** Shaped like a record row: nullable numbers, a date, a multi-select. */
type Row = {
  nameEn: string;
  capital: number | null;
  foreignWorkers: number | null;
  registeredOn: Date;
  productTypes: string[];
};

const before: Row = {
  nameEn: "Angkor Rice",
  capital: 0,
  foreignWorkers: null,
  registeredOn: new Date("2026-01-15T00:00:00Z"),
  productTypes: ["rice", "flour"],
};

describe("diffFields", () => {
  it("returns nothing when no field changes", () => {
    expect(diffFields(before, { ...before })).toEqual({});
  });

  it("keeps only the changed fields, with both values", () => {
    expect(
      diffFields(before, { nameEn: "Angkor Rice Co.", capital: 0 }),
    ).toEqual({ nameEn: { before: "Angkor Rice", after: "Angkor Rice Co." } });
  });

  it("treats null and zero as different values", () => {
    expect(diffFields(before, { capital: null, foreignWorkers: 0 })).toEqual({
      capital: { before: 0, after: null },
      foreignWorkers: { before: null, after: 0 },
    });
  });

  it("skips fields that were not sent", () => {
    expect(diffFields(before, { nameEn: undefined })).toEqual({});
  });

  it("compares dates by instant", () => {
    const sameInstant = new Date("2026-01-15T07:00:00+07:00");
    expect(diffFields(before, { registeredOn: sameInstant })).toEqual({});
  });

  it("compares arrays by value and order", () => {
    expect(diffFields(before, { productTypes: ["rice", "flour"] })).toEqual({});
    expect(diffFields(before, { productTypes: ["flour", "rice"] })).toEqual({
      productTypes: {
        before: ["rice", "flour"],
        after: ["flour", "rice"],
      },
    });
  });

  it("logs every non-null field of a create, from nothing", () => {
    expect(
      diffFields<Row>({}, { nameEn: "Angkor Rice", foreignWorkers: null }),
    ).toEqual({ nameEn: { before: null, after: "Angkor Rice" } });
  });
});
