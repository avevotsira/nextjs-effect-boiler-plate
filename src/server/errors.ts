import { Data, Effect } from "effect";
import type { SqlError } from "effect/unstable/sql/SqlError";

import type { ApiResponse } from "@/lib/api/response";

import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";

/** What any effect touching the database can fail with. */
export type DbError = SqlError | EffectDrizzleQueryError;

// --- request-level failures --------------------------------------------------

export class Forbidden extends Data.TaggedError("Forbidden") {}

export class RateLimited extends Data.TaggedError("RateLimited") {}

export class InvalidJson extends Data.TaggedError("InvalidJson") {}

/** A request body over `parseBody`'s limit; reading stopped there. */
export class PayloadTooLarge extends Data.TaggedError("PayloadTooLarge") {}

export class ValidationFailed extends Data.TaggedError("ValidationFailed")<{
  readonly message: string;
}> {}

/** No session cookie, or one that no longer resolves to an Active user. */
export class Unauthorized extends Data.TaggedError("Unauthorized") {}

/** The thing the path names does not exist. */
export class NotFound extends Data.TaggedError("NotFound") {}

// --- sign-in -----------------------------------------------------------------
// Not in `AppError`: a sign-in callback is a browser navigation, so it turns
// this into a redirect to `/login?error=<reason>` instead of a JSON body.

/**
 * The sign-in method proved who the person is, but this app does not let
 * them in. Each reason gets its own message on the login page.
 */
export class AccessDenied extends Data.TaggedError("AccessDenied")<{
  readonly reason: "unregistered" | "deactivated";
}> {}

/**
 * Every failure a route program can surface. `toResponse` handles each one by
 * tag; a service may fail with any subset. Adding a variant here without a
 * `catchTags` arm below is a compile error — see the `never` annotation.
 */
export type AppError =
  | Forbidden
  | Unauthorized
  | NotFound
  | RateLimited
  | InvalidJson
  | PayloadTooLarge
  | ValidationFailed
  | DbError;

// --- the boundary ------------------------------------------------------------

/**
 * Maps a route program to an HTTP `Response`.
 *
 * The `Effect<Response, never, R>` annotation is load-bearing: it forces
 * `catchTags` to be exhaustive over `AppError`. Without it an unhandled variant
 * stays in the error channel, compiles, and fails at runtime.
 */
export const toResponse = <A, R>(
  program: Effect.Effect<A, AppError, R>,
): Effect.Effect<Response, never, R> =>
  program.pipe(
    // A program that already built its response (e.g. a redirect) passes
    // through; everything else gets the JSON envelope.
    Effect.map((data) =>
      data instanceof Response ? data : json({ ok: true, data }, 200),
    ),
    Effect.catchTags({
      Forbidden: () =>
        fail(
          403,
          "FORBIDDEN",
          "You do not have permission to do this. If you think you should, ask your administrator.",
        ),
      Unauthorized: () => fail(401, "UNAUTHORIZED", "Sign in to continue."),
      NotFound: () =>
        fail(404, "NOT_FOUND", "We could not find what you asked for."),
      RateLimited: () =>
        fail(
          429,
          "RATE_LIMIT_EXCEEDED",
          "Too many requests. Please try again later.",
        ),
      InvalidJson: () =>
        fail(
          400,
          "INVALID_JSON",
          "We could not read that request. Refresh the page and try again.",
        ),
      PayloadTooLarge: () =>
        fail(413, "PAYLOAD_TOO_LARGE", "That request is too large to accept."),
      ValidationFailed: (e) => fail(400, "VALIDATION_ERROR", e.message),
      // The cause is logged, never sent: a stack trace is neither readable
      // nor safe to show.
      SqlError: (e) => fail(500, "INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, e),
      EffectDrizzleQueryError: (e) =>
        fail(500, "INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, e),
    }),
  );

const INTERNAL_ERROR_MESSAGE =
  "Something went wrong on our side. Please try again in a moment.";

const json = <T>(body: ApiResponse<T>, status: number) =>
  Response.json(body, { status });

const fail = (
  status: number,
  code: string,
  message: string,
  cause?: unknown,
): Effect.Effect<Response> => {
  if (cause !== undefined) console.error(`[api] ${code}`, cause);
  return Effect.succeed(json({ ok: false, error: { code, message } }, status));
};
