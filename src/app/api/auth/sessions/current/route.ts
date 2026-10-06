import { Effect } from "effect";

import { currentSession } from "@/server/auth/current";
import { authService } from "@/server/auth/service";
import {
  SessionCookieWriter,
  sessionCookieHeader,
} from "@/server/auth/session-cookie";
import { apiRoute } from "@/server/runtime";

/**
 * Sign out. Idempotent: no session still clears the cookie and returns 200.
 * The cookie goes through `SessionCookieWriter`, never `cookies().set()`:
 * this write follows a query (AGENTS.md → Non-negotiables).
 */
export const DELETE = apiRoute(() =>
  Effect.gen(function* () {
    const current = yield* currentSession;
    if (current) yield* authService.signOut(current.session.id);
    const writer = yield* SessionCookieWriter;
    yield* writer.write(sessionCookieHeader(null));
    return null;
  }),
);
