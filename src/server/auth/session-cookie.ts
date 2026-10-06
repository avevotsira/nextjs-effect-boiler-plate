import { cookies } from "next/headers";

import { Context, Effect, Layer } from "effect";

import { env } from "@/env";

export const SESSION_COOKIE_NAME = "session_token";

/**
 * 30 minutes of inactivity ends a session. The cookie's `Max-Age` and the
 * row's `last_verified_at` are both this long and slide forward together on
 * activity.
 */
export const SESSION_INACTIVITY_MS = 30 * 60 * 1000;

const options = {
  httpOnly: true,
  secure: env.APP_ENV !== "development",
  sameSite: "Lax",
  path: "/",
} as const;

/** A `Set-Cookie` value with this app's options; `maxAgeSeconds` 0 clears it. */
export const cookieHeader = (
  name: string,
  value: string,
  maxAgeSeconds: number,
): string => {
  const parts = [
    `${name}=${value}`,
    `Path=${options.path}`,
    `Max-Age=${maxAgeSeconds}`,
    `SameSite=${options.sameSite}`,
  ];
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
};

/** The `Set-Cookie` value for a session token, or for clearing it when null. */
export const sessionCookieHeader = (token: string | null): string =>
  cookieHeader(
    SESSION_COOKIE_NAME,
    token ?? "",
    token ? SESSION_INACTIVITY_MS / 1000 : 0,
  );

/**
 * Writes a cookie, and says whether it actually managed to.
 *
 * That boolean is the whole point: the session cookie's expiry and the row's
 * `last_verified_at` must slide in lockstep, so if the cookie cannot move the
 * row must not move either. Otherwise the next request sees a fresh row,
 * decides no refresh is due, and leaves the cookie to expire under a session
 * the server still considers live.
 *
 * Two implementations, because "can I write a cookie" is exactly what differs
 * between the contexts this runs in:
 *
 * - {@link SessionCookieRouteLayer}, provided per request by `apiRoute`:
 *   collects the header and hands it to the response. It does **not** go
 *   through `next/headers`, because by the time a session cookie is written
 *   the request has already queried the database, and after a query
 *   `cookies()` returns the *first request the process served* — its response
 *   is long gone, so the write is silently lost. See `AGENTS.md` (Effect on
 *   the backend → Non-negotiables) and docs/learning/async-context-and-cookies.md.
 * - {@link SessionCookieReadOnlyLayer}, the default in `AppLive`: a server
 *   component has no response to attach a header to, so it reports `false` and
 *   the row is left alone. The next route-handler request retries both.
 *
 * Any other cookie a route sets (an OAuth `state`, say) rides the same
 * writer: `write(cookieHeader(name, value, maxAgeSeconds))`.
 */
export class SessionCookieWriter extends Context.Service<
  SessionCookieWriter,
  { readonly write: (header: string) => Effect.Effect<boolean> }
>()("app/SessionCookieWriter") {}

/** A slot the route boundary drains after the program has run. */
export type SessionCookieSlot = { headers: string[] };

export const SessionCookieRouteLayer = (slot: SessionCookieSlot) =>
  Layer.succeed(SessionCookieWriter, {
    write: (header) =>
      Effect.sync(() => {
        slot.headers.push(header);
        return true;
      }),
  });

export const SessionCookieReadOnlyLayer = Layer.succeed(SessionCookieWriter, {
  write: () => Effect.succeed(false),
});

/** Must run before the program's first query — see the class comment. */
export const readCookie = (name: string) =>
  Effect.promise(async () => {
    const jar = await cookies();
    return jar.get(name)?.value ?? null;
  });

export const readSessionCookie = readCookie(SESSION_COOKIE_NAME);
