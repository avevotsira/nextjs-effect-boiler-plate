---
name: effect-backend
description: Use when writing or changing anything under src/server/ or src/app/api/ in this repo - the backend is Effect 4 on top of drizzle-orm/effect-postgres. Covers the service/Layer shape, error unions, transactions, the route boundary, and the v3-to-v4 renames that break training-data recall.
---

# Effect backend conventions

The backend of this repo is Effect. This skill is the long form; the
non-negotiables also live in the `effect-rules` block of `AGENTS.md`.

Code examples that name `reports`, `cases`, `Turnstile` or `Captcha*` come from
the project these conventions were ported from (public-report-system). They
illustrate the shape; they are not modules in this repo.

## First: you are probably remembering Effect 3

Most Effect material predates v4. These are the renames that will waste your
time, all verified against the installed `effect@4.0.0-beta.83`:

| Effect 3 (what you remember)             | Effect 4 (this repo)                    |
| ---------------------------------------- | --------------------------------------- |
| `Context.Tag("key")<Self, Shape>()`      | `Context.Service<Self, Shape>()("key")` |
| `Effect.catchTag("TimeoutException", …)` | `Effect.catchTag("TimeoutError", …)`    |
| `import … from "@effect/sql"`            | `import … from "effect/unstable/sql/…"` |
| `Effect.Effect.Success<T>`               | `Effect.Success<T>`                     |

`Context` in v4 exports `Service`, not `Tag`. If you write `Context.Tag` you get
`Property 'Tag' does not exist`.

When unsure, read the installed types rather than recalling:

```bash
grep -n "export declare const" node_modules/effect/dist/Context.d.ts | head -30
```

## The stack

```
src/server/
  db.ts            Db service + dbLayer(url)  — no env import, so tests can build one
  errors.ts        every tagged error, the AppError union, toResponse — a leaf, no env
  http.ts          parseBody(req, schema); redirect(location) — a Response apiRoute can add cookies to
  runtime.ts       AppLive = mergeAll(dbLayer(env.DB_URL), SessionCookieReadOnlyLayer); apiRoute
  auth/
    session-cookie.ts  SessionCookieWriter service, cookie headers, readCookie
    current.ts     currentSession / requireCurrent — cookie → { session, user }
    service.ts     authService = { signInWithAccount, signOut } — a sign-in method calls signInWithAccount
  <resource>/
    service.ts     <resource>Service = { create, findOneById } — programs, Effect<_, _, Db>
```

`runtime.ts` is the composition root: the only module that builds a pool or a
runtime. Routes are `export const POST = apiRoute((req) => Effect.gen(...))`
and nothing else calls `runtime.runPromise`.

```ts
// db.ts
type DrizzleDatabase = Effect.Success<
  ReturnType<typeof PgDrizzle.makeWithDefaults>
>;
export class Db extends Context.Service<Db, DrizzleDatabase>()("app/Db") {}
export const dbLayer = (url: string) =>
  Layer.effect(Db, PgDrizzle.makeWithDefaults()).pipe(
    Layer.provide(
      PgClient.layer({ url: Redacted.make(url), maxConnections: 3 }),
    ),
  );

// runtime.ts
export const AppLive = Layer.mergeAll(dbLayer(env.DB_URL), SessionCookieReadOnlyLayer);
export const runtime = ManagedRuntime.make(AppLive);
```

Prefer the query builder over `db.execute(sql…)`: in `drizzle-orm@1.0.0-rc.4`
the effect driver types `execute` as a row array, but it returns pg's
`{ rows, rowCount, … }` result object, so `result[0]` is `undefined` at runtime
while tsc stays green.

Payload-less errors take no type argument — `class Forbidden extends
Data.TaggedError("Forbidden") {}` — because oxlint bans the `{}` type literal.

## Transactions

Use the Drizzle Effect driver's own. It takes an Effect and returns an Effect,
and rolls back on failure, on defect, and on **interruption** — an aborted
request or a timeout leaves no open transaction.

