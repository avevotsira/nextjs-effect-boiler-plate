# Why `cookies()` returned someone else's cookies — a study guide

**What this is:** a from-scratch walkthrough of the bug that broke sign-in on
2026-09-09, written to be read slowly, with an agent beside you. Every term is
defined before it is used. Every claim comes with something you can run.

**What you'll understand by the end:**

1. How Node.js keeps track of "which request is running right now".
2. How Next.js's `cookies()` and `headers()` rely on that.
3. Why a database connection pool can quietly break it.
4. The rule we now follow, and why each half of it works.

**How to use it with an agent:** read one section, run its snippet, then ask
the agent the questions at the end of the section _in your own words_. If the
agent's answer uses a word you don't know, ask for that word first. Don't move
on until you could explain the section to someone else.

---

## 0. Prerequisites — the three things everything builds on

### 0.1 A callback is "code to run later"

```js
setTimeout(() => console.log("later"), 100);
console.log("now");
// prints: now, then (100 ms later) later
```

The arrow function is a **callback**. Node runs it when the timer fires. Between
`now` and `later`, Node is free to run other work. This is how one Node process
serves many users at once: it never waits idly, it schedules callbacks.

### 0.2 `await` is a callback in disguise

```js
async function f() {
  console.log("a");
  await something(); // pauses f, lets other work run
  console.log("b"); // this line is really a callback that runs when
} // something() finishes
```

Everything after an `await` is, under the hood, a callback registered on the
promise. Keep that picture: **the line after `await` is "code to run later",
and Node decides when.**

### 0.3 Two users at once means two chains of callbacks interleaved

If user A and user B both hit the server, Node runs a bit of A, then a bit of
B, then a bit of A… The callbacks are interleaved. Nothing in the code says
"this callback is A's" — unless something tracks it.

> **Ask the agent:** "Show me two async functions running at the same time and
> print which one each line belongs to."

---

## 1. `AsyncLocalStorage` — Node's way of tracking "whose code is this?"

### 1.1 The problem it solves

You are deep inside some function and you want to know "which request am I
serving?" — but nobody passed you a request object. `AsyncLocalStorage`
(from `node:async_hooks`) solves exactly this. Think of it as a **wristband**:
you put one on at the start of a request, and every piece of code that request
runs — including code that runs _later_, after an `await` — can look at its
wrist and see the band.

### 1.2 Run this

```js
// als-demo.mjs — run with: node als-demo.mjs
import { AsyncLocalStorage } from "node:async_hooks";
const als = new AsyncLocalStorage();

async function handleRequest(id) {
  await als.run({ requestId: id }, async () => {
    console.log("start ", als.getStore().requestId);
    await new Promise((r) => setTimeout(r, 10)); // pause; other work runs
    console.log("after ", als.getStore().requestId); // same wristband
  });
}

handleRequest("A");
handleRequest("B");
```

Output:

```
start  A
start  B
after  A
after  B
```

Even though A and B interleave, each `after` line still sees its own id.

### 1.3 How it works under the hood — the one sentence that matters

> Every time an async operation is **created** (a timer, a promise
> continuation, a socket listener), Node records which store was active **at
> that moment**. When the operation's callback later runs, Node restores that
> recorded store.

So the wristband is not attached to _you_; it is attached to **each callback,
at the moment the callback was created**. Normally that is the same thing. The
bug is the case where it isn't.

### 1.4 Vocabulary

| word                | meaning                                                        |
| ------------------- | -------------------------------------------------------------- |
| store               | the value you put in with `als.run(value, fn)` — the wristband |
| `als.getStore()`    | "show me my wristband"                                         |
| async context       | the store that is active right now                             |
| context propagation | Node copying the store onto each new callback                  |

> **Ask the agent:** "In `als-demo.mjs`, add a third request and a `setTimeout`
> inside the `await`. Predict the output before running it."

---

## 2. Next.js builds `cookies()` and `headers()` on top of this

When a request arrives, Next.js does, in spirit:

```js
als.run(requestStore, () => runYourRouteHandler());
```

