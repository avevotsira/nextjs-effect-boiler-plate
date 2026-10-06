import { Effect } from "effect";

/**
 * Lets a person sign in: the sign-in method proves who they are, these rows
 * let them in. Writes the user and its account row together; the account maps
 * the person's ID at the provider, which is what `signInWithAccount` looks
 * up. Idempotent on the email: does nothing when it already has an account.
 *
 *   npm run seed:user -- someone@example.com <provider> <account-id>
 */
import { accountTable, userTable } from "@/db/schema";
import { env } from "@/env";
import { Db, dbLayer } from "@/server/db";

const email = process.argv[2]?.trim().toLowerCase();
const providerId = process.argv[3]?.trim();
const accountId = process.argv[4]?.trim();
if (!email || !providerId || !accountId)
  throw new Error(
    "Usage: npm run seed:user -- <email> <provider> <account-id>",
  );

const program = Effect.gen(function* () {
  const db = yield* Db;
  return yield* db.transaction((tx) =>
    Effect.gen(function* () {
      const [user] = yield* tx
        .insert(userTable)
        .values({ email })
        .onConflictDoNothing()
        .returning({ id: userTable.id });
      if (!user) return `${email} already has an account; nothing to do.`;
      yield* tx
        .insert(accountTable)
        .values({ userId: user.id, providerId, accountId });
      return `Account created for ${email}, mapped to ${providerId} account ${accountId}.`;
    }),
  );
});

Effect.runPromise(program.pipe(Effect.provide(dbLayer(env.DB_URL))))
  .then((message) => console.log(message))
  .catch((error) => {
    console.error("seed:user failed", error);
    process.exitCode = 1;
  });
