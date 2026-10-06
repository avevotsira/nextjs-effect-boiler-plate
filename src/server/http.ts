import { Effect } from "effect";

import { z } from "zod";

import {
  InvalidJson,
  NotFound,
  PayloadTooLarge,
  ValidationFailed,
} from "./errors";

/**
 * Larger than any JSON body a form sends, Khmer included (3 bytes a
 * character). Route handlers have no size limit of their own, so without this
 * a client could make the server hold any amount.
 */
const MAX_BODY_BYTES = 64 * 1024;

/**
 * JSON body → validated value. Malformed JSON and schema failures are 400s; a
 * body over `MAX_BODY_BYTES` is a 413.
 */
export const parseBody = <S extends z.ZodType>(
  req: Request,
  schema: S,
): Effect.Effect<
  z.output<S>,
  InvalidJson | PayloadTooLarge | ValidationFailed
> =>
  Effect.gen(function* () {
    const bytes = yield* Effect.tryPromise({
      try: () => readBounded(req.body, MAX_BODY_BYTES),
      catch: () => new InvalidJson(),
    });
    if (bytes === null) return yield* new PayloadTooLarge();
    // Only `JSON.parse` can throw here; `safeParse` reports instead.
    const parsed = yield* Effect.try({
      try: () => schema.safeParse(JSON.parse(new TextDecoder().decode(bytes))),
      catch: () => new InvalidJson(),
    });
    if (!parsed.success)
      return yield* new ValidationFailed({ message: firstIssue(parsed.error) });
    return parsed.data;
  });

/**
 * A route's path params → validated value. A path that fails its schema
 * names no resource, so it is a 404, not a 400.
 */
export const parseParams = <S extends z.ZodType>(
  params: Promise<unknown>,
  schema: S,
): Effect.Effect<z.output<S>, NotFound> =>
  Effect.gen(function* () {
    const parsed = schema.safeParse(yield* Effect.promise(() => params));
    if (!parsed.success) return yield* new NotFound();
    return parsed.data;
  });

/**
 * The body's bytes, or null once it passes `limit`. It counts bytes as they
 * arrive and stops there, so a huge body is never held whole: a
 * `Content-Length` check alone is skipped by a chunked upload.
 */
const readBounded = async (
  stream: ReadableStream<Uint8Array> | null,
  limit: number,
): Promise<Uint8Array<ArrayBuffer> | null> => {
  if (!stream) return new Uint8Array(new ArrayBuffer(0));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(new ArrayBuffer(size));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

/**
 * A 303 to `location` (absolute, or a path on this origin). Not
 * `Response.redirect()`: its headers are immutable, so the `Set-Cookie` that
 * `apiRoute` appends would throw.
 */
export const redirect = (location: string): Response =>
  new Response(null, { status: 303, headers: { Location: location } });

/**
 * One readable sentence, not the whole failure. `ZodError.message` is
 * `JSON.stringify(issues)` — a multi-line blob that would reach the user
 * verbatim in an alert box. The schemas already carry human messages
 * (`AGENTS.md`, Shared schemas), so the first issue is the thing to show; the
 * client's own resolver highlights the rest field by field anyway.
 */
const firstIssue = (error: z.ZodError): string => {
  const [issue] = error.issues;
  if (!issue) return "Please check the information you entered.";
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
};