where `requestStore` holds that request's headers, its incoming cookies, and a
**pending mutable cookies** object. Then:

```js
export function cookies() {
  const store = als.getStore(); // look at the wristband
  return store.cookieJar; // THIS request's cookies
}
```

- `cookies().get(...)` reads from that jar.
- `cookies().set(...)` writes into the pending object.
- When your handler returns, Next turns the pending object into `Set-Cookie`
  headers on the response and sends it.

Three consequences to hold onto:

1. No wristband → `cookies()` throws ("called outside a request scope").
2. **Wrong** wristband → `cookies()` returns another request's jar. No error.
3. A `set()` on another request's jar goes onto a response that has **already
   been sent**. It is silently lost.

> **Ask the agent:** "Why can't `cookies()` just take the request as a
> parameter? What would be annoying about that?"

---

## 3. The database pool — a thing created _outside_ any request

### 3.1 What a pool is

Opening a connection to Postgres is slow (TCP, auth, handshake). So apps open
a few connections once and reuse them. That set of reusable connections is a
**connection pool**. Each connection has a socket, and each socket has
listeners — callbacks that fire when Postgres sends bytes back.

### 3.2 When ours is created

Look at `src/server/runtime.ts`:

```ts
export const runtime = ManagedRuntime.make(AppLive);
```

This line runs **once, when the file is first imported** — at server startup,
before any request exists. `AppLive` includes the Postgres client. So the pool
is born with **no wristband**.

### 3.3 Now apply section 1.3 to the pool

Recall: a callback gets the store that was active **when the callback was
created**.

- **Request A** arrives with wristband A. It runs a query. The pool needs a
  connection, so _now, during A,_ it creates the socket listeners and the
  "query finished" callback. Those callbacks are stamped **A**.
- Postgres replies. The stamped callback runs — wearing A — and resumes A's
  code. Correct, because it _is_ A.
- **Request B** arrives with wristband B. Before its first query,
  `als.getStore()` says B. Correct. Then it runs a query. The pool **reuses
  the connection and listeners it already created during A**. Postgres
  replies. Node restores the store stamped on that listener: **A**.
- Everything B does _after_ the query is now wearing A's wristband.
  `cookies()` returns A's jar. `cookies().set()` writes into A's long-gone
  response.

### 3.4 This is not theory — it was measured

Three requests, each sending a cookie `probe=A`, `B`, `C`, each reading the
cookie _before_ a query and _after_ one:

```
probe=A  before: A   after: A
probe=B  before: B   after: A   ← wrong
probe=C  before: C   after: A   ← wrong
```

Every request after the first reads the first request's cookies once it has
touched the database.

### 3.5 Why a plain `await pool.query()` in a normal Next route is fine

This is the subtle part, so it gets its own walk-through. Everything rests on
the rule from §1.3: **a callback wears the wristband that was active when the
callback was _created_.** The question for each case is: _who created the
callback that runs "the rest of my code"?_

#### 3.5.1 A plain `await` — you create the callback yourself

```js
async function handler() {
  // wearing wristband B
  const rows = await pool.query(); // ← at THIS line, your function creates a
  cookies().set(/* … */); //   callback: "run the rest of me when the
} //   query finishes"
```

Your function creates that callback, at the `await` line, while wearing B. So
it is stamped **B** at creation. It does not matter who finishes the query
later, or from which context — when Node runs the callback it restores B, and
the rest of the function wears B. Correct.

#### 3.5.2 Effect — something else wakes your code up

With `Effect.gen(function* () { … })`, your code is not a plain async function.
Effect turns it into a **fiber**: a small state machine that Effect steps
forward one `yield*` at a time. The code that does the stepping is Effect's
**scheduler** — the part of the runtime that decides "run the next step of
this fiber now".

```
plain await:  your function ──creates callback (stamped B)──▶ Node runs it wearing B

Effect:       pool callback fires  (stamped A — see §3.3)
                └─▶ tells Effect "the query result is ready"
                      └─▶ Effect's scheduler steps your fiber forward
                            RIGHT THERE, inside the pool's callback
                            ─▶ your next line runs wearing A
```

