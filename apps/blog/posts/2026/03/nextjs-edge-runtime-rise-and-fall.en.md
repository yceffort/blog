---
title: 'The Rise and Fall of Next.js Edge Runtime'
tags:
  - nextjs
  - edge-computing
  - serverless
  - web-performance
  - vercel
published: true
date: 2026-03-16 16:24:02
description: 'Hey Edge Middleware, how have you been?'
series: 'The State of Next.js'
seriesOrder: 1
---

## Table of Contents

## Introduction

In 2022, Vercel rapidly expanded the scope of Edge. Following Middleware, they introduced [Edge API Routes](https://nextjs.org/blog/next-12-2#edge-api-routes-experimental) and Edge SSR — extending the ability to run all server-side code in Next.js on the Edge. In their [Edge Functions general availability announcement](https://vercel.com/blog/edge-functions-generally-available), they claimed it was "more efficient and faster than traditional Serverless," citing figures like OG Image generation being 15x cheaper than Serverless. Naturally, the community formed the expectation that Edge would be the future replacement for Serverless.

```ts
// app/api/hello/route.ts
export const runtime = 'edge' // This single line runs it on Edge worldwide

export async function GET() {
  return new Response('Hello from the Edge!')
}
```

Four years later, what happened to that vision? The official Next.js documentation now recommends the Node.js runtime, and the new `proxy` replacing Middleware in Next.js 16 is designed as Node.js only.

This post traces how the Next.js Edge Runtime emerged, why it retreated, and what we can learn from the process.

## Timeline: The Rise and Retreat of Edge

### October 2021 — The Arrival of Middleware

[Middleware](https://nextjs.org/blog/next-12#introducing-middleware) was introduced as a beta feature in Next.js 12. It was code that runs on the Edge before a request reaches a route, intended for use cases like A/B testing, geo-based redirects, and authentication checks. The key selling point was instant execution with no cold start, thanks to V8 Isolates.

```ts
// middleware.ts (Next.js 12 beta)
export function middleware(req: NextRequest) {
  const country = req.geo?.country
  if (country === 'KR') {
    return NextResponse.rewrite(new URL('/ko', req.url))
  }
}
```

Middleware was a success. Running request-level routing logic on the Edge was a reasonable use case, and it delivered tangible performance improvements.

### 2022 — The Year of Edge Expansion

[Edge API Routes](https://nextjs.org/blog/next-12-2#edge-api-routes-experimental) were introduced experimentally in Next.js 12.2, and [Edge Functions reached general availability](https://vercel.com/blog/edge-functions-generally-available) in December of that year. With Next.js 13 and the App Router, declaring `export const runtime = 'edge'` allowed even Server Components to render on the Edge.

In the GA announcement, Vercel positioned Edge Functions as "more efficient and faster compute compared to traditional Serverless," advising developers to choose their execution environment based on performance and cost characteristics. But the rapid expansion of Edge's scope — from Middleware to API Routes to SSR — was itself the message. The community's expectation that "Edge will replace Serverless" grew.

### 2023 — Collision with Reality

As the App Router stabilized, more teams attempted to adopt Edge Runtime in production. That's when the problems surfaced.

Representative complaints from GitHub Issues included:

- [Prisma doesn't work on Edge](https://github.com/prisma/prisma/issues/21310) — Can you build an app without an ORM?
- [next-auth (Auth.js) can't fully support Edge](https://github.com/nextauthjs/next-auth/issues/9702) — Can you build an app without authentication?
- Core Node.js modules like `crypto`, `fs`, `net` are unavailable — the majority of existing npm packages don't work

Our team also went through considerable trouble when experimentally adopting Middleware. And as many people are well aware, Next.js was never known for quickly resolving complaints or issues raised by the community. Frustrations grew, and as I recall, it was around this time that the community's enthusiasm cooled dramatically.

### 2024 — The Quiet Retreat

In mid-2024, Vercel announced [Fluid Compute](https://vercel.com/blog/introducing-fluid-compute). It virtually eliminated Serverless Function cold starts and enabled a single instance to handle multiple requests concurrently. The very raison d'être of Edge Runtime — "fast responses without cold starts" — could now be achieved with the Node.js runtime.

The tone of the official Next.js documentation shifted as well. The [v14 docs](https://nextjs.org/docs/14/app/building-your-application/rendering/edge-and-nodejs-runtimes) presented Edge Runtime as "Lowest latency" and "Highest scalability," comparing it neutrally with Node.js. But the [v16 docs](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#runtime) now explicitly state: "We recommend using the Node.js runtime for rendering your application."

### 2025–2026 — The Quiet Exit

`export const runtime = 'edge'` was never officially declared "deprecated." The [Next.js documentation](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#runtime) still lists `'nodejs' | 'edge'` as valid options. However, the same page advises:

> We recommend using the Node.js runtime for rendering your application.

And a more telling change arrived in Next.js 16. `middleware.ts` was [renamed to `proxy.ts`](https://nextjs.org/docs/app/guides/upgrading/version-16), and **the new `proxy` is designed as Node.js only.** You can keep using `middleware.ts` to stay on the Edge runtime, but the direction of the framework is clear.

> The `edge` runtime is **NOT** supported in `proxy`. The `proxy` runtime is `nodejs`, and it cannot be configured. If you want to continue using the `edge` runtime, keep using `middleware`.

Why did this happen? Middleware was originally meant for lightweight routing — redirects, header manipulation, geo-detection. But in practice, developers needed to do things like authentication (requiring DB access for session validation), logging (Pino/Winston unavailable), and encryption (`crypto` unavailable). Due to Edge's constraints, workaround patterns like calling a separate `/api/authenticate` endpoint from within Middleware became rampant. Community frustration poured into a [GitHub Discussion](https://github.com/vercel/next.js/discussions/71727), and Lee Robinson himself [acknowledged](https://github.com/vercel/next.js/discussions/71727) that "Middleware's intent was quick redirects, rewrites, headers/cookies — not blocking data fetching." But real-world demands couldn't be ignored. The Next.js team experimentally introduced the Node.js runtime for Middleware in v15.2, then renamed it to `proxy` in v16 and made it Node.js only.

On top of this, the [proxy.js documentation](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) signals a plan to reduce the use of Middleware (proxy) itself:

> Middleware is highly capable, so it may encourage the usage; however, this feature is recommended to be used as a last resort.

"Middleware is so powerful that it's prone to misuse. Use it only as a last resort when no other option exists." This is a declaration that they intend to provide APIs that achieve the same goals without Middleware.

Edge's flagship use case, Middleware, still runs on Edge. But its successor, `proxy`, is Node.js only and has been demoted to a last resort. There's no official deprecation announcement, but Edge Runtime's scope is progressively shrinking.

## Why It Failed to Become a General-Purpose Runtime (1): Half-Baked Node.js Compatibility

Edge Runtime is [based on Web APIs](https://edge-runtime.vercel.app/) and cannot use Node.js APIs. The fact that you could only use standard Web APIs like `Request`, `Response`, and `fetch` was marketed as a "feature," but in practice it was a fatal limitation.

### Disconnect from the npm Ecosystem

A large portion of npm packages depend on Node.js built-in modules. `fs`, `path`, `crypto`, `net`, `child_process` — if a package imports even one of these, it doesn't work on Edge.

Core libraries that didn't work on Edge:

| Library                 | Reason                         | Impact                        |
| ----------------------- | ------------------------------ | ----------------------------- |
| **Prisma**              | Depends on `fs`, `path`, `net` | No ORM                        |
| **bcrypt**              | C++ native addon               | No password hashing           |
| **jsonwebtoken**        | Depends on Node.js `crypto`    | No JWT verification           |
| **Auth.js (next-auth)** | Depends on the above           | Authentication system blocked |
| **winston/pino**        | Depends on `fs`, `stream`      | No structured logging         |
| **sharp**               | Native addon (libvips)         | No image processing           |

Looking at this list, one might wonder what you _could_ do on Edge. Database access, authentication, image processing, logging — most fundamental features of a web application were blocked.

### The Rise and Confusion of "Edge-compatible" Versions

Some libraries created separate Edge-compatible versions. Prisma's [Edge Client](https://www.prisma.io/docs/orm/prisma-client/deployment/edge/overview), Auth.js's Edge support, and so on. But this fragmented the ecosystem.

```ts
// Node.js environment
import {PrismaClient} from '@prisma/client'

// Edge environment
import {PrismaClient} from '@prisma/client/edge'
```

Same functionality, different import paths. Edge-compatible versions had reduced features or required additional configuration (connection pool URLs, etc.). Developers had to branch their code based on the runtime, adding maintenance burden.

## Why It Failed to Become a General-Purpose Runtime (2): Data Isn't at the Edge

Even if you worked around the compatibility issues, a more fundamental structural problem remained: **the latency paradox.**

The promise of Edge was simple: if a user in Seoul has their request processed by an Edge node in Seoul, there's no need for a round trip to a server in US East. In theory, this is correct — **when serving static content.**

The problem is that real-world web applications almost always **access a database.** And the database isn't at the Edge. In most cases, it's concentrated in one or two regions.

```
[User: Seoul] → [Edge Node: Seoul] → [DB: us-east-1]
                  ↑ Code runs here          ↑ Data lives here
                  RTT: ~2ms                 RTT: ~150ms
```

Code execution happens in Seoul, but fetching data still requires a round trip to the US. **The latency bottleneck was data access, not code execution.** The 2ms saved by running on Edge was meaningless against the 150ms DB round trip.

In contrast, a Node.js Serverless Function can be co-located with the DB:

```
[User: Seoul] → [Serverless: us-east-1] → [DB: us-east-1]
                  RTT: ~150ms                RTT: ~2ms
```

Total latency was comparable, or when multiple DB queries were needed, Serverless was actually faster. For N+1 query patterns, Edge was disastrous:

```
Edge:    150ms × N (cross-ocean trip per query)
Node.js: 150ms + 2ms × N (first request crosses the ocean, rest are local)
```

### "Then Why Not Pin Edge to the DB Region?"

A natural question arises: couldn't you pin the Edge Function to the same region as the DB to get the best of both worlds? Vercel did in fact offer [Regional Edge Functions](https://vercel.com/changelog/regional-edge-functions-are-now-available) that could be configured to run only in a specific region.

But doing so eliminates the very reason Edge exists. The core value of Edge is **global distributed deployment.** The moment you pin it to a specific region, it's just "a Serverless Function with the constraint of only being able to use Web APIs." There's no reason to choose Edge Runtime while giving up Node.js's full API surface and npm ecosystem.

In summary, the dilemma was:

- **Global distributed deployment** → Leverages Edge's advantage, but creates DB latency issues
- **Pinned to DB region** → Solves DB latency, but eliminates Edge's advantage

Either way, Edge Runtime struggled to offer a clear benefit over Node.js Serverless.

### It's Not Just Latency: The Connection Management Problem

The difficulty of databases on Edge isn't just about latency. There's also the **connection management** problem. Traditional servers maintain a connection pool with the database, reusing connections across requests. But Edge Isolates are short-lived. When the request ends, the Isolate disappears, and so does the connection. Every request has to establish a new TCP connection.

```
Traditional Server:
[Server Start] → [Create Connection Pool (5)] → Reuse per request

Edge Isolate:
Request 1 → [Create Connection] → [Query] → [Close Connection]
Request 2 → [Create Connection] → [Query] → [Close Connection]  ← Created fresh every time
```

To solve this, HTTP-based DB drivers emerged. [Prisma Data Proxy](https://www.prisma.io/docs/orm/prisma-client/deployment/edge/overview), [Neon HTTP driver](https://neon.tech/docs/serverless/serverless-driver), [PlanetScale HTTP driver](https://planetscale.com/docs/tutorials/planetscale-serverless-driver), and the like. These send queries via HTTP requests instead of TCP connections. But this adds yet another proxy layer, and the usage differs from conventional ORMs.

Vercel's own [Sam Lambert (former PlanetScale CEO)](https://x.com/isamlambert) acknowledged this problem:

> "If your data isn't at the edge, your compute shouldn't be either."

## Why It Failed to Become a General-Purpose Runtime (3): Fluid Compute Eliminated Its Reason to Exist

The core selling points of Edge Runtime boiled down to two things:

1. **No cold starts**: Instant execution based on V8 Isolates
2. **Global distribution**: Execution close to the user

Point 2 was neutralized by the data latency paradox, and point 1 was addressed by Vercel's [Fluid Compute](https://vercel.com/blog/introducing-fluid-compute).

Fluid Compute was announced in February 2025 as Vercel's new compute model. Positioned between traditional Serverless and dedicated servers, Vercel describes it as "high-performance mini servers." The core ideas are threefold:

1. **Instance reuse**: After a function sends a response, it doesn't immediately shut down — it waits. When the next request comes in, the already-warm instance handles it.
2. **Concurrency**: A single instance can handle multiple requests simultaneously, accepting new requests during I/O idle time.
3. **Fast initialization**: With a Rust-based runtime and bytecode caching, even when cold starts occur, initialization time is reduced.

```
Traditional Serverless:
Request 1 → [Cold Start + Execute] → Terminate
Request 2 → [Cold Start + Execute] → Terminate  ← Cold start every time

Fluid Compute:
Request 1 → [Cold Start + Execute] → Wait
Request 2 → [Execute] → Wait                    ← No cold start
Request 3 → [Execute] → Wait                    ← No cold start
```

Vercel [claims](https://vercel.com/blog/introducing-fluid-compute) this can reduce compute costs by up to 85%. The Fluid Compute announcement didn't directly mention replacing Edge Runtime, but the result was that Edge's key advantage — "fast responses without cold starts" — could now be achieved in a Node.js environment. With full access to Node.js APIs and the npm ecosystem.

## Is Edge Completely Dead?

Edge Runtime has retreated in Next.js, but Edge Computing itself is not dead. In fact, it's thriving elsewhere.

### Cloudflare Workers: Same Edge, Different Outcome

Cloudflare Workers is also V8 Isolate-based Edge Computing. The technical foundation is identical to Vercel's Edge Runtime. Yet Cloudflare hasn't retreated. Where did the difference come from?

**First, they brought the data to the Edge.** The biggest reason Next.js Edge Runtime failed was "data isn't at the Edge." Cloudflare solved this at the infrastructure level.

- [D1](https://developers.cloudflare.com/d1/) — An SQLite database accessible from the Edge. It runs in the same location as Workers, eliminating DB query latency.
- [KV](https://developers.cloudflare.com/kv/) — A globally distributed key-value store. Optimized for reads, suitable for configuration and feature flags.
- [Durable Objects](https://developers.cloudflare.com/durable-objects/) — A construct designed to solve the hardest problem in Edge environments: distributed state management. Each Object has a unique ID and runs in a single location while maintaining state. It enables use cases like real-time collaboration, chat, and gaming to be handled at the Edge.
- [R2](https://developers.cloudflare.com/r2/) — S3-compatible object storage with zero egress costs.

Vercel's Edge Runtime put only compute on the Edge and relied on existing infrastructure (AWS RDS, PlanetScale, etc.) for data. Cloudflare put both compute and data on the Edge. This difference was decisive.

**Second, they incrementally achieved Node.js compatibility.** Cloudflare also started as Web API only, but over [the course of 2025, they natively implemented 11 core Node.js modules](https://blog.cloudflare.com/nodejs-workers-2025/) (`node:crypto`, `node:fs`, `node:http`, `node:net`, etc.). Not polyfills — native implementations in C++/TypeScript directly in the runtime. As a result, frameworks like Express and Koa, and major npm packages like jsonwebtoken, passport, and knex, now work on Workers. This stands in stark contrast to Vercel's Edge Runtime, which maintained the "Web APIs only" constraint.

**Third, they own the infrastructure.** Cloudflare operates its own network in over 330 cities worldwide as a CDN provider. Adding Edge nodes is the business itself, and Workers run on top of that infrastructure. Vercel, on the other hand, is a platform built on AWS. The more they expand Edge, the more they pay AWS. Cloudflare, which owns its infrastructure, and Vercel, which rents it, had fundamentally different economic incentives regarding Edge.

In summary, Cloudflare's approach was not "let's run existing Node.js apps on Edge" but "let's build an Edge-native stack from the ground up." Compute, data, compatibility, infrastructure — they addressed all four, which is why the same Edge produced a different outcome.

### Turso/libSQL: Distributed Database

[Turso](https://turso.tech/) is an Edge database based on SQLite, using read replicas deployed to Edge locations worldwide. Writes go to the primary region, but reads are served from the nearest replica.

```
[User: Seoul] → [Edge Node: Seoul] → [Turso Read Replica: Seoul]
                                      RTT: ~2ms ✓
```

With this approach, Edge Computing can actually deliver on its latency promise. That said, the ecosystem is still maturing, and write operations remain limited.

## Lessons: How Far Should You Follow the Tech a Platform Pushes?

Several lessons can be drawn from the history of Next.js Edge Runtime.

### 1. Read the Vendor's Incentives

Consider why Vercel pushed Edge so aggressively. Edge Computing was favorable to Vercel's business model. Edge Functions **consume fewer resources** than Node.js Serverless (V8 Isolates are lighter than a full Node.js runtime), and **global distribution** improves infrastructure utilization. When technical superiority and business incentives align, tech companies tend to overvalue that technology.

This isn't unique to Vercel.

- **Google and AMP**: Google pushed AMP under the banner of mobile web performance, but AMP pages were served from Google's cache servers, routing traffic through Google. By favoring AMP pages in the search results top carousel, they effectively forced adoption, leaving publishers under pressure that "not using AMP means penalties in search visibility." They ultimately [dropped the AMP preference in 2021](https://developers.google.com/search/blog/2021/04/more-details-page-experience), and AMP adoption plummeted.
- **The Serverless-for-everything narrative**: When AWS Lambda arrived, there was a wave of "make everything Serverless." No server management, auto-scaling, pay-per-use — attractive promises. But real-world constraints like cold starts, execution time limits, no local state, and debugging difficulties emerged, and most teams settled on hybrid architectures mixing Serverless with traditional servers. The arc from "everything on Edge" to "Edge only where appropriate" follows this exact pattern.

### 2. Distinguish "Theoretically Fast" from "Actually Fast"

Edge Runtime is theoretically fast — it runs close to the user. But real application performance is determined not by a single network hop but by the **entire request chain.** DB queries, external API calls, auth verification — end-to-end latency including all of these must be measured.

When adopting new technology, always check **under what conditions** the benchmarks were measured. "Hello World responds in 5ms on Edge" has nothing to do with actual production performance.

### 3. Ecosystem Compatibility Is Non-Negotiable

No matter how good a runtime is, if it's not compatible with the existing ecosystem, adoption will be difficult. Just as Deno learned this lesson and strengthened its Node.js compatibility, Edge Runtime's failure to achieve Node.js API compatibility was fatal.

Cloudflare recognized this too, and is adding a [Node.js compatibility layer](https://developers.cloudflare.com/workers/runtime-apis/nodejs/) to Workers — progressively supporting `node:crypto`, `node:buffer`, `node:stream`, and more. The future of runtimes may not be "new APIs" but "existing APIs running anywhere."

### 4. Don't Broadly Apply a Narrow Success

Middleware was a success story for Edge. It's lightweight, doesn't need a database, has minimal dependencies, and runs on every request where low latency matters. It's a use case where Edge Computing's advantages fit perfectly.

The problem was seeing this success and extrapolating: "Then why not run API Routes and SSR on Edge too?" But the conditions that made Middleware successful — no DB needed, minimal npm dependencies, lightweight logic — don't apply to most server-side code. API Routes need database access, and SSR uses all sorts of libraries.

This pattern repeats itself in software engineering. Microservices worked at Netflix, so a 10-person team adopts microservices. Monorepos worked at Google, so every organization adopts monorepos. Success under specific conditions exists because of those conditions, not because the technology is universally superior. Before adopting a technology, always ask: "Do the conditions that made this technology succeed apply to us?"

## Conclusion

The history of Next.js Edge Runtime is not a "failure of technology" but a story of "overexpansion and contraction of scope." Edge Computing remains a valid technology, and as we've seen with Middleware, OG Image generation, static content serving, and Cloudflare's Edge-native stack, it's still powerful in the right use cases. The problem was trying to extend success in specific use cases into a general-purpose runtime.

What we should remember is this: **A technology's value is determined by the scope of problems it solves, not by the positioning a platform assigns to it.** The next time some technology is pushed as a silver bullet, just recall the lessons of Edge Runtime.
