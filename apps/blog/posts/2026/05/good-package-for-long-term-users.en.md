---
title: 'What makes a <em>package you can keep using for years</em> different'
tags:
  - frontend
  - package-management
  - semver
  - nextjs
  - maintenance
published: true
date: 2026-05-09 12:54:08
description: 'A good package has to be user-friendly not just in features, but in dependencies, version bumps, compatibility, and release policy.'
thumbnail: /thumbnails/2026/05/good-package-for-long-term-users.png
art:
  layout: rings
  hue: blue
  tone: light
  hero: 'peerDependencies'
---

## Table of Contents

## Introduction

What is a good package? The usual answers come up: well-designed API, good docs, decent performance, few bugs. None of that is wrong. But once you actually keep a package in production code for a long time, quality is not decided inside the code alone.

A package enters your schedule the moment it is installed. New features, security patches, deprecations, breaking changes, peer dependency warnings, canary releases, migration guides — all of these become user costs. Even a version bump that breaks nothing is a cost. The lockfile changes, you run CI, you do QA, you watch for regressions after deploy. So the question of whether you can use a package for years is closer to "how does it treat users when it changes" than to "was it nice on day one."

I felt this strongly while working with an internal design system. The components themselves were not bad — many parts were well made. The problem was the release policy. Token names changed in patch or minor releases and theme overrides silently disappeared, button heights and modal padding changed and broke QA snapshots. Sometimes a critical fix was missing from stable and only available on canary, so we had to ship the canary version to production. When this kind of thing repeats, users start to see the package not as a "dependency" but as a "risk."

This post looks at what makes a package usable for years, through Next.js, Yarn Berry, peerDependencies, and design system cases. The focus is more on Next.js — which has a much wider release surface than React itself — than on React. The conclusion is simple. **A good package is not code that works well, but code you can keep depending on at a predictable cost.**

## A package's real API includes its release policy

A package's API is not just function signatures or component props. The following are effectively part of the API:

- Which versions are supported
- When breaking changes are released
- Whether security patches are applied to previous majors
- How long the deprecation window is
- What canary, beta, rc, stable actually mean
- How wide or narrow peerDependencies are
- Which runtime dependencies are pulled into the user's app
- Whether migrations are provided as codemods
- Whether the release notes clearly state what the user has to do

None of these show up in `import` statements. But they are very real costs in product code.

For example, suppose a design system renames `Button`'s prop.

```tsx
// before
<Button variant="primary" />

// after
<Button color="brand" />
```

The change itself can be reasonable from a maintainer's perspective — clearer terminology, cleaner token system, more consistent design language. The issue is not whether the change is justified, but how it is delivered.

If it ships in a patch release with a one-line note like this, users have a hard time accepting it.

```md
## 2.4.1

- Renamed `variant` prop on Button to `color`
```

A breaking change went into a patch. No migration guide. No deprecated alias. No codemod. No previous-major support policy. From now on, users no longer trust patch upgrades.

The same change, delivered like this, is different.

```tsx
type ButtonProps =
  | {
      color?: 'brand' | 'neutral'
      variant?: never
    }
  | {
      /**
       * @deprecated use color instead.
       */
      variant?: 'primary' | 'secondary'
      color?: never
    }
```

And if the release policy is described like this, users can plan.

```txt
2.5.0: add color prop, variant emits deprecation warning
3.0.0: variant removed
2.x: 6 months of critical bug/security patches
codemod: npx @design-system/codemod button-variant-to-color
```

Both end up at the same place: `variant` disappears, `color` remains. But the user experience is completely different. A good package is not one that doesn't change. **It's one that makes change predictable.**

Release channel names sit in the same context. canary, beta, rc, stable are not just labels — they are the language users use to judge risk. If users have to ship canary to production to get a critical fix that is missing from stable, then the name says canary but the reality is an unstable stable. A good channel policy backports critical fixes to the stable line whenever possible, and when that is hard, it tells users when the fix will land in the next stable. That is exactly why the UK Intelligence Community Design System explicitly labels canary components as "unstable testing" and discourages production use.

## A framework upgrade is an ecosystem upgrade

Treating this as a React problem is slightly off. React has actually been pretty conservative about versioning and upgrade paths. It doesn't release majors often, and for React 19 it acknowledged the breaking changes and shipped React 18.3 as a bridge release first. React 18.3 is essentially identical to 18.2 but warns about deprecated APIs that would break in React 19. It gave users a buffer where they could see the warnings before the major upgrade.

