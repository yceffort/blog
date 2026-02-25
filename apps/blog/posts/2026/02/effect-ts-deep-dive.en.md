---
title: "Deep Dive into Effect Systems: From Monads to Algebraic Effects, and Effect-TS's Choices"
tags:
  - typescript
  - backend
published: true
date: 2026-02-20 10:00:00
description: 'I dug deep into what Effect-TS is all about and why everyone seems so excited about it.'
---

## Table of Contents

## Introduction

Programs are useless with pure computation alone. Network requests, file reads, database queries, logging — all are side effects. The problem is that side effects make programs hard to reason about. Calling the same function with the same arguments can yield different results depending on network conditions, and you can't tell from the type signature alone where errors might occur or what kinds they'll be. Consider this code:

```typescript
// You can't tell from outside what side effects this function has or what errors it might throw
async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error('HTTP error')
  return res.json()
}
```

"What if we could track side effects with the type system?" This question has been the subject of 30 years of exploration by academia and industry. This article traces the journey from Moggi's monads through Plotkin and Pretnar's algebraic effect handlers to the practical compromises Effect-TS makes in the TypeScript ecosystem.

## Academic Origins of Effect Systems

The idea of "tracking side effects with types" didn't emerge overnight. It's built on about 20 years of accumulated academic research from 1991 to 2009.

### Moggi (1991): Modeling Computation with Monads

