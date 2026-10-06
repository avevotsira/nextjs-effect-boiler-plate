import { Effect, Exit } from "effect";

/**
 * Runs only when TEST_DB_URL points at a disposable, migrated Postgres (the
 * docker-compose one, after `npm run db:migrate`). It writes and deletes real
 * rows — never aim it at staging.
 */
import { accountTable, userTable } from "@/db/schema";

import { eq, like } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { Db, dbLayer } from "../db";
import { AccessDenied } from "../errors";
import { type AccountIdentity, authService } from "./service";

const url = process.env.TEST_DB_URL;
const marker = `auth-test-${Date.now()}`;
const CTX = { userAgent: null, clientIp: null };

const PROVIDER = "test";

const identity = (sub: string): AccountIdentity => ({
  providerId: PROVIDER,
  accountId: `${marker}-${sub}`,
});

const run = <A, E>(program: Effect.Effect<A, E, Db>) =>
  Effect.runPromise(
    // SAFETY: `describe.skipIf(!url)` guarantees `url` is set on this path.
    program.pipe(Effect.exit, Effect.provide(dbLayer(url as string))),
  );

/** What `seed:user` does: a user, plus the account mapping its ID. */
const createMappedUser = (sub: string, deactivatedAt: Date | null = null) =>
  run(
    Effect.gen(function* () {
      const db = yield* Db;
      const [user] = yield* db
        .insert(userTable)
        .values({
          email: `${marker}-${sub}@x.test`,
          deactivatedAt,
        })
        .returning({ id: userTable.id });
      yield* db.insert(accountTable).values({
        userId: user.id,
        providerId: PROVIDER,
        accountId: `${marker}-${sub}`,
      });
    }),
  );

const denied = (reason: AccessDenied["reason"]) =>
  Exit.fail(new AccessDenied({ reason }));

describe.skipIf(!url)("authService.signInWithAccount", () => {
  afterAll(() =>
    run(
      Effect.gen(function* () {
        const db = yield* Db;
        // Accounts and sessions cascade.
        yield* db.delete(userTable).where(like(userTable.email, `${marker}%`));
      }),
    ),
  );

  it("signs in the user mapped to this provider + account ID", async () => {
    await createMappedUser("mapped");
    const exit = await run(
      authService.signInWithAccount(identity("mapped"), CTX),
    );
    expect(Exit.isSuccess(exit) && exit.value.user.email).toBe(
      `${marker}-mapped@x.test`,
    );
  });

  it("refuses an account ID nobody mapped", async () => {
    const exit = await run(
      authService.signInWithAccount(identity("nobody"), CTX),
    );
    expect(exit).toEqual(denied("unregistered"));
  });

  it("refuses a deactivated user", async () => {
    await createMappedUser("off", new Date());
    const exit = await run(authService.signInWithAccount(identity("off"), CTX));
    expect(exit).toEqual(denied("deactivated"));
  });

  it("never creates an account row on sign-in", async () => {
    await run(authService.signInWithAccount(identity("ghost"), CTX));
    const accounts = await run(
      Effect.gen(function* () {
        const db = yield* Db;
        return yield* db
          .select({ id: accountTable.id })
          .from(accountTable)
          .where(eq(accountTable.accountId, `${marker}-ghost`));
      }),
    );
    expect(accounts).toEqual(Exit.succeed([]));
  });
});
