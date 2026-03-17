---
title: 'Why Cloudflare Rebuilt Next.js'
tags:
  - nextjs
  - cloudflare
  - edge-computing
  - vite
  - reverse-engineering
published: true
date: 2026-03-17 20:07:31
description: 'What question does vinext really ask?'
series: 'The State of Next.js'
seriesOrder: 2
---

## Table of Contents

## Introduction

The core of vinext is not "AI built it in a week." The core is that Cloudflare declared a strategic shift — instead of continuing to rely on adapters and reverse engineering that interpret undocumented build outputs, they would directly reimplement the public API surface of Next.js.

As covered in the [previous post](/2026/03/nextjs-edge-runtime-rise-and-fall), Cloudflare had completed its Edge-native infrastructure, but one puzzle piece was missing: developer experience. Most modern frameworks provide adapters — official interfaces that transform build outputs for each deployment platform. Swap the adapter, and the same code deploys to Cloudflare, AWS, or Netlify. Next.js had no such mechanism. When Next.js builds, it generates server functions, static assets, and caches in a `.next` directory whose format is designed for Vercel's infrastructure and is not officially documented. Running a Next.js app on other platforms like Cloudflare or Netlify required analyzing undocumented internal structures and converting them to fit each platform. And since these structures changed without notice on every Next.js version bump, maintaining the conversion code became a constant burden. In February 2026, Cloudflare released [vinext](https://github.com/cloudflare/vinext) — a project that reimplements Next.js's public API surface on top of Vite. This post examines the structural background behind vinext's emergence, how it differs from the existing approach (OpenNext), what "built with AI" actually means, and the questions this attempt raises for the open-source ecosystem.

## Why Is Next.js Hard to Deploy Outside Vercel?

Next.js is open source, but its build output is designed for Vercel's infrastructure.

### There Were No Adapters

Remix, Astro, SvelteKit, Nuxt — most modern frameworks support the adapter pattern. They provide official interfaces for transforming build outputs per platform, so swapping an adapter is all it takes to deploy to Cloudflare Workers, AWS Lambda, or Netlify.

Next.js had none of this. The format of build outputs generated in the `.next` directory was undocumented and changed without notice between versions. Deploying to any platform other than Vercel required reading these private outputs and reprocessing them to fit the target platform.