In 1991, Eugenio Moggi made a revolutionary observation in ["Notions of Computation and Monads"](https://www.cs.cmu.edu/~crary/819-f09/Moggi91.pdf). **Computations with side effects can be modeled using the mathematical structure called monads.**

The core idea goes like this. A pure function `A → B` means "takes A and returns B." Adding side effects transforms this to `A → T(B)`. Here `T` is the monad, representing in types that "B is returned, but something (an effect) happens in the process."

Different choices for `T` can express various effects:

- `T(B) = B | Error` → computation that might throw exceptions
- `T(B) = State → (B, State)` → computation that modifies state
- `T(B) = List<B>` → non-deterministic computation (multiple possible results)
- `T(B) = IO<B>` → computation that interacts with the outside world

Haskell's `IO` monad is a direct product of this idea. But monads had a fundamental problem: **different monads are hard to compose.** To express "computation that might throw exceptions and also modify state," you'd need to stack monad transformers like `EitherT[StateT[IO, S, _], E, A]`, which breaks type inference and hurts performance.

### Plotkin & Power (2002): Decomposing Monads

Plotkin and Power offered a different perspective. Instead of dealing with monads as wholes, **monads can be decomposed into individual operations**. For example, the State monad decomposes into two operations: `get` and `put`. The Exception monad decomposes into a `raise` operation. They called these operations "algebraic operations." The term "algebraic" comes from the fact that these operations follow certain laws and can be freely combined, just like operations in algebra. Therefore, **algebraic effects** means "side effects that can be decomposed into algebraic operations."

This observation was important because **it solved the composition problem**. While composing monads as wholes is difficult, individual operations can be freely combined. You simply list the operations needed — "this computation uses `get`, `put`, `raise`" — and the set of those operations becomes the effect type for that computation. Instead of stacking monad transformers, you just add another operation to the set when you want to add an operation.

### Plotkin & Pretnar (2009): The Birth of Algebraic Effect Handlers

In 2009, Plotkin and Pretnar published ["Handlers of Algebraic Effects"](https://homepages.inf.ed.ac.uk/gdp/publications/Effect_Handlers.pdf). The core contribution of this paper is the **effect handler concept, which generalizes exception handlers**.

Consider traditional exception handling:

```typescript
try {
  // code that might throw exceptions
  throw new Error('failure')
} catch (e) {
  // handle the exception, but can't return to the original location
}
```

`throw` unwinds the stack. Once an exception occurs, you can't return to the point where it was thrown to continue execution. Plotkin and Pretnar's effect handlers break this constraint. **Handlers receive continuations and can send values back to resume execution from the original location.** This is "resumable exception."

Here, **continuation** refers to "the computation remaining after the interruption point." For example, in `let name = perform Ask; "Hello, " + name`, when `perform Ask` interrupts execution, the remaining computation "take name and return 'Hello, ' + name" is the continuation. The handler can call this continuation with a value to continue execution from the interruption point.

In pseudocode:

```
function getName() {
  // perform: triggers an effect. Similar to throw but can return.
  let name = perform 'askName'
  return "Hello, " + name
}

// handle: processes effects. Similar to catch but can resume.
try {
  getName()
} handle (effect) {
  if (effect === 'askName') {
    resume with "World"  // "World" goes into name in getName() and execution continues
  }
}
// Result: "Hello, World"
```

`perform` passes control to the handler like `throw`, but `resume with` can send a value back to resume execution from the interruption point. This is the crucial difference from `try-catch`.

As Dan Abramov explained in ["Algebraic Effects for the Rest of Us"](https://overreacted.io/algebraic-effects-for-the-rest-of-us/), the key benefit of this mechanism is that **intermediate functions don't need to be aware of effects**. No matter how many functions exist between the code calling `getName()` and the code handling the `askName` effect, the intermediate functions can remain unchanged. There's no "function coloring" problem like with `async/await` where you need to add `async` to all intermediate functions. Function coloring refers to the problem where "functions are divided into two colors (types), and to call a function of one color, the caller must also be the same color." The requirement that calling an `async` function requires the caller to also be `async` is a typical example.

### Real Implementations: Koka, Eff, OCaml 5

This theory has been implemented in several programming languages.

**Koka** (Microsoft Research): A language designed by Daan Leijen with algebraic effects as a core feature. Every function's effects are tracked with row-polymorphic types. Row-polymorphic means "the list of effects can be flexibly extended" — functions list only the effects they use in their types and leave the rest open. For example, `fun foo(): <exn, io> int` means "this function can throw exceptions (`exn`), performs I/O (`io`), and returns `int`." These effect types compose freely without monad transformer stacks.

**OCaml 5**: Released in 2022, OCaml 5 added effect handlers to the language alongside multicore support. Effects are triggered with `perform` and handlers use `continue k value` to resume continuations. However, it only supports single-shot continuations — once you resume a continuation, you can't use the same continuation again. This constraint makes interactions with mutable data predictable and performance good.

The same behavior as the pseudocode above, written in OCaml 5 syntax:

```ocaml
(* Declare that there's an Ask effect that returns a string *)
effect Ask : string

(* greet function: triggers Ask effect and creates greeting with returned value *)
let greet () =
  let name = perform Ask in  (* perform = same as perform in pseudocode *)
  "Hello, " ^ name            (* ^ is string concatenation operator *)

(* handler: execute greet() but when Ask effect occurs, send back "World" *)
let result =
  match_with greet ()
  { effc = fun (type a) (eff : a Effect.t) ->
      match eff with
      | Ask -> Some (fun (k : (a, _) continuation) ->
          continue k "World")  (* continue = resume with in pseudocode *)
      | _ -> None }
(* result = "Hello, World" *)
```

When `perform Ask` executes, control passes to the handler, and when the handler calls `continue k "World"`, `"World"` is sent back to be assigned to `name` and execution resumes.

What these implementations share is that **the language runtime supports continuations**. When `perform` is called, the runtime captures the current execution state (continuation) and allows handlers to resume it. This mechanism cannot be implemented without language-level support.

## Effect-TS Is Not Algebraic Effects

An important distinction needs to be made here. **Effect-TS does not implement algebraic effects.** It simulates effect tracking based on monads.

### Fundamental Differences

| Aspect | Real Algebraic Effects (Koka, OCaml 5) | Effect-TS |
| --- | --- | --- |
| Base mechanism | Runtime continuation capture | Monad `flatMap` chaining |
| Effect occurrence | `perform` (handled by runtime) | `Effect.fail`, `yield*` (type-level tracking) |
| Handler resumption | Can resume continuations | Impossible — can only catch or transform errors |
| Function coloring | None — effects can occur in regular functions | Yes — effectful functions must return `Effect<A, E, R>` |
| Impact on intermediate functions | No changes needed | All intermediate functions must participate in Effect chain |

The biggest difference is **resumption is impossible**. Algebraic effect handlers can send values back to the point where effects occurred to resume execution. In Effect-TS, this is impossible. You can catch errors with `catchTag` and replace them with other values, but you cannot return to the exact point where the error occurred to continue execution.

The **function coloring** problem also exists. Just as in `async/await` where calling an `async` function requires the caller to also be `async`, in Effect-TS, calling a function that returns `Effect<A, E, R>` requires the caller to also be within an Effect chain.

```typescript
// Effect-TS: function coloring exists
const getUser = (id: string): Effect.Effect<User, NotFoundError> => /* ... */

// To call this function, the caller must also be inside an Effect
const program = Effect.gen(function* () {
  const user = yield* getUser('123')  // Can only be called within Effect chain
  return user.name
})

// Can't directly call from regular functions
function getName(id: string): string {
  const user = getUser(id) // ← This is an Effect object, not User
  return user.name         // Type error
}
```

### Why Monad-Based?

TypeScript (JavaScript) lacks the runtime features needed to implement algebraic effects. There's no mechanism in the language to capture the current execution state (continuation) when `perform` is called and resume it later.

JavaScript's Generators (`function*`) do provide some continuation-like functionality. You can interrupt execution with `yield` and resume with `.next(value)`. But Generators are only single-frame continuations — they can't capture the entire call stack. You can't `yield` from within a regular function called inside a Generator. This is exactly what causes "function coloring."

Effect-TS makes the most of these constraints. It chains computations with `flatMap` (an operation that takes the result of a previous computation and returns the next computation — same principle as `Array.flatMap` but chaining Effects instead of arrays) and tracks success values, errors, and dependencies with the three parameters of `Effect<A, E, R>`. While it's not the perform/handle/resume mechanism of algebraic effects, it shares the core idea of **tracking "what effects does this computation have" at the type level**.

## From ZIO to Effect-TS: Evolution of the Monad-Based Approach

If algebraic effects require language runtime support, what can we do in languages without that support? Scala's ZIO provided an answer first, and Effect-TS brought that answer to TypeScript.

### ZIO's Design Decisions

In 2018, John De Goes in the Scala ecosystem hit the practical limits of monad transformers. Type stacks like `EitherT[Future, Error, A]` broke inference and were hard to explain to regular developers.

De Goes's solution was **a single monad with three type parameters**: `ZIO[R, E, A]`.

```scala
// R = required environment (dependencies), E = failure type, A = success type
ZIO[UserRepository, NotFoundError, User]
```

Instead of monad transformer stacks, he packed three concerns into one type:

- **A (success)**: the value returned if computation succeeds
- **E (error)**: possible errors — not fixed to `Throwable` but generic. What errors are possible is tracked at compile time.
- **R (environment)**: services needed to execute this computation. Uses contravariance so the compiler automatically unions dependencies of multiple effects. Contravariance is a type theory property where "types on the consuming side become unions when combined." Since `R` is the dependency that effects "require (consume)," composing two effects automatically makes `R` become `R1 | R2`.

They also abandoned Haskell conventions. `ZIO.succeed` instead of `pure`, `for` comprehension instead of `>>=` (Scala's equivalent of `async/await` syntax). The goal was "a library you can use without knowing monads" rather than "a library you need to know monads to use."

### The Failed TS+ Compiler Fork

During Effect-TS's process of porting ZIO to TypeScript, there was an attempt at an experimental TypeScript compiler fork called TS+ (ts-plus). It was a project to add pipe operators, operator overloading, enhanced Do syntax, and more to TypeScript.

The failure was both technical and ecosystem-related.

**tsc Architecture Limitations**: Modern build tools (Next.js, Vite, esbuild) achieve speed through parallel compilation. The TypeScript compiler's single-threaded architecture doesn't fit this paradigm, and the TS+ fork actually made development speed worse in HMR environments.

**Conflicts with Tool Ecosystem**: While compatibility with tools like ESLint and Prettier was maintained, it couldn't integrate into build pipelines of Next.js or Vite. The cost of introducing a custom compiler overwhelmed the convenience gained.

The lesson learned was clear: **Don't touch the compiler; solve it with pure libraries.** Current Effect-TS works with TypeScript's type system alone, without any separate compiler or build tools.

### Effect-TS's `Effect<A, E, R>`

Effect-TS redesigned ZIO's `ZIO[R, E, A]` for TypeScript. The parameter order changed to `Effect<A, E, R>` (success type first) because of TypeScript's generic default syntax. Setting defaults for `E` and `R` to `never` allows simple effects without errors or dependencies to be written concisely as `Effect<number>`.

```typescript
import {Effect, Data, Context} from 'effect'

// Error definition — uses _tag field to construct discriminated union
class NotFoundError extends Data.TaggedError('NotFoundError')<{
  readonly id: string
}> {}

class NetworkError extends Data.TaggedError('NetworkError')<{
  readonly cause: unknown
}> {}

// Service interface definition
class UserRepository extends Context.Tag('UserRepository')<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User, NotFoundError>
  }
>() {}

// This function's type says everything:
// "Needs UserRepository, NotFoundError or NetworkError can occur, returns User on success"
const getUser = (
  id: string,
): Effect.Effect<User, NotFoundError | NetworkError, UserRepository> =>
  Effect.gen(function* () {
    const repo = yield* UserRepository
    return yield* repo.findById(id)
  })
```

## Inside Effect.gen: Implementing do-notation with Generators

`Effect.gen` is the most frequently used API in Effect-TS. It lets you write code that looks like `async/await`, but internally uses quite an interesting trick.

### Why `yield*`?

There's a reason it uses `yield*` instead of `yield`. JavaScript's `yield*` is an operator for **delegation** to other iterables/generators. Unlike `yield` which passes a single value to the outside, `yield*` propagates all `yield`s from an inner generator to the outside and **can receive the inner generator's return value as the result of the expression**.

```typescript
function* inner() {
  yield 1
  yield 2
  return 42 // ← This value becomes the result of yield*
}

function* outer() {
  const result = yield* inner()
  // result === 42
}
```

Effect-TS leverages this mechanism. Every `Effect` object implements `Symbol.iterator` so it can be the target of `yield*`. The key is that the Effect's iterator implementation has the structure of **`yield`ing itself, then `return`ing the injected value**.

```typescript
// Simplified structure of Effect object's Symbol.iterator implementation
class EffectImpl<A, E, R> {
  *[Symbol.iterator]() {
    // 1. yield self (Effect object) → passed to gen runtime
    // 2. runtime executes this Effect then injects result via .next(result)
    // 3. return the injected value → becomes the result of yield*
    return (yield this) as A
  }
}
```

When `yield* getUser(id)` executes, this happens:

1. The `[Symbol.iterator]()` of the Effect object returned by `getUser(id)` is called.
2. The inner generator executes `yield this` — the Effect object itself is passed to the `Effect.gen` runtime.
3. The runtime executes this Effect and injects the result via `.next(result)` into the inner generator.
4. The inner generator does `return result` — this value becomes the evaluation result of `yield*` and goes into `const user`.

Ultimately, through the three steps of `yield this` → `.next(result)` → `return result`, the "execution" and "result injection" of the Effect object happen cleanly within the generator protocol. The `Effect.gen` runtime is a loop that repeats this process.

```typescript
// Simplified core loop of Effect.gen runtime
function runGen(genFn) {
  const gen = genFn()
  let result = gen.next()

  while (!result.done) {
    const effect = result.value  // yielded Effect object
    const value = runEffect(effect)  // execute Effect
    result = gen.next(value)  // inject result into generator, proceed to next yield
  }

  return result.value  // generator's return value = final success value
}
```

In code, it looks like you're synchronously extracting values, but actually the runtime is running a loop that receives Effects one by one through the generator protocol, executes them, and returns results.

### The Core of Type Inference

When `yield*` passes Effect objects to the runtime, the error type (`E`) and dependency type (`R`) information of each Effect is also propagated. `Effect.gen` collects the `E` and `R` of all Effects `yield*`ed within the generator and automatically infers the final Effect's error and dependency types. The generator's return value becomes the final Effect's success type `A`.

As a result, the entire pipeline's types are accurately inferred without separate type annotations.

### Constraint: Single-Shot

This approach has an important constraint. JavaScript Generators **can only be traversed once**. Once an iterator progresses, it cannot be rewound. Because of this, Effect.gen can only be used for single-shot effects (Effects that return one result), not multi-shot effects like Stream. To handle Streams, you must use `pipe` and dedicated operators.

## Problems Effect-TS Attempts to Solve

Now that we've looked at the theoretical background, let's specifically examine what problems Effect-TS solves in practice. These are the problems repeatedly encountered in Promise-based code that motivate Effect-TS's design.

### Loss of Error Types

Promise errors are `unknown`. You can't know the error type in `catch` blocks, and what errors might occur doesn't show up in function signatures.

```typescript
// Promise: no information about what errors occur in the type
async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`)
  if (res.status === 404) throw new NotFoundError(id)
  if (!res.ok) throw new NetworkError(res.statusText)
  return res.json()
}

// Caller can't know what errors to handle
try {
  const user = await getUser('123')
} catch (e) {
  // e is unknown — NotFoundError? NetworkError? TypeError?
}
```

Since errors are `unknown`, the entire team depends on implicit contracts about "this function throws these errors." When code changes, contracts change too, but the compiler doesn't tell you.

### Implicit Dependencies

What external services a function depends on doesn't appear in its signature.

```typescript
// This function depends on DB, Redis, Logger but it's not in the signature
async function processOrder(order: Order): Promise<void> {
  const user = await db.findUser(order.userId) // DB dependency
  await redis.set(`order:${order.id}`, order) // Redis dependency
  logger.info('Order processed', {orderId: order.id}) // Logger dependency
  await emailService.send(user.email, 'Order confirmed') // Email dependency
}
```

To call this function in tests, you need to mock `db`, `redis`, `logger`, and `emailService`, but you can't tell what needs mocking just from the function signature. You have to read the function body.

### Resource Leaks

Resources like database connections and file handles must be released. This is handled with `try-finally`, but when multiple resources are nested, boilerplate explodes.

```typescript
// As resources increase, try-finally nesting gets deeper
const conn = await pool.connect()
try {
  const file = await fs.open('/tmp/export.csv', 'w')
  try {
    await exportData(conn, file)
  } finally {
    await file.close()
  }
} finally {
  conn.release()
}
```

There's also the problem where if errors occur inside `finally`, the original error gets swallowed.

### Difficult Concurrency Management

You can execute in parallel with `Promise.all`, but canceling the rest when one fails must be implemented manually. Code that manually manages `AbortController` is hard to read and easy to miss.

Effect-TS solves these four problems with the single type `Effect<A, E, R>`. Now let's look at how it solves each one specifically.

## Core Features of Effect-TS

Now that we've seen the problems Effect-TS attempts to solve, let's examine how it actually solves them one by one. Error handling, dependency injection, resource management, concurrency — focusing on why each feature is designed the way it is.

### pipe and Effect.gen: Two Code Styles

There are two main ways to write code in Effect-TS.

**pipe style**: Based on function composition. Concise when data transformation is the main logic.

```typescript
import {Effect, pipe} from 'effect'

const program = pipe(
  Effect.succeed(5),
  Effect.map((n) => n * 2),
  Effect.flatMap((n) => (n > 0 ? Effect.succeed(n) : Effect.fail('negative'))),
  Effect.catchAll((e) => Effect.succeed(0)),
)
```

**gen style**: Similar to `async/await` form. Good readability for complex logic needing branching, loops, and intermediate variables.

```typescript
const program = Effect.gen(function* () {
  const n = yield* Effect.succeed(5)
  const doubled = n * 2
  if (doubled <= 0) {
    return yield* Effect.fail('negative')
  }
  return doubled
})
```

The two styles can be mixed. In practice, it's common to write business logic with `Effect.gen` and attach cross-cutting concerns like error handling or retries with `pipe`.

```typescript
const handled = pipe(
  getUser('123'),
  Effect.retry(Schedule.exponential('100 millis')),
  Effect.catchTag('NotFoundError', () => Effect.succeed(defaultUser)),
  Effect.timeout('5 seconds'),
)
```

### Structured Errors: Expected Errors and Defects

Effect distinguishes between two kinds of errors. This distinction isn't just convention but is built into the type system.

**Expected Error** (`E` channel): Business errors created with `Effect.fail`. Predictable failures like "user not found" or "payment failed" are tracked at the type level.

**Defect**: Created with `Effect.die` or uncaught exceptions. Programming bugs like division by zero or null references. They don't appear in the `E` type and terminate the program by default. This is similar to the distinction between Java's checked vs unchecked exceptions, but thanks to union types, the "declaration bloat" problem of checked exceptions doesn't occur.

Error definitions use `Data.TaggedError`. The `_tag` field is automatically added to construct a discriminated union (a pattern where types are distinguished by the value of a common field).

```typescript
import {Data} from 'effect'

class NotFoundError extends Data.TaggedError('NotFoundError')<{
  readonly id: string
}> {}

class NetworkError extends Data.TaggedError('NetworkError')<{
  readonly cause: unknown
}> {}

class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly field: string
  readonly message: string
}> {}
```

The core of error handling is `catchTag` and `catchTags`. When you selectively handle specific errors, the handled errors are removed from the type.

```typescript
// getUser type: Effect<User, NotFoundError | NetworkError | ValidationError>

// catchTag: handle one specific error
const withFallback = pipe(
  getUser('123'),
  Effect.catchTag('NotFoundError', (e) => Effect.succeed(defaultUser)),
)
// Type: Effect<User, NetworkError | ValidationError>
// Only NotFoundError was handled, so the remaining errors stay

// catchTags: handle multiple errors at once
const withAllHandled = pipe(
  getUser('123'),
  Effect.catchTags({
    NotFoundError: (e) => Effect.succeed(defaultUser),
    NetworkError: () => Effect.retry(getUser('123'), Schedule.recurs(3)),
    ValidationError: (e) => Effect.fail(new BadRequestError({field: e.field})),
  }),
)
// Type: Effect<User, BadRequestError>
// All three original errors were handled and transformed into one new error
```

You can also transform errors with `mapError`. A typical pattern is wrapping detailed errors from lower modules into abstract errors for upper modules.

```typescript
// Transform detailed errors from lower module into upper module errors
const getOrder = (id: string) =>
  pipe(
    getOrderFromDb(id), // Effect<Order, DbConnectionError | DbQueryError>
    Effect.mapError((e) => new OrderServiceError({cause: e})),
  )
// Type: Effect<Order, OrderServiceError>
```

### Layer and Dependency Injection

The `R` parameter declares at the type level "what is needed to execute this computation." `Layer` is what actually provides dependencies.

Let's look at the complete flow from service definition to injection.

```typescript
import {Effect, Context, Layer} from 'effect'

// 1. Define service interface
class UserRepository extends Context.Tag('UserRepository')<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User, NotFoundError>
    readonly save: (user: User) => Effect.Effect<void, DbError>
  }
