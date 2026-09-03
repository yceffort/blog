---
title: 'Killing Frame Drops in a framer-motion Banner: Two Wrong Turns and One Easing Function'
tags:
  - framer-motion
  - performance
  - animation
  - css
  - frontend
published: true
date: 2026-08-15 20:00:00
description: 'A banner built with framer-motion made the entire home screen stutter for the 0.6 seconds it took to open. The record of guessing the cause from the code, having that guess overturned twice by measurement, and finally removing the reflow with a single easing function. Plus what the work left behind: the gap between declaration and execution, the principle that properties decide performance, preserving mechanisms, suspecting your instruments first, and proving sameness with a curve.'
thumbnail: /thumbnails/2026/08/framer-motion-banner-frame-drop.png
art:
  scene: 'A single accordion card lifts open above a long paper list, its downward push frozen into visible stair-step notches instead of a smooth ramp.'
  composition: cutaway
  layout: contours
  hue: warm
  tone: dark
  hero: '25회 → 10회'
---

## Table of Contents

## The 0.6 Seconds a Banner Takes to Open

A banner card opens at the top of the home screen. It is an ordinary entrance motion built with [framer-motion](https://motion.dev/)'s `AnimatePresence` and variants: the card makes room for itself and slides down (0.4s), and over that, the card floats up (the 0.3s to 0.6s window). On desktop there is no problem at all. But on a phone, the whole screen stutters for those 0.6 seconds. Not just the banner. The entire list underneath it hitches along with it. And this was not a low-end-phone story either. It stuttered on the latest flagships too, and why that is the expected outcome comes later, along with the cost model.

Open the profiler and the cause is immediately visible. Layout is recorded on every frame while the animation runs. The banner was animating `height: 0 → auto`, and every time `height` changed, the entire document below it was laid out again. The cost is proportional not to the banner's size but to **the size of the document underneath the banner**, so it looks lightweight when you only look at the component while being heavy on the actual screen.

Up to here it is a common diagnosis. What this post wants to record is what came after. I started reimplementing with the goal of "keep the visible motion exactly identical to the original, and remove only the frame drops," and the hypotheses I built from reading the code collapsed twice in front of measurement. Even the intent of the person who wrote the original and the values the original actually executes turned out to disagree with each other. The final solution I arrived at through that process was, in terms of code diff, a single easing function. Looking back, though, what I learned on the way there will stick around longer than that one line. So the first half of this post is a record of what happened, and the second half unpacks, one by one, what the work left behind.

> Code citations in this post are based on framer-motion `12.42.2` and its internal engine motion-dom `12.43.0`. Source deep links point at the `v12.42.2` tag of the [motion monorepo](https://github.com/motiondivision/motion) (I confirmed the cited passages match). Measurements were taken in Chromium on Apple Silicon macOS (traces with 4x CPU throttling), and cross-browser checks were done with Playwright `1.62.1`'s WebKit and Firefox. The full experiment code lives at [yceffort/banner-motion-lab](https://github.com/yceffort/banner-motion-lab).

## Why It Stutters Structurally

The original banner's motion definition looks roughly like this. The values are lifted from the actual code.

```tsx
const variants = {
  show: {
    height: 'auto',
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.65, 0, 0.35, 1],
      height: {delay: 0.1},
      opacity: {delay: 0.3},
      scale: {delay: 0.3, ease: [0.47, 0, 0.23, 1.38]},
    },
  },
  // hidden (exit) has the same structure
}
```

The list of values framer-motion can hand off to GPU acceleration, or more precisely to WAAPI (the Web Animations API), is hardcoded in motion-dom's [`accelerated-values.ts`](https://github.com/motiondivision/motion/blob/v12.42.2/packages/motion-dom/src/animation/waapi/utils/accelerated-values.ts#L4-L10).

```js
const acceleratedValues = new Set([
  'opacity',
  'clipPath',
  'filter',
  'transform',
  'backgroundColor',
])
```

`height` is not on that list. So it runs the other way: a rAF loop on the main thread rewrites the inline `height` in px on every frame. But reading this as a defect in framer-motion misidentifies the cause. Even if it did run through WAAPI, nothing would change. `height` is a property that determines layout, so the compositor (the compositing thread, which runs separately from the main thread and only composites pixels) cannot animate it on its own, and no matter how you change the value, a document reflow follows on every frame.

Confirmed by measurement, it looks like this. The numbers come from tracing one entrance animation with 4x CPU throttling on a page with a 400-row list laid underneath.

|                                       | Layout                           | Paint | PrePaint total |
| ------------------------------------- | -------------------------------- | ----- | -------------- |
| Original (`height` tween)             | **25 (every frame)**             | 53    | 85.8ms         |
| Final implementation (stepped + FLIP) | **10 (only at discontinuities)** | 8     | 6.8ms          |

One thing to record honestly: on this demo machine (an M-series MacBook), there were no drops during the animation even with 4x throttling. Roughly 3ms per frame fits inside the 16.7ms budget. But this cost scales linearly with document size, and the budget side should not be reasoned about on desktop terms either. In the real service this banner stuttered even on the latest flagship phones, and counting the conditions, that was to be expected. The real home screen is a much heavier multi-thousand-node document than the demo, the banner appears right after initial load when hydration and data fetching keep the main thread at its busiest, and the more flagship the phone, the more likely it runs at 120Hz, which halves the frame budget from 16.7ms to 8.3ms. In other words the condition is not "low-end" but **cost relative to frame budget**, and the original stands on the side where that cost is proportional to document size. The final implementation's per-frame cost is independent of document size.

Substituting into the same formula in reverse also explains why nothing seemed wrong on a PC during development. Stutter appears when per-frame cost exceeds the frame budget, and on a PC both sides of that inequality are favorable. The budget is 16.7ms at 60Hz, twice that of a 120Hz phone, while the cost is lower because a lower DPR means less than half the pixels to repaint, and a desktop CPU runs several times faster with no thermal constraints, and the main-thread contention at the moment the banner appears gets absorbed by sheer performance. In fact this demo machine stayed at 3ms to 5ms per frame even with the CPU slowed 4x. The browser is covering for a bad structure with hardware muscle, and that cover simply comes off on a phone.

This asymmetry is what I think makes problems like this nasty. In the environment the developer looks at, the structural flaw produces no symptom, so a per-frame reflow passes code review and QA and only shows up on the user's phone. The symptom depends on the environment, but the structure shows up in a trace no matter where you look. That is why, later on, the criterion for reaching for this technique is not "does it feel janky" but "does Layout appear on every frame in the profiler."

## Wrong Turn 1: "The Container Pushes What Is Below"

The first version of the reimplementation was built with CSS transitions and FLIP. FLIP (First-Last-Invert-Play) is a technique that commits the layout change all at once, then uses `transform` to pull the element back by the distance it moved and animates that back to zero, making it look "as if the layout changed smoothly." Layout is computed once, and the movement is drawn by the compositor.

But overlaying this reimplementation on the original, it was subtly different. The moment the content below started to be pushed was off, and the acceleration profile of the curve differed too. To find the cause, I had to go back and look at what the original actually does.

The original's structure is a two-level nesting of a container and a card wrapper. The container makes room with `initial={{height: 0}} animate={{height: 'auto'}}`, and inside it the card wrapper enters with the variants above. Reading only the code, a natural hypothesis follows: the container's `height: 0 → auto` pushes the content below, and the card wrapper floats up inside it. The reimplementation carried over "the container's curve" on top of that hypothesis.

The measurement said otherwise. Recording the inline styles of the container and the card wrapper frame by frame during the entrance produces this (t is in ms from card mount).

| t   | Container inline height | Card wrapper inline height | Top of content below |
| --- | ----------------------- | -------------------------- | -------------------- |
| 0   | `auto`                  | `0px`                      | 148 (+8 jump)        |
| 167 | `auto`                  | `5.96px`                   | 154                  |
| 234 | `auto`                  | `64.6px`                   | 213                  |
| 434 | `auto`                  | `157.6px`                  | 306                  |
| 451 | `auto`                  | `auto`                     | 314 (+8 jump)        |

The container's inline `height` is `auto` from start to finish. There is no animation. framer-motion resolves the target `height: 'auto'` by measuring it in px at the moment the animation starts (motion-dom's `DOMKeyframesResolver`, `measureEndState`), and at that measurement moment the child card wrapper's inline `height` is 0. So the measured value of 'auto' is also 0, and an animation from 0 to 0 finishes instantly and then restores the inline `height: auto`. After that the container simply follows its child.

In other words, **the thing actually pushing the content below was the card wrapper's `height` tween, alone**. The curve and start time (no delay) I had attributed to the container never existed, and the real push starts 0.1s late, following the card wrapper's 0.1s delay. That is why the reimplementation started pushing 0.1s early.

The plus or minus 8px jumps in the table were news to me too. The card's `margin: 8px` pokes out through the wrapper's `height: 0` and collapses, then jumps by 8px with no animation at the moment of mount and at the end of the tween (when `auto` is restored). It is part of the original, so if the goal is "exactly identical," that has to jump at the same place too.

## Wrong Turn 2: "The Specified ease Gets Applied"

Even after fixing the first hypothesis and overlaying again, the curve was subtly different. The variants clearly specify `ease: [0.65, 0, 0.35, 1]`, a symmetric S-curve, but the measured push curve of the original was front-loaded and asymmetric. The time at which it crossed the 50% point was well before the midpoint of the interval.

The answer was in motion-dom's [`animateMotionValue`](https://github.com/motiondivision/motion/blob/v12.42.2/packages/motion-dom/src/animation/interfaces/motion-value.ts#L31-L36). Here is the part that interprets per-value transitions, verbatim.

```js
const valueTransition = getValueTransition(transition, name) || {}
/**
 * Most transition values are currently completely overwritten by value-specific
 * transitions. In the future it'd be nicer to blend these transitions. But for now
 * delay actually does inherit from the root transition if not value-specific.
 */
const delay = valueTransition.delay || transition.delay || 0
```

The comment says it outright. A per-value transition **replaces the outer transition wholesale**, and the only thing inherited is `delay`. So where does `ease` come from when you write only a delay, as in `height: { delay: 0.1 }`? The code that follows decides.

```js
if (!isTransitionDefined(valueTransition)) {
  Object.assign(options, getDefaultTransition(name, options))
}
```

`isTransitionDefined` checks whether anything remains after excluding orchestration keys like `delay` and `repeat`. `{ delay: 0.1 }` is nothing but a delay, so it counts as "no transition defined" and the library default goes in. The [default](https://github.com/motiondivision/motion/blob/v12.42.2/packages/motion-dom/src/animation/utils/default-transitions.ts#L29-L33) for non-transform values is this.

```js
const ease = {
  type: 'keyframes',
  ease: [0.25, 0.1, 0.35, 1],
  duration: 0.3,
}
```

Which matches the measured asymmetric curve exactly. To summarize, the timeline the original declares and the timeline it actually executes differ by this much.

| Value           | Range    | delay | Actual easing                    |
| --------------- | -------- | ----- | -------------------------------- |
| enter `height`  | 0 → H    | 0.1s  | `[0.25, 0.1, 0.35, 1]` (default) |
| enter `opacity` | 0 → 1    | 0.3s  | `[0.25, 0.1, 0.35, 1]` (default) |
| enter `scale`   | 0.96 → 1 | 0.3s  | `[0.47, 0, 0.23, 1.38]`          |
| exit `opacity`  | 1 → 0    | none  | `[0.65, 0, 0.35, 1]`             |
| exit `scale`    | 1 → 0.96 | none  | `[0.47, 0, 0.23, 1.38]`          |
| exit `height`   | H → 0    | 0.1s  | `[0.25, 0.1, 0.35, 1]` (default) |

The only place the specified `[0.65, 0, 0.35, 1]` actually applies is the exit `opacity`. The exit variants alone have no per-value entry for opacity, so it is the one value that rides the outer transition as written.

## One Easing Function Turns the Reflow Into a Step

Once the two wrong turns were behind me, the problem became clear. The only effect the card wrapper's `height` tween produces on screen is "the push of the content below." The card itself has `overflow: visible`, so it is fully visible regardless of the wrapper's height, and the wrapper's intermediate height values only create a reflow every frame while drawing nothing. Which means the intermediate values can be thrown away.

So I left the variants exactly as they were and slipped a step function into the easing for `height` only.

```tsx
/** Jump to the end value immediately. Keeps the tween's delay and end time, drops only the middle. */
const stepToEnd = (progress: number) => (progress <= 0 ? 0 : 1)

// Original: height: { delay: 0.1 }
// Final:    height: { delay: 0.1, ease: stepToEnd }
```

With that one line, `height` keeps the original tween's timeline (starts at 0.1s, ends at 0.4s) while stepping on the endpoint values only. For the entrance, that is once at 0.1s from 0 to H (px), and once at 0.4s when framer-motion restores `auto`. The per-frame reflow drops to two or three discontinuous reflows. I also confirmed by trace that on the frames between the steps, where the tween writes the same value again, computed style does not change and therefore no layout is produced.

FLIP takes over the continuous movement that disappeared. A `ResizeObserver` catches the step, pulls the content below back by the distance it moved using `transform`, and sends it to zero over the same 300ms with the same `[0.25, 0.1, 0.35, 1]` as the original tween.

```ts
const observer = new ResizeObserver(() => {
  const sizeDelta = source.offsetHeight - prevHeight
  const positionDelta = readLayoutTop(target) - prevTop
  prevHeight += sizeDelta
  prevTop += positionDelta

  // Filter out events caused by margin collapse: if the signs differ or one is 0, a jump is correct
  if (sizeDelta * positionDelta <= 0) return

  const delta =
    Math.sign(sizeDelta) *
    Math.min(Math.abs(sizeDelta), Math.abs(positionDelta))
  invertAndPlay(target, delta) // transition: none → invert → force flush → play in the same frame
})
```

A nice property of this structure is that there is no delay anywhere. The moment the step is taken is exactly the moment the original tween's delay ends, so the firing time of the `ResizeObserver` is itself the timing. Taking the distance to animate as "the smaller magnitude among values with the same sign" between the `offsetHeight` change and the actual layout displacement is there for the plus or minus 8px margin jump seen earlier. Thanks to that rule, the points where the original jumps stay jumps, and only the distance the original pushes gets animated.

Verification was done with curves, not eyes. I recorded `getBoundingClientRect().top` of the content below on every frame, overlaid the two implementations, and compared shape by the times at which the push distance crossed 10%, 50%, and 90% (Chromium, no throttling).

| Segment | Original p10→p90 width | Stepped + FLIP p10→p90 width | p50 diff |
| ------- | ---------------------- | ---------------------------- | -------- |
| Enter   | 197ms                  | 198ms                        | +13ms    |
| Swap    | 165ms                  | 156ms                        | +21ms    |
| Exit    | 198ms                  | 197ms                        | +9ms     |

The width of the curve, that is, the acceleration profile, is identical within one or two frames of noise, and what remains is an offset of half a frame to one frame in the start time. I also checked the position of the margin jumps and the curve of the incoming card sliding up during a swap, and the curve widths matched in Playwright's WebKit and Firefox as well. WebKit's exit curve came within 1ms on the p50 difference.

## Four Implementations Side by Side

Going through this process left me with four implementations of the same motion: the original form of the problem, the record of the wrong turns, and two forms of the final solution.

| Implementation            | Driven by                   | height              | Push of content below                      |
| ------------------------- | --------------------------- | ------------------- | ------------------------------------------ |
| **Original**              | framer-motion               | px tween each frame | side effect of the height reflow           |
| **Reimplementation (v1)** | CSS transition              | committed instantly | FLIP, but 100ms early with a misread curve |
| **Improved**              | framer-motion + step easing | one step at 0.1s    | FLIP, same curve as the original tween     |
| **Pure CSS**              | CSS transition only         | one step at 0.1s    | FLIP, identical                            |

The improved version and the pure CSS version look the same and differ only in what drives them. The improved version keeps framer-motion and injects a single easing function, so it can be retrofitted onto an existing codebase in one line of diff, while the pure CSS version strips the framer-motion dependency entirely. In the pure CSS version, playback is all CSS transitions and only measurement and orchestration remain in JS, and that orchestration code is precisely the list of things framer used to absorb. More on that later.

In the demo below you can play all four and overlay the curves. The demo's labels map to the table like this: Reimpl 1 is the first reimplementation, Reimpl 2 is the step easing (the finished version we were aiming at), and CSS only is the pure CSS version. Each button press draws the movement curve of the list below in its own color, overlaid. Original (red), Reimpl 2 (green), and CSS only (orange) lie on top of each other, and only Reimpl 1 (blue) veers about 100ms to the left, which is the trace of wrong turn 1. The Original button reproduces framer-motion's mechanism (writing height every frame via rAF) rather than using the library, and a comparison against the original actually driven by framer-motion can be made in the [experiment repository](https://github.com/yceffort/banner-motion-lab).

<LiveDemo src="/demos/2026/08/banner-motion.html" title="Four banner motions compared: the curves overlap and only the reflow count differs" height={680} />

To set expectations up front: on an ordinary PC even the original will come out perfectly smooth with zero drops. The list in this demo is 2000 rows, imitating the real service home, but on a desktop CPU that reflow and paint are a few ms per frame, so redoing them every frame still fits comfortably inside the 16.7ms budget. On a phone, or with DevTools CPU throttling (4x to 6x), you can see that only the original stutters throughout the animation. The difference between the original approach and the stepped approach is not "does it stutter right now" but the structural question of **whether the per-frame cost is proportional to document size or constant**, and that structural difference only shows up as drops in environments where the cost exceeds the budget (a heavy document, a busy main thread, a budget halved at 120Hz).

The demo's "load" option is a device for imitating that environment visually. It burns the main thread every frame, so the ball judders in every mode, but the list in the stepped approach runs on the compositor and keeps gliding while only the original's list hitches along with the ball. That said, I did not try to manufacture a difference in drop _counts_ with artificial load. I actually tried, and adding a constant cost lands right on the 16.7ms budget boundary, so the same settings would produce zero drops or eight depending on the machine's mood. DevTools CPU throttling (4x to 6x) is the right tool for reproducing numbers, because throttling recreates exactly what a slow device experiences: the reflow and paint costs themselves become several times larger.

It is also worth noting that with no load, the stepped approach can come out with one or two drops. The original's cost is spread thinly across every frame, while the stepped approach's cost is concentrated in a single layout commit at the moment of the step. (The list layer used for the push is promoted ahead of time with `will-change` right before playback, as in the real implementation. If that promotion also piles onto the step frame, something that is not the technique's own cost gets mixed in.) That means on a fast device playing once, the original can win, and the conditions under which that ordering flips (a heavy document, a tight budget) are exactly the conditions for reaching for this technique. Regardless of load, the curve chart is always valid. Reimpl 1's curve veering left while the other three overlap is a question of whether the motion is the same, not of performance, so it looks the same regardless of device performance.

That is the end of the record of events. From here on I unpack, one by one, what I learned in the process.

## Declared Code and Executed Values Are Different Things

If I had to pick one lesson from this work that will stay with me longest, it is this. My hypothesis collapsed twice, and both times what collapsed was the belief that "it is written that way in the code, so it will behave that way."

`ease: [0.65, 0, 0.35, 1]` was plainly written in the variants. A hundred code reviews would never reveal that this value is not applied. What a reviewer can see is the declaration, and between declaration and execution sits the library's interpretation rules. framer-motion's per-value transition replacement rule is not heavily emphasized in the official docs, and it is behavior the library itself regrets enough to write "In the future it'd be nicer to blend these transitions" in a source comment. Whoever wrote the original probably wrote it believing all the values move along the specified curve. Which is to say **even the original was not behaving as intended**, and the goal of "identical to the original" had to be anchored to the execution result, not the intent.

A methodology falls out of this. At first I did verification at the level of "I confirmed it in the library source," and that was not enough. A model built from reading one part of the source cannot guarantee that part is on the actual execution path. In fact I found the container's default transition value in the source and was confident that "this curve is applied," and the code was right while the target was wrong. The container's animation was itself a no-op.

Reversing the order solved it. **Measure first, then read the source at the point the measurement points to.** The measurement I used here was nothing elaborate: a 20-line script that records the inline styles and positions of the relevant elements on every frame via rAF while the animation runs. That dump produced the fact that "the container's inline height is `auto` for the whole duration," and only then did the right question about the 'auto' measurement moment arise, which led me to read `DOMKeyframesResolver`. The asymmetric curve came out of measurement, and only then did I go read the transition interpretation section of `animateMotionValue`. The source deep dive was useful only after measurement had generated the question.

This is not an argument against abstractions. It is an argument that the cost of an abstraction gets billed in the form of "making the execution model opaque" in exchange for "making complex things short," and that bill arrives on work like performance or precise reproduction where you have to know the execution model exactly. And you pay it in frame-level measurement, not code review.

## Properties, Not Syntax, Decide Performance

The first temptation when meeting this problem is to swap the library. framer-motion is slow, so maybe move to a lighter library, or to pure CSS. This work confirmed from several angles that this direction misses the cause.

The fact that `height` is not on the WAAPI acceleration list is not the cause but a consequence. The compositor cannot compute layout, so a layout property comes back as a main-thread reflow every frame no matter which engine you put it on. Running it through a rAF loop (framer-motion), through WAAPI, or through a CSS transition is all the same. Even animating `height: auto` with modern CSS's `interpolate-size: allow-keywords` in pure CSS syntax only makes the syntax declarative while the cost is the same per-frame reflow as the original. **What decides the cost is not where the syntax lives but which property changes.**

Writing the cost model as a formula makes the judgment faster. The total cost of animating a layout property is roughly "reflow cost proportional to document size times the number of frames." Two things follow from that formula. One is the identity of the illusion. The reason the banner component looks lightweight in isolation is that most of the cost comes not from the banner but from the document below it, which is why this kind of problem fails to reproduce on the lightweight pages of a development environment and then blows up on the real service home. The other is the direction of optimization. Of the two factors in the formula, there is the document-size side (`contain`, `content-visibility`) and the frame-count side (this post's stepping), and swapping libraries touches neither factor.

Put the other way round, this principle is why I could solve the problem while keeping framer-motion. What needed fixing was not the library but "what gets animated," and that was something a single easing function could change.

## Preserve the Mechanism Instead of Copying Values

The first reimplementation and the final implementation differed fundamentally in approach, and the difference in results reflected that difference in approach directly.

The first reimplementation **copied the original's values**. Read duration, delay, and easing from the original and transcribe them into CSS. The problem is that interpretation creeps into the reading, and if the interpretation is wrong, the wrong value gets silently enshrined. In practice, five things were off. The push started 0.1s early (wrong turn 1), the exit curve differed (wrong turn 2), the margin jumps collapsed into one +16 instead of two of +8, the composite curve differed during a card swap because two transitions crossed and overlapped, and treating the `offsetHeight` change as the actual displacement animated a stray plus or minus 8px on events where the margin moves in or out of the box.

The final implementation copied almost no values. Instead it **kept the original's structure and removed only the intermediate values**. The variants, `AnimatePresence`, and the tween's timeline are all exactly as in the original, and the only change is that `height` does not step on the middle of the curve. The power of this approach showed up in **the things I did not try to reproduce falling into place on their own**.

- The positions of the plus or minus 8px margin jumps matched automatically. The wrapper passes through the same height states (0 → px → auto) at the same moments as the original, so the margin collapse happens at the same points in the same way.
- The `LazyMotion` chunk loading timing problem disappeared structurally. The first reimplementation had different drivers for the push (`ResizeObserver`, starting immediately) and the card motion (framer, starting after the chunk arrives), so they could drift apart. In the final implementation the trigger for the push is the card motion's height step itself, so there is no way for the two to drift.
- Interruptions, cutting off mid-animation and closing, matched too. The original's exit tween and FLIP's transition ride the same delay, the same duration, and the same curve, so no matter where you cut, the two implementations continue from the same point.

Generalized, I think it comes out like this. When you have to reproduce some system "identically," the approach of copying the observed output (values) only works if the observation is perfect. The approach of preserving the mechanism that produces the output and replacing only the costly part gets the properties you failed to observe guaranteed by the mechanism instead. And when the thing being reproduced is, as here, a system that "differs even from its author's intent," perfect observation is that much harder, so the latter is worth that much more.

## Suspect the Instrument First

Half the moments in this work where "the implementation looks wrong" turned out to be the measurement being wrong. It happened three times, and all three had different causes.

The first was execution order. The rAF sampler recording the curve started producing an enormous jump in the stepped approach's curve at one point. The real thing looked smooth while only the data jumped. The cause was inside the browser's frame pipeline. A rAF callback runs before the same frame's `ResizeObserver` callback, so on the frame where the CSS transition steps the height, the layout has already moved at rAF time while the FLIP invert has not been applied yet. The sampler caught one frame of **an intermediate state that was never painted to screen**. Interestingly, this does not happen with the original where framer-motion writes height, because framer's writes happen inside a rAF callback and therefore come after the sampler in order. Which means the same instrumentation code lies or does not lie depending on the implementation. Isolated single-frame spikes were removed with a median-of-3 (the median of three consecutive samples).

The second was contamination in the measurement setup. To compare, I reset the previous banner before playback, and when that reset caused an immediate unmount with no exit animation, the FLIP hook received the layout delta and started a 300ms slide, and the next measurement began before that slide finished, so the curves overlapped. A case of the measurement's setup behavior, rather than the behavior being measured, getting into the data. Solved by adding a wait after the reset until things settled.

The third had the most trivial cause: a 4x CPU throttle left on from an earlier experiment while I was measuring curve timings. Mount commits took 200ms each, pushing back every start time, and the two implementations getting pushed back by different amounts made it look like there was a difference that did not exist.

Compressing these three experiences into one sentence: **when a result looks strange, suspecting the measuring tool before the thing being measured saves time**. The first case in particular came from the ordering among rAF, `ResizeObserver`, style application, and paint, a place you normally do not think about while writing instrumentation code. If you build frame-level instrumentation, it is worth working out once which point of the pipeline your own sampler reads.

## Define the Proof Standard for "Identical" First

The goal of "the visible motion must be completely identical" has a trap in it: if you leave the judgment to your eyes, nothing gets proven. The first reimplementation looked plausible when viewed on its own. It looked plausible despite five things being off. Human eyes are insensitive to an entire curve shifting by tens of ms, but concluding "so nobody will notice a difference" would be a mistake, because differences in the acceleration profile (easing) do register as a feeling that something is off. The eye is an instrument with unclear standards, missing some differences and catching others.

So I defined the criterion for "the same" explicitly. Record the position of the content below on every frame, normalize the travel distance from 0 to 1, then extract the times at which it crosses 10%, 25%, 50%, 75%, and 90%. That summarizes one curve into five numbers and decomposes the difference between two implementations into two components. A difference in acceleration profile shows up as **the width of the curve**, and a difference in start time shows up as **a translation of the whole curve**. This decomposition was useful because the two components mean different things. A difference in curve width was a signal that the implementation was wrong, while a start offset was a source of variation in the original itself, like framer's start scheduling delay. In practice, in cross-browser measurement, the curve width matched across all three engines and only the offset varied by engine (WebKit around 1ms to 4ms, Firefox around 40ms to 50ms).

Only once this metric existed did "identical" turn from a claim into a proposition. The first reimplementation was disqualified immediately by this metric (it started about 250ms early and had a different curve width), and the final implementation passed. Carrying the same metric over to WebKit and Firefox also let me confirm there was no browser dependency. If you do similar work, I think it is better to establish the metric before the implementation. Without a metric you stop at "this seems done," and about half the time that state is the state of this first reimplementation.

## Generalization: Quantizing Layout Animations

Detach this work from the banner and one reusable pattern remains. If I had to name it, something like "quantizing layout animations."

> In one sentence: let layout properties step discontinuously onto the endpoints of the curve only, and interpolate that difference with `transform` for the continuous movement the eye sees.

The recipe has four steps.

1. **Decompose**: separate what is visible in this animation from the layout computation that is not. In the banner, only the push of the content below was visible, and the wrapper's intermediate height values were invisible computation.
2. **Quantize**: push layout commits onto the endpoints of the curve, reducing reflow from a cost proportional to the frame count to a constant cost. If you are already using a library, you can retrofit this by injecting an easing function as done here, with no need to rewrite the animation definition.
3. **Interpolate**: FLIP replaces the continuous movement with the same duration and the same curve.
4. **Verify**: overlay position traces and confirm by curve that the motion matches the original.

The conditions for applying it are fairly clear. This technique works when the effect the layout change produces visually is **elements being pushed wholesale**. Accordions, banners, list insertions and removals, toasts that change height, patterns where the things below get pushed. Conversely there are two cases where it does not work. If the look of content being clipped and revealed via `overflow: hidden` is itself the effect, you should go toward `clip-path` (also a compositor property), and if the reflow itself is the effect, as with text rewrapping every frame as the width shrinks, there is no way to fake it.

The remaining costs, written down as they are. The one reflow at the moment the step is taken is still proportional to document size. The original, though, pays that same cost every frame throughout the animation. While a `transform` is applied, a containing block is created on the content below, changing the reference frame for any descendant `position: fixed`, so it has to be removed when finished, and you need an integration point outside the component to apply the transform to the content below. The original got this for free as a side effect of the `height` reflow, but since that side effect was exactly the cost, what was free simply becomes explicit.

Finally, when to reach for this pattern. Turning it into a rule of "apply to every height animation by default" makes it over-engineering the moment you do. On a lightweight page even the original holds 60Hz, and in fact even on this experiment bench an M-series machine had no drops during the animation at 4x throttling. The right trigger, I think, is where three conditions overlap: Layout appears every frame in the profiler, the document is heavy, and the frame budget is tight (8.3ms on 120Hz mobile). Because of that last condition, it should not be narrowed to "a problem only on low-end devices." This banner actually stuttered on the latest flagships.

## What if It Were a Native App

This is a good point to address a natural question. Would the same banner have stuttered if it had been built as a native app? The answer is closer to "the trap is the same, but it is built to be hard to step into."

The principle that changing a layout-determining value every frame runs layout every frame is common to UI systems. On Android, code that changes the height of `LayoutParams` every frame with a `ValueAnimator` and calls `requestLayout()` has the same structure as the web's height animation, and it is in fact considered an anti-pattern. What differs is the platform's defaults.

First, **the default animation path is this post's technique from the start.** iOS's standard pattern, changing constraints and calling `layoutIfNeeded()` inside `UIView.animate`, computes layout once to the target state and leaves frame interpolation to Core Animation. The "quantize plus interpolate" we built is effectively built in. Android's `ChangeBounds` transition likewise interpolates the view's bounds directly toward computed final coordinates instead of re-running layout every frame. Second, **rendering is always composited.** Every view on iOS is a CALayer, a GPU layer from the start, and Android is display-list based, so when a view moves it is not redrawn but the layer is moved. On the web, getting the same state requires explicitly promoting to a layer with something like `will-change`, and even then it has to be applied only when needed and removed afterward, as with this post's FLIP. Native lives in that state all the time. Third, iOS goes one step further: **animation interpolation runs in a render server outside the app process.** Even if the app's main thread stops entirely, in-flight animations keep going. That is stronger isolation than the web's compositor thread separation.

Looked at in reverse, this also organizes why the web's conditions are unusually bad. Layout semantics that affect the whole document (margin collapse, for one), a paint model that repaints damaged regions, a structure where animation and business logic share one thread, and an API that lets you animate any property without warning. The trap is deep and there are no guardrails. The recent direction of web standards (View Transitions, scroll-driven animations, `@starting-style`) converging toward the native-style model of "declare only, and leave execution to the engine" probably comes from the same awareness. In summary, in native this post's technique is mostly unnecessary, because the platform already is the technique. This work could also be seen as hand-porting what UIKit has given by default for a long time onto a single banner on the web.

This is not an abstract comparison but something I actually ran into. A screen in another app using the same interaction was oddly smooth and I wondered why, and it turned out to be a React Native screen. React Native's views are real native views, and layout transitions like `LayoutAnimation` have the structure of "compute the next layout once and leave interpolation to native," so this post's quantization is the API's default behavior, and the animation runs separated from the JS thread. Even for the same effect, which render pipeline it executes on is what split the outcome.

## This Is Not an Argument for Ripping Out framer-motion

I do not want this post's conclusion to read as "framer-motion is dangerous," so for balance, here is the other side. The base form of the final implementation kept framer-motion, and there was a reason for that choice.

Something I felt while building the pure CSS version: in that code the animation values are 20 lines and the remaining 100 lines are all things framer used to absorb as API. Pinning the in-progress computed value inline and switching over on interruption, coordinating cancellation between the entrance rAF and the cleanup timer, lifecycle management that defers unmount until exit finishes. The banner has only two states so it was writable by hand, but as states and transitions multiply this cost grows fast. The value of framer-motion lies not in making animation possible but in absorbing this management cost, and the price is the opacity of the execution model seen earlier.

So if I reduce the judgment to one criterion, it comes out like this. If the motion is "a transition between two states," CSS wins; if it is "a state machine plus a value graph," framer-motion wins. To add one more, if the design is such that heights enumerate into a few fixed options, you can go all the way to pure CSS with even the measurement JS removed (a combination of `@starting-style`, `transition-behavior: allow-discrete`, and `:has()`), but the price there is not technical, it is a design contract that forces a clamp on every piece of text.

## Closing

To put it honestly, this was the hardest thing I have worked on recently. In terms of lines of code that is a strange claim, since the final diff is one easing function and two hooks. The difficulty was somewhere other than the code.

First, nothing was broken. No errors, no failing tests, no console warnings. All the mismatches were things like sub-100ms timings and 8px jumps, things you cannot even know exist until you build a standard and measure. Fixing a bug has the signal of "broken" to give you direction, whereas this work required establishing the judgment criteria myself at every step.

Second, there was no answer key. The "original" in "identical to the original" was behaving differently from its author's intent, so neither the docs nor the code comments were the answer. The answer existed only inside the running browser, and even the instrument for extracting it lied three times. I had to go around the loop of building a ruler, validating the ruler, and re-reading the source with the values that ruler measured, several times over.

Third, the problem did not stay in one domain. React's lifecycle, framer-motion's transition interpretation rules, CSS margin collapse, the callback order of the browser's frame pipeline. Domains that normally do not need to know about each other were all tangled together at once. Knowing any one of them alone did not explain even a single mismatch. I will confess that the one that held me up longest was CSS, and being weak at CSS contributed to the difficulty. Rules like margins collapsing through a box with `height: 0`, `transform` creating a containing block and changing the reference for a descendant `position: fixed`, and where the start value comes from when swapping transition lists, have been in the spec for decades, and this was where I found out how much those fundamentals had weakened while working on top of frameworks.

So what this post leaves behind is closer to the record of that loop than to the solution itself. Building it takes a day, while proving sameness took several times that, and looking back I think that proof was the actual body of this work.

That said, it is right to also write down how far that proof closed. The title of this post is "killing frame drops," but the proposition actually proven is closer to "the per-frame cost was detached from document size," and the two are not the same. The one reflow at the moment the step is taken is still proportional to document size. Layout went from 25 to 10, not to 0. On a fast device with no load, concentrating the cost into a single frame can even make the stepped approach come out with one or two drops. The curves only matched in width; the start times still differ by around 10ms in Chromium and around 40ms in Firefox. And the biggest thing left over is that all the numbers in this post come from a desktop with CPU throttling applied. The place the banner actually stuttered was a flagship phone, and I never measured before and after on that device with the same metric. To be more honest still: this banner is still not completely smooth on a phone. What used to stutter throughout the animation has only been reduced to catching once at the moment it appears.

The identity of what remains can still be pinned down, though. The layout commit on that one frame where the step is taken is still proportional to document size, and that frame happens to coincide with the moment hydration and data loading are holding the main thread. As seen earlier, the web has animation and business logic sharing one thread, and there is no way to hand a layout commit to the compositor. The range of this technique ends here. To go further you would have to touch not the frame count but the other factor, document size (`contain`, `content-visibility`), or ask again whether this motion belongs at the busiest moment in the first place. Either way, it is not something one easing function finishes.