```ts
const db = yield* Db;

return yield* db.transaction((tx) =>
  Effect.gen(function* () {
    const [report] = yield* tx.insert(reportTable).values({ … }).returning();
    const urls = yield* tx.insert(reportUrlTable).values([…]).returning();
    return { reportId: report.id, urls };
  }),
);
```

Never reintroduce `AsyncLocalStorage`, a `getDb()` ambient lookup, or a sentinel
rollback exception. Those exist in the `Result` world because Drizzle's Promise
transaction cannot be aborted from a nested helper; the Effect driver has no
such limitation.

## Error unions

Every failure is a distinct type. Define yours with `Data.TaggedError`:

```ts
class CaptchaRejected extends Data.TaggedError("CaptchaRejected")<{
  readonly token: string;
}> {}
```

Anything touching the database also carries the driver's own errors:

```ts
export type SubmitError =
  | CaptchaRejected
  | CaptchaUnavailable
  | SqlError // effect/unstable/sql/SqlError
  | EffectDrizzleQueryError; // drizzle-orm/effect-core/errors
```

Do not widen to `unknown` to silence the compiler. When it names a missing
variant, add it — that message is the feature working.

## The route boundary

**The `Effect<Response, never>` annotation is load-bearing.** Without it an
unhandled variant stays in the error channel, `runPromise` accepts it, and it
fails at runtime. With it, `catchTags` is exhaustive and a new unhandled variant
is a compile error.

```ts
// errors.ts — the return type is the annotation
export const toResponse = <A, R>(
  program: Effect.Effect<A, AppError, R>,
): Effect.Effect<Response, never, R> =>
  program.pipe(
    Effect.map((data) => json({ ok: true, data }, 200)),
    Effect.catchTags({
      Forbidden: () => fail(403, "FORBIDDEN", "Invalid request origin."),
      // … one arm per AppError variant; omitting one is a type error
    }),
  );

// runtime.ts
export const apiRoute = (handler) => (req, ctx) =>
  runtime.runPromise(toResponse(handler(req, ctx)));
```

## Services vs programs

Two kinds of thing live under `src/server/`, and the distinction decides
whether something gets a Layer:

|                   | Service                                                                      | Program                                                                       |
| ----------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| what              | a capability you would replace: `Db`, `Turnstile`, later `Notifier`, `Clock` | a domain operation: `reportsService.submit`, `findOneById`, later `claimCase` |
| shape             | `Context.Service<Self, Shape>()("app/Name")` + a `Live` Layer                | plain function returning `Effect<A, E, R>`                                    |
| dependencies      | provided by `AppLive` in `runtime.ts`                                        | declared in `R`; obtained with `yield* Db`                                    |
| swapped in tests? | yes — that is the point                                                      | no — test it by swapping the services it needs                                |

Rule of thumb: **if you would want a fake of it in a test, it is a service;
otherwise it is a program.** Effect's own docs model services as `Random`,
`Logger`, a database client — things with effects — and never as business
logic. Do not promote a program to a service for tidiness; it adds a Layer and
a `yield*` at every call site and buys a swap point nobody uses.

Programs are grouped per resource as a namespace object to match the
`<resource>Service = { verb, findOneByX }` naming convention:

```ts
const submit = (input, meta): Effect.Effect<ReportApiResponse, SubmitError, Db | Turnstile> => …
const findOneById = (id): Effect.Effect<ReportDetailResponse, ReportNotFound | DbError, Db> => …
export const reportsService = { submit, findOneById };
```

It is a namespace, not a class — zero runtime cost. cpp's repo/service split
(raw queries vs policy) stays merged in one file until a second caller earns
the extraction, per the Locality rule in AGENTS.md.

## Services

Depend on the Layer, never on the constructor. Importing a project-local
`make<Capability>` into runtime code is a lint error
(`anti-slop-effect/no-service-constructor-imports`) — import the owning Layer,
yield the contextual service, and let requirements propagate to the composition
root.

Keep `R` honest: a service that needs the database has `Db` in its requirements
channel, and the compiler refuses to run it until something provides one. That
is the dependency check; do not paper over it by capturing a module-level `db`.

## Writing cookies