>() {}

class EmailService extends Context.Tag('EmailService')<
  EmailService,
  {
    readonly send: (to: string, body: string) => Effect.Effect<void, EmailError>
  }
>() {}
```

```typescript
// 2. Use services — reference only interfaces without knowing implementations
const registerUser = (input: RegisterInput) =>
  Effect.gen(function* () {
    const repo = yield* UserRepository
    const email = yield* EmailService

    const user = createUser(input)
    yield* repo.save(user)
    yield* email.send(user.email, 'Welcome!')
    return user
  })
// Type: Effect<User, NotFoundError | DbError | EmailError, UserRepository | EmailService>
// UserRepository | EmailService is automatically inferred in R
```

```typescript
// 3. Implement services — define as Layers
const UserRepositoryLive = Layer.succeed(UserRepository, {
  findById: (id) =>
    Effect.gen(function* () {
      const result = yield* queryDb(`SELECT * FROM users WHERE id = $1`, [id])
      if (!result) return yield* Effect.fail(new NotFoundError({id}))
      return result
    }),
  save: (user) => queryDb(`INSERT INTO users ...`, [user]),
})

const EmailServiceLive = Layer.succeed(EmailService, {
  send: (to, body) =>
    Effect.tryPromise({
      try: () => sendgrid.send({to, body}),
      catch: (e) => new EmailError({cause: e}),
    }),
})
```

```typescript
// 4. Compose Layers and run program
const AppLayer = Layer.mergeAll(UserRepositoryLive, EmailServiceLive)