Your "line after the query" is **not** a callback you created. Nothing was
ever stamped B for it. It is executed by the scheduler from inside whatever
callback woke the fiber — and for a database query that is the pool's
callback, stamped A. So your code inherits A.

("Resumes through its own queue" just means: Effect does not hand your
continuation to Node's promise system; it keeps it on its own to-do list and
runs it itself when told to.)

#### 3.5.3 The one-line takeaway

**Who creates the callback decides the wristband.** A plain `await` makes
_you_ the creator. Effect makes _whatever woke the fiber_ the effective
creator — and for a query, that is a pool callback from the first request.

#### 3.5.4 Why the three experiments came out the way they did

- **Plain Next route + query** — the continuation was created by your own
  function, stamped correctly. **Passed.**
- **Effect route, cookie write only, no query** — the only async step was
  `await cookies()`, created inside the request, stamped correctly. No pool
  callback was involved, so nothing could hand over A's wristband. **Passed.**
- **Effect route, query then cookie write** — the fiber was woken by the
  pool's callback, which carried A. **Failed.**

> **Ask the agent:** "Show me, in the `als-demo.mjs` from §1.2, a callback
> created inside `als.run` for A but _invoked_ from inside `als.run` for B.
> Which store does `getStore()` return inside it? (Answer: A — creation wins.)"

> **Ask the agent:** "Draw a timeline of requests A and B, marking which
> wristband each line of code is wearing. Where exactly does B pick up A's?"

---

## 4. What that did to sign-in

### 4.1 First, what a "cookie write" physically is

`cookies().set()` does **not** send anything to a browser. It adds an entry to
a plain JavaScript object — think of it as the request's **pending-cookies
box**. The box lives inside the request's store (its wristband). Here is the
lifecycle of one request:

```
request B arrives
  Next creates   boxB = {}            ← empty, belongs to B
  your handler runs …
  handler returns
  Next reads boxB → one Set-Cookie header per entry → sends the response
  boxB is finished; Next never reads it again
```

So a `Set-Cookie` header exists on B's response **only if boxB has something
in it at the moment B's handler returns.** That is the whole mechanism.

### 4.2 What happened to sign-in, step by step

Sign-in must (1) look the user up in the database, then (2) set the session
cookie. Step 1 is a query.

1. Request A (the first after a restart) ran earlier. It had `boxA`. Its
   handler returned, Next read `boxA`, sent A's response, and `boxA` was
   finished. The object still exists in memory only because the pool's
   callback kept a reference to A's store (section 3.3).
2. Request B arrives. Next creates a fresh, empty `boxB`.
3. B's handler runs the lookup query. When the query completes, B's code
   resumes wearing **A's** wristband.
4. `cookies().set("session_token", …)` looks at the wristband, finds A's store,
   and writes into **`boxA`** — the box that has already been read and
   discarded.
5. B's handler returns `{ ok: true }`. Next reads **`boxB`**. It is still
   empty. B's response goes out with **no `Set-Cookie` header at all**.

So nothing was issued — not an expired cookie, not a wrong value. The cookie
was written into an object that had already been consumed, and the object
that _would_ have been consumed stayed empty. It went nowhere: A's response
was already on the wire, and you cannot add a header to a response that has
been sent. Meanwhile the session row **was** created in the database — the
server thinks you are signed in; only the browser was never told.

### 4.3 Symptoms, all explained by the above

- The first sign-in after a server restart works (the pinned wristband is its
  own).
- Every later sign-in returns `200 ok` — with no `Set-Cookie`. The browser has
  no session. The next page bounces to `/login`. It looks like a login loop.
- No error anywhere, because nothing _failed_ — it just wrote to the wrong
  place.
- Nobody was ever logged in as someone else, because `currentSession` reads the
  cookie **first**, before any query. Ordering luck.

---

## 5. Reproduce it yourself (30 minutes)

