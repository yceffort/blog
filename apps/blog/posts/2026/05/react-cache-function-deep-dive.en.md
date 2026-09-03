---
title: 'React <em>cache()</em> Deep Dive: Request-Scoped Memoization, Read from the Source'
tags:
  - react
  - react-server-components
  - memoization
  - performance
  - frontend
published: true
date: 2026-05-30 14:00:00
description: "Every odd rule of React's cache() falls straight out of a ~30-line implementation. We trace the dispatcher, getCacheForType, and the WeakMap/Map tree at the source level to see exactly how request-scoped memoization works."
thumbnail: /thumbnails/2026/05/react-cache-function-deep-dive.png
art:
  layout: codePanel
  hue: violet
  tone: dark
  hero: 'getCacheForType'
---

## Table of Contents

## Introduction

`cache()` is an API that shipped as stable in React 19[^1]. Yet the moment you use it, your intuition keeps missing. You wrap a DB query and it still runs twice; you move the same code into a Client Component and nothing happens; you switch an argument to an object and the cache stops working entirely. The official docs list a whole bundle of rules — "Server Components only," "won't use the cache when called outside a component," "wrap it once at module scope," "the cache is invalidated on every request" — but they never tell you _why_.

You can use it fine if you memorize all the rules. But you don't have to. Every one of these rules is just **a mechanical consequence of one small implementation**. `cache()` in `ReactCacheImpl.js` is a single guard line that checks whether a dispatcher exists, a loop that descends a data structure one level per argument, and one line that stores the return value by reference — that's essentially all of it. Once you read these ~30 lines, the rules above answer their own "why" all at once.

So this post follows the **implementation**, not the usage, of `cache()`. Reading `facebook/react`'s `ReactCacheImpl.js`[^2] and the Flight server's per-request cache store[^5] directly, we explain at the source level why it's RSC-only, why it doesn't work outside a component, why object arguments are dangerous, and why a failed fetch isn't retried.

> One thing before we start. The subject of this post is the **`cache()` function you import from `react`**. It is a completely different thing from Next.js's **`'use cache'` directive**. The names are similar enough to get confused often; that difference is covered separately in the [`'use cache'` directive deep dive](/2026/05/use-cache-deep-dive). The boundary between the two is laid out clearly in the section right after [The Short Version](#the-short-version) below.
>
> Source analysis is based on `facebook/react`'s **`v19.2.6` tag** (the latest stable at the time of writing). `main` changes over time, so I cite a fixed tag, and every GitHub link in this post points to that tag. For reference, `cache()` has been in stable since React 19.0.0, and `cacheSignal()` (which appears later) since 19.2.0.

## The Short Version

Before diving into the internals, here's the summary. Even if you read no further, this much is worth keeping.

- `cache()` is memoization that works **only within a single server request (render pass)**. When the request ends, the cache is discarded, and it is never shared across requests or users. It is not a persistent cache.
- Whether memoization happens is decided by **the existence of `ReactSharedInternals.A` (the AsyncDispatcher)**. If it's `null` (client, or outside a component), caching is skipped entirely and the function just runs. The two rules "RSC only" and "doesn't work outside a component" are literally this one line.
- The cache is **a tree built from the function reference and the arguments**. Object/function arguments go into a `WeakMap` keyed by reference; primitives go into a `Map` keyed by value. That's why passing a fresh object every render is always a miss.
- The return value is stored **by reference, as-is**. For an async function, the very same Promise object is cached, so `await`s all over the tree share one in-flight request. This is the mechanism behind request deduplication and the `preload` pattern.
- Error caching is **asymmetric**. Only a synchronous `throw` is stored as the `ERRORED` state; an async function's rejection is stored as the rejected promise (a value). Either way, **there is no retry within the same request.**

The body is the evidence for each item.

## cache() Is Neither 'use cache' Nor useMemo

The first thing to clear up is the confusion of names. As server caching tools poured out all at once, `cache()`, `'use cache'`, `unstable_cache`, fetch memoization, and `useMemo` all blur together in your head. By results alone they look similar — "same input, same output, the second call is fast." But their **scope and persistence** are all different.