Effect.runPromise(
  registerUser({name: 'Alice', email: 'alice@example.com'}).pipe(
    Effect.provide(AppLayer),
  ),
)
```

**Layer Memoization**: An important property of Layers is **reference equality-based memoization**. When the same Layer instance is referenced in multiple places in the dependency graph, it's created only once and shared.

```typescript
// Define DatabaseLayer once at module level
const DatabaseLayer = Layer.scoped(
  Database,
  Effect.acquireRelease(connectToDatabase(), (conn) =>
    Effect.sync(() => conn.close()),
  ),
)

// Even if both UserRepositoryLayer and OrderRepositoryLayer depend on DatabaseLayer
// the database connection is created only once
const AppLayer = Layer.mergeAll(UserRepositoryLayer, OrderRepositoryLayer).pipe(
  Layer.provide(DatabaseLayer),
)
```

This is the same behavior as singleton scope in DI containers. Note that since it's "reference equality," calling `makeDbLayer()` twice creates different instances that are each created separately.

**Replacement in Tests**: The real advantage of Layer-based DI shows up in tests.

```typescript
// Test Layers — pure functions without real DB, Email
const UserRepositoryTest = Layer.succeed(UserRepository, {
  findById: (id) =>
    id === '1'
      ? Effect.succeed({id: '1', name: 'Test', email: 'test@test.com'})
      : Effect.fail(new NotFoundError({id})),
  save: () => Effect.void,
})

