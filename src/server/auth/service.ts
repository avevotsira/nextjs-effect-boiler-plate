import { Effect } from "effect";

import { type User, accountTable, sessionTable, userTable } from "@/db/schema";

import { and, eq } from "drizzle-orm";

import { Db } from "../db";
import { AccessDenied, type DbError } from "../errors";
import { generateSessionToken } from "./crypto";

/** Who a sign-in method says this is: an `accounts` row's two keys. */
export type AccountIdentity = {
  /** The provider's fixed name, e.g. `keycloak`, `github`. */
  providerId: string;
  /** The person's ID at that provider, e.g. an OIDC `sub`. */
  accountId: string;
};

/** Where the sign-in came from; stored on the session row. */
export type CreateSessionContext = {
  userAgent: string | null;
  clientIp: string | null;
};

export type SignedIn = {
  user: User;
  /** `<id>.<secret>`: set this as the cookie value. Not retrievable later. */
  token: string;
};

/**
 * Lets a person in once a sign-in method has proved who they are, or says why
 * not. The user is found by the account row created for this identity; no
 * row means unregistered. Not by email: an email can be reassigned at the
 * provider, an account ID cannot. The caller writes `token` as the cookie
 * (`sessionCookieHeader`) through `SessionCookieWriter`.
 */
const signInWithAccount = (
  identity: AccountIdentity,
  ctx: CreateSessionContext,
): Effect.Effect<SignedIn, AccessDenied | DbError, Db> =>
  Effect.gen(function* () {
    const db = yield* Db;
    const [row] = yield* db
      .select({ user: userTable })
      .from(accountTable)
      .innerJoin(userTable, eq(userTable.id, accountTable.userId))
      .where(
        and(
          eq(accountTable.providerId, identity.providerId),
          eq(accountTable.accountId, identity.accountId),
        ),
      )
      .limit(1);
    if (!row) return yield* new AccessDenied({ reason: "unregistered" });
    if (row.user.deactivatedAt)
      return yield* new AccessDenied({ reason: "deactivated" });

    const { id, secretHash, token } = generateSessionToken();
    yield* db.insert(sessionTable).values({
      id,
      userId: row.user.id,
      secretHash,
      userAgent: ctx.userAgent,
      clientIp: ctx.clientIp,
    });
    return { user: row.user, token };
  });

const signOut = (sessionId: string): Effect.Effect<void, DbError, Db> =>
  Effect.gen(function* () {
    const db = yield* Db;
    yield* db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
  });

export const authService = { signInWithAccount, signOut };