| Tool                    | Runtime / Scope                         | Key                                  | Persistence                                     |
| ----------------------- | --------------------------------------- | ------------------------------------ | ----------------------------------------------- |
| `useMemo(fn, deps)`     | Client, component instance              | reference equality of the deps array | non-persistent (gone on rerender/unmount)       |
| **`cache(fn)`**         | **Server (RSC), single request render** | **fn reference + argument identity** | **non-persistent (gone when the request ends)** |
| `fetch()` memoization   | Server (RSC), single request render     | URL + options                        | non-persistent (render-scoped)                  |
| fetch Data Cache        | Server, across requests                 | URL + options + tags                 | persistent (revalidate / tag)                   |
| `unstable_cache`        | Server, across requests                 | keyParts + arguments                 | persistent                                      |
| `'use cache'` directive | Server, across requests                 | buildId + fnId + serialized args     | persistent (host-dependent)                     |
| React Query / SWR       | Client                                  | query key                            | persistent for the session                      |

The key boundary is the bolded row. `cache()` belongs to the upper group (request-scoped, non-persistent), while `'use cache'` / `unstable_cache` / Data Cache belong to the lower group (persistent caches that cross requests).

This difference is exactly why you must not mix them up. `'use cache'` **serializes** the result into a key-value store and reuses it even after the request ends — even on the next request. That's why its arguments must be serializable and why it can't read `cookies()` directly. `cache()`, by contrast, holds the result **as a raw JavaScript reference** in memory and throws it away when the request ends. With no serialization, it can cache anything — a Promise, a class instance, whatever. But it can't take a single step outside the request.

> In one sentence: **`'use cache'` is "a store that crosses requests," `cache()` is "a memo that lives for one request," and `useMemo` is "a memo that lives for one component."** The names are similar; the lifetimes are completely different.

Now let's look at exactly how `cache()` "lives for one request," through the implementation. The starting point is the dispatcher.

## The Dispatcher Decides Everything

Look at the first line of the function `cache(fn)` returns.

```js
export function cache(fn) {
  return function () {
    const dispatcher = ReactSharedInternals.A
    if (!dispatcher) {
      // No dispatcher means we treat this as not cached.
      return fn.apply(null, arguments)
    }
    // ... actual caching starts here ...
  }
}
```

`ReactSharedInternals` is the shared communication channel between the React packages (`react`, `react-dom`, `react-reconciler`, `react-server`). These are separately published packages that can't import each other's internals directly, so `react` exposes one mutable object and the rest read and write it. Inside it, the "current dispatchers" that change during a render are held in single-letter slots — `H` is the Hooks dispatcher (the path `useState` and friends take), `T` is the transition config, and the one we care about, **`A`, is the AsyncDispatcher**[^4]. As the slot comment says verbatim, it points to `ReactCurrentCache`, i.e. the "current cache."

