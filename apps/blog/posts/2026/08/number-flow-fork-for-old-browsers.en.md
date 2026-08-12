---
title: 'Porting number-flow to Old Browsers: Five Decisions and Two Reversals'
tags:
  - javascript
  - animation
  - web-animations-api
  - browser-compatibility
  - frontend
published: true
date: 2026-08-11 22:00:00
description: 'The minimum versions where number-flow turns animations on are Chrome 125 and Safari 17.2. A record of the decisions made while building a fork that lowers this floor to Chrome 66 and WebKit 16.4, the two judgment calls I ended up reversing, and the Safari bug investigation that made me give up on automatic downgrading.'
thumbnail: /thumbnails/2026/08/number-flow-fork-for-old-browsers.png
---

## Table of Contents

## It Started with Two Numbers

Chrome 125, Safari 17.2. These are the de facto minimum versions that [number-flow](https://github.com/barvian/number-flow), the animated number counter library, requires before it turns animations on. The library itself loads and renders values correctly on lower versions, but the animation is silently disabled. Instead of rolling, the digits just swap instantly.

This floor doesn't come from neglecting support; it comes from a design that is radical in the opposite direction. number-flow implements the digit spin with CSS `mod()`/`round()` math, the spring curve with `linear()` easing, and animatable custom properties with `@property`. All three are recent CSS features that let the browser's animation engine do the work with no per-frame JS involvement, and all three must be present for animations to turn on. `mod()` ships in Chrome 125 and `linear()` in Safari 17.2, so their intersection becomes that floor.

The problem is that plenty of browsers in the world still live below that floor. And the place where I wanted to use this library happened to be exactly such an environment. I wanted to show the same animation on old Android WebViews that stopped receiving updates, and on old Safari versions pinned to whatever iOS version the device is stuck on. The same demand shows up verbatim in the upstream issue tracker: a request for at least a `cubic-bezier()` fallback because animations don't run below iOS 17.2 ([#131](https://github.com/barvian/number-flow/issues/131)), and a report that it doesn't work on older Safari ([#164](https://github.com/barvian/number-flow/issues/164)). So I built a fork, [yceffort/number-flow](https://github.com/yceffort/number-flow), that keeps the original's API and visual output while swapping out only the animation driver, lowering the floor to Chrome 66 and WebKit 16.4 (the theoretical floor by API surface is around iOS 13).

This post is a record of that process, but instead of a chronological diary I organized it as a **decision log**, because the actual substance of a migration turned out to be closer to a chain of judgment calls than to writing code. I list the five decisions I made in order, and the two judgments I reversed get their own "Reversal" entries. One was reversed in a single step; the other took three rewrites to settle. The reversed decisions are exactly the things I wish I had known from the start. There is also one entry that is closer to giving up than deciding, which is the story of Safari and automatic downgrading. For readers who care about the code rather than the judgment calls, there is a change map section near the end that walks through what changed in each file, how, and why.

> Code quotes in this post are based on the fork [yceffort/number-flow `578d5f0`](https://github.com/yceffort/number-flow/tree/578d5f0) and upstream [barvian/number-flow `a7b78f5`](https://github.com/barvian/number-flow/tree/a7b78f5) (number-flow 0.6.2). Verification numbers are the ones recorded in the repository's CI and README.

## Decision 1: Don't Rewrite; Swap Only the Driver

The conclusion I reached after first reading the original code was: "this library's real asset is not its animation code." The real assets sat underneath it.

- A structure where every digit keeps all ten numerals 0–9 in the DOM and only shows the current one. Whatever happens to the animation, the accessibility tree and the text are always correct.
- Diff logic that assigns keys to `Intl.NumberFormat.formatToParts` results and reliably tracks the entry/exit/movement of digits and symbols.
- The six-layer mask gradient CSS that naturally clips the digits scrolling up and down.

The animation execution layer sitting on top of these assets was thinner than expected. The places that actually call `el.animate()` amount to just seven sites in all of [lite.ts](https://github.com/yceffort/number-flow/blob/578d5f0/packages/number-flow/src/lite.ts). So I chose vendoring over a rewrite: take the original source as-is, and push only those seven call sites behind a single layer of engine abstraction.

Where the upstream call looks like this:

```ts
// barvian/number-flow a7b78f5, lite.ts, Num.didUpdate
this.el.animate(
  {
    [dxVar]: [`${dx}px`, '0px'],
    [widthDeltaVar]: [dWidth, 0],
  },
  {
    ...this.flow.transformTiming,
    composite: 'accumulate',
  },
)
```

the fork changes it to this:

```ts
// yceffort/number-flow 578d5f0, lite.ts, Num.didUpdate
animate(
  this.flow,
  this.el,
  {
    [dxVar]: [`${dx}px`, '0px'],
    [widthDeltaVar]: [dWidth, 0],
  },
  this.flow.transformTiming,
)
```

`animate()` calls `el.animate(..., { composite: 'accumulate' })` exactly like the original when the native path is available, and hands off to the rAF-based fallback engine otherwise. In other words, on modern browsers this fork takes exactly the same code path as the original. The property that no JS runs per frame, because the animation is browser-native, is preserved too. Unless you force an engine explicitly, the fallback engine only steps in on browsers where the original gives up on animating.

A side effect of vendoring is that the nature of the diff became clear. If you compare the two repositories right now, `formatter.ts` and the util files are semantically 100% identical apart from formatting differences, and the substantive changes are concentrated in `lite.ts`, `styles.ts`, and `ssr.ts`. I considered it important for the fork's credibility to maintain a state where "what did you change" is provable by the diff itself.

One more note: I started from a fresh repository instead of the git fork button. I wanted to replace the infrastructure wholesale (pnpm monorepo, oxlint/oxfmt, dropping the Vue/Svelte wrappers and the docs site). In exchange, I separated the custom element name into `number-flow-yceffort-react` so it can coexist with the original `@number-flow/react` on the same page during a migration period. The package also swaps in via an alias with no code changes:

```json
"dependencies": {
  "@number-flow/react": "npm:@yceffort/number-flow-react@^0.1.0"
}
```

## Decision 2: Change the Question Feature Detection Answers

Upstream's animation gate is one line.

```ts
// barvian/number-flow a7b78f5, lite.ts
export const canAnimate = supportsMod && supportsLinear && supportsAtProperty
```

Are all three CSS features present? The answer to this question used to be the answer to "do we animate at all." In the fork, this line becomes:

```ts
// yceffort/number-flow 578d5f0, lite.ts
// The rAF fallback engine only needs rAF itself; browsers that additionally
// support linear() + mod()/round() + @property get the original native path:
export const canAnimate =
  BROWSER && typeof requestAnimationFrame !== 'undefined'
```

The detection results for the three features are not thrown away. Renamed to `supportsNativeAnimations` in [engine/index.ts](https://github.com/yceffort/number-flow/blob/578d5f0/packages/number-flow/src/engine/index.ts), they now answer "which engine do we run on" instead of "can we animate." The same detection code's role changed from a gate to a router.

On top of this I added a manual override for testing. Without a way to force the fallback engine on a modern browser, the fallback code would effectively be an untestable dead path.

```ts
export type EngineMode = 'auto' | 'native' | 'raf'

export const setEngineMode = (m: EngineMode) => {
  mode = m
}
```

This API later gained a second use I hadn't anticipated; that story comes back in the Safari section.

## Decision 3: Carry Over composite: 'accumulate' with Its Semantics Intact

This is the point I deliberated on longest while designing the fallback engine. Anyone can get as far as "tween the values with rAF on old browsers" (tweening: computing intermediate values every frame to move a value along). What makes the problem hard is the requirement that the tween have **the same semantics as the original**.

All of number-flow's animations run with `composite: 'accumulate'`. Each animation converges "from the current delta to 0," and when multiple animations overlap on the same property, the browser sums their contributions. Thanks to this structure, when a new value arrives while the digits are still rolling, the animation doesn't visibly snap. The existing animation keeps decelerating as it was, and one more animation covering just the new delta gets stacked on top.

If you build the fallback naively as "when a new value arrives, cancel the existing tween and start a new one," these semantics break. Restarting from the position at cancellation keeps the value itself continuous, but the decelerating velocity jumps discontinuously into the steep opening of the new curve, so rapid consecutive updates produce a subtle stutter every time. Put the fork next to the original in a comparison demo and the difference is immediately visible.

So I built the engine around (element, property) channels, with each channel summing the contributions of its active tweens every frame.

```ts
// engine/index.ts
class Channel {
  readonly anims = new Set<JSAnimation>()

  apply(now: number) {
    let total = 0
    this.anims.forEach((anim) => {
      total += anim.valueAt(now)
      if (anim.done) this.anims.delete(anim)
    })
    this.applier(this.el, total, this.anims.size === 0)
    if (this.anims.size === 0) activeChannels.delete(this)
  }
}
```

Each tween's `valueAt` keeps the same "from delta to 0" shape as WAAPI.

```ts
valueAt(now: number): number {
  if (this.done) return 0
  const t = (now - this._start) / this._duration
  if (t < 0) return 0
  if (t >= 1) {
    this._finish()
    return 0
  }
  return this._from * (1 - this._ease(t))
}
```

The loop layers a 34ms `setTimeout` backstop on top of rAF.

```ts
const ensureLoop = () => {
  rafId ??= requestAnimationFrame(tick)
  // rAF can be throttled or entirely absent (hidden pages, some old WebViews,
  // headless virtual time); a timer backstop keeps animations progressing:
  backstopId ??= setTimeout(tick, 34)
}
```

In background tabs and some WebViews, rAF gets heavily throttled or stops entirely. If the cleanup of an exiting character stalls in that state, the element can be left with the old and new values visibly overlapping. The original has the same family of problem on record as [issue #148](https://github.com/barvian/number-flow/issues/148) (an open issue that reproduces only intermittently on Android WebView, with the cause not yet pinned down). The timer costs nothing when rAF is healthy, since it gets cancelled every frame, and only takes over progression when rAF has stalled.

Of course, in the background `setTimeout` itself is throttled too, to once a second, and to minute-level intervals if the page is left long enough. The objection that 34ms can't possibly hold comes immediately, but it is still sufficient for the purpose, because what this timer guarantees is not frame rate but termination. Tweens are computed from elapsed time, so a single tick waking up seconds later jumps straight to the finished state and completes the cleanup.

## Decision 4: Don't Approximate the Easing; Parse It

number-flow's spring deceleration is defined as a CSS `linear()` function string with 90 sample points in it.

```ts
// lite.ts, default spinTiming (abridged)
easing: `linear(0,.005,.019,.039,.066,.096,.129,.165, ..., .9988,.9989,1)`,
```

There were a few options for handling this in the fallback. The easiest path is "hardcode an ease-out that feels similar," and the next is "use a pre-baked curve, but only for the default easing." I discarded both. This fork's verification method was a demo comparing it side by side with the original, so a different curve is itself a failure. And `spinTiming` and friends are public API, so users can pass arbitrary easing strings; if only the default value gets special treatment, you can no longer claim API compatibility.

The reporter of upstream [#131](https://github.com/barvian/number-flow/issues/131), mentioned in the introduction, was asking for even a `cubic-bezier()` fallback. Because I discarded approximation, this fork's answer ended up going one step further than that request: not a fallback to a similar curve, but the same curve.

So I built a parser for CSS easing strings in [engine/easing.ts](https://github.com/yceffort/number-flow/blob/578d5f0/packages/number-flow/src/engine/easing.ts).

- `linear(...)`: parsed per the CSS spec, including percentage stop positions, even distribution when positions are omitted, and enforced monotonic progression. Playback finds the segment by binary search and interpolates linearly, and since `linear()` is by spec a function that linearly interpolates between stops, this playback is not an approximation but the identical curve down to floating-point error.
- `cubic-bezier(...)`: implemented with the standard bezier-easing algorithm (Newton-Raphson, falling back to bisection when convergence fails).
- `steps(...)`: supports all four positions, `jump-start`/`jump-end`/`jump-none`/`jump-both`.
- Keywords (`ease`, `ease-in-out`, and so on) are substituted with their corresponding cubic-beziers.

Writing the parser to spec taught me, during review, that the spec's validity rules come along for the ride. For example, `steps(1, jump-none)` is an invalid combination per the CSS spec, and computing it naively makes `step / (count - 1)` a division by zero, writing `NaN` into an inline style. Input that a browser would have rejected at parse time silently passes through a JS port unless it rejects it explicitly.

## Decision 5: Move the CSS Math to JS, but Let the Stylesheet Consume It

The heart of the digit spin is the `mod()`/`round()` math in the original stylesheet. Each numeral (`.digit__num`) computes the distance between the current value and its own index to derive `--y` (a translateY percentage). Old browsers have no `mod()`, so I ported this math to JS.

```ts
// engine/index.ts
const cssMod = (a: number, m: number) => ((a % m) + m) % m

// JS port of the .digit__num CSS formula from styles.ts (mod()/round() math):
export const digitYPercent = (c: number, length: number, n: number): number => {
  const raw = cssMod(length + n - cssMod(c, length), length)
  const offset = raw - length * Math.floor(raw / (length / 2))
  return clamp(-1, offset, 1) * 100
}
```

There was one design principle I tried to hold onto here. The fallback engine **only writes, inline, the values the original stylesheet consumes**; it does not split the stylesheet into a separate fallback edition. Write custom properties like `--_number-flow-dx`, `--scale-x`, and `--y` every frame, and the original CSS handles the rest. My view was that the moment there are two stylesheets, you lose any way to verify visual equivalence.

That said, the mask and padding styles that use `round()` outside of animations unavoidably needed double declarations, and here I stepped on one of CSS's older traps. I assumed branching with `@supports` would do, but if the probe contains `var()`, the branch becomes meaningless on old browsers. It's exactly as the comment I left in [styles.ts](https://github.com/yceffort/number-flow/blob/578d5f0/packages/number-flow/src/styles.ts) says: with `var()` in the value, an old browser cannot reject the declaration at parse time, so it wins the cascade first and then gets invalidated at computed-value time, taking the whole property down with it. So the probe had to be a `var()`-free literal, like `@supports (padding: round(nearest, 0.125em, 1px))`.

## Verification: Don't Claim the Support Range; Prove It by Running

Every decision so far exists to construct the claim "it works on old browsers," and this claim, by its nature, cannot be proven by any amount of testing on modern browsers. Forcing the fallback path with `setEngineMode('raf')` on the latest Chrome and running on a real Chrome 66 are different things. A genuinely old browser doesn't just lack the features the fallback engine routes around; it may also lack the APIs the fallback engine itself uses.

So I built the verification in three layers.

1. **Declaration**: pin the support floor (Chrome 66+, Safari/iOS 13+, Firefox 78+, Edge 79+) in `.browserslistrc`.
2. **Static check**: in CI, `eslint-plugin-compat` fails the build if the source uses an API missing at the floor.
3. **Execution**: run the selftest on real old-browser binaries.

There is something to admit up front: the three layers do not cover the same range. Execution proof reaches down to Chromium 66+ and WebKit 16.4+. Of the declared floors, the iOS 13 to 16.3 range and Firefox 78+ have passed only the static check, and by this section's own standard they are still "claims." The WebKit builds for Safari 16.0 through 16.3 won't even launch on current macOS, and I never built a runner for old Firefox. Let it be pinned down here that for those ranges, static analysis of the API surface is the only evidence.

The third layer is the core. `demo/selftest.html` is a page that runs five scenarios by itself inside the browser (spin plus width change, rapid interrupts, sign crossfade, a live ticker, and post-completion cleanup state) and reports the results of 44 assertions. It runs on real old-version binaries downloaded from the Chromium snapshot archive, and on old WebKit versions that Playwright pins per release. The per-commit CI covers Chromium 66/80/114 and WebKit 16.4/17.4/18.2; the full eight-milestone matrix (66/71/75/80/87/92/100/114) is the result of a local runner.

| Environment                           | Upstream behavior                              | Fork result                                              |
| ------------------------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| Chromium 66–114 (8 real binaries)     | Animations off                                 | rAF fallback auto-selected, 44 assertions PASS           |
| WebKit 16.4 (≈ Safari 16.4)           | Animations off                                 | rAF fallback auto-selected, PASS                         |
| WebKit 17.4 / 18.2                    | Native (some failures; see the Safari section) | Identical failures to upstream; all PASS with rAF forced |
| Latest Chromium / Firefox / WebKit 26 | Native                                         | PASS on both native and forced-rAF                       |
| Next.js 16 (React 19) SSR             | -                                              | Server markup + hydration smoke PASS                     |

Running old Chromium in CI took some sleight of hand. Old binaries are incompatible with modern CDP clients, so Playwright can't attach to them. Instead, the selftest page is executed directly with `--headless --dump-dom`: the page delays its `load` event until verification is complete, then releases it, which triggers the DOM dump at exactly that moment. The results are harvested from the dumped DOM.

## Reversal 1: "Clean Up Spent Inline Styles" Was Wrong

From here on are the judgments I reversed.

Since the fallback engine writes inline styles every frame, I assumed that erasing them when the animation ends, returning control to the stylesheet, was obvious hygiene. I actually [changed it to do that](https://github.com/yceffort/number-flow/commit/7bde206): a channel that reaches rest clears its inline `--y`.

A few days later I [reversed that decision](https://github.com/yceffort/number-flow/commit/6be954f). The cause was a mismatch of ownership and timing.

- Each digit's spin ends **at a different time per digit**. The hundreds digit can already be at rest while the ones digit is still rolling.
- But the `is-spinning` class, which makes all ten numerals 0–9 visible, is removed at the **whole flow's** `animationsfinish` moment, not per digit.
- If you clear an early-resting digit's inline `--y` on the spot, then on a browser without `mod()` the stylesheet has no way to compute `--y`. The result: while `is-spinning` is still alive, that digit's numerals that should stay hidden are exposed.

The fix became: "channels whose tween has finished keep their resting value inline until the whole flow settles, and cleanup is done by `Digit` after the entire flow reaches rest." This wasn't a problem with the one line that clears an inline style; it was an ownership design problem of "who clears this value, and when." This bug re-taught me that cleanup code belongs with the party that knows the lifetime, not the party that does the writing.

## Reversal 2: The @property Detection Was Rewritten Three Times

The `@property` support detection initially had the same structure as upstream: register four custom properties with `CSS.registerProperty` in a single try block, and treat a throw as lack of support.

First problem: when two copies of the same library land on one page (micro frontends, or the coexistence-with-upstream scenario that Decision 1 deliberately created), the second copy's registration throws `InvalidModificationError`. That is not "unsupported"; it is "name already taken." A batched try/catch cannot tell those two apart and downgrades a supporting browser to rAF. So I [broke it into individual registrations](https://github.com/yceffort/number-flow/commit/42182e1) and made `InvalidModificationError` count as supported.

Second problem: during review I realized this judgment was complacent too. `InvalidModificationError` only tells you the name was taken; it does not tell you **with which descriptors** it was registered. Why this matters: the digit spin math depends on `--_number-flow-d` being registered with `inherits: true`, so that the parent's animated value is inherited by the child `.digit__num`. If some other code had claimed the same name with `inherits: false`, the registration would "count as a success" while the animation silently breaks.

So the [third version](https://github.com/yceffort/number-flow/commit/8f2bebd) probes the actual behavior of a preexisting registration through the DOM. It creates parent/child divs, injects a probe value, and only rules the property supported after `getComputedStyle` confirms that the syntax accepts our value and that inheritance matches our expectation.

```ts
// styles.ts
const ok =
  // A different syntax would reject our probe value and compute to its
  // own initial value instead:
  getComputedStyle(parent).getPropertyValue(name) === probe &&
  getComputedStyle(child).getPropertyValue(name) ===
    (inherits ? probe : initialValue)
```

At the very end there was one more trap of the same family, minor-looking but real. If you judge the four registration results with `every()`, short-circuit evaluation leaves the properties after the first failure never even attempted. So I forced the order with `.map(registerProperty).every(Boolean)`: attempt everything first, judge after.

## Why I Gave Up on Automatic Downgrading: Safari 17.4–18.x

The strangest bug of the whole fork came not from the fallback side but from the native path. Running the selftest on WebKit 17.4/18.2, out of the 44 assertions only the width scale (and, on macOS builds, the enter fade as well) failed, repeatedly. Naturally I first suspected a regression the fork had introduced, but running the same scenarios on the original number-flow failed identically. Not a fork bug; a WebKit bug that the original is caught by too.

Narrowing the symptom down: when three or more animations run concurrently inside the same shadow root, WebKit does not reflect a registered custom property's **mid-animation value** into `var()` substitution for other properties on the same element. In `--scale-x: calc(1 + var(--_number-flow-d-width) / var(--width))`, the delta always substitutes as 0, so the width scale tween vanishes. The digit spin happens to dodge this bug because its structure has a **child element** consuming a property registered with `inherits: true`. Three animations is a threshold any real number update crosses unconditionally, so on affected versions this is effectively always on.

The vicious part of this bug is that it cannot be observed. `getComputedStyle` reports as if the animated value were being applied normally, while the actual style resolution uses the static declared value. At first I thought "detect it and automatically downgrade to the rAF engine," and I built several probes; all of them failed. If you set `Animation.currentTime` directly to construct a mid-animation state, the style computes correctly and the bug does not reproduce. Reproduction requires three animations progressing in real time, and I could not find a way to construct that inside synchronous feature detection.

So I gave up on automatic downgrading, and left three things in its place.

1. **Documentation**: the README states the affected range (Safari 17.4–18.x, resolved in WebKit 26), the two failing effects, and the fact that values, layout, and accessibility remain correct.
2. **An escape hatch**: if those two effects matter more to you than the native path, you can explicitly select the fallback engine with `setEngineMode('raf')`. The fallback renders both effects correctly on every WebKit version. The API built for testing found its second use here.
3. **Regression watch**: the CI WebKit job manages these failures as a known-failures list. If only listed items fail, the job passes; any other failure is caught as a real regression. Conversely, if some WebKit build starts passing these items, the runner tells you to shrink the list.

One piece of homework remains. The evidence for this bug still lives only inside this repository. I cross-checked that the original fails identically in the same scenarios, but I have not gotten as far as building a library-independent minimal reproduction and reporting it to WebKit Bugzilla. Porting the reproduction condition, "three concurrently progressing real-time animations," into a standalone page is still on the list, and until then this section's claim has no external evidence beyond the selftest results.

Graceful degradation is not always possible, and when you have confirmed it is impossible, I think the next best thing is to leave the confirmation process itself in the docs and the CI. For what it's worth, among these failures the enter fade reproduces only on macOS WebKit builds and not on the Linux builds that CI runs. That "the same version of WebKit" can mean different things depending on the build was also a first for me.

## Change Map: What Changed Where, How, and Why

If everything up to here was the record of judgment calls, this section is the list of where those calls actually landed in the code. Six files carry a meaningful diff against upstream, and the new additions are the two engine files and the tests. The table gives the overview first; then the entries go file by file.

| File                   | Main change                                                               | Why                                       |
| ---------------------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| `lite.ts`              | 7 animation call sites routed through the engine; finish/wait paths split | The body of the driver swap               |
| `styles.ts`            | `@property` detection rewritten, `round()` double declarations            | Preventing feature-detection misjudgments |
| `ssr.ts`               | HTML/CSS escaping, doubled fallback styles                                | Safety of server output                   |
| `index.ts`, `group.ts` | Serialized formatter memo keys, `queueMicrotask` polyfill                 | Recreation cost; below Chrome 71          |
| `react/*`              | Element namespace separation, cache caps                                  | Coexistence with upstream; memory         |
| `engine/*` (new)       | rAF engine, easing parser                                                 | The body of the fallback path             |

`formatter.ts` and the util files are semantically identical to upstream apart from formatting. Being able to say that what you didn't change is unchanged is the benefit of vendoring, and this list is maintained by that standard.

### lite.ts: The Body of the Driver Swap

- **The seven engine-routed animation call sites (Decision 1) and the `canAnimate` redefinition (Decision 2) live in this file.** Since they were covered above, just the locations: the seven sites are `Num` (width change), `Section`/`Sym`/`Digit` (horizontal movement), `Digit` (digit spin), and `AnimatePresence` (two enter/exit fades), and the `composite: 'accumulate'` designation moved inside the engine.
- **Forced animation finishing and completion waiting split per engine.** The original enumerates animations with `shadowRoot.getAnimations()` to `finish()` them or await `finished`, but the rAF engine's tweens don't show up in the WAAPI list. So it branches on `usesNativeEngine()` between the original code and the engine's `finishAll()`/`finishedOf()`. Finish handling was also added to the update path that completes without animating, for the reason left in the comment:

```ts
// lite.ts, didUpdate
if (!this.computedAnimated || !this._preUpdated) {
  // A non-animated update landing mid-flight (hidden tab, reduced
  // motion, invisible element) must not leave the old tweens running:
  // they'd keep deriving offsets from the already-updated --current:
  if (usesNativeEngine())
    this.shadowRoot?.getAnimations().forEach((a) => a.finish())
  else finishAll(this)
  return
}
```

When a value updates in a hidden tab or under reduced motion, only the DOM changes with no animation. Leaving in-flight tweens running at that point keeps stacking the old delta on top of the already-updated `--current`, drawing the digits at offset positions.

- **The `Num` constructor plants initial values inline in rAF mode.** `--scale-x: 1`, `--_number-flow-dx: 0px`. Instead of animating the width delta variable, the rAF engine writes `--scale-x` directly as a fully computed number (old browsers can't digest division by a `var()` that substitutes to a `calc()` value), and for that there must be a stable value to divide against even at rest, when no animation is running.
- **Accessibility fallback.** Chrome 77–80 has `ElementInternals` but no ARIAMixin, so the `internals.ariaLabel = ...` assignment is silently ignored. It detects this with `'ariaLabel' in internals` and falls back to `setAttribute('aria-label', ...)` when absent. The moment you advertise "old browser support," every one of these silent no-ops becomes your responsibility across the support range.
- **The React 19 double-mount reflow guard is inherited from upstream.** React 19 sets the custom element's `data` property during commit, and the wrapper's `componentDidMount` sets the same object once more; without an identity check the second set takes the update path, re-measuring every section and digit on each mount and forcing a synchronous reflow ([issue #195](https://github.com/barvian/number-flow/issues/195)). This check was already in upstream at the time of vendoring (upstream PR #196), and the fork merely kept it. It is not a fork improvement, so it is recorded separately as such.
- **The background-tab animation leak guard is likewise upstream's.** In hidden tabs, WAAPI animations pile up in a pending state, and pages whose values update every second were reported to leak memory by the gigabyte when left in the background for long ([issue #165](https://github.com/barvian/number-flow/issues/165)). The `visibilityState === 'visible'` gate preventing this was also already in upstream, and the fork inherited it. The fork's own contribution is limited to the rAF fallback path: there, the backstop timer drives tweens to completion even in the background, so there is no place for pendings to pile up in the first place.
- **Section diff removal detection from O(n²) to O(n).** Instead of linearly scanning the new parts array per existing child (`parts.find(...)`), it now builds a key `Set` once and queries with `has()`. This path repeats on every update for numbers with many digits.

### styles.ts: Feature Detection and Fallback Styles

- **`@property` detection changed from batch registration to individual registration plus a DOM probe.** This is the end product of the three-stage evolution covered in Reversal 2. The verdict on registration results is also order-forced as `.map(registerProperty).every(Boolean)`, so that `every()`'s short-circuiting can't leave the remaining properties unregistered.
- **`round()`-dependent styles are doubly declared.** Values that use `round()` outside animations, like mask heights and padding, are first declared with `round()`-free fallback values, then overridden with the `round()` versions inside an `@supports` block whose probe is a `var()`-free literal. This is the response to the trap covered in Decision 5.

### ssr.ts: Safety of Server Output

- **HTML escaping added.** The SSR renderer's output is injected via `dangerouslySetInnerHTML`, and caller data like `prefix`/`suffix` was flowing into text and the `aria-label` attribute unescaped. Escaping for the `&`, `<`, `"` family went in.
- **CSS selector escaping added.** `elementSuffix`, which builds the custom element name, goes straight into the fallback styles' selector. `CSS.escape` doesn't exist server-side, so a hand-written implementation hex-escapes ident-unsafe characters. Escaping was chosen over rejecting input because underscores and non-ASCII characters are legal under custom element naming rules.
- **The `@supports` double declarations apply to fallback styles too.** The styles of the static fallback `<span>` that SSR draws follow the same `round()` doubling as the main body.

### index.ts, group.ts: Small Compatibility Repairs

- **Formatter memo key from reference comparison to serialized comparison.** The original compares format option objects by reference identity (a "Might want to do a deep-equal check here" comment survives there), so in the common pattern where call sites pass a fresh object literal every render, a new `Intl.NumberFormat` gets constructed per render. Switching to `JSON.stringify` comparison, locales are first normalized with `Intl.getCanonicalLocales`, because `Intl.Locale` instances have no own enumerable properties and would all collapse to `{}` under naive stringification.
- **`queueMicrotask` polyfill.** WebViews below Chrome 71 have no `queueMicrotask`. Three lines substituting `Promise.resolve().then(cb)`.

### packages/react: Coexistence and Caps

- **Custom element namespace separation.** Registers as `number-flow-yceffort-react` instead of `number-flow-react`. As mentioned in Decision 1, this keeps custom element registration from colliding when it shares a page with the original package during a migration period.
- **A 64-entry cap on the formatter cache.** The original's unboundedly growing `Record` cache became `Map`-based. This too went through a two-step fix: at first, a full cache clear on reaching capacity, until the problem surfaced. A caller that produces a fresh options object every time starts repeatedly annihilating the entire cache the moment the cap is reached (taking frequently used entries down with it), driving the hit rate to effectively 0%. It was fixed to [evict only the single oldest entry](https://github.com/yceffort/number-flow/commit/f02f1e7), and the engine's easing parser cache (also capped at 64) follows the same policy.
- **Null-safety for `usePrefersReducedMotion`.** Changed to `?.matches ?? false` so getSnapshot doesn't throw in environments without `matchMedia`.

### What Was Added, What Was Dropped

- **New**: [engine/index.ts](https://github.com/yceffort/number-flow/blob/578d5f0/packages/number-flow/src/engine/index.ts) (the rAF engine) and [engine/easing.ts](https://github.com/yceffort/number-flow/blob/578d5f0/packages/number-flow/src/engine/easing.ts) (the easing parser) are the body of the fallback. Beyond those, unit tests verifying the easing parser, the mod math, and additive composition, the self-verifying in-browser selftest demo, and the old-browser runner scripts are new. Upstream centers on Playwright-based app tests and had no unit tests at this layer, but once CSS math is ported to JS, that port's correctness needs to be pinned at the unit level.
- **Removed**: the Vue/Svelte wrappers, the docs site, and upstream's e2e test app infrastructure. Since the core is identical, the wrappers can be added back by referencing the original if the need arises, and I chose to shrink the maintenance surface.

## What Remains

To write it down honestly, this fork has clear limits too.

- The fallback engine runs on the main thread. But it is more accurate to write down the substance of that cost without inflating it. The per-frame work is the arithmetic summation of a few tweens, the writing of a few inline custom properties, and the style recalculation of a small shadow root subtree that follows. It touches only transform and opacity, so no layout happens, and it is the same model that pre-WAAPI JS animation libraries ran on exactly these devices for years. The original's native path is no different in that custom property animations are not compositable and go through main-thread style recalculation every frame, so what the fallback adds is the JS tick cost, not a new category of work. Still, the structure remains that this cost is billed to devices that are, by definition, old. For a single counter it should be negligible, but for ticker-style pages with dozens of flows running at once the difference could become real, and since all verification in this post is behavioral rather than performance measurement, I have not measured where that boundary lies. The preceding sentences are also inferences that follow from the structure, not claims backed by numbers.
- The fallback's `EffectTiming` interprets only `duration`/`delay`/`easing` and ignores options like `iterations`.
- On browsers without `mix-blend-mode: plus-lighter`, the ± sign crossfade degrades slightly to a plain fade.
- The Vue/Svelte wrappers were not ported.
- Below the floor (under Chrome 66) there is no graceful degradation. Chrome 64–65 has no `AbortController`, so animation updates throw. It is the irony of floor-lowering work: however far down you push the floor, you still have to define the behavior immediately below it. I settled this by pinning it in the docs: within the support range, it degrades to "static but correct rendering"; outside the floor, it throws. Personally, I just hope nobody is still on Chrome 66 or Safari 13 by now.

## What I Learned

Let me distill the lessons scattered through this post into one line each. I believe most of them apply beyond this fork.

- Cleanup code belongs with the party that knows the lifetime, not the party that writes the value. That's the sentence Reversal 1's inline style bug left behind.
- Feature detection should ask "does it behave as we expect," not "is it present." Reversal 2's `@property` detection got this wrong in both directions. At first it treated every registration throw as lack of support, downgrading perfectly capable browsers whose only sin was that another copy had taken the name. Then it treated every taken name as support, certifying even cases where the name was claimed with different descriptors, silently breaking the animation. It only settled once the expected behavior was probed directly in the DOM.
- Porting a spec function to JS brings along not just the math but the validity rules. Input a browser parser would have filtered out passes through the port silently as `NaN`.
- The moment you advertise "old browser support," every silently ignored API assignment becomes your responsibility across the support range.
- Support range claims are only proven by execution. If ranges remain that execution cannot reach, writing down the distinction between claim and proof is part of the job.
- Graceful degradation is sometimes impossible. When it is, leaving the process of confirming that impossibility in the docs and the CI is the next best thing.

Beyond these, this work left me with one lasting impression about the original's design. Because the original expresses all animation state as custom properties that the stylesheet consumes, the fallback engine could reuse the original CSS as-is just by "filling in the same properties from JS." The swap of the driver was possible precisely because the producers and consumers of values were separated by the narrow interface of CSS custom properties. It surely wasn't an extension point the author intended, but this was a project that confirmed that code with well-separated concerns stays open in directions its original author never imagined.

## Repository and Demo

Everything from this work is public.

- **Repository**: [github.com/yceffort/number-flow](https://github.com/yceffort/number-flow). Contains all the code quoted in this post, the selftest, the old-browser runners, and the CI setup.
- **Live demo**: [yceffort.github.io/number-flow](https://yceffort.github.io/number-flow/). A Storybook where you can drive scenarios like the live ticker and rapid interrupts yourself. There is also a story that forces the rAF fallback, so you can visually compare the fallback engine's output even on a modern browser.
- **Packages**: [`@yceffort/number-flow`](https://www.npmjs.com/package/@yceffort/number-flow), [`@yceffort/number-flow-react`](https://www.npmjs.com/package/@yceffort/number-flow-react). They drop into the original's place with no code changes via the alias approach covered in Decision 1.

Counterexamples and questions are welcome as repository issues. I'd be especially glad to hear from anyone with an independent reproduction of, or more information about, the WebKit bug from the Safari section.

Finally, this fork is work that could only exist because the original does. The deeper I dug into the design, the more it impressed me, and the very fact that swapping out the entire driver was possible is proof of that design. I hope no sentence in this post reads as criticism of the original. My respect and gratitude go to [Maxwell Barvian](https://github.com/barvian) for building and sharing number-flow. And if anything in this fork's work turns out to be meaningful for upstream: anytime.
