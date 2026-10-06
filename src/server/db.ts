import { PgClient } from "@effect/sql-pg";
import { Context, Duration, Effect, Layer, Redacted } from "effect";

import * as PgDrizzle from "drizzle-orm/effect-postgres";

type DrizzleDatabase = Effect.Success<
  ReturnType<typeof PgDrizzle.makeWithDefaults>
>;

/**
 * The database as a service. Anything that queries has `Db` in its
 * requirements channel; the compiler refuses to run it until a layer provides
 * one. Tests provide `dbLayer(TEST_DB_URL)`; production provides
 * `dbLayer(env.DB_URL)` from `runtime.ts`.
 */
export class Db extends Context.Service<Db, DrizzleDatabase>()("app/Db") {}

/**
 * Builds the `Db` layer for one Postgres URL. Pool settings carried over from
 * the pre-Effect `src/db/index.ts` verbatim.
 */
export const dbLayer = (url: string) =>
  Layer.effect(Db, PgDrizzle.makeWithDefaults()).pipe(
    Layer.provide(
      PgClient.layer({
        url: Redacted.make(url),
        maxConnections: 3,
        idleTimeout: Duration.seconds(20),
        connectTimeout: Duration.seconds(15),
      }),
    ),
  );
