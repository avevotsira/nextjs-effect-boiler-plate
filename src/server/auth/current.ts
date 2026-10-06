import { Effect } from "effect";

import { type Session, type User, sessionTable, userTable } from "@/db/schema";

import { eq } from "drizzle-orm";

import { Db } from "../db";
import { type DbError, Unauthorized } from "../errors";
import { hashSecret, parseSessionToken, secretHashEquals } from "./crypto";
import {
  SESSION_INACTIVITY_MS,
  SessionCookieWriter,
  readSessionCookie,
  sessionCookieHeader,
} from "./session-cookie";

export type CurrentSession = { session: Session; user: User };

/** Rewrite `last_verified_at` at most this often; validation itself is free. */
const EXTEND_AFTER_MS = 5 * 60 * 1000;

/**
 * Resolves the request's cookie into `{ session, user }`, or null when there
 * is no cookie, the token is malformed or unknown, the secret does not match,
 * the inactivity window has passed (the row is then deleted), or the user is
 * Deactivated (account status is enforced on every request). Read
 * this at the top of any route or server component that needs the caller.
 *
 * The inactivity check runs before the secret check, so a stale row is reaped
 * whoever probes it. On a live session the window slides forward: the cookie
 * first, and the row only if the cookie could actually be re-issued, so the two
 * never drift apart. A server component cannot write cookies, so it moves
 * neither and the next route-handler request retries both.
 */
export const currentSession: Effect.Effect<
  CurrentSession | null,
  DbError,
  Db | SessionCookieWriter
> = Effect.gen(function* () {
  // Read before the first query — after it, `cookies()` sees the first
  // request's jar (AGENTS.md → Non-negotiables).
  const token = yield* readSessionCookie;
  if (!token) return null;
  const parsed = parseSessionToken(token);
  if (!parsed) return null;

  const db = yield* Db;
  const [row] = yield* db
    .select({ session: sessionTable, user: userTable })
    .from(sessionTable)
    .innerJoin(userTable, eq(userTable.id, sessionTable.userId))
    .where(eq(sessionTable.id, parsed.id))
    .limit(1);
  if (!row) return null;

  const idleFor = Date.now() - row.session.lastVerifiedAt.getTime();
  if (idleFor >= SESSION_INACTIVITY_MS) {
    yield* db.delete(sessionTable).where(eq(sessionTable.id, row.session.id));
    return null;
  }
  if (!secretHashEquals(hashSecret(parsed.secret), row.session.secretHash))
    return null;
  if (row.user.deactivatedAt) return null;

  if (idleFor >= EXTEND_AFTER_MS) {
    const writer = yield* SessionCookieWriter;
    const wrote = yield* writer.write(sessionCookieHeader(token));
    if (wrote) {
      yield* db
        .update(sessionTable)
        .set({ lastVerifiedAt: new Date() })
        .where(eq(sessionTable.id, row.session.id));
    }
  }

  return { session: row.session, user: row.user };
});

/** `currentSession`, or 401. */
export const requireCurrent: Effect.Effect<
  CurrentSession,
  Unauthorized | DbError,
  Db | SessionCookieWriter
> = Effect.gen(function* () {
  const current = yield* currentSession;
  if (!current) return yield* new Unauthorized();
  return current;
});