Netlify [publicly acknowledged](https://www.netlify.com/blog/how-we-run-nextjs/) the severity of this problem:

> Next.js builds use a private, largely undocumented format that is subject to change.

Netlify even had to build a tool called `nextjs-sentinel`[^1] that automatically monitors changes in Next.js's canary branch. They were running a dedicated engineering team just to support a single framework.

### The Undocumented `minimalMode` Flag

Next.js's server has an undocumented setting called [`minimalMode`](https://github.com/vercel/next.js/discussions/29801). This mode, activated only when deploying on Vercel, disables some of the framework's core features and replaces them with Vercel's private infrastructure code. The ability to split Middleware from the application and run it at the Edge was made possible by `minimalMode` — but only Vercel had access to it.

Netlify's [Eduardo Boucas analyzed this problem in detail](https://eduardoboucas.com/posts/2025-03-25-you-should-know-this-before-choosing-nextjs/):

> This secret minimal mode is what allowed Vercel to break out middleware from the rest of the application so they could run it at the edge, but only Vercel has access to it.

### Removal of `target: 'serverless'`

Next.js originally had a `target: 'serverless'` configuration. With this setting, apps could be deployed to any serverless platform. In October 2022, Vercel [removed this option](https://github.com/vercel/next.js/pull/41495). The official target for general-purpose serverless deployment disappeared, and from that point on, supporting other platforms effectively depended on separate adapters and reverse engineering.

### Non-Standard Cache Headers

Until v15, Next.js emitted `stale-while-revalidate` headers that did not conform to [RFC 5861](https://datatracker.ietf.org/doc/html/rfc5861)[^6]. The spec requires `stale-while-revalidate=<delta-seconds>`, but Next.js output `s-maxage=SECONDS, stale-while-revalidate` without a value. Vercel's CDN handled this non-standard format internally[^7], but other CDNs like AWS CloudFront simply ignored the header. This was fixed in Next.js 15 with the introduction of the [`expireTime`](https://nextjs.org/docs/app/api-reference/config/next-config-js/expireTime) setting, which added a default delta-seconds value of one year[^8].

### The ISR Caching Trap

[ISR (Incremental Static Regeneration)](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration) is one of Next.js's core features. This mechanism for periodically regenerating static pages "just works" on Vercel. But in self-hosted environments, the default is a file-system-based cache, which means multiple instances end up with different caches. Implementing a custom `cacheHandler` for consistent caching required integration code with an external store like Redis.

Synthesizing the facts covered so far, two things are verifiable. First, Next.js's deployment surface operated for a long time without an official adapter pattern. Second, as a result, other platform providers bore a high maintenance cost of reading and converting internal outputs. Whether this was intentional lock-in or a byproduct of prioritizing optimization for their own platform is difficult to determine from the outside. But the conclusion that **an asymmetry in deployment experience existed between Vercel and other platforms** is hard to deny.

## OpenNext: Choosing Reverse Engineering

[OpenNext](https://opennext.js.org/) emerged to reduce this friction.

### What Is OpenNext?

OpenNext is an open-source project that converts Next.js build outputs so they can run on platforms other than Vercel. Created in December 2022 by the [SST (Serverless Stack)](https://sst.dev/) team, it was originally designed for AWS Lambda deployment but later expanded into a multi-platform project as Cloudflare and Netlify built their own adapters.

- [opennextjs-aws](https://github.com/opennextjs/opennextjs-aws) — AWS Lambda adapter
- [opennextjs-cloudflare](https://github.com/opennextjs/opennextjs-cloudflare) — Cloudflare Workers adapter

### How It Works

OpenNext operates as follows:

1. Run `next build` in standalone mode to generate the `.next` directory
2. Parse the output and convert it into platform-specific deployment artifacts

Taking AWS as an example:

```
.next/ (Next.js build output)
  ↓ OpenNext conversion
.open-next/
  ├── server-function/    → Lambda function (NextServer wrapper)
  ├── image-function/     → Dedicated image optimization Lambda
  ├── revalidation-function/ → ISR revalidation Lambda
  ├── warmer-function/    → Cold start prevention Lambda
  ├── assets/             → Static files for S3 upload
  └── cache/              → DynamoDB-based cache
```

The key point is that it uses Next.js's `NextServer` as-is. OpenNext repackages build outputs for the target platform — it does not replace Next.js itself.

### The Limits of Reverse Engineering

This approach has a fundamental vulnerability: **the stability of Next.js's internal build output format is not guaranteed.**

Cloudflare's engineering blog [directly acknowledged this](https://blog.cloudflare.com/vinext/):

> Because OpenNext has to reverse-engineer Next.js's build output, this results in unpredictable changes between versions that take a lot of work to correct.

Specific issues include:

- Build output formats change without notice in Next.js minor/patch releases
- There is a lag before the OpenNext adapter supports new versions, preventing immediate adoption of the latest Next.js
- The introduction of Turbopack builds broke existing adapters
- `next dev` only runs on Node.js, so platform-specific features (Cloudflare KV, etc.) cannot be tested during development

Cloudflare, Netlify, and AWS Amplify all had to maintain their own patch stacks and fallback logic. Every Next.js update triggered a "whack-a-mole" response cycle.

### Deployment Adapters API — Late but Official

In April 2025, Vercel announced the [Deployment Adapters RFC](https://github.com/vercel/next.js/discussions/77740). Designed by a working group that included Netlify, Cloudflare, AWS Amplify, and OpenNext, this standard adapter API was introduced as alpha in Next.js 16.

```js
// next.config.js
const nextConfig = {
  experimental: {
    adapterPath: require.resolve('./my-adapter.js'),
  },
}

module.exports = nextConfig
```

Adapters use `modifyConfig()` to adjust build settings and `onBuildComplete()` to receive structured build output (route information, asset mappings, function metadata, etc.) and generate platform-specific deployment artifacts. Per the [Next.js documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/adapterPath), it still sits under `experimental`, and Vercel has [open-sourced its own adapter](https://github.com/nextjs/adapter-vercel), stating they "use the same API."

Once this API matures, it could reduce the need for reverse-engineering projects like OpenNext. However, it is still in alpha, and there are no plans to backport it to older Next.js 15 and below versions. As of March 2026, it is too early to rely solely on this API.

## vinext: Reimplementation Instead of Reverse Engineering

If OpenNext's approach was "reverse-engineering Next.js build outputs," vinext made a fundamentally different choice: **reimplementing Next.js's public API surface on top of Vite.**

### What Is vinext?

[vinext](https://github.com/cloudflare/vinext) is a Vite plugin released by Cloudflare in February 2026. It reimplements Next.js's routing, SSR, RSC (React Server Components), Server Actions, caching, Middleware, and `next/*` module imports on a Vite foundation.

- GitHub: [cloudflare/vinext](https://github.com/cloudflare/vinext)
- Official site: [vinext.io](https://vinext.io/)
- License: MIT
- Deployment targets: Cloudflare Workers is the first native target, but the README states that deployment to Vercel, Netlify, AWS, Deno Deploy, and others is possible via [Nitro](https://nitro.build/). However, the substance of this claim is limited. Cloudflare reportedly succeeded in a PoC deploying to Vercel "in 30 minutes"[^3], and a [PR for Netlify deployment](https://github.com/cloudflare/vinext/pull/76) exists but remains in DRAFT status with the author warning "do not use this in production as I have not reviewed the code." [Clever Cloud](https://www.clever.cloud/blog/engineering/2026/02/25/how-we-deployed-a-vinext-application/) has deployed to their own platform, but independently verified cases on AWS or Deno Deploy are hard to find. Saying it is Cloudflare-first rather than Cloudflare-only is technically accurate, but non-Cloudflare platform support remains experimental at this point.

Initial benchmark figures [presented by Cloudflare](https://blog.cloudflare.com/vinext/):

| Metric                              | vinext                | Next.js                |
| ----------------------------------- | --------------------- | ---------------------- |
| **API compatibility** (per README)  | 94% of Next.js 16 API | -                      |
| **Build speed** (33-route test app) | 1.67s                 | 7.38s (4.4x slower)    |
| **Client bundle size** (gzip)       | 72.9 KB               | 168.9 KB (2.3x larger) |
| **Tests**                           | 1,700+ unit + 380 E2E | -                      |

These figures are initial benchmarks based on a specific test app (33 routes) published by Cloudflare. There is no independent third-party verification yet, and results may vary depending on app scale and configuration.

### The Depth of the RSC Reimplementation

When vinext claims to have "reimplemented the Next.js API," the biggest technical challenge was likely RSC (React Server Components). RSC involves complex runtime behaviors — server/client boundaries, streaming rendering, Server Actions — that cannot be solved by simple API mapping.

vinext's RSC implementation is built on `@vitejs/plugin-rsc` (Vite's official RSC plugin) and uses three independent module graphs:

- **RSC environment**: Renders Server Components and produces RSC streams
- **SSR environment**: Receives RSC streams and generates HTML
- **Client environment**: Performs hydration in the browser

`"use client"` and `"use server"` boundaries work correctly, and Suspense integration with streaming SSR is supported. Server Actions (form submissions, mutations, `redirect()`, FormData handling) also work. `generateMetadata()` and dynamic OG images are supported.

However, `@vitejs/plugin-rsc` itself is still in its early stages, and there are structural constraints requiring explicit state transfer at the RSC/SSR environment boundary. Partial Prerendering (PPR) is not supported, and the `"use cache"` directive is experimental.

### Structural Differences from OpenNext

The difference between these two projects is not merely about implementation approach — **the direction of dependency** is different.

```
OpenNext:
  next build → .next/ (private output) → OpenNext conversion → platform deployment
  ⚠️ Breaks if .next/ format changes

vinext:
  vinext build (Vite) → platform deployment
  ✓ Depends only on Next.js public API contract
```

|                             | OpenNext                                       | vinext                                |
| --------------------------- | ---------------------------------------------- | ------------------------------------- |
| **Approach**                | Build output reverse engineering               | Public API reimplementation           |
| **Build tool**              | Uses Next.js (Turbopack) as-is                 | Fully replaced by Vite                |
| **Next.js dependency**      | Directly depends on `next build`               | No dependency on Next.js code         |
| **Version tracking burden** | Must respond to internal changes every release | Only responds when public API changes |
| **Maturity**                | Production-proven                              | Experimental, security issues exist   |

OpenNext runs the `next-server` binary directly, so all Next.js features work — but it is vulnerable to internal structure changes. vinext uses no Next.js code at all, so it is unaffected by internal changes — but the remaining 6% beyond 94% API compatibility could be problematic.

### The Other 6% Beyond 94%

The practical value of vinext depends on what falls within the 6% not covered by "94% compatible with the Next.js API." The missing features can be categorized as follows:

**Intentionally excluded** — features with low relevance in the Next.js ecosystem or replaced by Vite:

- `next/amp` (AMP support)
- Webpack/Turbopack-related config (replaced by Vite)
- Vercel-specific features: Edge Config, Vercel Analytics, `@vercel/og`
- Legacy `next export` CLI
- `experimental.typedRoutes`

**Practically problematic** — features commonly used in production apps:

| Unsupported/partially supported feature                    | Impact                                                                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `next/image` optimization                                  | Replaced by `@unpic/react`. No build-time image optimization or responsive image generation. Requires `images: { unoptimized: true }` |
| `font.variable` in `next/font/local`                       | CSS custom property injection breaks. Affects apps using CSS variables for typography                                                 |
| `next-auth` / `@clerk/nextjs`                              | Depends on Next.js internal API route handlers; does not work                                                                         |
| `generateStaticParams()` build-time prerendering           | Only works via ISR on first request. Cold start latency on initial visits                                                             |
| `styled-components` / `@emotion/react`                     | Partially supported due to unimplemented `useServerInsertedHTML()`                                                                    |
| Workers runtime constraints (`fs`, `net`, `child_process`) | Restricts apps requiring server-side file processing                                                                                  |

Among these, `next/image` and `next-auth` are frequently cited as unsupported, but neither is necessarily fatal. Image optimization can be handled by Cloudflare Images or external CDNs (Cloudinary, imgix), and authentication can be worked around with Auth.js (the framework-agnostic version of next-auth) or other services. Migrating existing Next.js apps will involve friction, but for new projects, alternatives can be chosen from the start. While 94% looks high as API surface coverage, whether the remaining 6% affects your specific project requires direct verification.

An important caveat: while Cloudflare's official messaging leans toward "there are already production use cases," the [vinext README](https://github.com/cloudflare/vinext) itself classifies the project as experimental software and presents OpenNext as the safer choice in terms of maturity. There is a tonal gap between the blog and the README. Teams considering vinext for production at this point would be wise to take the README's warnings as their baseline rather than the blog's optimism.

### Traffic-aware Pre-Rendering

vinext also includes a feature that Next.js does not have. **Traffic-aware Pre-Rendering (TPR)** analyzes Cloudflare's zone analytics data to selectively prerender only the pages that actually receive significant traffic. Rather than prerendering every page, it optimizes based on real access patterns. This is possible because Cloudflare has direct access to its own CDN data.

## What "Built with AI" Actually Means

The biggest reason vinext made headlines was the announcement that "it was built with AI in one week." The Cloudflare blog title was literally ["How we rebuilt Next.js with AI in one week"](https://blog.cloudflare.com/vinext/), so this was understandable. But looking at the reality, this was not simple vibe coding.

### Who Built It and How

vinext was built by **Steve Faulkner**, Cloudflare's Director of Engineering. The AI model used was **Claude** (Anthropic), and it went through over 800 AI coding sessions. The API token cost was approximately $1,100[^2].

Faulkner's role was not writing code directly but rather **making architecture decisions, setting priorities, and course-correcting when the AI headed in the wrong direction.** He spent the first few hours defining the architecture with Claude, then entered a cycle where the AI would implement features and pass tests.

> "The AI can hold the whole system in context, but I had to course-correct regularly." — Steve Faulkner[^2]

### Why This Task Was Well-Suited for AI

The key reason vinext could be built with AI was that Next.js had already published an **extensive test suite**.

[An analysis by paddo.dev](https://paddo.dev/blog/vinext-test-suites-are-specs/) nailed this point: Next.js's 2,000+ unit tests and 400+ E2E tests[^5] were effectively an **executable specification**. AI is far better at passing tests than reading and interpreting documentation. When there is a clear contract — "this input should produce this output" — AI can efficiently generate code that satisfies it.

```
Traditional AI coding:
  Ambiguous requirements → AI "guesses" code → Human verifies

vinext:
  Next.js test suite (clear contract) → AI writes code to fulfill contract → Tests auto-verify
```

The conditions that made this structure possible were likely:

1. **Clear API contracts**: Next.js's public API is well-defined. The behavior of `next/router`, `next/image`, `next/link`, etc., is unambiguous.
2. **Extensive test suite**: Over 2,000 tests define expected behavior in code. The AI just needed to pass them one by one.
3. **Independent module structure**: Features like routing, SSR, RSC, and caching are relatively independent, enabling parallel implementation.
4. **Existence of a reference implementation**: The Next.js source code itself is public, so ambiguous behavior could be cross-referenced.

In short, this was not "AI built a framework" but rather **"AI was able to generate an implementation because well-defined specs and tests existed."** Well-documented APIs and comprehensive test suites served as the specification for the AI.

The key takeaway from this event is not "AI is an omnipotent tool." It is that **software with a public specification is beginning to see its implementation commoditized.** Granted, the level of polish is not comparable to Next.js. But it demonstrated that the more explicit the API contract and the more comprehensive the tests, the more dramatically the cost of creating an implementation can drop. That vinext was built for $1,100 also means the "implementation cost" of the Next.js API has fallen to that level.

## Security: A v1 Problem, or an AI Code Problem?

Two days after vinext's release, Vercel CEO [Guillermo Rauch disclosed 7 security vulnerabilities](https://x.com/rauchg/status/2026864132423823499) — 2 Critical, 2 High, 2 Medium, and 1 Low. These included SSRF, authentication bypass, missing security headers, and path parsing errors.

Subsequently, the AI security tool [Hacktron](https://www.hacktron.ai/blog/hacking-cloudflare-vinext) discovered an additional 45 vulnerabilities, of which 24 were manually verified, including 4 Critical and 6 High severity issues. Key vulnerabilities included:

| Vulnerability                             | Severity | Description                                                |
| ----------------------------------------- | -------- | ---------------------------------------------------------- |
| AsyncLocalStorage race condition          | Critical | Session data leakage between concurrent requests           |
| Cache poisoning                           | Critical | `Authorization`/`Cookie` headers not included in cache key |
| Middleware bypass via double URL encoding | Critical | Authentication bypass possible with `/%2561dmin`           |
| API route middleware not applied          | Critical | `/api/*` endpoints exposed outside middleware protection   |
| Image optimizer ACL bypass                | High     | `/_vinext/image` executes before middleware                |

Security researcher [Sam Curry's observation](https://x.com/samwcyo/status/2026888257779224594) is telling:

> "Two years ago, I reported an improper path parsing vulnerability in Next.js. Today, they reported the exact same vulnerability to their competitor, Vinext."

The AI likely used Next.js's pre-fix code as training data, reproducing a known vulnerability verbatim.

Functional tests verify "this should work," but security vulnerabilities exist in the domain of **"this should not work."** If the test suite lacks sufficient security tests, AI can generate code that is functionally correct but insecure. All vulnerabilities reported so far fall within fixable categories, so this is partly a v1 problem.

The more fundamental question is **the absence of code review.** The vinext README states:

> Humans direct architecture, priorities, and design decisions, but have not reviewed most of the code line-by-line.

In a model where humans define the architecture and AI implements it, who bears responsibility for security verification? Just as tests could substitute for specifications, whether automated security scanning can substitute for human code review remains an open question.

## They Called It Open Source, But...

More interesting than vinext's technical completeness is how this attempt exposed structural tensions in the open-source ecosystem.

### Vercel's Strategy: Build an Ecosystem with Open Source, Monetize with the Platform

Vercel's business model is clear. Build a developer ecosystem with Next.js, an open-source framework, and generate revenue on the Vercel platform. According to estimates from external analyst firm [Sacra](https://sacra.com/c/vercel/), Vercel's ARR was approximately $200M as of 2025 — a 200x growth from $1M in 2019 over six years. (Vercel is a private company and does not publicly disclose revenue, so this figure is Sacra's independent estimate.) The 850,000+ developers using Next.js form the potential customer pool[^4].

This model itself is sound. Many companies — MongoDB, Redis, Elastic — use the same strategy. Spread the technology through open source and monetize through managed services. The problem arises **when framework design decisions conflict with the platform's business interests.**

As already covered earlier in this post, it is a fact that **the cost of operating Next.js outside Vercel was high.**

Vercel published a blog titled ["The Anti-Vendor Lock-in Cloud"](https://vercel.com/blog/vercel-the-anti-vendor-lock-in-cloud) in November 2025, responding to this criticism:

> "Approximately 70% of Next.js applications run outside of Vercel. Every Next.js 16 application deployed on Vercel uses the same adapter API available to other platforms."

This blog predates vinext (February 2026), so it is not a direct response to vinext. However, it is worth noting that the Deployment Adapters RFC (April 2025) came after years of pressure from competing platforms including Netlify, Cloudflare, and OpenNext. Accumulated lock-in criticism moved Vercel in a more open direction. vinext is not the cause of this trend but another consequence of the same structural friction.

### What vinext Turned Upside Down

The irony vinext revealed is this: **the API specifications and test suites that Vercel open-sourced were used directly by a competitor to build an alternative.**

Next.js's 2,000+ tests precisely define the API's expected behavior. vinext took these tests and used them to verify that its Vite-based implementation produces the same behavior. The test suite was the specification, and since the specification was public, reimplementation was possible.

Guillermo Rauch's response was fierce. He called vinext a ["vibe-coded framework"](https://x.com/rauchg/status/2026864132423823499) and criticized Cloudflare's strategy:

> "Cloudflare's mission is to fork the entire developer ecosystem and destroy open source. Vinext was an excuse to swindle developers into using their proprietary runtimes instead of @nodejs."

The validity of this statement is debatable, but the underlying tension is real.

### A Missing Perspective: Where Is Netlify?

Three companies chose different answers to the same problem of Next.js platform dependency. Cloudflare chose reimplementation, Vercel chose the Deployment Adapters API, and Netlify chose to reduce its dependency on Next.js altogether.

Netlify went as far as building `nextjs-sentinel` to bear the cost of Next.js support, and Eduardo Boucas's `minimalMode` analysis was cited in this post. Yet there is no official position on vinext. A [PR for Netlify deployment](https://github.com/cloudflare/vinext/pull/76) exists in DRAFT status, but the author is not a Netlify employee. Netlify's Edge Functions are Deno-based (a different runtime from Workers), and the company has been pivoting toward a "composable architecture" to reduce framework dependency. The fact that all three responses stem from the same structural problem arguably underscores the problem's severity.

### Sustainability of Corporate-Led Open Source

What happens if the vinext pattern repeats? What if a company publishes a framework as open source, and competitors routinely take its test suites and API specifications to build alternatives?

There is precedent. MongoDB (SSPL), Elastic (SSPL then AGPL), and HashiCorp (BSL) all switched to licenses that restrict competitive use. But those were "infrastructure software" — Next.js is a "framework." A framework's value is proportional to its ecosystem size, so restricting the license would shrink the ecosystem and the framework's value along with it. A license change from MIT seems unlikely for Next.js.

The more realistic path is **coexistence through the adapter API.** If the Deployment Adapters API matures, Cloudflare can support Next.js through an official adapter, reducing the need for reimplementations like vinext. For Vercel, the ecosystem stays healthy; for Cloudflare, stable support becomes possible without reverse engineering.

"Open source is dying" is not the conclusion. But the question of **"what incentive do companies have to keep frameworks open source"** is valid. If public API specs and tests become a competitor's weapon, how much will companies be willing to disclose? vinext did not ask this question for the first time — it asked it again in a world where AI has dramatically lowered the cost of implementation.

## Can vinext Actually Drive Workers Adoption?

Let us return to the beginning. The last missing puzzle in Cloudflare's Edge strategy was developer experience, and vinext was presented as the answer. But can the vinext + Workers combination actually attract Next.js developers to Cloudflare?

### The Infrastructure Is Ready; the Problem Is Switching Cost

As discussed in the [previous post](/2026/03/nextjs-edge-runtime-rise-and-fall), the reason Cloudflare achieved different outcomes with the same Edge technology was that it placed both compute and data at the Edge with D1, KV, Durable Objects, and R2. If vinext integrates natively with this infrastructure, it enables true Edge rendering that is impossible with a Vercel + AWS RDS combination. TPR (Traffic-aware Pre-Rendering) is a good example of optimization that is only possible when the CDN and framework live under one roof.

But whether this advantage can overcome real-world switching costs is a separate matter. For a Next.js developer to switch to vinext, it is not simply a build tool change:

- **ORM migration**: Prisma + PostgreSQL to Drizzle + D1 (SQLite)
- **Auth migration**: Auth.js's various DB adapters to D1-based
- **File storage migration**: S3 to R2
- **Monitoring migration**: Datadog/Sentry to Cloudflare's tools

None of these are small changes. The Prisma to D1 migration in particular involves a change in SQL dialect (PostgreSQL to SQLite), requiring query-level migration. Even if vinext is 94% compatible with Next.js, the DX improvement is offset if the switching cost for the rest of the stack is high.

### What Happens to vinext When Deployment Adapters API Matures?

This question directly concerns vinext's reason for existence.

If the Deployment Adapters API stabilizes, Cloudflare can run Next.js on Workers with just an official adapter. Neither OpenNext's reverse engineering nor vinext's reimplementation would be necessary. Does vinext then become obsolete?

Not necessarily. vinext's value lies not only in "running Next.js on Workers" but also **in being Vite-based.** This difference is not resolved by the Deployment Adapters API. Even with an official adapter, the build tool would still be Turbopack.

Turbopack's dev mode stabilized in Next.js 15, but its production build is still maturing. OOM errors, crashes after 2+ minute builds, behavior inconsistencies compared to webpack, and source maps always being generated (exposing source code) have been reported in [GitHub Discussions](https://github.com/vercel/next.js/discussions/77721). Most importantly, Turbopack is Next.js-only. While it initially aspired to be a framework-agnostic general-purpose bundler, it is currently coupled to the Next.js build pipeline and cannot be used independently.

Vite, on the other hand, offers 1,000+ community plugins (inheriting the Rollup ecosystem), multi-framework support for React/Vue/Svelte/SolidJS, and significantly improved production build performance through [Rolldown](https://rolldown.rs/) (a Rust-based bundler) introduced in Vite 8. vinext's benchmarks showing the Vite 8 + Rolldown combination achieving 4.4x faster builds and 2.3x smaller bundles compared to Turbopack demonstrate this combination's potential. That Vite is currently more mature and has a richer ecosystem as a build tool is one reason for vinext's existence.

Realistically, however, **100% compatibility through an official adapter** is a safer choice for most teams than **94% compatibility through a reimplementation.** vinext may be attractive to a subset of teams that prefer the Vite ecosystem, but what Cloudflare needs to deliver for the majority of Next.js developers is a stable official adapter.

Ultimately, vinext's long-term role will be one of three things:

1. **Completing its historical role as a catalyst for the Deployment Adapters API** — Would Vercel have introduced the adapter API at this pace without vinext? If competitive pressure drove openness, vinext has already served its purpose.
2. **Establishing an independent position as a Vite-based Next.js-compatible framework** — if the "Next.js API + Vite build" combination attracts enough developers.
3. **Evolving into Cloudflare's own framework** — maintaining Next.js API compatibility while adding Cloudflare infrastructure-optimized features (TPR, etc.), gradually diverging into a standalone framework.

Regardless of direction, for vinext to become "a framework that replaces Next.js in production," it needs near-100% compatibility (not 94%), security stabilization, and validation on platforms beyond Cloudflare. As of now, there is a long road ahead.

## Conclusion

It is too early to view vinext as a general-purpose production replacement. While Cloudflare claims it has been used in some production environments, the README classifies the project as experimental, and most people are unlikely to rush an AI-built product into production.

Nevertheless, vinext is significant because it most dramatically demonstrated why official solutions like the Deployment Adapters API are necessary. The Deployment Adapters RFC (April 2025) predates vinext (February 2026) and was progressing on its own track. vinext is not the cause of that initiative but rather a symptom showing how severe the underlying structural friction had become. Once that API matures, vinext's role will naturally be redefined.

In the long term, **if vinext survives, it will be not as a Next.js replacement but as a Next.js-compatible layer for the Vite ecosystem.** The proposition that "Next.js's API design is good, but the build tool and deployment pipeline are better with Vite/Nitro" — this position could become viable as Turbopack becomes locked into being Next.js-only. Getting there requires compatibility, security, and real-world validation outside Cloudflare to come first.

[^1]: [netlify/nextjs-sentinel](https://github.com/netlify/nextjs-sentinel) — A tool that monitors Next.js releases to automatically detect changes that could affect the Netlify adapter.

[^2]: [How we rebuilt Next.js with AI in one week — Cloudflare Blog](https://blog.cloudflare.com/vinext/)

[^3]: Steve Faulkner's statement. [Cloudflare Releases Experimental Next.js Alternative — InfoQ](https://www.infoq.com/news/2026/03/cloudflare-vinext-experimental/)

[^4]: [Building the most ambitious sites on the Web with Vercel and Next.js 14 — Vercel Blog](https://vercel.com/blog/building-the-most-ambitious-sites-on-the-web-with-vercel-and-next-js-14) (figures as of November 2023)

[^5]: [Test suites are specs — paddo.dev](https://paddo.dev/blog/vinext-test-suites-are-specs/)

[^6]: [GitHub Issue #51823 — stale-while-revalidate header used without delta-seconds](https://github.com/vercel/next.js/issues/51823). The issue of headers being ignored on AWS CloudFront was reported.

[^7]: PR confirming the non-standard format was designed specifically for Vercel CDN (formerly Now CDN): [#8866 — Remove stale-if-error header from SPR](https://github.com/vercel/next.js/pull/8866)

[^8]: [PR #70674 — Changed default SWR delta value to 1 year](https://github.com/vercel/next.js/pull/70674). In Next.js 15, `swrDelta` was [renamed](https://github.com/vercel/next.js/pull/71159) to `expireTime` and stabilized.