The strain shows up more clearly in the framework layer above React. Next.js bundles together not only the React version but also router, compiler, bundler, runtime, cache semantics, deployment model, and security patches. Next.js's API includes the cadence and ecosystem coordination of all of these. So upgrading Next.js is not just bumping a single `next` package.

Next.js 15 illustrates this tension well. Next.js 15 was released as stable, but the App Router was tied to React 19 RC. The official release post even said the App Router uses React 19 RC. At the same time, breaking changes like Async Request APIs and caching semantics landed. Functionally, all of this is reasonable. But for organizations with large monorepos or shared design systems, "upgrading Next.js" effectively means "upgrading the entire React ecosystem and all internal packages together."

This is where version-bump fatigue starts to kick in. Even when a change is not breaking, users still have to review the dependency diff, look at the lockfile, run CI and E2E, validate in staging, and monitor after deploy. "Upgrades are easy" might be true from the maintainer's side, but inside a product schedule it's still an interruption. A framework changes the entire runtime environment of user code, so even a small minor upgrade is a small project for the team.

The clearer the user reactions get, the clearer this problem becomes.

The title of [Next.js discussion #73405](https://github.com/vercel/next.js/discussions/73405) is essentially "can the Next 15 features that don't need React 19 RC be backported to Next 14?" The author wants the self-hosting improvements and `next.config.ts` features in Next.js 15 but says they cannot upgrade their large monorepo and shared design system because of React 19 RC.

> "Upgrading to React 19 is not an easy task, especially for people working in big monorepos with many ecosystem packages."

The interesting part of this quote is not the general "React upgrades are hard." It's that even when you only want Next.js 15's self-hosting improvements or `next.config.ts`, the React 19 RC and ecosystem peer dependency problems come along as a single package. In the same post the author estimates it could take "at least a year" for the ecosystem and design systems to catch up. If you ignore the warning and force React 19 RC, and something breaks, filing an upstream issue is awkward — you ended up using an unsupported peer version that you "chose." This isn't just warning fatigue. It's the responsibility boundary moving onto the user.

The same problem repeats in other issues. [Next.js issue #72204](https://github.com/vercel/next.js/issues/72204) is titled "Cannot install dependencies after upgrading to Next 15 and React 19 RC." After running the codemod and bumping to Next 15 + React 19 RC, the author writes:

> "Now I cannot install any new package or upgrade any existing package."

What this shows is more than a single failed build. After the framework upgrade, the package manager's dependency resolution itself is blocked. The user only upgraded Next.js, but everything else — installing a brand-new unrelated package, upgrading any existing package — also stops working. Now upgrade cost is not measured in files the codemod touched, but in time spent waiting for the entire ecosystem's peer ranges to converge.

[Headless UI issue #3538](https://github.com/tailwindlabs/headlessui/issues/3538) reports the same problem from the other end: Next.js 15 demands React 19, and a peer dependency error blocks the upgrade.

> "I get a peer dependency error that breaks the upgrade. headlessui requires react 18."

Again, the point isn't that Headless UI is bad. When some UI package still declares React 18 as its only peer, Next.js's React major requirement can block the entire app's upgrade path. A single package's peer range becomes the schedule of the entire product.

The Reddit reactions look the same. In a [Next.js 15 upgrade thread](https://www.reddit.com/r/nextjs/comments/1g9cqyq), one user reports the small project finished in 5 minutes via codemod, but for the bigger project, builds kept failing due to dependency compatibility. The conclusion was to defer the upgrade.

> "With the smaller one, a blog template, it took less than 5 mins in total with the codemod. However, there was more problem when trying to upgrade another repo which is much bigger in size. The codemod managed to update close to 30-40 files but the build keeps failing. Digging deeper, there was lots of compatibility issues between that project's existing dependencies and React 19. ... Will wait for things to stabilize, so I'll give it at least 6 months before making a new attempt."

Another user in the same thread describes giving up after 2 hours of cookies/headers refactoring and 3rd-party UI package issues. None of this proves Next.js 15 is bad — there are reports of clean upgrades in smaller projects. The point is that as scale grows, version bumps stop being a simple task and become an ecosystem coordination problem.

Once a security patch enters the picture, the options shrink further. The React Server Components RCE advisory in late 2025 told App Router users on Next.js 15.x and 16.x to upgrade to a patched stable immediately. April 2026 brought a Server Components-based DoS advisory. Security vulnerabilities have to be patched, of course. But when a security patch effectively comes bundled with a major upgrade, users are left choosing between two risks:

1. Sit on the vulnerability.
2. Force the upgrade without verified ecosystem compatibility.

A good package's maintenance policy should narrow this choice. Backport security patches to as wide a supported range as possible, and when a major upgrade is required, say clearly why it is required, which combinations are safe, and which combinations have to be given up.

## Technically right with no migration design will still break users

Yarn Berry shows that a package's API was not just code, but the migration design itself. Yarn 2 tried to fix the long-standing problems of `node_modules` through Plug'n'Play (PnP). Considering install speed, disk usage, and phantom dependencies, the direction itself was sound. `node_modules` is slow, large, and allows implicit dependency access. PnP attacked these head-on.

But from the user's side, the implicit contract of the existing Node.js ecosystem was disturbed in a big way.

The official Yarn PnP migration docs ask you to consider:

- There is no `node_modules` folder.
- There is no `.bin` folder.
- Some `node` invocations have to become `yarn node`.
- For IDE support, you need to generate SDKs and configure VSCode.
- Some dependencies have to be declared explicitly.

This is not a simple package manager swap. It changes the dev environment, CI, editor, bundler, test runners, and script conventions all at once.

That's why questions like "how to turn off Yarn 2 PnP" got high scores on Stack Overflow. The same pattern repeats in GitHub issues.

[Yarn berry issue #6380](https://github.com/yarnpkg/berry/issues/6380) reports that with PnP and a workspace TypeScript SDK, vscode shows module not found while `yarn build` succeeds. The author tested various yarn × typescript version combinations as a matrix, and ended up with a single resolution.

> "What single action fixes this? `yarn config set nodeLinker node-modules && yarn`"

The point here is not whether this is a vscode bug or a typescript bug. The user has to live with `yarn build` succeeding while the editor shows red squiggles every day. Once one tool's problem makes PnP unusable, the most stable escape hatch becomes flipping nodeLinker back to `node-modules`. PnP's promise of "freedom from node_modules" breaks the moment it misaligns with one IDE.

[Yarn berry issue #7071](https://github.com/yarnpkg/berry/issues/7071) is more direct. Once Vite 8 swapped its bundler internals to rolldown, import resolution itself started breaking under PnP. The author's first report is short:

> "Changing the nodeLinker from pnp to node-modules fixes the problem."

Another comment in the same thread is heavier.

> "The Vite team is probably not going to support Yarn PnP going forward."

The point of these quotes isn't to assign blame. Bundlers are moving toward native (Rust) implementations, which makes it harder to keep up with PnP's module resolution, and Vite may stop supporting PnP. From the user's perspective, a build failure that resolves with a one-line nodeLinker change is actually a signal closer to "this tool may no longer be your channel."

This is not to say Yarn was wrong. Yarn Berry actually identified a structural problem in the Node.js ecosystem precisely. The issue is **whether the buffer needed for users to move in the right direction was sufficient.**

For a package or tool to break the implicit contracts of the existing ecosystem, it should at least provide:

- An escape hatch that lets users stay on the old way
- A migration doctor or compatibility checker
- A compatibility matrix for major tools
- Good error messages explaining the cause when things fail
- A staged guide for organization-level migration
- Enough parallel support until things stabilize

Technically better design becomes a better experience for users only when there is migration design between the two.

## A dependency is operational responsibility passed to the user

`peerDependencies` at least surface as warnings. Plain `dependencies` are quieter. They install along with the package, and the user takes on the bundle, audit, transitive dependency, and security patch costs without ever knowing why those dependencies are needed.

Personally, I've had to respond to axios vulnerabilities just because axios had been pulled in for "things you could just do with `fetch`." That doesn't make axios a bad package. axios is an old HTTP client, and if you actually need interceptors, timeouts, transforms, or the Node/browser abstraction, there are reasons to use it. The problem is when it's added by habit, even when none of those features are needed.

Suppose you have code like this.

```ts
import axios from 'axios'

export async function getUser() {
  const response = await axios.get('/api/user')
  return response.data
}
```

For this much, the platform API is enough.

```ts
export async function getUser() {
  const response = await fetch('/api/user')

  if (!response.ok) {
    throw new Error('Failed to fetch user')
  }

  return response.json()
}
```

Of course, using `fetch` doesn't make security problems disappear. If a server forwards user-provided URLs as-is, you can still build SSRF on top of `fetch`. The difference is that **when you add a dependency for a problem that didn't need one, the user inherits that dependency's specific vulnerabilities and release policy.**

Even axios alone had a 2025 advisory about SSRF / credential leakage related to absolute URL handling, and another advisory about excessive memory use in `data:` URL handling. If you're using axios's advanced features directly, that response is a normal cost. But if a package internally pulled axios in just for one HTTP call, the user is paying a cost they didn't choose.

So a good package doesn't add dependencies easily. Before adding one, it asks:

- Is the platform API enough?
- Does this dependency end up in the user's bundle?
- Could this dependency's security advisories break the user's audit?
- Which of Node, browser, edge runtime does this dependency support?
- Should this go in the core, or can it be split into an adapter package?
- Can this be exposed as an optional or peer dependency so the user picks?

Design systems and framework plugins, which get installed across many apps, should be especially conservative. If you push axios, a date library, an animation library, or a CSS-in-JS runtime into core dependencies for internal convenience, every product team has to follow that release cycle. Good structure usually keeps the core small and splits out integrations.

```txt
@company/ui-core
@company/ui-react
@company/ui-next
@company/ui-axios-adapter
```

You don't have to split everything like this. But any dependency the user didn't pick is itself maintenance debt. A good package treats dependencies not as a shortcut to features, but as operational responsibility passed to the user.

## peerDependencies is a responsibility boundary

The recurring problem in the Next.js 15 case ultimately comes down to `peerDependencies`. Many people see peer dependencies as just an annoying install warning. In reality, it's the compatibility contract a package declares to its users, and the line that decides whose responsibility it is when things break.

For example, this declaration means React 18 only.

```json
{
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

Suppose this package actually works on React 19 too. The user still gets an install warning on a React 19 project. npm may even refuse to install; pnpm or Yarn leave warnings. Eventually the user starts considering workarounds like `--force`, `--legacy-peer-deps`, `overrides`, or `packageExtensions`.

A good declaration allows a wider range.

```json
{
  "peerDependencies": {
    "react": "^18.2.0 || ^19.0.0",
    "react-dom": "^18.2.0 || ^19.0.0"
  },
  "peerDependenciesMeta": {
    "react-dom": {
      "optional": false
    }
  }
}
```

But widening the range is not the end. The declaration has to be proven by a CI matrix.

```yaml
strategy:
  matrix:
    react:
      - 18.2.0
      - 19.0.0
```

Widening the range is not just a metadata change. The actual code has to absorb the differences between two React versions. The most common example is `forwardRef`. From React 19, function components can take `ref` as a regular prop, so `forwardRef` is now a deprecated path. But a design system that supports React 18 alongside still has to satisfy both models.

```tsx
// React 18: forwardRef required
const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => (
  <button ref={ref} {...props} />
))

// React 19: ref as a regular prop
function Button({ref, ...props}: ButtonProps & {ref?: Ref<HTMLButtonElement>}) {
  return <button ref={ref} {...props} />
}
```

The workarounds real design packages use look similar. Keep `forwardRef` and silently swallow React 19's deprecation warning internally, or move to ref-as-prop and use type assertions to pass the React 18 build, or split the build at compile time so a different entry is exported per React version.

One thing worth noting is that React 19 **deprecated** `forwardRef`, it didn't **remove** it. `forwardRef` still works on React 19 — you just see a deprecation warning in the console. So the most conservative pattern is to barely change the code and just widen the peer range. Users see deprecation warnings, but warnings are better than breakage. From the design system's side, if you have dozens of components, you can't migrate them all at once. A deprecation that comes with a deprecation period gives you "an operational resource that lets us not break now and buys us time until the next major."

A more active approach is to satisfy both models with a compat helper.

```tsx
import {forwardRef as legacyForwardRef, type Ref} from 'react'

// Helper that works the same on React 18 / 19
export function compatForwardRef<T, P>(
  render: (props: P, ref: Ref<T>) => React.ReactNode,
) {
  return legacyForwardRef(render as any) as unknown as (
    props: P & {ref?: Ref<T>},
  ) => React.ReactNode
}

// Usage
const Button = compatForwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => <button ref={ref} {...props} />,
)
```

This kind of helper looks small but has a big effect. Component authors can write new code in the React 19 style, React 18 users don't break, and deprecation warnings only happen inside the helper, so the user's console stays relatively clean. More importantly, 100 components go through the same helper, which means the React-model switch can be decided in one place.

This matters in design systems specifically because ref forwarding chains. When a ref has to flow through several layers like `Tooltip → Popover → Button → <button>`, switching only one layer to the React 19 model collides with the type definitions of the other layers. Type mismatches in component composition aren't always caught at compile time — they show up at runtime as `null` refs or broken focus management. Unifying through a single helper makes the entire ref chain behave the same way and reduces these incidents.

Type definitions sit in the same context. React 18's `Ref<T>` and React 19's `Ref<T>` are slightly different. So some packages ship two `.d.ts` outputs depending on the `@types/react` version. The build-split export pattern looks roughly like this.

```json
{
  "exports": {
    ".": {
      "react-18": "./dist/react-18.js",
      "react-19": "./dist/react-19.js"
    }
  }
}
```

In practice, after the React 19 RC was announced, similar issues went up across multiple design packages around the same time. [react-aria-components #7583](https://github.com/adobe/react-spectrum/issues/7583), [ant-design-mobile #6899](https://github.com/ant-design/ant-design-mobile/issues/6899), [vidstack/player #1533](https://github.com/vidstack/player/issues/1533) are all the same shape. To widen a peer range by one line, you have to verify ref forwarding, JSX runtime, and hook behavior together. Some packages kept the code as-is and shipped just a wider peer; some widened the peer first and let the internal compatibility lag, leaving users to discover runtime errors.

A peer range like `^18.2.0 || ^19.0.0` is a one-liner that is actually the result of all this internal compatibility work. A wide peer range is not metadata — it's the package's operational burden.

Conversely, if you can't support React 18 and 19 at the same time, a narrow peer range itself isn't the problem.

```json
{
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

The problem is dropping that declaration without explaining how long React 18 users will be supported, what kind of patches will go to the previous major, or why React 19-only features were adopted. In design systems especially, a single peer dependency moves the entire product's React version. If a single button declares React 19 only, every app using that button is forced into the same decision.

So a peer dependency change cannot end with a one-line changelog. At minimum, the following information has to come with it:

- React 18 support end date
- The last major/minor for React 18
- The bug/security patch range provided for the React 18 line
- A codemod or migration guide for the React 19 transition
- Per-app migration windows
- Rules for using canary/stable packages

`peerDependencies` is not install metadata. It is operational policy. The moment you train users to ignore the warnings, you've handed compatibility responsibility over to them.

## A design system's breaking changes go beyond code

In a regular library, breaking changes usually mean removed APIs, changed function signatures, or changed types. In a design system, the surface is wider.

Nulogy Design System treats not only prop removals, prop renames, and component renames, but also visual updates that affect layout as major changes. Font size, font weight, and letter spacing changes can affect line breaks and layout, so they can be breaking changes too.

GitLab Pajamas Design System is similar. If a designer has to take action after an update, they treat it as a breaking change. Dimension changes, property incompatibilities, and lost overrides are all included.

This is especially important for internal design systems. Design system changes don't only show up as TypeScript compile errors.

- A button height changes and the layout shifts.
- Modal padding changes and a QA snapshot breaks.
- A token name changes and a theme override disappears.
- The DOM structure changes and a test selector fails.
- Default aria attributes change and an accessibility test changes.
- Internal focus behavior changes and an E2E test fails.

The problems I encountered fell into this category. For example, when a color token alias changed, the theme overrides products had defined no longer applied. Button heights and modal padding shifted by a few pixels each, and QA snapshots and regression tests broke together. Component props were unchanged, so TypeScript stayed quiet — but the screen the user saw and the tests were not quiet.

These changes can look like minor in code. To users, they're major.

So design systems should interpret semver more conservatively. In particular, "visual changes are not API changes" is the wrong framing. In a design system, the visual result is part of the API. Users consume the design system's DOM, CSS, tokens, spacing, and interaction as part of their product.

## A checkpoint for packages you can keep using

There is no need to rewrite all of the above as a numbered list. The following is what to actually look for in release notes or upgrade guides.

| Item             | Bad signal                                             | Good signal                                                           |
| ---------------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| semver           | Breaking changes appear in patch/minor                 | Ambiguous changes are pushed to major and a migration path is given   |
| release cadence  | Effectively forces every project to the latest version | Explains the upgrade window and urgency                               |
| previous major   | Old line is abandoned as soon as a new major lands     | EOL date and bug/security patch range are stated                      |
| deprecation      | Discovered in changelog only after removal             | Pre-announced via warning, JSDoc, lint rule, codemod                  |
| dependencies     | Adds core dependencies for implementation convenience  | Considers platform APIs, optional dependencies, adapters              |
| peerDependencies | Trains users to ignore warnings                        | Verifies the supported range in CI, states unsupported combos plainly |
| canary           | Ends up in production because of a blocker fix         | Backports critical fixes to the stable line                           |
| migration        | Just says "upgrade to the latest version"              | Explains impact, order, automation, rollback                          |

The common point of this table is one thing. A good package can't make the cost of change disappear, but it lets users predict that cost and put it in their schedule.

## A good package respects the user's time

What matters in package maintenance isn't avoiding change itself. Change is necessary. Old APIs have to be removed, the structure has to move toward something better, security problems have to be fixed quickly. The question is how that change reaches the user.

Package authors can change internal structure aggressively. They can support new runtimes, move to a better bundler, clean up old APIs. But when those changes reach users, they should be conservative. Users should be able to know in advance, test, migrate gradually, and roll back if something fails.

No matter how good a feature is, if users can't soft-land on it, it's not an improvement — it's an invasion of their schedule.

Maintainers are always making hard tradeoffs. Holding old APIs makes code complex. Backporting security patches to previous majors costs time. Testing React 18 and 19 simultaneously increases CI time. Splitting canary and stable makes release operations annoying. These costs are real and significant.

So I can't claim every package should have an LTS policy, support every major for years, and ship a codemod for every migration. Open source or internal — maintainer time is finite.

But a good package doesn't hide its limits from users.

```txt
React 18 is no longer supported.
v2 will not receive security backports.
canary is not recommended for production use.
This breaking change does not have a codemod.
```

These statements may look cold, but they're better for the user. They reduce uncertainty. The user can see the risk and choose.

A package you can keep using for years is not a perfect package. **It's a predictable one.** It explains the reason when something changes, states the support range clearly, lowers the upgrade cost as much as possible, and lets the user plan.

In the end, package quality reveals itself after the release. Day-one DX is just the start. Real DX shows up six months later when a security patch has to land, a year later when a major upgrade is needed, when 20 internal products are following the same design system at different speeds.

A good package isn't one that doesn't break the user's code. It's one that respects the user's time even when it has to break the code.

## References

- **Next.js 15 / React 19 migration**: [Next.js 15](https://nextjs.org/blog/next-15), [Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-15), [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- **User reports**: [discussion #73405](https://github.com/vercel/next.js/discussions/73405), [issue #72204](https://github.com/vercel/next.js/issues/72204), [Headless UI #3538](https://github.com/tailwindlabs/headlessui/issues/3538), [Reddit thread](https://www.reddit.com/r/nextjs/comments/1g9cqyq)
- **Security advisories**: Next.js [RCE](https://github.com/vercel/next.js/security/advisories/GHSA-9qr9-h5gf-34mp) / [DoS](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3), axios [SSRF](https://github.com/advisories/ghsa-jr5f-v2jv-69x6) / [DoS](https://github.com/advisories/GHSA-4hjh-wcwx-xvwj)
- **Yarn Berry / PnP**: [Migration guide](https://yarnpkg.com/migration/pnp), [SO: how to turn off PnP](https://stackoverflow.com/questions/60012394/how-to-turn-off-yarn2-pnp), [issue #6380 (TS SDK)](https://github.com/yarnpkg/berry/issues/6380), [issue #7071 (Vite 8)](https://github.com/yarnpkg/berry/issues/7071)
- **React 19 peer compat cases**: [react-aria-components #7583](https://github.com/adobe/react-spectrum/issues/7583), [ant-design-mobile #6899](https://github.com/ant-design/ant-design-mobile/issues/6899), [vidstack/player #1533](https://github.com/vidstack/player/issues/1533)
- **Design system versioning**: [ICDS](https://design.sis.gov.uk/get-started/releases-versions/), [Nulogy](https://nulogy.design/guides/versioning/), [GitLab Pajamas](https://design.gitlab.com/get-started/uik-breaking-changes/)
