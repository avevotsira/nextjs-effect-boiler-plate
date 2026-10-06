<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:decision-rules -->

# The developer decides — ask first

The developer makes every final decision. Requirements documents, plans and
your own judgement are inputs, not authority.

- **Confirm before building.** Anything whose shape you chose or took from a
  spec needs a short "here's what I intend" and a yes first. That covers a
  table or column, a constraint, a workflow rule, an endpoint, a library or a
  UI flow.
- **The developer beats the spec.** When they disagree, build the developer's
  call and note the gap wherever the project tracks decisions.
- **No unrequested machinery.** Example: no `version` columns or
  optimistic-lock checks. Concurrency is Postgres row locks inside the write
  transaction: `.for("update")` on the select that reads the row.
- **Mark a question decided only when the developer says so,** with the date.

<!-- END:decision-rules -->

<!-- BEGIN:reacts-agent-rules -->

# No manual memoization

React Compiler is enabled. Don't write `useMemo`, `useCallback`, or `React.memo`.

# Pattern matching, not `switch`

Branch on a union or enum with `ts-pattern`: `match(x).with(...).exhaustive()`.
No `switch` statements. `.exhaustive()` makes a missing case a compile error,
and each arm is an expression, so the branch reads as a value. Effect code
keeps Effect's own `catchTags` / `Match`.

<!-- END:reacts-agent-rules -->

<!-- BEGIN:ui-agent-rules -->

# UI rules

Users have low digital literacy. UI must be obvious, forgiving, and never clever at their expense. Style is modern and intentional — not a generic admin template.

## Composition pattern

Build UI by composing small, focused components — the way Radix UI builds its primitives. Each component owns one concern and exposes a slot-friendly surface; pages assemble them.

- **Prefer shadcn primitives** over hand-rolled markup. Need a table? `Table`/`TableHeader`/`TableRow`/`TableCell`. Need an avatar? `Avatar`/`AvatarFallback`/`AvatarImage`. Need pagination? `Pagination`/`PaginationContent`/`PaginationItem`/`PaginationLink`/`PaginationPrevious`/`PaginationNext`. Don't reinvent these with raw `<table>`, `<div>` circles, or `<Button>Next</Button>`.
- **Decompose domain UI into named pieces.** `UserAvatar`, `UserStatusBadge`, `GenderBadge` — each is a thin wrapper around a primitive plus the rule for _this_ domain. The parent component reads like prose; styling and behavior live in the leaves.
- **Multi-part components ship as a namespace.** Sub-components hang off the root: `<StatCard><StatCard.Body><StatCard.Icon/><StatCard.Value/><StatCard.Label/></StatCard.Body></StatCard>`. Wire it up with `Object.assign(Root, { Body, Icon, Value, Label })` — Radix uses the same shape. The caller arranges the slots; you don't ship a 9-prop monolith.
- **Forward `className` and rest props on every leaf**, using `cn(...)` to merge. Add `data-slot="<name>"` so siblings and tests can target parts. Never lock styling behind a `variant` enum when a className passthrough would do.
- **Wrap shadcn primitives; recolor via local `cva`.** Render the shadcn primitive (`<Badge>`, `<Avatar>`, etc.) as the wrapper, and pass purpose-specific tones through a local `cva(base, { variants: { tone: { ... } } })` merged with `cn(variants({ tone }), className)`. `tailwind-merge` resolves the class conflict so `bg-emerald-50 text-emerald-700` cleanly overrides the primitive's default. Don't pass shadcn's own `variant="secondary"` to encode domain meaning — those defaults are tuned to the primitive's theme, not your status palette. The primitive provides layout/role; the tones (and any dot/icon companion cva) are yours. Same shape for every domain badge: `UserStatusBadge`, `GenderBadge`, `TwoFactorBadge`.
- **No god components.** If a component reaches for `colSpan`, `getInitials`, status colors, _and_ dialog state, split it. The parent composes; the leaves do one thing.

<!-- END:ui-agent-rules -->

<!-- BEGIN:form-field-rules -->