You'll build tiny routes that each do one thing, then write a cookie, and see
which ones lose it.

1. Start a throwaway Postgres and point the app at it (never staging):

   ```
   docker run -d --name app-pg -e POSTGRES_USER=app \
     -e POSTGRES_PASSWORD=app -e POSTGRES_DB=app \
     -p 5544:5432 postgres:16-alpine
   ```

2. Create `src/app/api/diag/withquery/route.ts`. (Not a `_`-prefixed folder —
   Next ignores those as routes.)

   ```ts
   import { userTable } from "@/db/schema";
   import { Db } from "@/server/db";
   import { apiRoute } from "@/server/runtime";
   import { cookies } from "next/headers";
   import { Effect } from "effect";

   export const GET = apiRoute(() =>
     Effect.gen(function* () {
       const before = yield* Effect.promise(
         async () => (await cookies()).get("probe")?.value ?? null,
       );
       const db = yield* Db;
       yield* db.select({ id: userTable.id }).from(userTable).limit(1);
       const after = yield* Effect.promise(
         async () => (await cookies()).get("probe")?.value ?? null,
       );
       return { before, after };
     }),
   );
   ```

3. Build and run with `DB_URL` pointed at port 5544, then:

   ```
   for p in A B C; do curl -s -b "probe=$p" localhost:3000/api/diag/withquery; echo; done
   ```

4. Expect `after` to be `A` on the second and third calls. Then delete the
   route and the container.

> **Ask the agent:** "Change the route so it does a scrypt hash instead of a
> query. Does the bug still happen? Why not?" (Answer: no — scrypt's callback
> is created _during your request_, so it is stamped with your wristband.)

---

## 6. The rule we follow now, and why each half works

**Never call `next/headers` after a database query.**

1. **Read `cookies()` / `headers()` first**, before the first query. At that
   moment no pool callback has resumed you yet, so `als.getStore()` is still
   yours. (Or take what you need from the `Request` object the handler was
   given — `req.headers.get("cookie")` — which has no ambient context at all.)

2. **Write cookies onto the response object**, not through `cookies().set()`.
   `Response.json(body, { headers: { "Set-Cookie": "…" } })` needs no
   wristband — you are holding the actual response. In this codebase that is
   `SessionCookieWriter` in `src/server/auth/session-cookie.ts`: the program
   hands the cookie header to a slot, and `apiRoute` attaches it to whatever
   response it builds.

The general lesson, bigger than cookies: **anything created once at startup —
a pool, an HTTP client, a scheduler — can hand your code a stale context.
Never read per-request state after handing control to one of them.**

This rule is recorded in `AGENTS.md` under _Effect on the backend →
Non-negotiables_.

---

## 7. Check yourself

Try to answer without looking. Then ask the agent to grade you.

1. What does `als.run(store, fn)` do, in one sentence?
2. When is a callback's store decided — when it runs, or when it is created?
3. Why does the first request after a restart behave differently from the rest?
4. Why did reading the session cookie never break, while writing it did?
5. Why would `req.headers.get("cookie")` be immune to this problem?
6. Name one other startup-created resource in this app that could cause the
   same class of bug. (Hint: `runtime.ts`.)

## Glossary

| term                | plain meaning                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| callback            | a function you hand over to be run later                                                         |
| event loop          | the thing in Node that decides which callback runs next                                          |
| promise             | an object representing a value that will arrive later                                            |
| `await`             | pause here; the rest of the function becomes a callback on the promise                           |
| async context       | the "current request" information Node keeps attached to a chain of callbacks                    |
| `AsyncLocalStorage` | Node's API for storing and reading that information                                              |
| store / wristband   | the value held in the async context                                                              |
| connection pool     | a handful of reusable database connections, opened once                                          |
| `ManagedRuntime`    | Effect's long-lived runtime; ours is created once at startup and owns the pool                   |
| fiber               | Effect's unit of running work — roughly "a lightweight thread" that the Effect scheduler resumes |
| `next/headers`      | the Next.js module that exposes `cookies()` and `headers()` — both read the async context        |