This object is the one that used to be exposed under the notorious name `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` (literally, "or you will be fired"). In React 19, through a series of internal-cleanup PRs, [that name became the less dramatic `__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE`](https://github.com/facebook/react/pull/28789), but the "don't touch this" intent is the same.

This dispatcher is populated **only while React is rendering RSC on the server**. The Flight server runtime plugs its own dispatcher into `A` when a render starts and clears it when the render ends. In every other situation — the client bundle, module-top-level code outside a component, ordinary event handlers — `A` is `null`.

So this one line, `if (!dispatcher) return fn.apply(null, arguments)`, is the identity of the two pitfalls the official docs mention.

- **"cache is for use in Server Components only."** There is no dispatcher on the client, so caching is skipped.
- **"Calling a memoized function outside of a component will not use the cache."** Called outside a component, you're not in a render context, so there's no dispatcher and it skips again.

Neither is an error. **It just quietly runs the function.** That's what makes "why isn't the cache working?" tricky to debug — the behavior is fine, only the caching is missing.

The neutralization on the client is in fact blocked **twice over**. The React package splits into a server entry (`ReactServer.js`) and a client entry (`ReactClient.js`), and the `ReactCacheClient.js` the client entry imports looks like this[^3]:

```js
// ReactCacheClient.js (conceptually)
export const cache = disableClientCache ? noopCache : cacheImpl
```

`disableClientCache` in `ReactFeatureFlags.js` defaults to `true`. So the `cache` you import on the client is not the real implementation but `noopCache`, which simply calls `fn` and returns. The comment on `noopCache` is candid — "We intend to implement client caching in a future major release." And even if that flag were off and it connected to the real implementation, as we saw above, `A` is `null` on the client, so it falls through to `fn.apply` anyway.

> By the way, using `arguments` and `fn.apply(null, arguments)` is also a deliberate choice. A source comment says it avoids rest parameters because they bloat the transpiled output. They treat this as a hot path and shave off every byte they can.

## The Cache Is a Tree Built from the Function and Its Arguments

Once there's a dispatcher, the real caching begins. The cache's data structure is a **tree** that branches along the function and its arguments. The function itself is the root, and each argument extends one more branch below it. Calling with the same function and the same arguments lands you at the same branch tip (node), and the result hangs there.

First, the node. Each cache node looks like this.

```js
const UNTERMINATED = 0 // no value yet
const TERMINATED = 1 // result stored
const ERRORED = 2 // error stored

function createCacheNode() {
  return {
    s: UNTERMINATED, // status: one of the three above
    v: undefined, // value: result or thrown error (meaning depends on s)
    o: null, // object cache: WeakMap for non-primitive args
    p: null, // primitive cache: Map for primitive args
  }
}
```

Four letters — `s`, `v`, `o`, `p` — are all there is. A single `v` is shared by result and error, and `s` distinguishes which. `o` and `p` are the two branching paths down to the next argument.

Now the full implementation. This is the part that follows the dispatcher guard we saw above.

```js
export function cache(fn) {
  return function () {
    const dispatcher = ReactSharedInternals.A
    if (!dispatcher) {
      return fn.apply(null, arguments)
    }

    // 1) Get the per-request WeakMap, then find this fn's root node in it
    const fnMap = dispatcher.getCacheForType(createCacheRoot)
    let cacheNode = fnMap.get(fn)
    if (cacheNode === undefined) {
      cacheNode = createCacheNode()
      fnMap.set(fn, cacheNode)
    }

    // 2) Descend one tree level per argument
    for (let i = 0; i < arguments.length; i++) {
      const arg = arguments[i]
      if (
        typeof arg === 'function' ||
        (typeof arg === 'object' && arg !== null)
      ) {
        // Objects/functions: stored in a WeakMap keyed by reference
        let objectCache = cacheNode.o
        if (objectCache === null) cacheNode.o = objectCache = new WeakMap()
        let next = objectCache.get(arg)
        if (next === undefined) objectCache.set(arg, (next = createCacheNode()))
        cacheNode = next
      } else {
        // Primitives (including null): stored in a Map keyed by value
        let primitiveCache = cacheNode.p
        if (primitiveCache === null) cacheNode.p = primitiveCache = new Map()
        let next = primitiveCache.get(arg)
        if (next === undefined)
          primitiveCache.set(arg, (next = createCacheNode()))
        cacheNode = next
      }
    }

    // 3) Branch on the final node's status
    if (cacheNode.s === TERMINATED) return cacheNode.v
    if (cacheNode.s === ERRORED) throw cacheNode.v

    try {
      const result = fn.apply(null, arguments)
      cacheNode.s = TERMINATED
      cacheNode.v = result
      return result
    } catch (error) {
      cacheNode.s = ERRORED
      cacheNode.v = error
      throw error
    }
  }
}
```

The original uses Flow types and somewhat more verbose branches, but that's the whole behavior. Let's unpack the three steps.

### Step 1: The Function Identity Is the Root

The `fnMap` returned by `dispatcher.getCacheForType(createCacheRoot)` is **a WeakMap that lives only for this request** (how it's per-request is the [next section](#where-does-per-request-isolation-come-from)). The key of this WeakMap is the **original `fn` reference**.

This is where the most confusing rule in the docs dissolves.

> "Calling cache with the same function multiple times will return different memoized functions that do not share the same cache."

Call `cache(fn)` twice and you get two different wrapper functions. But what gets used as the WeakMap key is not the wrapper — it's the **original `fn` you passed in**. So wrappers made by passing the same `fn` share the same root node no matter where in the tree they're called.

That said, people usually write it like this.

```tsx
// a new wrapper on every render — often called an anti-pattern
export function Temperature({cityData}) {
  const getWeekReport = cache(calculateWeekReport)
  const report = getWeekReport(cityData)
  return <p>{report}</p>
}
```

The official docs flag this as an anti-pattern — since a new wrapper is created on every render, they say it "creates a new memoized function each time the component is rendered which doesn't allow for any cache sharing" ([cache – React docs](https://react.dev/reference/react/cache)). But **at the source level that explanation is wrong.** As we saw, the root node's key is not the wrapper but the original `fn` (`calculateWeekReport`), and that `fn` is module-level, so it's the same every time. Even though a new wrapper is built and thrown away each render, at call time every one of them lands on the same node, via the same `calculateWeekReport` key in the same per-request WeakMap. So **as long as you call it with the same argument, the cache really is shared.** The same holds if another component wraps `cache(calculateWeekReport)` separately — contrary to the docs' wording, it does share.

What actually defeats the cache is not the wrapper's identity. It's (1) defining `fn` **inline inside the component** — e.g. `cache((c) => …)` — so the `fn` reference changes every render, or (2) passing **a new object as the argument** each time (see Step 2). The example above does neither, so it actually works.

So why still "wrap it once at module scope"? Even though sharing works, you pay for a throwaway wrapper each render, you lean on behavior the docs don't guarantee, and the moment someone inlines `fn` it breaks silently. The recommended form is to wrap it once in a dedicated module and import it.

```tsx
// getWeekReport.js — defined once in a dedicated module
import {cache} from 'react'
export default cache(calculateWeekReport)

// usage: import the same memoized function to share it
import getWeekReport from './getWeekReport'

export function Temperature({cityData}) {
  const report = getWeekReport(cityData) // same cache wherever it's called in the tree
  return <p>{report}</p>
}
```

"Wrap it once at module scope" isn't a requirement that _makes_ the cache work — it's recommended because it pins a stable `fn` reference and removes all three fragilities at once.

### Step 2: Each Argument Descends One Level of the Tree

Once you've grabbed the root node, you walk the argument array and descend one level at a time. The branching condition is the heart of it.

```js
if (typeof arg === 'function' || (typeof arg === 'object' && arg !== null)) {
  // objects/functions → WeakMap (keyed by reference)
} else {
  // primitives → Map (keyed by value)
}
```

Objects and functions go into the node's `o` (WeakMap) **keyed by the reference itself**. Strings, numbers, booleans, `undefined`, and `null` go into `p` (Map) **keyed by value**. The `arg !== null` guard blocks JavaScript's famous `typeof null === 'object'` trap, routing `null` to the primitive-side Map.

This branch explains **the danger of object arguments**. The docs phrase it as "shallow equality, compared with `Object.is`," but the actual lookup is just Map/WeakMap key equality. For object arguments it ultimately comes down to reference equality. That's why code like this quietly breaks.

```tsx
// data.js
import {cache} from 'react'
export const getReport = cache((opts) => calc(opts.x, opts.y, opts.z))

// Cell.tsx (Server Component)
function Cell({x, y, z}) {
  // 🚩 a fresh object literal every render → a different WeakMap key each time → always a miss
  const report = getReport({x, y, z})
  return <pre>{report}</pre>
}
```

`{x, y, z}` is a new object every time even if the values are equal. To the WeakMap it's a different key each time, so the cache never hits. There are two fixes — **unpack into primitives**, or **share a stable reference**.

```tsx
// (a) Pass primitives: the primitive Map keys by value, so equal values hit
export const getReport = cache((x, y, z) => calc(x, y, z))
function Cell({x, y, z}) {
  return <pre>{getReport(x, y, z)}</pre>
}

// (b) Share a stable reference: build the object once, pass it as-is
function App() {
  const vector = [10, 10, 10] // created once
  return (
    <>
      <Marker vector={vector} />
      <Marker vector={vector} /> {/* same reference → hit */}
    </>
  )
}
```

The tree shape is worth noting too. For arguments `(a, b, c)` you descend three levels — root → `a` node → `b` node → `c` node — and the result hangs on the final node. Since branches split in argument order, if the leading arguments match and the trailing ones differ, you share the path down to the intermediate node. Variadic arguments are handled naturally too — you just descend as many levels as there are arguments.

### Step 3: Branch on the Final Node's Status

Once you've descended through the arguments, you look at the `s` of the node you arrived at.

- `TERMINATED` (1): return the stored `v` as-is. **Cache hit.**
- `ERRORED` (2): re-`throw` the stored error `v`. **Errors are cached too.**
- otherwise (`UNTERMINATED`): run `fn`, store the result as `TERMINATED` (or a thrown error as `ERRORED`), and return.

Two details emerge here. One is how the return value is stored, and the other is the asymmetry of error caching. Each deserves its own section. But first, let's finish off why all of this is "per-request."

## Where Does Per-Request Isolation Come From?

So far the word "request" hasn't appeared once in `ReactCacheImpl.js`. Neither the tree nor the nodes know about requests. **Per-request isolation is provided not by the `cache()` implementation but by the dispatcher.** Specifically, by `getCacheForType`.

What `cache()` calls was the single line `dispatcher.getCacheForType(createCacheRoot)`. This dispatcher is the one the Flight server runtime plugged in, and `getCacheForType` reads **the current Request's cache store**. It looks roughly like this[^5].

```js
// Flight server's getCacheForType (conceptually)
function getCacheForType(resourceType) {
  const cache = getCache() // the current Request's cache — a plain Map
  let entry = cache.get(resourceType)
  if (entry === undefined) {
    entry = resourceType() // first time: call the factory → createCacheRoot() → a new WeakMap
    cache.set(resourceType, entry)
  }
  return entry
}
```

And the Flight server creates a fresh store **for every request (Request)**.

```js
// Request instance in ReactFlightServer.js (excerpt)
this.cache = new Map()
this.cacheController = new AbortController()
```

You must not confuse the two layers of caching here.

1. **`request.cache`** is a plain `Map`. Its key is the `resourceType` — that is, the `createCacheRoot` factory function `cache()` passed in.
2. The value that Map returns is **the `WeakMap` created by `createCacheRoot()`**. That's the root of the tree inside `cache()`.

Since every `cache()` call passes the same module-level `createCacheRoot` reference, within one request they all share **a single WeakMap**. Inside that WeakMap it branches again per `fn`, and then per argument the tree branches further. When the request changes, `request.cache` becomes a new Map, so `createCacheRoot` is called again and a fresh WeakMap is made. **That's why the next request starts from scratch.**

> The dispatcher object itself is process-global, but the cache it returns belongs to "the current Request." So **sharing the dispatcher does not mean sharing the cache.** Two requests that arrive concurrently get their own Request → their own `cache` Map → isolated caches. That's why it's structurally impossible for user A's `getUser('me')` result to leak to user B.

How "the current Request" is found is the last piece of the puzzle. During synchronous execution it's resolved through a module-level `currentRequest` variable; across `await` boundaries that continue asynchronously, it's resolved through Node's `async_hooks`-based `AsyncLocalStorage`[^5]. It's the mechanism that lets you see the same request's cache even after crossing async boundaries.

One more thing — **there is no eviction inside a request.** No TTL, no LRU, no size limit. A cached value stays until the request ends, and when the request ends it's discarded wholesale along with the Request. Object-keyed subtrees are WeakMaps, so an entry whose key object is no longer referenced anywhere can become eligible for GC, but that's a side effect, not an intended cache policy. `cache()` is **a read-memoization primitive**, not a managed cache store.

> Exactly how Next.js App Router wires this up is hard to assert from the React source alone. But since App Router creates a Flight Request when it renders RSC, in practice you can treat the lifetime of `cache()`'s cache as aligned with **"one server render of one route, one request."** (This part is behavioral inference from React's per-request semantics; I did not verify Next's internal call sites directly.)

## The Return Value Is Stored by Reference: preload and In-Flight Sharing

Look again at the cache-miss handling from step 3.

```js
const result = fn.apply(null, arguments)
cacheNode.s = TERMINATED
cacheNode.v = result
return result
```

No `await`, no `.then`. **It stores `fn`'s return value by reference, as-is.** If `fn` is an async function, `result` is a Promise object, and that **same Promise** is pinned to the node.

This seems trivial but produces powerful results. When a cached async function is called with the same arguments all over the tree, everyone shares **one in-flight Promise** created by the first call. The DB query fires only once, and the remaining `await`s wait together for the same promise to resolve. `fetch` is deduplicated automatically, but DB and ORM queries are not — and `cache()` fills exactly that gap.

This property is the foundation of the **`preload` pattern**. Before the component that needs the data renders, you call it once in advance to kick off the work.

```tsx
// user.js
import {cache} from 'react'
export const getUser = cache((id: string) => db.user.findById(id))
export function preload(id: string) {
  void getUser(id) // discard the result — the point is to start the work
}

// page.tsx
import {getUser, preload} from './user'

export default async function Page({id}: {id: string}) {
  preload(id) // fire the query before children render
  return <Profile id={id} />
}

// profile.tsx
async function Profile({id}: {id: string}) {
  const user = await getUser(id) // hits the same in-flight promise — no extra query
  return <h1>{user.name}</h1>
}
```

Because the promise fired by `preload(id)` is stored in the cache, when `Profile` later does `await getUser(id)` it receives the same promise. It's a common technique to shave one level off the waterfall (where the child fetch can't start until the parent fetch finishes).

> Just don't forget that `preload` must be called **inside a component**. Call `getUser('demo')` at module top level and what happens? There's no dispatcher, so it just runs without caching, and when the component actually calls it the cache is empty and it runs again. The dispatcher guard from the earlier section applies here too.

## The Asymmetry of Error Caching: Sync throw vs Async Rejection

Look again at the `try/catch` from step 3.

```js
try {
  const result = fn.apply(null, arguments)
  cacheNode.s = TERMINATED
  cacheNode.v = result
  return result
} catch (error) {
  cacheNode.s = ERRORED
  cacheNode.v = error
  throw error
}
```

`try/catch` only catches **a synchronous throw from `fn.apply`**. When a sync function throws, the node becomes `ERRORED`, and calling again with the same arguments re-throws the stored error. As the source comment says — "We store the first error that's thrown and rethrow it."

But **an async function does not throw synchronously.** Even if an error occurs inside, an async function _normally_ returns a "Promise that will reject later." So `try/catch` never fires, and the node becomes `TERMINATED`, not `ERRORED`. The `v` it stores is **that to-be-rejected promise itself**.

The result is this.

```tsx
export const getUser = cache(async (id: string) => {
  const res = await fetch(`/api/user/${id}`)
  if (!res.ok) throw new Error('fetch failed') // not a synchronous throw → a rejected promise
  return res.json()
})
```

If the first call rejects, **every subsequent `await getUser(id)` within the same request receives the same rejected promise.** `fetch` does not run again. In other words, within the same request, even a failure — once cached — is not retried.

To summarize.

| Case                   | Node status  | Stored value               | On re-call in the same request             |
| ---------------------- | ------------ | -------------------------- | ------------------------------------------ |
| Sync function `throw`s | `ERRORED`    | the thrown error           | re-`throw` the stored error                |
| Async function rejects | `TERMINATED` | the to-be-rejected Promise | reuse the same rejected promise (no retry) |
| Normal return          | `TERMINATED` | result (or a Promise)      | reuse the same value/promise               |

At the source level, the `ERRORED` state is indeed sync-throw-only. But in terms of **observed behavior**, an async failure is effectively cached too, via reuse of the rejected promise. That's also why the official docs simply say "cachedFn will also cache errors" without distinguishing sync from async.

There's one practical implication. **Don't wrap a call that needs retrying within the same request in `cache()`.** Fail once and you'll get the same failure back for the rest of that request. If you need retry logic, keep it outside `cache()`, or simply don't wrap calls whose failures must not be cached.

## cacheSignal: A Signal That Severs When the Request Ends

`ReactCacheImpl.js` has one more small companion API next to `cache`. It came later, though — `cache()` has been around since React 19.0.0, but `cacheSignal()` is stable only since 19.2.0.

```js
export function cacheSignal() {
  const dispatcher = ReactSharedInternals.A
  if (!dispatcher) return null
  return dispatcher.cacheSignal()
}
```

The pattern is identical to `cache()` — `null` if there's no dispatcher. If there is one, it returns that request's `AbortSignal`. Recall that the Request earlier was holding `this.cacheController = new AbortController()`; what `cacheSignal()` returns is that controller's signal.

The use is clear. Pass this signal into a cached async task and **when the request ends (or is aborted) and the cache is discarded, that task is aborted along with it.**

```tsx
import {cache, cacheSignal} from 'react'

export const getUser = cache((id: string) =>
  fetch(`/api/user/${id}`, {signal: cacheSignal() ?? undefined}),
)
```

It's a guard against a background fetch outliving a severed request and holding onto resources. You've paired a cache that lives per-request with a signal that dies per-request.

> There's another dispatcher with a similar name. The reconciler (Fiber/SSR) side also has a separate `DefaultAsyncDispatcher` with `getCacheForType`, but that's **a different path** that reads `<Cache>` boundary data from `CacheContext` to drive the `use()`/Suspense cache[^6]. The `cache()` function is documented as scoped to Server Components, so it's better not to conflate this Fiber path with `cache()`'s behavior. They merely share the name `getCacheForType`; the path userland `cache()` actually takes is the Flight server dispatcher.

## So When Should You Use It?

Now that we've seen the implementation, back to practical judgment. `cache()`'s place is narrower and clearer than you'd think.

**Good places to use it.** When several components within one RSC render need the same data. A layout and a page both look up the current user, or a sidebar and the main content read the same settings. **Request-scoped deduplication of non-fetch DB/ORM queries**, and **doing an expensive computation just once across the whole tree**. Reducing a waterfall with `preload` belongs here too. The common thread is all "sharing within one request, one render."

**Places not to use it.** A cache that needs to survive across requests. That's the job of [`'use cache'`](/2026/05/use-cache-deep-dive), `unstable_cache`, or the Data Cache — not `cache()`. `cache()` is empty-handed the moment the next request arrives. Client-side data caching isn't `cache()`'s domain either — there `cache()` is a no-op, so you use React Query or SWR. A call that needs retrying within the same request is, as we saw, also a poor fit.

Boil the decision down to one line. **"Will I use this result _again within this render_?"** If so, it's `cache()`. If you want to reuse it after the request ends, look at a different tool.

## Is There a Real Use for It in Next.js?

If you work in the App Router, one thing nags at you: Next.js already dedupes `fetch`. Identical GET `fetch` calls (same URL and options) are [automatically memoized](https://nextjs.org/docs/app/api-reference/functions/fetch#memoization) within a render pass (React's request memoization). So **you don't need to wrap `fetch` in `cache()`** — the docs say so outright.

So where does `cache()` fit in Next? **Everything that isn't `fetch`.** The official docs recommend it directly — "If you are not using `fetch` (which is automatically memoized), and instead using an ORM or database directly, wrap your data access with the React `cache` function," complete with a [Drizzle example](https://nextjs.org/docs/app/guides/caching-without-cache-components#deduplicating-requests). Prisma, Drizzle, and raw SQL are not auto-deduped the way `fetch` is. Assuming they are is the single most common mistake.

The flagship pattern is the **authentication Data Access Layer (DAL)**. Wrap `getCurrentUser()` or `verifySession()` in `cache()`, and no matter how many times the layout, the page, leaf components, and Server Actions each call it, the DB query and session decryption happen only once per request. It's the canonical pattern pushed by Next's [Authentication](https://nextjs.org/docs/app/guides/authentication) and [Data Security](https://nextjs.org/docs/app/guides/data-security) guides — and since request-scoped dynamic values like `cookies()` can't be wrapped by `'use cache'`, `cache()` is the right tool here, not Cache Components.

One more misconception. `cache()` has not been superseded by `'use cache'`. The two are **orthogonal** — `cache()` is request-scoped dedup, `'use cache'` is cross-request persistence. What Next 16 replaces is not `cache()` but `unstable_cache` (→ `'use cache'`). `cache()` remains valid across both the previous model and the Cache Components model, and the current docs still recommend it.

In short, **`cache()` has a narrow but definite place in Next.js.** A fetch-only app might never reach for it, but in a serious server tree tangled up with ORMs, sessions, and authorization, it's close to essential.

## Wrapping Up

`cache()` is a ~30-line function. There's no magic inside.

- No dispatcher means caching is skipped. → **RSC-only, and a no-op outside a component and on the client.**
- The cache is a tree built from the function reference and the arguments, and objects go into a WeakMap keyed by reference. → **Pass a fresh object every render and it always misses; wrap it once at module scope.**
- The cache store lives inside a Map the dispatcher creates fresh per request. → **Never shared across requests or users, and discarded when the request ends.**
- The return value is stored by reference, as-is. → **For async, the same promise is shared to dedupe the request, `preload` works, and a failure isn't retried within the same request.**

Read one implementation instead of memorizing the docs' rules, and all of those rules turn into "they couldn't be otherwise." If `cache()` confused you, it wasn't because the API is complex — it was because you looked at the rules without seeing the one fact that this function is **memoization tightly bound to the lifetime of a single request**. The dispatcher, the tree, and the per-request Map are the three faces of that one fact.

## References

- [cache – React official docs](https://react.dev/reference/react/cache)
- [`facebook/react` — ReactCacheImpl.js](https://github.com/facebook/react/blob/v19.2.6/packages/react/src/ReactCacheImpl.js)
- [`facebook/react` — ReactFlightServer.js](https://github.com/facebook/react/blob/v19.2.6/packages/react-server/src/ReactFlightServer.js)
- [Deduplicating requests with React cache – Next.js docs](https://nextjs.org/docs/app/guides/caching-without-cache-components#deduplicating-requests)
- [`'use cache'` Directive Deep Dive: To the End of Cache Boundaries](/2026/05/use-cache-deep-dive)

[^1]: [cache – React official docs](https://react.dev/reference/react/cache) — the source for all the official rules: `cache()`'s signature, scope (request-scoped, RSC-only), argument shallow equality (`Object.is`), error caching, the `preload`/data-snapshot-sharing use cases, "won't use the cache when called outside a component," and so on. `cache()` shipped as stable in React 19.

[^2]: [`facebook/react` — packages/react/src/ReactCacheImpl.js](https://github.com/facebook/react/blob/v19.2.6/packages/react/src/ReactCacheImpl.js) — the actual implementation of `cache()`/`cacheSignal()`. Status sentinels (`UNTERMINATED=0`/`TERMINATED=1`/`ERRORED=2`), the node shape `{s, v, o, p}`, the dispatcher guard, the WeakMap/Map tree traversal, and the error-caching logic.

[^3]: [`facebook/react` — packages/react/src/ReactCacheClient.js](https://github.com/facebook/react/blob/v19.2.6/packages/react/src/ReactCacheClient.js) — the client entry's `cache = disableClientCache ? noopCache : cacheImpl`. The `disableClientCache = true` default in `ReactFeatureFlags.js`, and `noopCache`'s "intend to implement client caching in a future major release" comment.

[^4]: [`facebook/react` — packages/react/src/ReactSharedInternalsClient.js](https://github.com/facebook/react/blob/v19.2.6/packages/react/src/ReactSharedInternalsClient.js) — the `ReactSharedInternals.A` (AsyncDispatcher) slot, `ReactCurrentCache` per the comment. It defines the `getCacheForType`/`cacheSignal` contract.

[^5]: [`facebook/react` — packages/react-server/src/ReactFlightServer.js](https://github.com/facebook/react/blob/v19.2.6/packages/react-server/src/ReactFlightServer.js) — the source of the per-request cache. The Request instance's `this.cache = new Map()`, `this.cacheController = new AbortController()`, `getCache(request)`/`resolveRequest()`, and current-request resolution via `currentRequest`/`AsyncLocalStorage` (`requestStorage`, `async_hooks`). `getCacheForType` itself lives in the sibling module `flight/ReactFlightAsyncDispatcher.js`'s `DefaultAsyncDispatcher`, which reads this Map via `getCache(request)`.

[^6]: [`facebook/react` — packages/react-reconciler/src/ReactFiberAsyncDispatcher.js](https://github.com/facebook/react/blob/v19.2.6/packages/react-reconciler/src/ReactFiberAsyncDispatcher.js) — the reconciler's (Fiber/SSR) `DefaultAsyncDispatcher`. A separate path that reads `<Cache>` boundary data via `readContext(CacheContext)` to drive the `use()`/Suspense cache. Not to be confused with userland `cache()`.
