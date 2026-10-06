# Next.js + Effect boilerplate

The core of a data-collection app with no domain in it: a provider-agnostic
session layer, Khmer/English UI, and an Effect 4 backend on Postgres. Start a
new project here, plug in a sign-in method, and add your own tables, routes and
pages.

## What's in it

| Area    | Stack                                                                                                                              |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| App     | Next.js 16 (App Router, React Compiler), React 19, `next-intl` (`km` default, `en`)                                                |
| Backend | Effect 4 (`src/server/`), `drizzle-orm/effect-postgres`, `@effect/sql-pg`; routes wrapped by `apiRoute`                            |
| Auth    | Opaque session cookie with sliding 30-min expiry, page guards, sign-out; no sign-in method (bring your own)                        |
| Tables  | `users`, `accounts` (user ↔ provider ID), `sessions`, `activity_logs` (append-only audit)                                          |
| UI      | Tailwind 4, shadcn/ui (`src/components/ui`), react-hook-form + zod, TanStack Query, sonner, lucide                                 |
| Quality | oxlint (type-aware, custom `anti-slop` rules in `tools/oxlint`), oxfmt, `tsc` patched with Effect diagnostics, vitest, CI workflow |
| Agents  | `AGENTS.md` (conventions), `.claude/skills` (effect-backend, impeccable, emil-design-eng, break-ui, …), `.cursor` rules + MCP      |
| Deploy  | `Dockerfile` (standalone output, build secrets), `railpack.json`                                                                   |

## Getting started

```bash
cp .env.example .env
docker compose up -d              # Postgres on localhost:5433
npm install                       # also runs `prepare` (patches tsc/oxlint with Effect rules)
npm run db:migrate
npm run dev
```

## Adding a sign-in method

There is none: the login page has a slot for it, and every page redirects
there until a session exists. A method (OAuth/OIDC such as Keycloak, a
password form, …) needs:

1. A route that starts it, and a callback route that proves who the person is.
2. In the callback: read cookies and `getClientIp()` **before** any query,
   call `authService.signInWithAccount({ providerId, accountId }, ctx)`, then
   `writer.write(sessionCookieHeader(token))` and `return redirect("/")`.
   Turn `AccessDenied` into `redirect("/login?error=<reason>")`.
3. Its env vars in `src/env.ts` and a secret line each in the `Dockerfile`.

Only people with a `users` row and an `accounts` row for that provider get
in: `npm run seed:user -- you@example.com <provider> <account-id>` writes
both.

## Scripts

| Script                 | Does                                                         |
| ---------------------- | ------------------------------------------------------------ |
| `npm run dev`          | Dev server                                                   |
| `npm run staged`       | Everything CI runs: lint, format check, typecheck, tests     |
| `npm run typecheck`    | `next typegen` + `tsc` (includes Effect diagnostics)         |
| `npm run lint`         | oxlint, type-aware                                           |
| `npm run format:write` | oxfmt                                                        |
| `npm test`             | vitest; `*.db.test.ts` run only when `TEST_DB_URL` is set    |
| `npm run db:generate`  | `drizzle-kit generate` — always pass `--name=<what_it_does>` |
| `npm run db:migrate`   | Apply migrations                                             |
| `npm run seed:user`    | Add a user + account row so a person can sign in             |

After `npm install <pkg>`, run `npm run prepare`: npm skips it for installs
with arguments, leaving `tsc`/oxlint unpatched.

## Layout

```
src/
  app/[locale]/            pages: login, the placeholder home, not-found
  app/api/auth/            sign-out (add your sign-in routes here)
  server/                  Effect programs and services; runtime.ts is the composition root
    auth/                  session-cookie.ts, current.ts, service.ts, crypto.ts
  db/schema/               one file per table, re-exported from index.ts
  schemas/                 zod wire contracts shared by routes and forms
  components/              shared inputs and widgets; components/ui is shadcn
  lib/                     api client, page guards, formatters, rate limit, diffFields
  i18n/messages/           km.json, en.json — every key in both
```

## Adding a feature

1. Table in `src/db/schema/` (re-export it from `index.ts`), then
   `npm run db:generate -- --name=create_<things>`.
2. Shared zod schema in `src/schemas/<things>.schemas.ts`.
3. Programs in `src/server/<things>/service.ts`; write an `activity_logs` row in
   the same transaction for every change.
4. Routes in `src/app/api/<things>/route.ts`:
   `apiRoute((req) => Effect.gen(function* () { const { user } = yield* requireCurrent; … }))`.
5. A page folder in `src/app/[locale]/<things>/` (`page.tsx`, `query-keys.ts`,
   `_components/`, `_hooks/`), guarded with `requireSession`.
6. Message keys in both `km.json` and `en.json`.

Rename the app in `package.json`, `common.app_name` (both message files), the
`metadata` title in `src/app/[locale]/layout.tsx`, and the colours in
`src/app/globals.css`.

Read `AGENTS.md` before writing code; the Effect long form is
`.claude/skills/effect-backend/SKILL.md`, and the UI tooling is described in
`docs/setup/ui-tooling.md`.
