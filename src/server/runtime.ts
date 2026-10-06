import { Effect, Layer, ManagedRuntime } from "effect";

/**
 * Composition root. The only module that builds a pool, a runtime, or wires
 * layers together. Route handlers go through `apiRoute`; server components and
 * page guards (`lib/auth/guards.ts`) run read programs through
 * `runtime.runPromise`.
 */
import { env } from "@/env";

import {
  type SessionCookieSlot,
  SessionCookieReadOnlyLayer,
  SessionCookieRouteLayer,
  type SessionCookieWriter,
} from "./auth/session-cookie";
import { type Db, dbLayer } from "./db";
import { type AppError, toResponse } from "./errors";

/**
 * The read-only cookie writer is the default: a server component or page guard
 * has no response to put a `Set-Cookie` on. `apiRoute` overrides it per
 * request with one that can (see `session-cookie.ts`).
 */
export const AppLive = Layer.mergeAll(
  dbLayer(env.DB_URL),
  SessionCookieReadOnlyLayer,
);

export const runtime = ManagedRuntime.make(AppLive);

/**
 * Wraps a route program into a Next.js route handler. The program's error
 * channel must be `AppError` (or a subset) so `toResponse` can map every
 * failure; its requirements must be satisfiable by `AppLive`.
 *
 * Any cookie the program asked to write is attached here, to the response, on
 * success and on failure alike — a cookie already accounted for in the
 * database must reach the browser even if the request went on to fail. So a
 * program that returns its own `Response` must build it with mutable headers:
 * `redirect()` from `./http`, never `Response.redirect()`.
 */
export const apiRoute =
  <A, Ctx = { params: Promise<Record<string, string>> }>(
    handler: (
      req: Request,
      ctx: Ctx,
    ) => Effect.Effect<A, AppError, Db | SessionCookieWriter>,
  ) =>
  (req: Request, ctx: Ctx): Promise<Response> => {
    const slot: SessionCookieSlot = { headers: [] };
    return runtime.runPromise(
      toResponse(handler(req, ctx)).pipe(
        Effect.map((response) => {
          for (const header of slot.headers)
            response.headers.append("Set-Cookie", header);
          return response;
        }),
        Effect.provide(SessionCookieRouteLayer(slot)),
      ),
    );
  };
