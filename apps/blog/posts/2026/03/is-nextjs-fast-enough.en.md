---
title: 'Is Next.js Fast Enough?'
tags:
  - nextjs
  - web-performance
  - react
  - ssr
  - benchmark
published: true
date: 2026-03-21 22:00:00
description: 'The uncomfortable truth benchmarks reveal'
thumbnail: '/thumbnails/2026/03/is-nextjs-fast-enough.png'
series: 'Next.js의 현주소'
seriesOrder: 4
---

## Table of Contents

## Introduction

Here's a summary of what [this series](/2026/03/nextjs-edge-runtime-rise-and-fall) has covered so far: Edge Runtime has retreated, Cloudflare has started re-implementing Next.js on its own, and React's governance is shaking. In this post, I ask a more fundamental question. Is Next.js fast enough?

To get it out of the way: the conclusion of this post is that "as of now, Next.js's SSR performance lags behind other frameworks in the same React ecosystem." But rather than starting with that conclusion and cherry-picking evidence to fit, I'll examine the benchmark data published in March 2026 one by one, distinguishing what is fact from what is interpretation. Where the data has limitations, I'll point those out too.

## Platformatic's SSR Framework Showdown

On March 17, 2026, [Platformatic](https://platformatic.dev/), led by Matteo Collina — a Node.js TSC member and creator of Fastify — published a benchmark called [React SSR Framework Showdown](https://blog.platformatic.dev/react-ssr-framework-benchmark-tanstack-start-react-router-nextjs). What makes this benchmark noteworthy is the fairness of its methodology.

### Test Design

The same e-commerce app (a card trading marketplace) was implemented in three frameworks:

- **TanStack Start** (v1.157.16) — Vite-based SSR, `createFileRoute` + `loader`
- **React Router** (v7) — Route module + `loader` export
- **Next.js** (v15.5.5 → v16.2.0-canary.66) — App Router + Server Components

The app's data model is fairly realistic: 5 games (Pokémon, MTG, Yu-Gi-Oh, Digimon, One Piece), 50 card sets (10 per game), 10,000 cards (200 per set), 100 sellers, and 50,000 listings. All frameworks used the same JSON data, with a random delay of 1–5ms added to simulate real DB latency. During load testing, a traffic distribution reflecting real e-commerce patterns was applied across routes including the homepage, search, game detail, card detail, and seller list.

The infrastructure consisted of AWS EKS (4 m5.2xlarge nodes, 8 vCPU/32GB per node), Grafana k6 as the load testing tool, a c7gn.2xlarge test machine (network-optimized), with a target load of **1,000 req/s**. Two runtimes were tested: Node.js standalone (6 pods × 1 CPU) and Platformatic Watt (3 pods × 2 CPU, leveraging `SO_REUSEPORT`), with total CPU allocation (6 cores) kept identical.

There was also an important design decision: **no caching was used.** In e-commerce environments that actively employ personalization and A/B testing, overlap between individual user views is often less than 5%, meaning cache hits barely outweigh invalidation overhead. The rationale was that measuring pure SSR performance without caching is more realistic.

### Results: Next.js 15's Crushing Defeat

The initial results for Next.js 15.5.5 were shocking.

| Metric            | TanStack Start | React Router | Next.js 15         |
| ----------------- | -------------- | ------------ | ------------------ |
| Avg response time | 12.79ms        | 17ms         | 8,000–11,000ms     |
| Success rate      | 100%           | 100%         | ~60%               |
| p95 latency       | < 50ms         | < 100ms      | 10,001ms (timeout) |

Next.js couldn't handle 1,000 req/s. Average response times reached 8–11 seconds, and roughly 40% of requests failed by hitting the 10-second timeout. The p95 latency of exactly 10,001ms is no coincidence — requests were hitting the timeout ceiling. While TanStack Start and React Router processed every request in milliseconds, Next.js was literally drowning.

The definition of "success" was strict here, too: returning HTTP 200 within the 10-second timeout. Since no real user would wait 10 seconds in production, the perceived success rate would have been even lower.

### Improvement with Next.js 16 Canary

The Platformatic team shared their benchmark data and flamegraphs generated with [@platformatic/flame](https://github.com/platformatic/flame) with the Next.js team. Tim Neutkens of Next.js discovered a function called `initializeModelChunk` as the bottleneck in the flamegraph. I'll cover this in more detail later.

Re-testing with Next.js 16.2.0-canary.66, which included the fix:

| Metric            | Next.js 15 (Watt) | Next.js 16 canary (Watt) | Improvement |
| ----------------- | ----------------- | ------------------------ | ----------- |
| Throughput        | 322 req/s         | 701 req/s                | **2.2x**    |
| Avg latency       | 8,000–11,000ms    | —                        | —           |
| Median latency    | —                 | 431ms                    | —           |
| Success rate      | ~60%              | ~64%                     | Slight      |
| Latency reduction | —                 | —                        | **83%**     |

Throughput more than doubled, and latency for successful requests dropped by 83%. A meaningful improvement. But roughly 36% of requests still failed, and the gap with TanStack Start (13ms, 100% success) remained large.

Here's the full ranking on the Watt runtime:

| Rank | Framework         | Avg latency    | Success rate |
| ---- | ----------------- | -------------- | ------------ |
| 1    | TanStack Start    | 12.79ms        | 100%         |
| 2    | React Router      | ~17ms          | 100%         |
| 3    | Next.js 16 canary | 431ms (median) | ~64%         |

One note of caution: Platformatic acknowledged at the top of their post that "readers pointed out some inconsistencies in the code" and announced that results would be updated. Therefore, it's more appropriate to focus on the directional gap between frameworks rather than the exact numbers.

Even so, Platformatic's core conclusion was clear:

> Framework Choice Matters More Than Runtime. The difference between TanStack Start and Next.js (3x throughput, 690x latency difference) far exceeds the difference between Watt and Node.js on the same framework.

## Why Is It Slow: The Architectural Weight of Next.js App Router

Benchmark numbers alone aren't enough. We need to understand **why** it's slow. Let's trace the SSR request processing path of the Next.js App Router and analyze where the overhead comes from.

### The Journey of an SSR Request

Here's roughly how a single SSR request is processed in the Next.js App Router:

```
Request received
  → Route matching (filesystem-based routing)
  → Layout tree construction (resolving nested layout.tsx)
  → Server Component execution
    → Data fetching (automatic fetch deduplication, cache check)
    → React Element tree creation
  → Flight serialization (component tree → RSC Payload)
  → HTML rendering (renderToReadableStream)
  → Streaming response sent
```

This pipeline itself is reasonable. The problem is the cumulative overhead hidden in each step.

### Overhead 1: Flight Protocol and the Double Data Problem

React Server Components use a proprietary serialization protocol called [Flight](https://github.com/facebook/react/tree/main/packages/react-server) to transfer the server-rendered component tree to the client. Flight is a line-based streaming format where each line takes the form `<chunkId>:<payloadMarker><serializedData>`.

For example, if a simple Server Component renders like this:

```jsx
// Server Component
export default async function Page() {
  const products = await getProducts()
  return (
    <main>
      <h1>Products</h1>
      <ProductList items={products} /> {/* Client Component */}
    </main>
  )
}
```

Next.js sends this result in **two forms simultaneously**:

1. **HTML** — Markup the browser can render immediately
2. **RSC Payload** — Data for React to reconstruct the Virtual DOM on the client and perform hydration

If the HTML is `<main><h1>Products</h1><div>...</div></main>`, the RSC Payload encodes the same structure once more in Flight format. On top of that, the `items` props passed to the Client Component (`ProductList`) are also serialized and included.

The real-world impact of this double data problem is significant:

- According to community reports, the RSC payload often accounts for a substantial portion of the total HTML page size. However, this ratio varies greatly depending on the app's structure and data volume, so it's more accurate to measure it yourself using the methods described in [Vercel's RSC payload optimization guide](https://vercel.com/kb/guide/how-to-optimize-rsc-payload-size)
- [eknkc/ssr-benchmark](https://github.com/eknkc/ssr-benchmark) (measured in 2024, Next.js v14–15) also reveals this issue. The Next.js App Router response size was **284.64KB**, compared to pure React at **97.28KB** and Remix at **189.10KB**. While absolute numbers may vary across versions, the tendency for RSC-based frameworks to produce structurally larger responses stems from the double data architecture and doesn't change

The eknkc benchmark quantified this phenomenon as a "duplication factor." Frameworks that require hydration (Remix, SvelteKit, etc.) exhibit **x2.00** duplication where each rendered data item appears twice in the response. Because the same information is sent in two different formats — HTML and hydration data — the duplication isn't immediately obvious, but it clearly impacts bandwidth. The RSC-based App Router adds Flight Payload on top of this, making the response even larger.

Of course, Server Component code itself isn't included in the client bundle, so JavaScript bundle size is reduced. But the trade-off is a new transmission cost: the RSC Payload. Bundle size and transfer size are separate concerns.

### Overhead 2: `initializeModelChunk` and JSON.parse reviver

The widest block in Platformatic's flamegraph turned out to be `initializeModelChunk`. This function deserializes RSC Flight chunks sent from the server into JavaScript objects. And at the core of this function was a `JSON.parse(text, reviver)` call.

To understand the problem, you need to know how V8 handles `JSON.parse`.

V8's `JSON.parse` is implemented in C++ ([v8/src/json/json-parser.cc](https://github.com/v8/v8/blob/main/src/json/json-parser.cc)). When called without a reviver, parsing completes entirely within C++ and only the final JavaScript object is returned. The C++↔JS boundary is crossed **only once**.

But when a reviver callback is passed, things change drastically. V8 must call the reviver function for **every key-value pair** in the parsed JSON. Each call triggers:

1. Switching from the C++ execution context to the JavaScript execution context
2. Calling the reviver function
3. Switching back from the JavaScript execution context to the C++ execution context

The cost of this boundary crossing is independent of what the reviver function does. Even a trivial `(k, v) => v` cannot avoid this cost. The benchmark presented in [React PR #35776](https://github.com/facebook/react/pull/35776) demonstrates this clearly:

| Payload size           | `JSON.parse(text)` | `JSON.parse(text, (k,v) => v)` | Reviver overhead |
| ---------------------- | ------------------ | ------------------------------ | ---------------- |
| 108KB (1000-row table) | 0.60ms             | 2.95ms                         | **391%**         |

On a 108KB payload, just adding a trivial reviver increases parsing time by **roughly 4x**. And since `initializeModelChunk` is called for **every Server Component chunk** in RSC, this overhead snowballs rapidly on pages with many components and large props.

The reason the previous React implementation needed a reviver was that special strings starting with `$` (module references, Promises, lazy, etc.) in the RSC Flight format required special handling. Simplified to pseudocode, here's the essence of the change (the actual PR code can be found at [facebook/react#35776](https://github.com/facebook/react/pull/35776)):

```javascript
// Before (pseudocode): passing a reviver to JSON.parse
// → C++↔JS boundary crossing for every key-value pair
const model = JSON.parse(payload, function reviver(key, value) {
  if (typeof value === 'string' && value[0] === '$') {
    return parseModelString(value, ...)
  }
  return value
})
```

```javascript
// After (pseudocode): two-phase approach
// Phase 1: pure parsing in C++ (boundary crossing once)
const model = JSON.parse(payload)

// Phase 2: traverse only necessary nodes in JavaScript
function reviveModel(value) {
  if (typeof value === 'string') {
    if (value[0] === '$') return parseModelString(value, ...)
    return value  // most strings return immediately here
  }
  if (typeof value === 'object' && value !== null) {
    for (const key in value) {
      value[key] = reviveModel(value[key])
    }
  }
  return value
}
reviveModel(model)
```

There are two key differences:

1. **C++↔JS boundary crossings are fixed at 2.** They don't scale with payload size.
2. **Short-circuit optimization becomes possible.** Most strings are CSS class names or text content that don't start with `$`, so they can be skipped after checking just the first character.

The benchmark results by payload size from the PR show that the larger the payload, the greater the improvement:

| Payload                | Before   | After    | Improvement |
| ---------------------- | -------- | -------- | ----------- |
| Small (142B)           | 0.0024ms | 0.0007ms | 72%         |
| Medium (914B)          | 0.0116ms | 0.0031ms | 73%         |
| Large (16.7KB)         | 0.1836ms | 0.0451ms | 75%         |
| XL (25.7KB)            | 0.3742ms | 0.0913ms | 76%         |
| 1000-row table (110KB) | 3.0862ms | 0.6887ms | **78%**     |

Larger payloads see greater improvements. A 78% improvement at 110KB shows just how dominant the boundary crossing cost was in the old implementation. The parsing logic itself was lightweight, but the cost of constantly crossing between C++ and JS dominated the total.

The real-world impact on actual Next.js apps was also measured in the PR: average render time on a page with nested Suspense went from 78ms to 59ms (**24% improvement**), and with double nesting levels, from 169ms to 134ms (**21% improvement**).

Note that this fix was applied to React core, so **all frameworks** using RSC benefit from it, not just Next.js.

### Overhead 3: The Cumulative Weight of the Framework Layer

While the `JSON.parse` reviver was the most dramatic single bottleneck confirmed in the flamegraph, for the remaining overhead we must rely on architectural reasoning. Here's what Next.js does on every request:

- **Filesystem-based routing**: Matching the request URL against the `app/` directory structure. Interpreting file conventions like layout, template, loading, error, and constructing the nested layout tree
- **Automatic fetch deduplication and caching**: Logic that automatically deduplicates same-request fetches and applies cache strategies (`force-cache`, `no-store`)
- **Metadata API**: Executing `generateMetadata` functions and merging metadata from nested layouts
- **Streaming pipeline**: Detecting Suspense boundaries and orchestrating out-of-order streaming using `$RC()` functions and `<template>` tags
- **Client Component reference management**: Managing the serialization of all components and props that cross `'use client'` boundaries

Without profiling data, it's impossible to determine how much each of these contributes to the total overhead. However, it's architecturally clear that all of these run on **every SSR request**, while thinner frameworks like TanStack Start or React Router minimize these layers. In the eknkc benchmark, about 17ms is added going from React (1.3ms) to Next.js App Router (18.7ms), and the fact that the `JSON.parse` reviver fix brought roughly 75% improvement suggests that a significant portion of those 17ms was concentrated in RSC deserialization.

## Next.js 16.2's Official Benchmark

The [Next.js 16.2 release blog](https://nextjs.org/blog/next-16-2) published on March 18, 2026, presented official numbers for the real-world impact of the `JSON.parse` fix.

| Scenario                              | Before | After | Improvement |
| ------------------------------------- | ------ | ----- | ----------- |
| Server Component Table (1000 items)   | 19ms   | 15ms  | 26%         |
| Server Component with nested Suspense | 80ms   | 60ms  | 33%         |
| Payload CMS homepage                  | 43ms   | 32ms  | 34%         |
| Payload CMS (rich text)               | 52ms   | 33ms  | **60%**     |

The pattern that larger RSC payloads see greater improvements is confirmed again. Payload CMS's rich text pages generate large payloads with a high proportion of strings, and the biggest improvement of 60% was seen there. This is evidence of how costly it was to cross the C++↔JS boundary for every string in the old reviver approach.

Vercel's officially stated improvement is "RSC payload deserialization up to **350% faster**", with real apps seeing "**25-60% faster rendering to HTML**."

Next.js 16.2 also included other notable improvements:

- `next dev` startup speed **~400% faster** (87% faster than 16.1 on the same project)
- `ImageResponse` default images **2x** faster, complex images up to **20x** faster
- `next start --inspect` enables attaching the Node.js debugger to production servers

It's clear that significant resources are being invested in performance improvements.

## Microbenchmarks: Anatomy of Rendering Overhead

While the Platformatic benchmark was a real-app-level load test, [eknkc/ssr-benchmark](https://github.com/eknkc/ssr-benchmark) is a microbenchmark that measures pure framework rendering performance.

**Important caveat:** The last commit to this benchmark is from April 2024. Therefore, the tested Next.js version is likely v14–v15 early. The RSC deserialization improvement in Next.js 16.2 is not reflected. The numbers below should be read as "pre-improvement" baselines. Even so, they're useful for understanding the structural differences in relative overhead between frameworks.

The test environment:

- Node.js v20.6.1, MacBook Pro M1 Pro
- HTTP overhead completely removed (mock request/response)
- Test scenario: 1000-row table, 2 UUID columns per row
- Next.js route cache disabled (`export const dynamic = 'force-dynamic'`)
- Asynchronous data loading included (Suspense or loader)

### Framework Benchmark

| Framework        | ops/sec | Avg (ms) | Response size (KB) | vs React   | Duplication factor |
| ---------------- | ------- | -------- | ------------------ | ---------- | ------------------ |
| React (baseline) | 766     | 1.305    | 97.28              | 1x         | —                  |
| SvelteKit        | 589     | 1.696    | 184.46             | 1.30x      | x2.00              |
| Remix            | 449     | 2.224    | 189.10             | 1.71x      | x2.00              |
| Nuxt             | 381     | 2.622    | 201.12             | 2.01x      | x2.00              |
| Qwik City        | 278     | 3.584    | 139.21             | 2.76x      | x1.00              |
| Next.js (Pages)  | 104     | 9.590    | 187.67             | **7.37x**  | x2.00              |
| Astro            | 99      | 10.077   | 99.91              | 7.74x      | x1.00              |
| Next.js (App)    | 53      | 18.673   | 284.64             | **14.45x** | —                  |

A few things stand out.

**First, the Next.js App Router is 2x slower than even the Pages Router.** App Router (18.673ms) being nearly twice as slow as Pages Router (9.590ms) is direct evidence of the overhead RSC adds. Within the same Next.js framework, just choosing App Router cuts performance in half.

**Second, what the response size tells us.** The Next.js App Router response is 284.64KB — roughly 2.92x the pure React response of 97.28KB. This is the direct numerical manifestation of the double data problem described earlier. Interestingly, Qwik (139.21KB, x1.00 duplication) and Astro (99.91KB, x1.00 duplication) don't send hydration data, so their responses are smaller.

**Third, the scale of the gap is extraordinary.** SvelteKit has only 1.30x overhead, Remix 1.71x. Framework-layer overhead of 30–70% is a reasonable range. But Next.js App Router's 14.45x is on a completely different level.

### Renderer Benchmark

Results from isolating just the rendering engine, separate from the full framework:

| Renderer   | ops/sec | Avg (ms) | vs Marko  |
| ---------- | ------- | -------- | --------- |
| Marko      | 6,675   | 0.150    | 1x (base) |
| Kita (JSX) | 3,074   | 0.325    | 2.17x     |
| Hono JSX   | 945     | 1.058    | 7.06x     |
| Vue        | 897     | 1.114    | 7.44x     |
| React      | 764     | 1.308    | 8.74x     |
| Qwik       | 622     | 1.605    | 10.73x    |
| Solid      | 613     | 1.630    | 10.89x    |

React's pure rendering performance (1.308ms) is mid-range among these frameworks. There's a significant gap from Marko (0.150ms) or Kita (0.325ms), but it's comparable to Vue (1.114ms). In other words, React's own rendering speed is within a reasonable range — it's the layers Next.js stacks on top that inflate 1.3ms into 18.7ms.

## TanStack Start: How It Achieved 5.5x on the Same React

To determine whether Next.js's performance problem stems from React itself or from the Next.js framework layer, we need a control group. TanStack Start serves exactly that role. It runs on the same React 19 but is an SSR framework that doesn't use RSC.

TanStack Start also struggled in its initial benchmark (v1.150.0): average response time over 3 seconds, p95 latency of 10,001ms (timeout), and a 75% success rate. But based on the flamegraphs Platformatic shared, it achieved dramatic improvement in just 7 minor versions.

The 4 bottlenecks and fixes discovered in TanStack's [published optimization process](https://tanstack.com/blog/tanstack-start-5x-ssr-throughput) are a textbook example of SSR performance optimization.

### 1. URL Parsing Overhead

E-commerce apps have lots of links. Product lists, category navigation, seller links — a single page can have dozens to hundreds of links. TanStack Router was creating a `new URL()` for each link, and URL construction is an expensive operation that fully parses the WHATWG URL spec.

The fix was simple: first check whether the value is obviously an internal link (starts with absolute path `/`), and only create a `URL` object for external URLs.

### 2. Unnecessary Reactivity in SSR

TanStack Router has a built-in reactivity system for client-side state management — store subscriptions, structural sharing, update batching, and so on. But SSR renders **only once** per request. Since state never changes, subscriptions, batching, and structural sharing are all wasted CPU cycles.

A build-time `isServer` flag was introduced to skip these operations entirely on the server. Since the bundler removes this branch in the client build via dead code elimination, client performance is unaffected.

### 3. Server-Only Fast Paths

The `isServer` pattern above was applied more aggressively. Server-only code paths guarded by build-time constants were added with separately optimized logic that runs only on the server. This alone improved server throughput by **25%**.

### 4. `delete` Operations Destroying V8 Optimizations

This is a particularly interesting discovery. In JavaScript, `delete obj.key` doesn't simply remove a property. V8 manages object property structures through internal metadata called hidden classes (or Maps/Shapes), and `delete` changes this hidden class, invalidating V8's inline cache (IC) optimizations. All subsequent property accesses on that object become slower.

Changing `delete obj.key` to `obj.key = undefined` reduced the CPU time of the `startViewTransition` method by **over 50%**.

The combined result of these four fixes was dramatic:

| Metric       | v1.150.0  | v1.157.16   | Improvement |
| ------------ | --------- | ----------- | ----------- |
| Throughput   | 427 req/s | 2,357 req/s | **5.5x**    |
| Avg latency  | 424ms     | 43ms        | **9.9x**    |
| p99 latency  | 6,558ms   | 928ms       | 7.1x        |
| Success rate | 99.96%    | 100%        | —           |

Platformatic's independent benchmark reached the same conclusion: under the same load, the success rate improved from 75.5% to 100%, and average latency went from 3,171ms to 13.7ms.

The key point is that all of these improvements were achieved **on top of the same React 19**, purely through framework-layer optimizations. React itself isn't slow — what determines performance is how efficient a layer the framework builds on top of React.

That said, there's a structural limitation to this comparison. The bottlenecks found in TanStack Start (URL parsing, unnecessary reactivity, `delete` operations) were problems specific to TanStack Router, and don't imply that Next.js has the same kinds of bottlenecks. Next.js's main bottleneck — RSC deserialization (`initializeModelChunk`) — stems from a fundamentally different architecture: RSC. You can't simply compare and say "TanStack fixed things quickly, so Next.js can too" — RSC's dual serialization pipeline is a problem of a different magnitude than URL parsing optimization.

Still, this case is meaningful because it empirically demonstrated that SSR performance on the same React can differ by orders of magnitude depending on framework design.

## Does RSC Actually Improve Performance?

The basic premise of React Server Components is "do more work on the server, send less JavaScript to the client, and improve performance." [Nadia Makarevich's empirical study](https://www.developerway.com/posts/react-server-components-performance) rigorously tests this premise.

### Measured Results

| Rendering approach                | LCP (no cache) | LCP (cached) |
| --------------------------------- | -------------- | ------------ |
| CSR (client-side rendering)       | 4.1s           | 800ms        |
| SSR + client data fetching        | 1.61s          | 800ms        |
| Next.js Pages (server data fetch) | 2.15s          | 1.15s        |
| Next.js App Router + Suspense     | **1.28s**      | **750ms**    |

The App Router + Suspense combination shows the best LCP. But you shouldn't just look at these numbers. There are critical conditions and costs hidden underneath.

### RSC Alone Doesn't Improve Performance

Simply adopting Server Components changes nothing. To achieve that 1.28s LCP, you need to **completely redesign your data fetching structure with Suspense boundaries**. On pages where data fetching isn't involved, performance is identical to traditional SSR.

And if Suspense is poorly placed, performance can actually **degrade**. If a slow Server Component sits above other components without a Suspense boundary, it blocks the entire stream. It's the "you can't eat until the slowest dish arrives" situation.

### The Non-Interactive Gap

There's an easily overlooked point. While server rendering makes content visible quickly, **the page is non-interactive until JavaScript loads and hydration completes.** In Makarevich's measurements, this non-interactive gap was **2.52 seconds**. However, since hydration time directly depends on client CPU performance, bundle size, and network conditions, this number is hard to generalize. The original article doesn't specify the exact device or network conditions either. Still, the structural issue that a significant gap exists between LCP (1.28s) and when the page becomes interactive remains valid.

RSC's selective hydration (hydrating only Client Components) mitigates this issue but doesn't fully resolve it. And since this non-interactive time depends on client bundle size and client device performance, it's an area that server optimization cannot reduce.

### The Difficulty of Managing `'use client'` Boundaries

One reason it's hard to fully realize RSC's performance benefits in practice is `'use client'` boundary management. Adding `'use client'` at the top of a shared file promotes that file and all its imports to Client Components.

This itself isn't a flaw of RSC so much as a component design issue. You can keep directly authored components as Server Components and separate Client Components into minimal units to manage boundaries well. But in practice, when using third-party UI libraries like MUI or Chakra, the entire component tree gets pushed to the client. While this is a transitional problem as the library ecosystem hasn't fully adapted to RSC yet, it's important to recognize the gap between the expectation that "adopting RSC automatically shrinks your bundle" and reality.

### The Reality of Server Costs

Adopting RSC means the server does more work. Data fetching that was previously handled by client API calls is now included in every SSR request. In [GitHub Discussion #86081](https://github.com/vercel/next.js/discussions/86081), there's a counterargument that "server rendering overhead is a small percentage compared to DB + business logic costs." The logic is that JSP, PHP, and Rails also generated HTML on every request and worked fine.

But this argument has a prerequisite: sufficient server resources and appropriate caching. Next.js collapsing at 1,000 req/s in the Platformatic benchmark shows the reality of how a "small percentage" of overhead can snowball under load.

## The Hidden Costs of Upgrading to Next.js 16

Performance improvements aren't the whole story. There are cases of unexpected issues after upgrading from Next.js 15 to 16.

### The Price of Per-Segment Prefetching

According to [GitHub Issue #85470](https://github.com/vercel/next.js/issues/85470), Next.js 16 introduced per-segment prefetching. Previously, a single prefetch request was sent for a route, but now **individual requests** are sent for each segment (layout, page) in the route tree. In theory, this allows shared layouts to be fetched once and reused, improving cache efficiency.

But reality was different.

- One user saw requests increase by **roughly 700%**
- Additional costs of over **$800/month** in Edge Requests
- A user who received an unexpectedly large bill got a 25% refund from Vercel
- Users with static exports saw build file counts surge, increasing deploy time from **2 minutes to 10 minutes**

Vercel's official explanation was that it's a trade-off: "more individual prefetch requests, but overall transfer volume decreases." Even if transfer volume decreases, in environments that bill based on request count, this trade-off becomes a cost explosion. Many developers downgraded to Next.js 15.

In Next.js 16.2, an [`experimental.prefetchInlining`](https://nextjs.org/blog/next-16-2) option was added as a mitigation. When enabled, it bundles all segment data for a route into a single response. Request count is reduced, but there's a trade-off of shared layout data being transmitted redundantly. It's still an experimental option.

### Memory: Another Performance Metric

[A blog post by BeyondIT](https://beyondit.blog/blogs/nextjs-16-vs-tanstack-start-data-comparison) claims that in Next.js 16's development environment, processes consume up to 9–10GB of memory, and OOMKilled events are frequent in production Kubernetes environments. It also cites numbers like dev server initial load of 10–12 seconds (TanStack Start: 2–3 seconds), HMR at 836ms (TanStack Start: 335ms), and CI builds being 7x slower. However, these figures come from a single source and have not been independently verified, so they should be treated as anecdotal.

## So, Is It Fast Enough?

Let's synthesize the data covered in this post.

### What Has Improved

- RSC deserialization up to **78% faster** — `JSON.parse` reviver removal (React core)
- **25–60% rendering improvement** in Next.js 16.2 (official benchmark)
- v15 → v16 canary: throughput **2.2x**, latency **83% reduction** (Platformatic benchmark)
- `next dev` startup speed **~400% faster**

### What Remains

- Platformatic benchmark (March 2026, Next.js 16 canary): at 1,000 req/s load, success rate **~64%** (TanStack Start: 100%, React Router: 100%)
- Response size increase due to RSC's double data architecture — a structural characteristic independent of version
- Cannot handle high load without caching
- Request count surge from per-segment prefetching (GitHub Issue #85470)

### Limitations of the Data

Before drawing conclusions, the limitations of the data cited in this post must be acknowledged.

The **Platformatic benchmark** is the most recent and most realistic test, but the original post itself stated that "code inconsistencies were pointed out by readers and results will be updated." Specific numbers may change.

The **eknkc microbenchmark** was last updated in April 2024, and the tested Next.js version is v14–v15 early. I cited it to demonstrate the existence of structural overhead, but how much this gap has narrowed after the February 2026 `JSON.parse` reviver fix has not yet been measured. The exact overhead multiplier for the current version is unknown.

The **BeyondIT comparison** (memory, CI builds, etc.) comes from a single third-party blog source and has not been independently verified.

### Conclusion

A structural gap exists, and its direction converges across multiple data sources. The exact multiplier is still being measured.

Here's what the Platformatic benchmark (March 2026) confirmed: when load-testing the same e-commerce app at 1,000 req/s, TanStack Start achieved 13ms/100% success, while Next.js 16 canary achieved 431ms median/64% success. Numbers may be updated due to code inconsistency issues, but the direction — that Next.js lags behind other frameworks in the same React ecosystem in SSR throughput — is consistent across multiple independent data sources.

**There are structural causes:** A significant portion of this gap originates from the RSC architecture. The double data transmission of the Flight protocol, the deserialization cost of `initializeModelChunk` (fixed but the structure remains), and the cumulative overhead of the framework layer are the causes. The fact that TanStack Start (which doesn't use RSC) and the pre-RSC Pages Router are faster supports this.

**It's improving rapidly:** From v15 to v16 canary, throughput doubled by 2.2x and latency dropped 83%. The proactive stance of contributing performance fixes directly to React core is notable. If this trajectory continues, the gap will narrow.

### "Can't You Just Use Caching?"

This is the first counterargument any reader will raise, and it deserves an honest treatment.

Yes, caching is powerful. Next.js provides sophisticated caching primitives like ISR, `stale-while-revalidate`, and component caching (`experimental.cacheComponents`), and when properly utilized, they can sidestep most of the SSR overhead. The majority of production Next.js apps already use caching aggressively, and in those environments, they likely don't experience the level of performance issues discussed in this post.

Platformatic's reason for excluding caching — "cache hit rates below 5% in e-commerce personalization environments" — is also specific to a particular scenario. Not all e-commerce operates at that level of personalization, and caching is highly effective for content sites and documentation sites.

Even so, there are three reasons why caching doesn't fully resolve this issue.

**First, caching doesn't "solve" SSR performance — it "bypasses" it.** When a cache miss occurs — and cache misses inevitably occur in production — what users experience is the uncached SSR performance. Even on a site with 95% cache hit rate, the remaining 5% of users receive slow responses. The better the framework's baseline performance, the better an experience even that 5% gets.

**Second, caching strategies add complexity.** Setting ISR revalidation intervals, deciding dynamic/static boundaries, cache invalidation for personalized content — these are difficult to configure correctly, and misconfiguration leads to stale data or cache inconsistency issues. If baseline performance is sufficient without caching, this complexity becomes unnecessary.

**Third, the same caching strategies can be applied to other frameworks.** If caching makes Next.js fast, applying the same caching to TanStack Start makes it even faster. Caching is an equal multiplier across all frameworks, so it's a weak argument for justifying baseline performance differences between frameworks.

### When This Benchmark Matters and When It Doesn't

Let's revisit the Platformatic benchmark conditions: 6 CPU cores at 1,000 req/s, no caching. Next.js 16 canary succeeded on only 701 req/s under these conditions — roughly 117 successful req/s per core.

If these conditions are irrelevant to your production environment — for example, if static generation is your primary approach, if ISR serves most requests from cache, or if your concurrent connections are sufficiently low — the numbers in this post are for reference only. Most Next.js apps likely fall into this category, and Next.js works perfectly well in those environments.

However, if the following conditions overlap, you should take this data seriously:

- **High proportion of dynamic SSR**: Personalization, A/B testing, and real-time data result in a low cacheable ratio
- **Strict latency SLAs**: Standards like p95 response time under 500ms
- **Frequent traffic spikes**: Sudden load surges from promotions, events, etc.

If these three conditions overlap and your cache-miss traffic exceeds 100 req/s per core, the Platformatic benchmark's scenario is directly relevant. In this case, evaluating TanStack Start or React Router as alternatives is rational.

Of course, these numbers come from Platformatic's specific test app and infrastructure, so the exact threshold should be determined through your own load testing. What this post provides is not a threshold but a direction — Next.js's uncached SSR performance carries a structural cost, and conditions exist where that cost becomes a problem.

The Next.js team's approach of contributing performance fixes directly to React core (`react#35776`) and accepting external benchmarks is positive. Borrowing Platformatic's words:

> Performance benchmarks capture a moment, not a final judgment.

The numbers in this post are also a snapshot of a moment. But the structural gap that moment reveals is worth watching to see how much the Next.js team narrows it by the next benchmark.

## References

- [Platformatic — React SSR Framework Showdown: TanStack Start, React Router, and Next.js Under Load](https://blog.platformatic.dev/react-ssr-framework-benchmark-tanstack-start-react-router-nextjs)
- [eknkc/ssr-benchmark — Benchmarking JS web framework SSR performance](https://github.com/eknkc/ssr-benchmark)
- [Next.js 16.2 Release Blog](https://nextjs.org/blog/next-16-2)
- [facebook/react#35776 — Walk parsed JSON instead of using reviver for parsing RSC payload](https://github.com/facebook/react/pull/35776)
- [V8 JSON parser source code — v8/src/json/json-parser.cc](https://github.com/v8/v8/blob/main/src/json/json-parser.cc)
- [TanStack Blog — 5x SSR Throughput: Profiling SSR Hot Paths in TanStack Start](https://tanstack.com/blog/tanstack-start-5x-ssr-throughput)
- [Nadia Makarevich — React Server Components: Do They Really Improve Performance?](https://www.developerway.com/posts/react-server-components-performance)
- [The Hidden Performance Costs of React Server Components](https://dev.to/rbobr/the-hidden-performance-costs-of-react-server-components-248f)
- [Tony Alicea — Understanding React Server Components](https://tonyalicea.dev/blog/understanding-react-server-components/)
- [Vercel — How to Optimize RSC Payload Size](https://vercel.com/kb/guide/how-to-optimize-rsc-payload-size)
- [GitHub Issue #85470 — Server requests and latency increased after upgrading from Next.js 15 to 16](https://github.com/vercel/next.js/issues/85470)
- [GitHub Discussion #86081 — Real-world cost of Server Components vs CSR at scale](https://github.com/vercel/next.js/discussions/86081)
- [BeyondIT — Next.js 16 vs TanStack Start: Performance, Memory Leaks & Migration Guide](https://beyondit.blog/blogs/nextjs-16-vs-tanstack-start-data-comparison)
- [Northflank — Why we ditched Next.js and never looked back](https://northflank.com/blog/why-we-ditched-next-js-and-never-looked-back)
- [Radek Pietruszewski — I made JSON.parse() 2x faster](https://radex.io/react-native/json-parse/)
