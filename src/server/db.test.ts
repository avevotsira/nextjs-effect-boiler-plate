import { Effect } from "effect";

import { userTable } from "@/db/schema";

import { count, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { Db, dbLayer } from "./db";

/**
 * Runs only when TEST_DB_URL points at a disposable, migrated Postgres (the
 * docker-compose one). Its job is to prove the `effect` ↔ `drizzle-orm`
 * pairing at runtime: a mismatched pair passes tsc and lint and only crashes
 * when the driver loads (see "Versions are a matched pair" in the skill).
 */
const url = process.env.TEST_DB_URL;

describe.skipIf(!url)("Db", () => {
  it("runs a query through dbLayer", async () => {
    const program = Effect.gen(function* () {
      const db = yield* Db;
      // The query builder, not `db.execute`: in drizzle-orm@1.0.0-rc.4 the
      // effect driver types `execute` as a row array but returns pg's
      // `{ rows }` result object.
      return yield* db
        .select({ value: count() })
        .from(userTable)
        .where(sql`false`);
    });

    const rows = await Effect.runPromise(
      // SAFETY: `describe.skipIf(!url)` guarantees `url` is set on this path.
      program.pipe(Effect.provide(dbLayer(url as string))),
    );

    expect(rows).toEqual([{ value: 0 }]);
  });
});
