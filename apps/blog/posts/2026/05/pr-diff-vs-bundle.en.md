---
title: 'The <em>invisible cost</em> in PR diffs: we are not reviewing the code our users receive'
tags:
  - frontend
  - bundle-analysis
  - performance
  - tree-shaking
  - code-review
published: true
date: 2026-05-03 15:50:00
description: 'The bundle costs that code review misses, and how to surface them in the PR.'
thumbnail: /thumbnails/2026/05/pr-diff-vs-bundle.png
art:
  layout: bands
  hue: cyan
  tone: light
  hero: 'PR diff → +200KB'
---

## Table of Contents

## Introduction

Code review is a necessary, but not sufficient, condition on the frontend. On the backend, the compiled artifact does not reach the user directly. Nobody argues in a PR about how the JVM bytecode looks, or how the JIT inlined a method. Frontend is different. What arrives at the user is not the source but the bundle, and that bundle does not appear in the PR diff.

A single line that the reviewer saw — `import { Button } from '@/components'` — can become 200KB in the bundle. A single line added to `package.json` can pull in an entire dependency tree. Between the +1 line of a PR diff and the +200KB of a production bundle, there is a gap that does not close unless someone is looking.

The solution is not to memorize specific import patterns and review more carefully. That approach does not last. **Source review alone is not enough. The PR has to surface a summary of the artifact diff alongside the source diff.** First we look at where costs leak when that instrumentation is missing, and then we move to how to expose it in the PR.

## Why this is more direct on the frontend

Backends also pay for artifact size in operating costs — cold start latency, memory usage, container image pull time. But for a typical web request, the user does not download, parse, and execute that code. What reaches the user is an HTTP response body. Whether the JIT inlined something or how GraalVM cleaned up dead code is invisible to the user.

Frontend is different. What the user receives is not the source itself, but the result of the following transformations:

1. The chunks the bundler extracts from the module graph
2. The exports the tree-shaker preserves
3. The output the minifier leaves after mangling, scope hoisting, and dead-code elimination
4. The bytes the compressor squeezes through brotli/gzip
5. The JavaScript the browser has to parse → compile → execute

The PR diff only shows above step 1, the source code. The transformations after that do not appear in the PR. At any step in the pipeline, a single added line can balloon into +200KB, and that swelling is invisible to human eyes. The cost is passed directly onto the user's browser as network, parse, compile, and execute time.

On top of that, the transformation is sensitive to the environment. The same source produces different artifacts depending on:

- Bundler version (even minor version differences can change chunking or optimization output)
- Bundler choice (Webpack, Turbopack, Rollup, esbuild — each has different tree-shaking policies)
- The `sideEffects` declarations of dependencies
- Environment variables (NODE_ENV, browserslist target)
- The bundler's chunk-splitting and plugin execution order
- Toolchain version or platform-dependent plugin differences

The same PR can produce different bundles in different environments. Without visibility into the artifact, you can neither measure the cost nor reproduce it.

## Bundle size is only part of the user's cost

Before the catalog, let's set up the cost model. All the patterns below converge to "the bundle gets bigger," but the actual cost the user pays is not bundle size itself. Bundle size is an indirect metric.

The user's cost can be broken into four stages:

1. **Network**: download time. Proportional to compressed byte size, varies by user network.
2. **Parse**: time the JavaScript engine spends parsing. Proportional to original byte size, varies by CPU.
3. **Compile**: time V8/JSC takes to produce bytecode. Proportional to JavaScript volume and complexity.
4. **Execute**: actual code execution time. Proportional to what the code does.

When you report "+12KB" using brotli/gzip stats, the original could be +60KB, and the parse/compile cost is proportional to that original size. On low-end mobile devices, parse + compile alone can add hundreds of milliseconds. This drags down LCP (Largest Contentful Paint) and TBT (Total Blocking Time) directly.

Compressed bundle size is a lower bound, not the real cost. A more accurate measurement is to watch the LCP/INP distribution change through CrUX (Chrome User Experience Report) data or Real User Monitoring. That said, for fast PR-time feedback, bundle size diff is the cheapest and most effective proxy. To see the real cost, you need RUM monitoring layered on top.

If you skip this point, the catalog reads like "patterns that affect size" and the conclusion drifts to "size-limit is on, we're done." Keep the four stages — Network/Parse/Compile/Execute — in mind as you read the catalog.