# Form field pattern

Forms follow the current [shadcn/ui react-hook-form pattern](https://ui.shadcn.com/docs/forms/react-hook-form):
a [react-hook-form](https://react-hook-form.com) store as the single source of
truth, **pure input components** that know nothing about the form, and shadcn's
`Field*` components for layout — wiring is explicit via `Controller`.

```
src/components/ui/field.tsx               shadcn field.tsx (Field, FieldLabel, FieldError,
                                          FieldDescription, FieldGroup, …) — verbatim clone;
                                          add via `npx shadcn@latest add field` if missing
```

The canonical implementation (`PhoneInput`) is inlined at the end of this
section as an illustration — its helpers (`typingRegex`, `formatPhone`) and
`CurrencyInput` below are examples, not files in this repo. Follow the shape.

## Usage

```tsx
<form onSubmit={form.handleSubmit(onSubmit)}>
  <Controller
    control={form.control}
    name="amount"
    render={({ field, fieldState }) => (
      <Field data-invalid={fieldState.invalid}>
        <FieldLabel htmlFor={field.name}>Amount</FieldLabel>
        <CurrencyInput
          id={field.name}
          placeholder="0"
          aria-invalid={fieldState.invalid}
          {...field}
        />
        <FieldDescription>Amount in Khmer Riel.</FieldDescription>
        {fieldState.invalid && (
          <TranslatedFieldError errors={[fieldState.error]} />
        )}
      </Field>
    )}
  />
</form>
```

Unlike the older `FormField`/`FormControl` layer, nothing is injected through
context or `Slot` — `id`, `aria-invalid`, and the `{...field}` wiring
(`value`, `onChange`, `onBlur`, `name`, `ref`) are all visible at the call
site. The input never imports react-hook-form or shadcn's form layer.

## Rules for writing a new input component

A pass-through input needs only rules 1 and 6. Rules 2–5 kick in once the
component transforms the value or rejects keystrokes.

1. **Stay a pipe unless you transform.** If the input shows the form value
   as-is, do NOT declare `value`/`onChange` — spread `{...props}` onto
   `<input>` and let `{...field}` flow through untouched (this is what
   shadcn's own `Input` does). Only name `value` and `onChange` when the
   component must convert between them (number ↔ formatted string), like
   `CurrencyInput`. Either way: own no form state, and the form only ever
   receives clean data (`CurrencyInput` always emits an integer, never a
   string or `NaN`).
2. **Display ≠ data.** If the box shows a formatted string ("1,234,567"), keep
   the raw string in local state and derive the display. Parse the raw string
   for `onChange`; never parse the formatted one.
3. **React to external writes** (`form.reset()`, async defaults) with the
   ["adjust state during render"](https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
   pattern, not `useEffect`. Guard with a value comparison so your own
   `onChange` echo doesn't clobber in-progress typing.
4. **Reject bad keystrokes by not updating state.** A controlled input snaps
   back to the rendered value automatically; no `preventDefault` needed.
5. **Merge, don't overwrite, aria props.** Append your local error id to any
   `aria-describedby` passed by the caller; OR your local error into
   `aria-invalid`. Render the error `<p>` unconditionally with
   `aria-live="polite"`.
6. **Forward everything else** (`id`, `placeholder`, `ref`, …) onto the real
   `<input>`. Use `type="text"` + `inputMode="numeric"` for numbers —
   `type="number"` fights formatted display and fires `onChange` with empty
   strings for partial input.

Two error channels, two owners: keystroke-level errors (invalid character)
belong to the input and show inline; form-level errors (validation `rules`,
schema) belong to react-hook-form and surface through `<FieldError />`.

## Canonical implementation

`PhoneInput` (example) — the form value IS the raw digit string, so no local raw state or render-sync is needed (rules 2–3
don't apply):

```tsx
"use client";

import * as React from "react";

import { typingRegex } from "@/lib/currency-input-util";

import { useTranslations } from "next-intl";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { formatPhone } from "./phone-input-util";

type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "type"
> & {
  value: string;
  onChange: (value: string) => void;
};

export function PhoneInput({
  value,
  onChange,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: PhoneInputProps) {
  const t = useTranslations("common");
  const errorId = React.useId();
  const [error, setError] = React.useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/ /g, "");
    if (!typingRegex.test(digits) || digits.length > 10) {
      setError(true);
      return; // no onChange -> React restores the controlled value; the bad char never lands
    }
    setError(false);
    onChange(digits);
  }

  return (
    <div>
      <InputGroup>
        <InputGroupAddon>+855</InputGroupAddon>
        <InputGroupInput
          {...props}
          type="text"
          inputMode="numeric"
          value={formatPhone(value)}
          onChange={handleChange}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={[ariaDescribedBy, errorId]
            .filter(Boolean)
            .join(" ")}
        />
      </InputGroup>
      {/* Always rendered so aria-live announces the message when it appears */}
      <p id={errorId} aria-live="polite" className="text-sm text-red-600">
        {error ? t("phone_invalid_kh") : null}
      </p>
    </div>
  );
}
```

<!-- END:form-field-rules -->

<!-- BEGIN:data-fetching-rules -->

# Data fetching

Feature data layer — the only approved structure for new pages:

```
src/app/<locale>/<feature>/<resource>/
  page.tsx          ← server: prefetch via the key factory
  query-keys.ts     ← isomorphic (no "use client"): key factory
  _components/      ← "use client": presentation; consumes hooks only
    *-skeleton.tsx  ← Suspense fallback mirroring real layout
  _hooks/           ← "use client": fetcher + React Query binding
    use-<resource>.ts
    use-<mutation>.ts
```

`query-keys.ts` is isomorphic because the server prefetch needs it — `"use client"` modules become client references and throw on the server.

## Query keys

Named-key factory, never bare arrays at call sites:

```ts
export const adminUsersKeys = {
  all: ["admin", "users"] as const,
  page: (page: number) => ["admin", "users", { page }] as const,
};
```

`all` for invalidation, `page(...)` for queries.

## Fetchers

Live in the hook file (module-private unless reused). Use `apiFetch<T>` from `@/lib/api/client` — typed body via `ApiResponse<T>`, narrowed by the `ok` discriminant. Never `data!`. Never inline `fetch().then(...)`.

```ts
const fetchAdminUsers = (page: number) =>
  apiFetch<Page<UserWithAccount>>(`/api/admin/users?page=${page}&limit=20`);
```

`apiFetch` returns `Result<T, ApiError>` (`@justmiracle/result`) — never throws. Maps rejections via `safeAsync`, not `try/catch`.

## Result over try/catch

Project default. Use `try/catch` only inside wrappers (e.g. `safeAsync` itself). Business code returns `Result<T, E>`.

## Hooks unwrap Result, throw ApiClientError

TanStack `queryFn`/`mutationFn` throw on error, so hooks are the only place `Result` → throw:

```ts
queryFn: async () => {
  const result = await fetchAdminUsers(page);
  if (isErr(result)) throw new ApiClientError(result.error);
  return result.value;
};
```

Mutation invalidation lives in the mutation hook's `onSuccess`. Components must not call `useQueryClient`.

## Components consume hooks only

No imports from `_queries/`, no `useQueryClient`, no inline `fetch`. Error: `mutation.error.message` (or `mutation.error.apiError.code` for branching). Loading: `mutation.isPending`.

## Suspense + prefetch

`page.tsx` calls `getQueryClient()`, runs `prefetchQuery({ queryKey: keys.page(1), queryFn: () => repo.method(...) })` (server uses the repo directly — never `fetch()` your own API server-side), wraps children in `<HydrationBoundary state={dehydrate(queryClient)}>` and `<Suspense fallback={<FeatureSkeleton />}>`. Fallback is a real skeleton mirroring loaded layout, not `Loading…`.

<!-- END:data-fetching-rules -->

<!-- BEGIN:shared-schemas-rules -->

# Shared schemas

Any wire-contract Zod schema lives in **one** file, imported by client and server. Never duplicate across the API/UI boundary.

## Location

`src/schemas/<resource>.schemas.ts`. Must not import server-only modules (DB, repos) — it's imported from client code. Shared transforms/helpers go in `src/schemas/helpers.ts`.

Derive from Drizzle via `createInsertSchema` / `createSelectSchema` so column changes propagate. Use the refine callback for app-layer constraints (min/max, regex, etc.). A schema that spans tables or branches on a discriminant may be hand-written; say why in its doc comment.

## Messages are keys, not sentences

Every message in a shared schema is a **message key** under `validation.*`, never English text: the UI must switch language for validation too.

```ts
const email = z
  .string()
  .trim()
  .min(1, { error: "validation.required" })
  .pipe(z.email({ error: "validation.email_invalid" }));
```

- Forms render errors with `TranslatedFieldError` (`src/components/translated-field-error.tsx`), shadcn's `FieldError` with each message passed through `t()`. Add every new key to both `km.json` and `en.json`.
- API errors are shown by **code**, not by the server's message: `ApiErrorMessage` (`src/components/api-error-message.tsx`) renders `t("api_error.<code>")`. A new error code needs a key in both files. The server's English `message` is for logs and API callers.
- A request-specific clash (409) is a tagged error in `src/server/errors.ts` carrying a `code` (e.g. `Conflict({ code: "EMAIL_TAKEN" })`) mapped in `toResponse`; the code is what the client translates.

## Usage

Backend imports the schema directly (`createUserSchema.safeParse(body)`). Frontend uses the same schema via `zodResolver(createUserSchema)` — same rules, same message keys. Forked rules drift; forked messages confuse users.

Extend only when the form has fields the server doesn't (e.g. `confirmPassword`, `termsAccepted`). The shared schema stays untouched; the dialog defines a superset:

```ts
const dialogSchema = createUserSchema
  .extend({ confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
```

Async/server-only checks (uniqueness) belong on the server, not in a client `.extend()`.

<!-- END:shared-schemas-rules -->

<!-- BEGIN:migration-rules -->

# Migrations

Always generate with an explicit name that says what the migration does:

```
npx drizzle-kit generate --name=rename_report_rows_to_subunits
```

The folder name is the only thing a reader sees in a directory listing —
`20260817181101_rename_report_rows_to_subunits` explains itself,
`20260804155753_bitter_khan` (drizzle's auto-name) explains nothing. If a
migration can't be named in a few words, it's doing too many things — split
it.

**Renames need the user.** When a table/column/index disappears and a new
one appears, `drizzle-kit generate` asks interactively whether it's a rename
or a drop+create — and picking wrong destroys data. That prompt needs a real
terminal, which agents don't have. Do the code rename, then hand the exact
`generate --name=...` command to the user with the answers: always
"renamed from", matching old → new **by suffix** (`_report_idx` renames from
`_report_idx`, `_position_uniq` from `_position_uniq`) — never "create",
which drops the original.

Afterwards, verify with a second `npx drizzle-kit generate`: it must say
"No schema changes, nothing to migrate". Anything else means the snapshot
and the code disagree — fix that before moving on.

<!-- END:migration-rules -->

<!-- BEGIN:naming-rules -->

# Naming

Plain industry-standard verbs everywhere. No clever synonyms, no colloquial shorthand. Future-you and the next contributor should be able to predict the name from the shape of the operation.

## Creators

`generate*` for anything that mints a value (random or derived): `generateActivationToken`, `generateScryptHash`, `generateIdFromEntropySize`. Not `mint*`, `forge*`, `spawn*`, `make*`.

## Repositories

CRUD vocabulary for reads; cardinality lives in the name (`findOne` returns 0–1; `findAll` returns many). Reads use the lookup key in the suffix:

```ts
fooRepo = {
  create(input),
  findOneById(id),
  findOneBy<X>(x),
  findAll(params?),
  findAllBy<X>(x),
  delete(id),
  deleteBy<X>(x),
}
```

For writes, prefer **action-specific named methods** over a generic `update(id, patch)`. Each method encodes which fields/transitions are valid, so the service can't accidentally touch columns it shouldn't:

```ts
usersRepo = {
  // ...
  markActivated(id, at?),   // sets activatedAt
  suspend(id, reason),      // sets suspendedAt + reason
  rename(id, displayName),  // sets displayName
};

// service — intent is obvious at the call site
await usersRepo.markActivated(userId);
```

Only add a generic `update(id, patch)` when the resource genuinely has many free-form mutable fields and the service-side intent is just "save these edits" (e.g. a settings form).

## Services

Domain verbs, qualified by the input. Same `By<X>` / `For<X>` suffix shape as repos so call sites read uniformly.

```ts
fooService = {
  createForUser(userId),
  findOneByToken(token),
  redeemByToken(token, input),
}
```

Not `peek`, `inspect`, `consume`, `process`, or any verb you wouldn't find in an OpenAPI doc.

## React Query hooks

`use<Verb><Resource>` — verb comes from the service method, not the HTTP verb.

```ts
useCreateActivationToken(); // wraps activationTokensService.createForUser
useRedeemActivationToken(); // wraps activationTokensService.redeemByToken
```

## REST routes

Resource-oriented paths. Collection plural, item by id, actions on an item as a sub-resource.

```
POST   /api/admin/users/[id]/activation-tokens     ← create on a sub-collection
GET    /api/activation-tokens/[token]              ← read item
POST   /api/activation-tokens/[token]/redemption   ← action sub-resource
```

No RPC-style verbs in the path (`/generate-link`, `/do-redeem`). The HTTP method is the verb; the path is the resource.

## Type names

A type's name must say what the thing _is_ in the domain, at its source —
once, and that one name is used everywhere. The failure in
`WorkingGroupMembersReportRow` was never length, it was meaning: it reads as
"a record of the working-group-members report", when the thing is actually
one **sub-unit** of that report — the name omits the word that identifies
it, so every reader starts from the wrong mental model. `SubunitRow` and
`WorkingGroupMembersSubunitRow` are both correct (the qualifier is optional,
the domain word is not); prefer the short form until a second feature grows
sub-unit rows and forces the qualifier.

Never re-alias a type per module (`type SubunitRow = WorkingGroupMembers…`) —
two names for one type makes every reader hold the mapping in their head. If
a name is wrong or bloated, fix it at the source and update the call sites.

Mechanical derivations (`<TableName>SelectRow`, `<TableName>Insert`) are how
these names go wrong: they describe how the type was made, not what it is.
Derive the type from the table, but name it yourself.

<!-- END:naming-rules -->

<!-- BEGIN:locality-rules -->

# Locality

A reader should understand an entry point by reading its file top to bottom —
not by chasing a call stack across four files. Cautionary tale:
`updateByReportId → saveRows → planSubunitRows → subunitKey` spans three
modules to learn what one UPDATE does.

## Call-depth budget

One entry point gets at most two hops of single-use helpers beneath it.
Before extracting a function, climb this ladder and stop at the first rung:

1. **Don't extract.** A once-called helper whose body is a few lines is
   indirection, not abstraction — inline it with a comment.
2. **A named variable.** `const key = tenantId + ":" + villageId` reads at
   the call site; a `subunitKey()` import does not.
3. **Extract** only when the logic is pure decision-making worth its own
   unit test (a planner, a parser, a diff) or genuinely reused by a second
   caller. Say which in the doc comment.

An extracted module stays flat: it may lean on a shared leaf utility (a key
builder, a formatter), but never on a further chain of once-used modules.

## Same file, newspaper order

A helper with one caller lives in its caller's file, below it: entry points
at the top, helpers after, in the order they are called. The reader scrolls
down, never jumps files. A new file is earned by reuse or by a pure module
with its own test — never by tidiness.

<!-- END:locality-rules -->

<!-- BEGIN:effect-rules -->

# Effect on the backend

Everything under `src/server/` and `src/app/api/` is Effect. `Promise`-returning
service code and `try/catch` are gone; so is `@justmiracle/result` on the server.

**Effect 4, not 3** — pinned to `effect@4.0.0-beta.83`, the version
`drizzle-orm@1.0.0-rc.4` was built against. Bump them only as a pair (see the
skill). Most training data and most blog posts are v3. The renames that will
bite you:

| v3                                | v4 (this repo)                        |
| --------------------------------- | ------------------------------------- |
| `Context.Tag("k")<Self, Shape>()` | `Context.Service<Self, Shape>()("k")` |
| `"TimeoutException"`              | `"TimeoutError"`                      |
| `@effect/sql`                     | `effect/unstable/sql/*`               |
| `Effect.Effect.Success<T>`        | `Effect.Success<T>`                   |

## The stack

`@effect/sql-pg` `PgClient.layer` → `drizzle-orm/effect-postgres`
`makeWithDefaults()` → the `Db` service → `ManagedRuntime`. Composition root is
`src/server/runtime.ts`; nothing else constructs a pool or a client.

## Non-negotiables

- **Never hand-roll a transaction.** `db.transaction((tx) => Effect.gen(...))`
  from the Drizzle Effect driver takes an Effect and returns one, and rolls back
  on failure _and_ on interruption. No `AsyncLocalStorage`, no sentinel
  exception, no `getDb()`.
- **Any effect touching the DB carries `SqlError | EffectDrizzleQueryError`** in
  its error channel. The compiler will tell you; add them rather than widening
  to `unknown`.
- **Annotate the route boundary `Effect.Effect<Response, never>`** before
  `runPromise`. Without it an unhandled error variant compiles and fails at
  runtime; with it, `catchTags` is exhaustive. This annotation is load-bearing.
- **Import Layers, never `make*` constructors.** Enforced by
  `anti-slop-effect/no-service-constructor-imports`.
- **Never call `next/headers` after a database query.** `cookies()` and
  `headers()` read Next's per-request `AsyncLocalStorage`. The `PgClient` pool
  lives in the module-scope `ManagedRuntime`, so a fiber that awaits a query
  resumes on a callback rooted in the context captured when the pool was first
  used — the **first request the process served**. Everything after the query
  therefore sees that request's cookies and headers, on every later request.
  Measured: with three requests carrying `probe=A`, `B`, `C`, a read before the
  query returns `A`, `B`, `C` correctly and a read after it returns `A`, `A`,
  `A`. A `cookies().set()` after a query lands on a response that was sent long
  ago and is silently lost — which is what turned a working sign-in into a
  login loop.

  So: read anything you need from `next/headers` **first**, before touching the
  database, or take it off the `Request` the handler was given
  (`req.headers.get("cookie")`), which has no ambient context at all. To _write_
  a cookie, put it on the response — `SessionCookieWriter` in
  `src/server/auth/session-cookie.ts` is the pattern: the route layer collects a
  header for `apiRoute` to attach, the read-only layer reports that it could not,
  and callers branch on that instead of assuming the write happened. A route
  that returns its own `Response` builds it with `redirect()` from
  `src/server/http.ts`: `Response.redirect()` has immutable headers, so the
  attached `Set-Cookie` would throw. The
  from-scratch explanation, with runnable experiments, is
  `docs/learning/async-context-and-cookies.md`.

- **The Effect diagnostics must pass.** `effect-tsgo patch` (the `prepare`
  script, from `@effect/tsgo`) builds them into `tsc`, so `npm run typecheck`
  and `next build` report them, at the severities set by `diagnosticSeverity`
  in `tsconfig.json`. `tsc` owns every Effect rule it has; `npm run lint` adds
  only the three it lacks (`strict-effect-provide`,
  `unsafe-effect-type-assertion`, `any-unknown-in-error-context`), so nothing
  is reported twice. After `npm install <pkg>`, run `npm run prepare`: npm
  skips it for installs with arguments, leaving `tsc`/oxlint unpatched.

Full conventions, worked examples and the service/Layer template:
`.claude/skills/effect-backend/SKILL.md`.

<!-- END:effect-rules -->