const EmailServiceTest = Layer.succeed(EmailService, {send: () => Effect.void})

const TestLayer = Layer.mergeAll(UserRepositoryTest, EmailServiceTest)

// Same business logic, different dependencies
const result = await Effect.runPromise(
  registerUser(input).pipe(Effect.provide(TestLayer)),
)
```

### Resource Management: acquireRelease and Scope

Resources (database connections, file handles, network sockets, etc.) must be released. Effect solves the nesting problem of `try-finally` with `acquireRelease`.

```typescript
import {Effect} from 'effect'

// Define acquire and release as a pair
const withDbConnection = Effect.acquireRelease(
  connectToDatabase(), // acquire
  (conn) => Effect.sync(() => conn.close()), // release — always executed
)

// Usage: manage resource lifetime with Effect.scoped
const program = Effect.scoped(
  Effect.gen(function* () {
    const conn = yield* withDbConnection
    const data = yield* queryDb(conn, 'SELECT ...')
    return data
  }),
)
// conn.close() is automatically called whether success or failure
```

With multiple nested resources, they're released in LIFO (last-in-first-out) order. You can write linearly without `try-finally` nesting.

```typescript
const program = Effect.scoped(
  Effect.gen(function* () {
    const conn = yield* withDbConnection // 1st acquire
    const file = yield* withFileHandle // 2nd acquire
    const lock = yield* withDistributedLock // 3rd acquire

    yield* exportData(conn, file)
    // Release order: lock → file → conn (LIFO)
  }),
)
```

### Structured Concurrency and Fibers

Effect's concurrency is **Fiber-based** and **structured**. Fibers are much lighter "virtual execution units" than OS threads. Multiple fibers are cooperatively scheduled on one thread, so running thousands simultaneously isn't burdensome. It's similar to Go's goroutines or Kotlin's coroutines. "Structured" means there are parent-child relationships. When a parent effect terminates, child fibers are automatically cleaned up, preventing "forgotten fibers" from floating around.

```typescript
import {Effect, Fiber} from 'effect'

