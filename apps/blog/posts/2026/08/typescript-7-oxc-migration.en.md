---
title: 'What Happens When You Install <em>typescript@7</em>: A Blog Monorepo Migration Log'
tags:
  - typescript
  - oxc
  - eslint
  - tooling
  - frontend
published: true
date: 2026-08-10 22:00:00
description: 'I dropped typescript 7.0.2 into a monorepo where pnpm lint took 12 minutes 32 seconds. Type checking passed quietly, but next build broke and lint crashed. A record of the chain reaction from one day of swapping eslint and prettier for oxlint and oxfmt, with before-and-after measurements. To say it up front, the build did not get any faster.'
thumbnail: /thumbnails/2026/08/typescript-7-oxc-migration.png
art:
  undraw: golden-gate-bridge
  layout: glyph
  hue: warm
  tone: light
  hero: '752.4초 → 0.4초'
---

## Table of Contents

## Saturday Evening, typescript@7

In this blog's repository, `pnpm lint` was a command that took 12 minutes 32 seconds. It now finishes in 0.4 seconds. Numbers like that are usually followed by a success story, so let me confess up front: **the build did not get one second faster.** The cold build that took 43.0 seconds still takes 43.4 seconds.

I saw that [TypeScript 7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) had become npm's latest and, on a Saturday evening, casually installed it in a side project (the pnpm monorepo behind this blog). It is a major version with the compiler rewritten in Go, so I braced for half a day. TS 7 itself was done in 10 minutes. The rest of the time went entirely to cleaning up everything else that collapsed in a chain reaction. This post is the record of that day. Following the commit log from that day, it goes like this.