public-report-system shipped a login loop by writing cookies through
`next/headers`; this section is why this repo does not.

**The bug.** `cookies()`/`headers()` read Next's per-request
`AsyncLocalStorage`. The `PgClient` pool lives in the module-scope
`ManagedRuntime`, so after any `yield*` of a query the fiber resumes in the
context of the **first request the process served**. A read after a query
returns that request's cookies. A `cookies().set()` after a query lands on a
response that was sent long ago, and it is silently lost. The full write-up
with runnable experiments is `docs/learning/async-context-and-cookies.md`.

**The rules:**

- Read from `next/headers` _before_ the first query (`readCookie`,
  `readSessionCookie`, `getClientIp`), or take the value from
  `req.headers.get("cookie")`, which has no ambient context.
- Never write through `cookies().set()`. Yield `SessionCookieWriter` and
  `write(cookieHeader(...))` (`src/server/auth/session-cookie.ts`). In a route,
  `apiRoute` provides the layer that collects the header and attaches it to the
  response, on success and failure alike. In a server component the default
  read-only layer returns `false`: branch on it (see `currentSession`, which
  only slides the row when the cookie moved too).
- A route that returns its own `Response` builds it with `redirect()` from
  `src/server/http.ts`. `Response.redirect()` has immutable headers, so the
  attached `Set-Cookie` throws.

Worked example: `src/app/api/auth/sessions/current/route.ts` (sign-out). It
queries, then clears the session cookie through the writer. A sign-in callback
follows the same order: read its cookies and the client IP (`getClientIp`)
first, call `authService.signInWithAccount`, then
`writer.write(sessionCookieHeader(token))` and return `redirect("/")`.

## Versions are a matched pair — do not bump one alone

`drizzle-orm@1.0.0-rc.4` is built against `effect@4.0.0-beta.83`, and both
are pinned exactly. Effect 4 renamed `Schema.TaggedErrorClass` to
`Schema.TaggedError` between beta.83 and rc.112; Drizzle's driver calls the
old name at module load. On the newer Effect, `tsc` and oxlint
both pass and the first request crashes with
`Schema$1.TaggedErrorClass is not a function`, because the `.d.ts` never
mentions the runtime call.

Before bumping either package, check what the other was built against:

```bash
npm view drizzle-orm@<version> devDependencies.effect
```

then prove the pairing at runtime — `npm test` imports the driver, so it fails
loudly where the static gates stay green.

## Checks that must pass

```bash
npx tsc --noEmit      # types + Effect diagnostics (tsc is patched by effect-tsgo)
npm run lint          # oxlint --type-aware, anti-slop-effect + the 3 effecttsgo rules tsc lacks
npm test              # vitest; the DB test skips unless TEST_DB_URL is set
```

The tooling is `@effect/tsgo` alone (not `@effect/language-service`, whose CLI
rejects TypeScript 7; the tsconfig plugin keeps that _name_). The `prepare`
script runs `effect-tsgo patch --typescript --oxlint`, which compiles the
Effect diagnostics into `tsc` and oxlint. npm skips `prepare` for
`npm install <pkg>`, so run `npm run prepare` after adding or bumping a
package, or the binaries stay unpatched. Bump `@effect/tsgo`, `oxlint` and
`oxlint-tsgolint` together, and keep `typescript` pinned: the patch picks its
replacement binary by package version.

`tsc` owns every Effect rule it has, so they surface in `typecheck` and
`next build`. Severities come from `diagnosticSeverity` in `tsconfig.json`, and
`ignoreEffectWarningsInTscExitCode` keeps warning-level rules from failing the
build. `.oxlintrc.json` deliberately does not extend the `@effect/tsgo`
presets, which would repeat those rules as oxlint warnings. It enables only the
three `tsc` has off (`strict-effect-provide`, `unsafe-effect-type-assertion`,
`any-unknown-in-error-context`), as errors.

Its rules catch what types alone do not: floating effects, `runEffectInsideEffect`,
`effectInFailure`, `unnecessaryEffectGen`, and preferences for Effect
abstractions over `globalThis` APIs.