// Effect.all: execute multiple effects in parallel
const [user, orders, notifications] =
  yield *
  Effect.all([getUser(id), getOrders(id), getNotifications(id)], {
    concurrency: 'unbounded',
  })
// If one fails, the rest are automatically interrupted

// You can also limit concurrent executions with the concurrency option
const results =
  yield *
  Effect.all(urls.map(fetchUrl), {
    concurrency: 5, // execute at most 5 in parallel
  })
```

For more fine-grained control, manage fibers directly with `fork`.

```typescript
const program = Effect.gen(function* () {
  // fork: run in background, returns Fiber handle
  const fiber = yield* Effect.fork(longRunningTask)

  // Do other work while...
  yield* doSomethingElse()

  // Get result or cancel when needed
  const result = yield* Fiber.join(fiber) // wait for completion
  // or
  yield* Fiber.interrupt(fiber) // cancel
})
```

### Schedule: Declarative Retry Policies

Retry policies are expressed with the `Schedule` abstraction. Since Schedule is an independent value, you can combine them to create complex policies.

```typescript
import {Effect, Schedule} from 'effect'

// Basic schedules
Schedule.recurs(3) // retry at most 3 times
Schedule.spaced('1 second') // repeat at 1-second intervals
Schedule.exponential('100 millis') // exponential backoff: 100ms → 200ms → 400ms → ...