- ⬆️ [Upgrade to TypeScript 7 and Next.js 16.3](https://github.com/yceffort/blog/commit/46d0f9ac)
- 🔧 [Replace eslint and prettier with oxlint and oxfmt](https://github.com/yceffort/blog/commit/535795db)
- ♻️ [Adapt code to oxlint ruleset](https://github.com/yceffort/blog/commit/3a43ab23)
- 🎨 [Reformat with oxfmt and sort imports](https://github.com/yceffort/blog/commit/a031d0e0)
- ⬆️ [Migrate to pnpm 11 and trim overrides](https://github.com/yceffort/blog/commit/38e03cc5)
- ♿ [Adopt native dialog and button semantics](https://github.com/yceffort/blog/commit/fe4c6299)
- 🔧 [Enable type-aware linting via tsgolint](https://github.com/yceffort/blog/commit/9b7a8e18)
- 🐛 [Fix sitemap tag urls and issue link slug](https://github.com/yceffort/blog/commit/d1da090e)

I went in to bump typescript, the linter and formatter got replaced wholesale, and it ended with fixing a bug that had been sitting there for months. Let me walk through it in order.

> Target versions: typescript 5.9.3 → 7.0.2, next 16.2.12 → 16.3.0, eslint 9.39.5 → oxlint 1.77.0 (+ oxlint-tsgolint 7.0.2001), prettier 3.9.6 → oxfmt 0.62.0 (beta), pnpm 10.6.5 → 11.20.0

## The Upgrade Itself Took 10 Minutes

After `pnpm add typescript@7`, all I fixed was two lines of tsconfig. Not a single line of application code was touched.

One was deleting `baseUrl`. TS 7 removes the option entirely, so there was no choice but to delete it, and since the repository only uses relative imports, nothing happened when I did. The other was bumping `lib` to `es2023`, but that was for the oxlint work described later (replacing `sort` with `toSorted`), not because of TS 7. The one thing that could be called a trap: even after bumping `lib`, the error saying `toSorted` did not exist kept coming, and I stared at it for a while. The culprit was the tsbuildinfo cache left behind by the previous compile. On the day I swapped out the entire compiler, the biggest compiler problem I ran into was deleting a cache file. I think that says a lot about TS 7's compatibility.

That was the 10 minutes. The problem was not `tsc` but everything that had been stacked on top of `tsc`.

## The First Thing to Break: next build

The typescript@7 package has no `lib/typescript.js`. With the compiler becoming a Go binary, the JS compiler API that countless tools depended on vanished entirely. Next.js was doing its build-time type check through exactly that JS API, and the version at the time, 16.2.12, failed at the build step when it met a typescript package without the API.

The fix was in Next.js 16.3. Under the name [useTypeScriptCli](https://nextjs.org/docs/app/api-reference/config/next-config-js/useTypeScriptCli), 16.3 added a mode that calls the local tsc CLI directly instead of the JS API, and it is on by default, so build-time type checking works on TS 6 and even on TS 7 without a JS API. In other words, **a typescript major upgrade forced a next minor upgrade.** Rather than the framework following the compiler, the compiler was pulling the framework version up, which felt a little unfamiliar. While bumping to 16.3, I also removed the deleted `experimental.viewTransition` flag from next.config.

## The Second Thing to Break: lint

With the build alive, I ran `pnpm lint`, and this time eslint died. Not a list of rule violations but a hard crash of the run itself. The message started with "typescript-eslint does not support TS 7.0" and ended with a link explaining how to work around it via the TS 6 API.

typescript-eslint's peer dependency range is `<6.1.0`, and the [tracking issue](https://github.com/typescript-eslint/typescript-eslint/issues/10940) shows that TS 7's stable external API is scheduled for 7.1, so proper support is hard until then. And it is not just typescript-eslint. ts-jest, ts-morph, the type checkers for Vue, Svelte and Astro, every tool standing on the JS API is waiting in the same line. The official workaround is to install `@typescript/typescript6` alongside and run only lint on TS 6, but I had been thinking about switching to oxlint anyway, so I chose that over the workaround. From here on this is no longer a TS 7 migration story but a toolchain replacement story.

## Taking Down eslint and prettier

What worried me about moving to [oxlint](https://oxc.rs) was not speed but coverage. Previously @naverpay/eslint-config bundled typescript-eslint, react, jsx-a11y and the import family, and I remapped that into an oxlint plugin configuration. Fortunately oxlint interprets existing `eslint-disable` comments as they are, so years of comments came over without changing a single line.

Turning the plugins on surfaced 84 findings that the old eslint had not caught. Going through them one by one and sorting them into "the rule is wrong" and "the code is wrong" was the work of that afternoon.

The representative of the rule-is-wrong pile was `react/react-in-jsx-scope`. When I first turned it on it reported no fewer than 1,281 findings, which startled me for a moment, but every one of them said "a file using JSX has no `import React from 'react'`". This rule is a relic of the pre-React 16 era, when JSX compiled to `React.createElement` calls. Back then every JSX file needed React in scope, so a missing import meant a runtime error, but since React 17 the automatic JSX runtime lets the compiler import the functions from `react/jsx-runtime` on its own. Next.js naturally uses this, so a JSX file that does not import React is not a problem but the recommended form. In other words, all 1,281 findings were false positives on perfectly normal code, and turning the rule off was the right answer. In the eslint days the preset (`react/jsx-runtime`) had been turning this rule off for me, and it briefly came back to life while I assembled the plugins by hand in oxlint.

The representative of the code-is-wrong pile was jsx-a11y. I converted the div modals with `role="dialog"` into native `dialog` elements, and despite all the years I had put it off, one CSS block resetting the browser's default styles kept the existing look intact.

The prettier side was almost anticlimactic.

```bash
oxfmt --migrate prettier
```

That one command carried the configuration over, and the only option it could not migrate was `endOfLine: auto` (it tells you itself: "is not supported, skipping"). Of 673 files in total, about 50 were reformatted. Markdown and yaml are formatting targets too, so nearly everything prettier had handled came over as is, and the `sortImports` option replaced eslint's `import/order` rule as well.

It was not free, of course. The package.json linting that the old config provided is outside oxlint's scope and is gone, some rules like `react/jsx-sort-props` have no oxlint implementation, and I turned off `typescript/no-unsafe-type-assertion` because the volume of findings was unmanageable. That oxfmt is still a 0.x beta also needs to be factored in.

## Unexpected Harvest: Type-Aware Linting in 1.9 Seconds

This was the most interesting part of the day. oxlint's default mode does not use type information at all. That is the secret of the 0.4 seconds, and in exchange it cannot run type-based rules like `no-floating-promises`. What I lost by abandoning typescript-eslint was exactly this typed linting, and [tsgolint](https://github.com/oxc-project/tsgolint) fills that spot. It is a project implementing type-based rules on top of typescript-go, and attaching it with `oxlint --type-aware` brings type-aware linting back.

So it becomes this irony. tsgolint stands on TS 7's compiler, so **in the very TS 7 environment where typescript-eslint crashes, type-aware linting runs across the whole monorepo in 1.9 seconds.** In the spot where I had to give up typed lint because of TS 7, I got a faster typed lint thanks to TS 7.

Real bugs came out on the first day I turned it on. The highlight was the bug `no-base-to-string` caught in the sitemap.

```diff
-    ...tags.map((tag) => ({
+    ...tags.map(({tag}) => ({
       url: `https://yceffort.kr/tags/${tag}`,
     })),
```

`tags` is an array of `{tag, count}` objects, and with the destructuring missing, every tag URL in the sitemap was being generated as `tags/[object Object]`. One pair of braces meant months of submitting broken URLs to search engines, an SEO bug, and since every type was correct, tsc stayed silent the whole time. Similarly, `restrict-template-expressions` caught a slug array being joined with commas into a string in the issue link at the bottom of posts, and `no-floating-promises` reported 7 cases in fullscreen, clipboard and service worker registration. All of it was "the types are right but the intent is wrong" code, which showed once again why typed linting exists.

## Settling the Numbers

I reproduced the pre-migration state with a git worktree and measured before and after on the same machine.

> Measurement environment: the same Apple M series Mac, cold cache, one run each. eslint took over 5 minutes even on rerun, so I could not increase the run count. Every conclusion rests on order-of-magnitude differences, so I judge that a single measurement does not change the verdict.

| Item         | Before                 | After                        | Ratio                     |
| ------------ | ---------------------- | ---------------------------- | ------------------------- |
| lint         | 752.4s (eslint, typed) | 0.4s / 1.9s (`--type-aware`) | about 1,880x / about 400x |
| format check | 216.6s (prettier)      | 2.9s (oxfmt)                 | about 75x                 |
| type check   | 4.2s (tsc ×3)          | 1.1s (native tsc ×3)         | about 4x                  |
| cold build   | 43.0s                  | 43.4s                        | same                      |

The table looks like a landslide, but each row needs an honest reading. The 1,880x for lint compares different axes. The 752 seconds of eslint is the cost of typed linting building a new TS program per workspace, while the 0.4 seconds of oxlint is a mode that does not look at types at all. The like-for-like comparison is the 1.9 seconds with type awareness on, and that is still about 400x. The 4x for type checking is at a level where the absolute values are meaningless because the codebase is small (most of the 1.1 seconds is the startup cost of three workspaces). The 10x that typescript-go advertises is a figure for large codebases where pure check time dominates. Still, it is not a number to dismiss. Shouldering the whole startup cost and still shrinking to a quarter is a good result in itself, and the larger the share of pure check time in a codebase, the closer this ratio will get to the 10x side.

## So Why Did the Build Not Get Faster

Coming back to the question left at the start, the answer lies in the composition of build time. This repository's 43-second `next build` is mostly Turbopack compiling the source and static generation of roughly 400 pages, and type checking is a few-second stretch inside that. Swapping the compiler speeds up only those few seconds, so even when 4.2 seconds become 1.1 seconds, it is buried in the noise of the 43-second total.

To put it a bit more structurally, what TS 7 makes faster and where `next build` spends its time do not overlap in the first place. TypeScript is a language that becomes JS once you erase the types, so the transform work in the build has long been done by native tools that ignore and strip types (SWC, now Turbopack). The job tsc holds in the build path is not transformation but checking, and TS 7 made that checking faster. No matter how much you shrink a piece that was already small, the whole does not shrink.

Conversely, this result is also specific to this repository. In a codebase where heavy type computation makes type checking dominate build time, the feel of TS 7 would be completely different. If you are hoping TS 7 will cut your build time, I think the first step is to measure how much of your current build type checking actually takes.

## Bonus Track: pnpm 11

The last task, which was not in the plan. Bumping pnpm to 11 produced a warning on the very first run.

```text
The "pnpm" field in package.json is no longer read by pnpm
```

pnpm 11 does not read the `pnpm` field in package.json, so the settings have to move to [pnpm-workspace.yaml](https://pnpm.io/pnpm-workspace_yaml), and `onlyBuiltDependencies` became `allowBuilds`. Since I had to copy them over anyway, I took the chance to delete all 30 overrides accumulated one by one with each security advisory and re-verify with `pnpm audit`. Only 2 came back. The other 28 were zombie pins that were already unnecessary because upstream packages had bumped their vulnerable dependencies in the meantime. Overrides have no expiry date, so this is apparently how they pile up. I came away thinking that periodically deleting them all and re-auditing may be better than managing them one by one. Adding the replacement of image-size, which never got a patch, with sharp to this cleanup, dependabot alerts went from 13 to 0.

To add, pnpm is the next runner in this trend. [pnpm 12](https://github.com/orgs/pnpm/discussions/11292) is a version with the install engine (the part that fetches and links packages) rewritten in Rust, currently in alpha, and the scope is said to be swapping only the engine while leaving the CLI, lockfile and node_modules structure alone, with no intentional breaking changes from v11. The compiler went to Go (typescript-go), the linter and formatter to Rust (oxc), the bundler was already Rust (Turbopack), and now the package manager is joining. The direction looks quite clear. As long as the artifact that runs in the browser can be produced in JS, there is no reason the tools that produce that artifact need to be written in JS. JS increasingly remains the language of the output rather than of the tools, and everything around it is moving to Rust and Go. As I experienced this time, when a foundational tool goes native, the tools on top of it have no choice but to follow, so this trend may well accelerate.

## Closing the Day

TS 7 itself is safe. That is my impression after a day with it. The code change was two lines of tsconfig, and there was hardly any moment where I could feel that the compiler had become Go. The crux is the lint pipeline. If you depend heavily on typed linting, you end up choosing one of three: wait for TS 7.1 and the ecosystem, keep only lint on TS 6 with `@typescript/typescript6`, or pay the cost of switching to oxc as in this post. For a codebase with a large stock of custom eslint rules, the cost of the third would be far greater than in this post.

In the end, what gets faster is not the build but the auxiliary tools of the development loop. Still, when a 12-minute lint becomes 2 seconds, what you can and cannot hook into pre-commit changes, so I felt this change is closer to reshaping the workflow than to saving CI fees. And what found the months-old `[object Object]` URL was not the new tool after all, but one rule I turned on while I was ripping out the tooling anyway.

Finally, if I had to name one personal gain, it is that I now have one more reason to study Rust. In the span of a day the linter and formatter became Rust and the package manager is following, so if you want to know how the tools you use every day work, it looks hard to avoid that language.
