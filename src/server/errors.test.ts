import { Effect } from "effect";

import { describe, expect, it } from "vitest";

import {
  type AppError,
  Forbidden,
  InvalidJson,
  RateLimited,
  ValidationFailed,
  toResponse,
} from "./errors";

const run = <A>(program: Effect.Effect<A, AppError>) =>
  Effect.runPromise(toResponse(program));

describe("toResponse", () => {
  it("wraps success in the { ok, data } envelope with 200", async () => {
    const res = await run(Effect.succeed({ id: "r1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { id: "r1" } });
  });

  it("passes a ready-built Response through untouched", async () => {
    const redirect = Response.redirect("https://example.com/file", 302);
    const res = await run(Effect.succeed(redirect));
    expect(res).toBe(redirect);
  });

  it.each([
    [new Forbidden(), 403, "FORBIDDEN"],
    [new RateLimited(), 429, "RATE_LIMIT_EXCEEDED"],
    [new InvalidJson(), 400, "INVALID_JSON"],
    [new ValidationFailed({ message: "bad" }), 400, "VALIDATION_ERROR"],
  ])("maps %s to its status and code", async (error, status, code) => {
    const res = await run(Effect.fail(error));
    expect(res.status).toBe(status);
    expect(await res.json()).toMatchObject({ ok: false, error: { code } });
  });

  it("carries the validation message through to the client", async () => {
    const res = await run(
      Effect.fail(new ValidationFailed({ message: "name: is required" })),
    );
    expect(await res.json()).toMatchObject({
      error: { message: "name: is required" },
    });
  });
});