// Apply retry policy to effects
const resilientFetch = pipe(
  fetchData(url),
  Effect.retry(
    Schedule.exponential('100 millis').pipe(
      Schedule.intersect(Schedule.recurs(3)),
    ),
  ),
)
```

The three combination methods of Schedule each have different semantics.

```typescript
// intersect: proceed only if both schedules "continue". Use longer delay.
// → "retry with exponential backoff, but at most 3 times"
Schedule.exponential('100 millis').pipe(Schedule.intersect(Schedule.recurs(3)))
// 100ms → 200ms → 400ms → stop

// union: proceed if either schedule "continues". Use shorter delay.
// → "continue retrying every 1 second even after 3 retries"
Schedule.recurs(3).pipe(Schedule.union(Schedule.spaced('1 second')))

// andThen: switch to second after finishing first.
// → "first 3 times quickly, then slowly"
Schedule.recurs(3).pipe(Schedule.andThen(Schedule.spaced('5 seconds')))
```

`intersect` is intersection (both must agree to continue), and `union` is union (continue if either agrees).

### Schema: Type Safety at External Boundaries

The `Schema` module in the Effect ecosystem plays a role similar to [Zod](https://npmx.dev/package/zod), but is deeply integrated with Effect pipelines. The key difference is **first-class support for bidirectional transformation (encode/decode)**.

```typescript
import {Schema} from 'effect'

const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  age: Schema.Number.pipe(Schema.between(0, 150)),
  createdAt: Schema.DateFromString, // bidirectional string ↔ Date transformation
})

// Automatic TypeScript type extraction
type User = typeof User.Type
// { id: string; name: string; age: number; createdAt: Date }

// decode: external data → internal type (with validation)
const parseUser = Schema.decodeUnknown(User)
// encode: internal type → external data (serialization)
const serializeUser = Schema.encode(User)
```

While Zod focuses on "parsing external data," Schema aims for "defining parsing and serialization with one schema." Looking at the `createdAt` field, during decode it converts `"2024-01-01"` string to `Date` object, and during encode it converts `Date` object back to string. You can use the same schema for API response parsing and API request serialization.

Since `Schema.decodeUnknown` returns an `Effect` type, error handling naturally joins the Effect pipeline.

```typescript
const handleRequest = (raw: unknown) =>
  Effect.gen(function* () {
    // ParseError is automatically added to E channel when parsing fails
    const user = yield* Schema.decodeUnknown(User)(raw)
    return yield* processUser(user)
  })
```

### Interoperability with Promise Ecosystem

Effect-TS is designed with interoperability with existing Promise-based code in mind. You can convert between Effect and Promise at boundaries.

```typescript
// Promise → Effect: bring existing libraries into Effect world
const fetchUser = (id: string) =>
  Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`).then((r) => r.json()),
    catch: (e) => new NetworkError({cause: e}),
  })
// Type: Effect<unknown, NetworkError>
// You can specify error type with catch

// Effect → Promise: exit Effect world
const main = async () => {
  const user = await Effect.runPromise(program)
  // Or receive errors as Exit for direct handling
  const exit = await Effect.runPromiseExit(program)
}
```

Thanks to these boundary APIs, you can gradually introduce Effect into existing codebases. Write only the internal logic of existing Express handlers with Effect, and convert at handler entry/exit with `Effect.tryPromise` and `Effect.runPromise`.

## Comparison with Promise: What You Gain, What You Lose

What Effect gains compared to Promise can be summarized like this:

| Aspect | Promise | Effect |
| --- | --- | --- |
| Error types | `unknown` (untrackable) | Generic `E` (compile-time tracking) |
| Dependencies | Implicit (imports, global state) | Explicit `R` parameter |
| Execution timing | Execute immediately on creation (eager) | Execute when instructed (lazy) |
| Cancellation | AbortController (manual) | Structured concurrency (automatic) |
| Resource management | try-finally (manual) | acquireRelease (automatic) |
| Retry | Direct implementation | Schedule (declarative) |