## Catalog: harmless in code, exploding in the bundle

### 1. Barrel file (index.ts re-export)

```ts
// src/components/index.ts
export * from './Button'
export * from './Modal'
export * from './Chart' // contains heavy dependency
```

At the use site it's a single line:

```ts
import {Button} from '@/components'
```

It looks clean to the reviewer. But the bundle can end up containing `Chart` and its transitive dependencies.

#### Why this happens

For tree-shaking to work, the bundler has to be able to statically prove that "removing this export is safe." The first condition for that proof is the `sideEffects` declaration. If `package.json` declares `"sideEffects": false`, every module uses ESM `import`/`export`, and no module triggers side effects at top level (IIFEs, register calls, polyfill patches), the bundler can drop unused exports.

Barrels widen the scope the bundler has to prove "this re-export path is safe to remove." If `sideEffects` is missing, if a re-exported module has a top-level side effect (e.g. `console.log`, `register()`, polyfill patches), or if CommonJS is in the mix, the bundler conservatively keeps that branch. Tree-shaking works when all conditions align, but a single broken condition keeps the entire branch alive.

The ESM standard itself is conservative. `export * from` semantically merges namespaces, and if the bundler cannot trace which name is actually used, it keeps everything. Webpack reduces this somewhat with `usedExports` analysis, but tracing every branch to prove safety is expensive and has limits.

Barrels are not always a cost pattern, though. In intentional structures where tree-shaking is not needed — Node.js server code that is not bundled, small internal modules where every export is genuinely used — barrels are legitimate. The problem is when barrels are used in code heading to the client bundle.

#### How big does this get

The difference is sharpest when comparing the same function imported via lodash and lodash-es:

```ts
// lodash (CommonJS): nearly the entire library is included
import {debounce} from 'lodash'

// lodash-es (ESM): only the helpers debounce needs
import {debounce} from 'lodash-es'

// or, more safely
import debounce from 'lodash/debounce'
```

The former pulls in nearly all of `lodash`; the latter brings only the `debounce` implementation and the helpers it depends on. The difference is an order of magnitude. ESM vs CommonJS is one factor; whether you go through a barrel is the other.

This is exactly why the Vercel team added [`optimizePackageImports`](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports) to Next.js. It rewrites barrel imports to direct imports at build time. The fact that the auto-applied package list includes names like `lucide-react`, `@mui/material`, `date-fns`, and `lodash-es` is itself reverse evidence of how common this pattern is. That said, this option is still scoped to `experimental.optimizePackageImports`, which makes it more of a workaround than a fundamental solution.

I traced a similar case in [Web Performance Analysis Part 3](/2025/06/web-performance-analysis-3). An internal UI package called `@web-memo/ui` had `sideEffects: false` declared and no actual usage of `recharts`, yet the entire `recharts` library was sitting in the client bundle. The cause was a multi-layer nested barrel export structure that prevented webpack from building an accurate dependency graph; webpack treated the barrel file as an opaque block. `optimizePackageImports` works around it, but the real fix is to expose each component explicitly via the `exports` field.

#### How to detect it

- Use `eslint-plugin-barrel-files`[^barrel-files] or `eslint-plugin-no-barrel-files`[^no-barrel-files] to block them statically
- Open the bundle analyzer treemap and check whether components you never imported ended up in the chunk
- Import the same component via direct import and barrel import, then measure the difference with size-limit

The third gives the most definitive proof; the first is the cheapest.

### 2. Installing libraries that don't tree-shake

You've seen a PR that added one line to `package.json`:

```diff
+ "moment": "^2.30.0"
```

The review comment is usually "library addition, OK." But `moment` is CommonJS-based, its locale handling is heavy, and it doesn't tree-shake well. Depending on build configuration and locale inclusion, it can add anywhere from tens of KB to over 100KB to the bundle, even gzipped.

I traced the same pattern in [Web Performance Analysis Part 2](/2025/05/web-performance-analysis-2). When I cracked open the production bundle, lodash utilities the project never used were embedded wholesale into a `__app` variable. lodash is one of the canonical "doesn't tree-shake" libraries, and for libraries like that, a single-line import effectively works as a "full import."

#### What signals to watch for

Open the library's `package.json` and check:

- Only `"main"` is declared, no `"module"` or `"exports"` → CommonJS-only. Tree-shaking is essentially impossible.
- `"sideEffects"` is missing or set to `true` → the bundler assumes "everything must stay alive to be safe."
- Even if `"exports"` declares an ESM entry, dynamic require usage internally neutralizes it.
- The library itself combines a barrel with side effects (e.g. registering plugins at top level).

#### How to find it

The PR-time tool is [bundlephobia](https://bundlephobia.com) or the [Import Cost extension](https://marketplace.visualstudio.com/items?itemName=wix.vscode-import-cost) in your editor. If size-limit is set up in CI, the new PR will fail when it busts the budget. Separate policy for library-addition PRs is covered later.

### 3. Dynamic import paths

```ts
const mod = await import(`./locales/${lang}.json`)
```

The bundler treats all of `./locales/*` as a single chunk group. The user only needs Korean, but JSON for 30 languages is sitting in the production bundle as chunks.

#### Why this happens

When the argument to `import()` is a static string, the bundler code-splits exactly one module. When it's a template literal or variable, the bundler cannot determine at compile time which module is needed. So it treats "every module that could match this pattern" as a candidate and creates a separate chunk for each. It's a conservative decision so that whatever lang comes in at runtime can be fetched immediately.

The intent is invisible from the single line of code, and the intuition "it's a dynamic import, so it's lazy-loaded" works against you. It is lazily fetched, but every chunk exists in the build output.

#### Solution

The simplest fix is to keep the manifest explicit:

```ts
const loaders = {
  ko: () => import('./locales/ko.json'),
  en: () => import('./locales/en.json'),
} as const

const mod = await loaders[lang]()
```

Now the bundler creates exactly two chunks. Or you can fix which locales to include via environment variables at build time and remove the dynamic import entirely. Either way, the point is that a human has to declare which modules are needed. When that decision is missing from the code, the bundler chooses "include everything to be safe."

In [Web Performance Analysis Part 3](/2025/06/web-performance-analysis-3) I saw the same pattern leak beyond build artifacts into runtime. An `import('./locales/${lang}/translation.json')` form was wired into i18next initialization, and every SSR request paid I/O and initialization costs again. In a serverless environment, the cold-start cost grew along with it. The cost of one dynamic-path line doesn't stay inside the client bundle.

### 4. Crossing the 'use client' boundary in RSC

This is the quietest leak in App Router, and the hardest to catch.

```tsx
// app/page.tsx (server component)
import {ProductCard} from './ProductCard'
```

Suppose `ProductCard` is a client component, and inside it imports a heavy charting library:

```tsx
// ProductCard.tsx
'use client'
import {Chart} from 'recharts'
```

The moment a server component tree imports a client component, that client component and every module it depends on enter the client bundle.

#### The mechanism from the module graph's perspective

Next.js's RSC bundler splits modules into two graphs: server graph and client graph. The `'use client'` directive is the marker that draws the boundary. When a server module imports a client module, that client module becomes an entry point in the client graph. And every module the client module transitively depends on gets bundled into that entry's chunk.

The key is that transitive dependencies are automatically pulled into the client. A heavy utility intended for server-only use crosses to the client the moment it's imported by a single client component.

```ts
// utils/heavy-parser.ts (intended server-only)
import { parser } from 'fast-xml-parser' // 70KB

export function parseXml(input: string) { ... }
```

If this module is imported absent-mindedly from a client component:

```tsx
'use client'
import {parseXml} from '@/utils/heavy-parser'
```

70KB of `fast-xml-parser` follows into the client bundle. In the PR diff it's a single import line, and that one line moves an entire server-graph module to the client.

#### When a size problem becomes a security problem

The same RSC boundary has a variant that becomes a security/data-exposure problem.

```ts
// shared/config.ts (assumed to be imported only on the server)
export const internalSecret = process.env.SECRET
```

Because `process.env.SECRET` lacks the `NEXT_PUBLIC_` prefix, it is not inlined in the client build. So far, safe. But when this module is evaluated on the server, the actual secret value is captured in the module-top-level constant `internalSecret`. If that value flows through a server component into the render output in any form — for example as a prop in `<div data-config={internalSecret}>`, or passed as a prop to a client component — it ends up embedded in the SSR output HTML and the RSC payload. It's exposed to the user.

In the PR diff this looks like nothing more than "a module that reads an environment variable on the server and exports it." Where that export ends up flowing requires walking the call graph. This kind of path doesn't show up in the PR diff.

#### How to catch it

- Enforce the boundary with [`server-only`](https://www.npmjs.com/package/server-only) / [`client-only`](https://www.npmjs.com/package/client-only) packages. Putting `import 'server-only'` at the top of a module makes the build break when the client tries to import it. Always attach it to modules that handle secrets.
- Lint rules like [eslint-plugin-react-server-components](https://www.npmjs.com/package/eslint-plugin-react-server-components)
- Inspect the client chunk treemap directly with Next.js Bundle Analyzer (Turbopack) or `@next/bundle-analyzer` (Webpack)
- Monitor the First Load JS in `next build` output regularly

Even with these, transitive leaks are still hard to catch. The server-only marker has to be applied consistently across every module that needs protection.

### 5. Transitive dependency duplication

If library A requires `zod@3.22` and library B requires `zod@3.23`, npm/pnpm installs both. It's visible in the lockfile but not in the PR diff. The bundle contains zod twice.

#### When duplication becomes a runtime bug

When this happens with a large library like React or Vue, it's not just a size problem — it's a runtime bug. Different React instances operating in the same tree break hooks, break context propagation, and make `instanceof` checks return false. Peer dependencies are exactly the mechanism meant to prevent this, but bad peer-range declarations or forced installs can bypass it.

Schema libraries like zod hit similar issues. If a schema instance built on one side is validated on the other, `instanceof` checks return false, producing strange errors.

#### How to find and fix

- `pnpm why <pkg>` or `npm ls <pkg>` to see which dependency tree pulled it in
- pnpm/npm `overrides`, yarn `resolutions` to force a single version
- Look for modules appearing twice in the bundle analyzer treemap
- Check dedup feasibility periodically in CI based on the lockfile (`pnpm dedupe --check`)

People won't do this voluntarily on every PR. Wire it into the CI pipeline once and forget about it.

### 6. Other patterns, briefly

These are in the same family as the patterns above rather than each requiring a deep analysis. Same structure: one line in code, an order-of-magnitude cost in the bundle.

**The first-use cost of runtime CSS-in-JS.** Runtime CSS-in-JS like styled-components or emotion pulls in the entire runtime library the moment the first using component is created. Free if it's already there; suddenly +30KB if it isn't. In App Router, compatibility with server components requires extra wrapping, so bundle size and hydration cost accumulate together.

**Polyfill auto-injection.** Automatic `core-js` injection swings by tens of KB depending on `browserslist` configuration. There's no trace in the code. A PR that changes one line of browserslist often grows or shrinks the bundle by 50KB.

**`process.env` inlining and secret leaks.** `NEXT_PUBLIC_*` environment variables are baked in as string literals at build time. Occasionally a secret that mistakenly got the `NEXT_PUBLIC_` prefix ends up exposed in the client bundle. The PR diff only shows the variable name, not that its value gets inlined. Also, environment variables baked into the bundle are pinned at deploy time, so changing them on a platform like Vercel without triggering a new build leaves the old values in place.

**Namespace import of static assets.** `import * as Icons from '@/assets/icons'` for 200 SVGs means the user sees five on a screen but all 200 sit in the build output. Same structure as the dynamic-import-path problem. If a human doesn't declare which assets are needed, the bundler includes them all.

**Dev vs prod behavior differences.** Dev mode includes the HMR runtime, skips minification, applies tree-shaking weakly, uses a different React.lazy chunking policy, and so on. In dev, every client component looks bundled into one chunk; in prod, they're split per route. As a result, the "+120KB chunk fetch on entering a specific route" that's invisible in dev only happens in prod. If you only validate the PR in dev, this cost is invisible.

## So what do we do

People doing this manually on every PR is an operating model that doesn't last. The conclusion is one line:

> **Don't only review the code. Make the artifact's change visible in the PR too.**

The real solution is not for a person to read the bundle, but for the bundle's change to be exposed in the PR in a form a person can read. In rough order of leverage:

### 1. Bundle size diff as a PR comment (mandatory)

The moment a number like "+12KB" is automatically posted to the PR, barrel additions and heavy library installs become visible automatically.

#### size-limit + size-limit-action

[size-limit](https://github.com/ai/size-limit) is the most common choice. Define budgets in `package.json`:

```json
{
  "size-limit": [
    {
      "name": "main bundle",
      "path": ".next/static/chunks/main-*.js",
      "limit": "120 KB",
      "gzip": true
    },
    {
      "name": "page: /products",
      "path": ".next/static/chunks/pages/products-*.js",
      "limit": "40 KB"
    }
  ]
}
```

Wire [size-limit-action](https://github.com/andresz1/size-limit-action) into a GitHub Action and it comments the size delta vs the base branch on every PR. If the budget is exceeded, CI fails. Because the budget is the basis for failing, you have to explicitly justify "why is +30KB OK" in the PR. That works as social pressure.

#### Next.js + Vercel environment

For Next.js projects, you can use the `next build` output, [Next.js Bundle Analyzer (Turbopack)](https://nextjs.org/docs/app/guides/package-bundling), and `@next/bundle-analyzer` (Webpack) together to see route-level client bundle changes. If you deploy to Vercel, the GitHub integration drops a deploy-preview comment on every PR, exposing the preview URL and deploy info. How exactly bundle information surfaces in PR comments depends on CI/Vercel setup and version, so it's worth checking once and turning it on.

#### bundlewatch

[bundlewatch](https://bundlewatch.io) is a similar concept to size-limit, but it accumulates history in its own service. Comparison against the base branch is more accurate, and you watch the time series in a dashboard.

Whichever tool you use, the point is the same: the number has to be inside the PR. Information you have to visit an external dashboard to see ends up being information no one looks at.

### 2. Surfacing import cost at the time of writing

The fastest line of defense, before CI, is the editor. Extensions like [vscode-import-cost](https://marketplace.visualstudio.com/items?itemName=wix.vscode-import-cost) display each import's module size next to the import line.

```ts
import {debounce} from 'lodash' // 71.5K (gzipped: 25.3K)
import {debounce} from 'lodash-es' // 1.8K  (gzipped: 0.9K)
```

When the number is sitting next to the line as you write it, you stop before typing the next line. It's much cheaper and faster feedback than CI. The downside is that it has no enforcement; it has no effect on someone working without the extension. So it has to go alongside CI-side size-limit.

### 3. Block at the static-lint layer

Things you can prevent at the tooling layer:

- `eslint-plugin-import` (especially `no-cycle`, `no-self-import`, `no-unused-modules`)
- `eslint-plugin-barrel-files` or `eslint-plugin-no-barrel-files`
- `depcheck` / `knip`: detect unused dependencies
- `server-only` / `client-only`: enforce the RSC boundary
- `eslint-plugin-react-server-components`: RSC rules
- Next.js's own [`optimizePackageImports`](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports): auto-rewrites packages that ship a barrel

This is one step above PR comments — the layer that prevents the issue from entering the code at all. Putting it as the first line of defense gives the best cost-to-benefit ratio.

### 4. A separate policy for `package.json`-changing PRs

PRs that change `package.json` need a separate reviewer or a separate checklist. This is a process recommendation, not a tooling one. It's worth having the team agree explicitly that adding one line of dependencies has a different cost structure than adding one line of code.

The minimum checklist is roughly:

- Check size on bundlephobia or packagephobia (the first step I always recommend in [Web Performance Analysis Part 1](/2025/05/web-performance-analysis-1))
- ESM support (`"module"` or `"exports"` field)
- `sideEffects` declaration
- Whether a lighter alternative exists for the same functionality
- Whether transitive dependencies conflict with libraries already in the tree

Wire a GitHub Action that says "when `package.json` is in the diff, attach a label and ping a designated reviewer," and the process runs automatically even if a person forgets.

### 5. Periodic checks on production artifacts

There's a class of accumulating cost that PR-time tools don't catch. You have to look at it on a schedule.

- Attach [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) to staging and track LCP/TBT regressions
- Upload Sentry source maps and trace what code is actually running in production
- Periodically inspect the treemap with [`source-map-explorer`](https://github.com/danvk/source-map-explorer) or webpack-bundle-analyzer
- Use a RUM tool (Vercel Speed Insights, Sentry Performance, DataDog RUM, etc.) to monitor LCP/INP distributions

PR-time size-limit catches the cost of this change; periodic checks catch the costs that have accumulated past a threshold. They're complementary.

## What about just pushing the artifact every time and comparing build outputs?

This is the natural follow-up question. If the problem is that the artifact is invisible in the PR diff, why not push the build result itself with every PR and compare artifact changes via git diff? It sounds like the simplest, most direct solution.

Don't recommend it. Pinning down why not makes the conclusion more solid.

### 1. Minified bundles don't diff in human-readable units

When you compare two bundles with `git diff`, the entire one-line giant string looks like it changed wholesale. Variable names are mangled to `a`, `b`, `c`; function boundaries are gone because of scope hoisting; and depending on the bundler's chunk-splitting or plugin execution order, the mangle output itself can change. The act of "before-and-after comparison" doesn't align in meaningful units. A one-line code change can show up as hundreds of lines of mangled-bundle diff, and a large semantic change can look like a small diff.

If you commit unminified to solve this, the size balloons by an order of magnitude, sending you straight into the next problem.

### 2. Repo size explosion

A typical SPA bundle is 200KB~2MB compressed. If it goes into git on every PR, in a year your git history bloats by gigabytes. Clone times explode, GitHub LFS costs appear, CI checkout takes longer. In a monorepo it accumulates faster.

Git deduplicates identical binary blobs, but for outputs like minifier results that change subtly every time, dedup is basically ineffective. Shallow clone is a workaround, but it means giving up on history — which was the whole point of this approach. So it's self-contradictory.

### 3. Source-of-truth confusion

When the build artifact is in the repo, sooner or later someone modifies the artifact directly. In a hotfix situation, "no time to run a build, just touch dist for a moment" happens. At that moment you have to verify again whether the artifact is in sync with the source — that's another verification layer.

Furthermore, environment differences in toolchain versions or platform-dependent plugins can cause subtle artifact differences across environments. Even with the same lockfile across CI and local environments, OS-specific binary dependencies or plugin behavior differences make byte-level identity hard to guarantee, and the result is that every PR fills up with meaningless false-positive diffs. To prevent this you have to lock the build environment fully via Docker, but whether that cost is worth paying is a separate question.

### 4. It's not the recommended practice on application frontends

In the library distribution space, projects still commit `dist/` — for direct CDN distribution, supporting consumers without a build environment, or generated-artifact review. But for application frontends, accumulating build artifacts in git history is hard to recommend as a PR review strategy. It was common in the jQuery/Bootstrap library distribution era, but as a way for humans to review application bundle diffs, the cost-to-benefit ratio is bad. There's a reason putting `dist/`, `build/`, `.next/` in `.gitignore` became the standard on the application side.

### "What if I don't use it for deploy, only push it for comparison?"

A narrower variant comes to mind at this point. What if we don't use dist as a deploy artifact, but purely for comparison — push it on every PR so we can see artifact changes via git diff? It sounds like the most reasonable middle ground, but the core of the rebuttals above is still essentially intact.

- Minified bundle diffs are unreadable in meaningful units even for comparison purposes. You can tell the bytes changed, but "why is it +18KB" doesn't show up. The information value of the comparison is nearly zero.
- "Comparison only" doesn't make the binary blobs accumulating in git history go away. Splitting into a separate branch or LFS protects main history, but at that point the simplicity of "just put it in git" is already gone.
- False positives are even more lethal when the use is comparison. The moment environment differences produce a byte difference once or twice, the entire comparison signal is poisoned, and the team starts ignoring the alarms.

Building unminified and pushing solves the first problem (diff readability), but repo size deteriorates by an order of magnitude further, and you end up comparing artifacts that aren't the minified production output, drifting away from the article's starting point: "the code the user receives."

To genuinely capture the value of comparison, you need a form that supports meaningful-unit comparison. That's stats JSON, size metrics, module graphs. At that point there's no longer any reason to put dist in git. External time-series services (RelativeCI, Codecov) are exactly the refined form of this idea.

### But the intuition is half right

The direction "compare the build result before and after" is correct. The comparison subject just needs to be the bundle's metadata, not the bundle file itself.

#### Bundle stats JSON

Webpack/vite/rollup all let you emit a stats JSON at build time:

```json
{
  "entrypoints": {
    "main": { "size": 245678, "assets": ["main.abc123.js"] }
  },
  "modules": [
    { "name": "node_modules/lodash/index.js", "size": 71234 },
    { "name": "node_modules/react-dom/index.js", "size": 134567 }
  ],
  "chunks": [...]
}
```

It's a JSON containing only the graph and size info, not the bundle file itself. It's about 1/100 the bundle size and supports semantic comparison. You can keep history by accumulating in a separate branch (`bundle-stats`) or sending to external storage. The downside is tooling is sparse if you build it yourself.

#### External time-series services

[RelativeCI](https://relative-ci.com) and [Codecov Bundle Analysis](https://docs.codecov.com/docs/javascript-bundle-analysis) are exactly this model. They accumulate in external storage as a time series without putting the bundle in git, and automatically post comments like "+18KB vs main, lodash newly added" on every PR. The original intuition of "compare before and after" is implemented exactly in this form.

#### GitHub Actions artifacts

Keep the webpack-bundle-analyzer HTML treemap as an artifact for 90 days on every build. It's not in git history, but you can always view past artifact structure visually. It's the lightest entry point in environments where adopting an external service feels heavy.

#### Summary

| Approach                                          | Recommendable?                               |
| ------------------------------------------------- | -------------------------------------------- |
| Commit the bundle file itself to git history      | ❌ A pattern from a previous era that failed |
| Accumulate bundle stats JSON in a separate branch | △ Possible, but tooling is sparse            |
| RelativeCI / Codecov Bundle Analysis              | ✅ Most realistic                            |
| Keep treemaps as GitHub Actions artifacts         | ✅ Good as a supplement                      |

Leave the shadow of the build artifact, not the artifact itself, in history. This one correction closes the gap between intuition and practice.

## Why these tools still aren't turned on

The tools above are all free, and setup takes half a day. Yet most frontend projects you look at don't have any of them on. Why?

First, **the cost of a single PR is invisible.** Nobody cares about "this PR is +5KB." It needs to accumulate 100 times to become +500KB, and at that point tracing which PR caused what is impossible. Accumulated cost has diffuse responsibility, so no one stops it.

Second, **the moment you turn the tool on, you have to set a budget.** Once you set a budget, PRs that break the budget appear, and you have to decide whether to block or pass them. Once decision cost begins, the tool gets turned off. To prevent this you need an operational policy that starts with budget = "current size + a small margin" and tightens it incrementally.

Third, **fatigue from false positives.** Toolchain differences, transitive updates without lockfile changes, the non-linear way subtle differences in pre-compression input reflect in post-compression byte size — these produce meaningless +1KB alarms occasionally. After a couple of repetitions the team starts shrugging them off as "that thing again." To prevent this you need to set thresholds appropriately. Ignore below 1KB, comment above 5KB, fail above 50KB — that kind of staged response.

Without solving all three, the tool gets adopted and then quietly disabled.

## In closing

On the frontend, "code review is enough" is only half true. We are not reviewing the code our users receive. The asymmetry where a +1-line change in the PR diff becomes +200KB in the user's browser will not close unless that cost is lifted into a place a person actually sees.

The solutions proposed here aren't new. They're all well-known tools, all free, all easy to set up. What's missing is the perspective on where and how those tools should be placed. The point isn't for a person to read the bundle, but for the bundle's change to be forced into the person's field of view. Without that perspective, this becomes another tool-recommendation post, and the tools get turned on and then off.

One last thing. In an era when AI agents automatically add dependencies and refactor components, this asymmetry accumulates at the agent's pace, not the human's. When a single PR adding three libraries and creating two barrels becomes routine, the line of defense "the reviewer will look carefully" collapses faster. By that point, automatically posting a bundle size diff to the PR is not a nice-to-have but a default. If we accept that what made compiler output trustworthy was not the compiler itself but the verification infrastructure around it, then we have to start by admitting that on the frontend, only half of that infrastructure is in place.

[^barrel-files]: [eslint-plugin-barrel-files](https://npmx.dev/package/eslint-plugin-barrel-files) — ESLint plugin that catches common mistakes related to barrel files.

[^no-barrel-files]: [eslint-plugin-no-barrel-files](https://npmx.dev/package/eslint-plugin-no-barrel-files) — ESLint plugin that disallows barrel files entirely.
