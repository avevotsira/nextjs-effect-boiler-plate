import { Effect, Exit } from "effect";

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { InvalidJson, NotFound, PayloadTooLarge } from "./errors";
import { parseBody, parseParams } from "./http";

const schema = z.object({ note: z.string() });

const post = (body: BodyInit) => {
  // Node needs `duplex` to send a stream body. The DOM `RequestInit` type
  // does not list it yet, so it goes in through a variable, not a literal.
  const init = { method: "POST", body, duplex: "half" };
  return new Request("http://localhost/api/x", init);
};

/** A body sent in chunks, with no `Content-Length` to check. */
const chunked = (text: string) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const bytes = new TextEncoder().encode(text);
      for (let i = 0; i < bytes.length; i += 1024)
        controller.enqueue(bytes.slice(i, i + 1024));
      controller.close();
    },
  });

const run = (req: Request) => Effect.runPromiseExit(parseBody(req, schema));

describe("parseBody", () => {
  it("parses a body within the limit, Khmer included", async () => {
    const note = "ការចុះពិនិត្យ".repeat(500);
    expect(await run(post(JSON.stringify({ note })))).toEqual(
      Exit.succeed({ note }),
    );
  });

  it("stops reading a body over 64 KB, even without a Content-Length", async () => {
    const note = "x".repeat(70 * 1024);
    expect(await run(post(chunked(JSON.stringify({ note }))))).toEqual(
      Exit.fail(new PayloadTooLarge()),
    );
  });

  it("refuses a body that is not JSON", async () => {
    expect(await run(post("{not json"))).toEqual(Exit.fail(new InvalidJson()));
  });
});

describe("parseParams", () => {
  const paramsSchema = z.object({
    locale: z.enum(["en", "km"]),
    id: z.string(),
  });
  const parse = (params: { locale: string; id: string }) =>
    Effect.runPromiseExit(parseParams(Promise.resolve(params), paramsSchema));

  it("passes a valid path through", async () => {
    expect(await parse({ locale: "km", id: "r1" })).toEqual(
      Exit.succeed({ locale: "km", id: "r1" }),
    );
  });

  it("is a 404 for a path its schema refuses", async () => {
    expect(await parse({ locale: "fr", id: "r1" })).toEqual(
      Exit.fail(new NotFound()),
    );
  });
});