**Lazy evaluation** is particularly important. Promises execute immediately upon creation, but Effects are just "execution plans." This property allows effects to be freely composed, retried, and scheduled.

But there are also things you lose:

**Learning curve**: You need to learn all the concepts of `pipe`, `Effect.gen`, `Layer`, `Context.Tag`, `Schema`, etc. The cost of the entire team agreeing on and learning this paradigm is significant.

**Function coloring**: As explained earlier, all effectful functions must return `Effect` types. While you can gradually introduce it to existing codebases (by wrapping Promises with `Effect.tryPromise` and extracting them again with `Effect.runPromise`), there's always a boundary between Effect and non-Effect areas.

**Ecosystem size**: Most libraries on npm are Promise-based. Boilerplate is needed to wrap them in Effect.

Honestly, this trade-off is justified when **system complexity exceeds a certain level**. For simple CRUD APIs, Promise and `try-catch` are sufficient. But for systems that communicate with multiple external services, need complex error recovery logic, and have deep dependency graphs, the benefits of "errors tracked by types, dependencies made explicit, resources automatically managed" outweigh the learning costs.

## Conclusion

The idea of "tracking side effects with types" started with Moggi's monads (1991), was refined through Plotkin and Pretnar's algebraic effect handlers (2009), and was implemented at the language level in Koka and OCaml 5.

Effect-TS is at the end of this lineage but made an important choice: **it's monad-based simulation, not real algebraic effects**. Since the TypeScript runtime doesn't support continuations, it tracks effects with `flatMap` chaining and `Effect<A, E, R>` type parameters instead of perform/handle/resume. Function coloring problems exist and resumable exceptions are impossible.

Nevertheless, Effect-TS is valuable because **it shows the maximum achievable with TypeScript's type system alone**. Errors are tracked by types, dependencies are verified at compile time, and resource lifecycles are automatically managed. The practical direction of "pure library, compatible with existing tools" after the TS+ compiler fork failure was also a wise decision.

So is it worth adopting in practice? Honestly, **it's overkill for most projects**. For typical React/Next.js-based frontend apps or simple CRUD APIs, `try-catch` and Promise are sufficient. If you need error type tracking, lightweight Result type libraries like [`neverthrow`](https://npmx.dev/package/neverthrow) solve 80% of the problem, and if you need DI, NestJS's DI or [`tsyringe`](https://npmx.dev/package/tsyringe) are sufficient. Effect-TS has a steep learning curve, and the cost of the entire team agreeing on and learning this paradigm is never small.

Effect-TS shows its true value when **system complexity exceeds a certain level**. For backend systems that need to orchestrate multiple external services (DB, Redis, message queues, external APIs), where error recovery logic is core to the business (payments, order processing, etc.), and dependency graphs are deep — the benefits of integrating error tracking, DI, resource management, and retry policies into one consistent system can outweigh the learning costs. Ultimately, the criterion is **whether "tracking errors by types, dependencies by types, resources by types" is really necessary for our project**.

Meanwhile, it's worth watching the evolution of the JavaScript language itself. The `using` declaration (Explicit Resource Management) already has its synchronous version included in the standard as Stage 4 (supported by TypeScript since 5.2), and pattern matching proposals are also in progress. As language-level support increases, the areas that libraries like Effect-TS need to solve directly will shrink. Effect-TS is a great technical achievement, but it's not the answer for every project. The value of a tool is proportional to the size of the problems it solves.

## References

- [Notions of Computation and Monads - Moggi (1991)](https://www.cs.cmu.edu/~crary/819-f09/Moggi91.pdf)
- [Handlers of Algebraic Effects - Plotkin & Pretnar (2009)](https://homepages.inf.ed.ac.uk/gdp/publications/Effect_Handlers.pdf)
- [Algebraic Effects for the Rest of Us - Dan Abramov](https://overreacted.io/algebraic-effects-for-the-rest-of-us/)
- [OCaml 5 Effect Handlers](https://ocaml.org/manual/5.4/effects.html)
- [Algebraic Effects for Functional Programming - Koka (Daan Leijen)](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/08/algeff-tr-2016-v2.pdf)
- [ZIO History - John De Goes](https://degoes.net/articles/zio-history)
- [TS+ Postmortem](https://effect.website/blog/ts-plus-postmortem/)
- [Effect Official Documentation](https://effect.website/docs/getting-started/introduction/)
- [Effect Patterns Hub](https://github.com/PaulJPhilp/EffectPatterns)
- [Exploring Effect in TypeScript - Tweag](https://www.tweag.io/blog/2024-11-07-typescript-effect/)