---
title: 'Improving <em>number-flow</em> Performance: Moving Animations onto the Compositor Thread'
tags:
  - web-performance
  - animation
  - browser
  - oss
  - css
published: true
date: 2026-10-07 16:05:00
description: 'In the number-flow fork I built to support old browsers, animations in modern browsers were still recalculating styles on every frame. This post records how 0.2.0 moved additive compositing into transform and opacity keyframes, how the change was measured, and the costs that remain in the mask and in interruptions.'
series: 'Improving number-flow'
seriesOrder: 2
art:
  undraw: charts
---

## Table of Contents

## A single number was recalculating styles on every frame

On a page that changed a single number once per second, the main thread was working 218ms out of every second. Forcing the animation duration to 0 dropped that to 41ms. JavaScript execution time stayed nearly the same; what shrank the most was style recalculation. Even with the animation handed off to the browser, the main thread kept working.

[Part 1](/2026/08/number-flow-fork-for-old-browsers) covered porting number-flow to old browsers. Browsers without the latest CSS features got a `requestAnimationFrame`-based fallback, and modern browsers kept the original Web Animations API (WAAPI) path. The job was to swap only the driver while preserving the digit-diffing logic, the DOM, and the mask styles.

At the end of that post I noted that the native path's custom property animations also go through style recalculation on every frame. I had not measured the actual cost, though, and guessed that a single counter would be negligible. The page I looked at this time made that guess hard to keep. When the value changes often and each animation runs long, even one counter takes up a meaningful share of the page's work.

So in [0.2.0](https://github.com/yceffort/number-flow/releases/tag/v0.2.0) I replaced the modern-browser driver too. Animations that derived positions from CSS custom properties became `transform` and `opacity` keyframes that the browser can run on the compositor thread. The motion is computed ahead of time and handed over, which reduces what the main thread has to do during playback.

The hard part was a new value arriving before the previous animation finished. This is also where the original author gave up on compositing. When the same compositing failures were reported in upstream [issue #183](https://github.com/barvian/number-flow/issues/183), the author replied:

> accumulated animations aren't compositable on Chrome ATM. I made a version that was fully compositable before launching but opted for the current version because the interruptibility felt worth it (I couldn't come up with a compositable version that handled interruptions as well)

In other words, a compositable version existed, but it did not handle interruptions as naturally, so the author chose the current `accumulate` approach. 0.2.0 tried to get both. The animations now run with `replace`, and the contributions of the animations still in flight are folded into the new keyframes so the motion matches what `accumulate` produced. The same summation that Part 1's rAF fallback performs on every frame now happens once, when the keyframes are built.

> The code analysis is based on `v0.2.0`, released on September 30, 2026, at commit [`3438c3e`](https://github.com/yceffort/number-flow/tree/3438c3eed55c65a07d99b634ca2c0fe75becf470). The performance work is in [PR #11](https://github.com/yceffort/number-flow/pull/11), and the code before the change is that PR's base commit, [`92e7d01`](https://github.com/yceffort/number-flow/tree/92e7d01eb83fb2d988260032213fe402ec694258). The measurements in this post were recorded for [issue #10](https://github.com/yceffort/number-flow/issues/10) and while preparing the PR. Only the example of re-baked keyframes and the on-screen measurements on old WebKit were newly made while writing this post.

## Style recalculation outweighed JavaScript

The conditions recorded in [issue #10](https://github.com/yceffort/number-flow/issues/10), which documented the problem, were as follows. `@yceffort/number-flow` and its React wrapper were both 0.1.0, on React 19. The number updated about once per second while other parts of the page received about 10 updates per second. `transformTiming` was 900ms.

The measurement used desktop Chrome with mobile viewport emulation, no CPU throttling, and no extensions. It compared 11-second windows under the same load, and in the comparison run the `duration` passed to `Element.prototype.animate` was forced to 0. So the table below is not before and after a library upgrade; it is the difference between animations repeating and animations with no duration.

| Main-thread work                         | Animations running | Duration 0 |
| ---------------------------------------- | -----------------: | ---------: |
| Total                                    |            218ms/s |     41ms/s |
| Style recalculation (`UpdateLayoutTree`) |            136ms/s |      6ms/s |
| JavaScript (`FunctionCall`)              |             37ms/s |     35ms/s |
| Paint, PrePaint, Layerize                |             28ms/s |      1ms/s |

Here `ms/s` is the milliseconds the main thread spent on that work per second of wall-clock time. It is not the time it took for one number to change.

The total difference was 177ms per second, about 81% of the run with animations. JavaScript differed by 2ms per second, while style recalculation differed by 130ms. With this result, there was reason to look at the browser work the animations created before looking at React rendering or event handlers.

Updates came once per second, but each animation lasted 900ms. For most of the time until the next value arrived, the number was moving. The fact that an update function is called rarely does not mean the animations it starts are cheap.

In the trace, 1,073 style recalculations sat directly under `RunTask`, not inside a JavaScript call. That pattern is distinct from an application reading layout and forcing a synchronous style calculation. At the same time, up to 19 WAAPI animations ran inside the shadow root, and every recorded animation event carried a `compositeFailed` value indicating a compositing failure. Upstream issue #183 reports the same thing through DevTools warnings: `Effect has composite mode other than "replace"` and `Unsupported CSS property: --_number-flow-d-opacity`.

## Why is the main thread busy when the browser runs the animation?

`transform` does not change layout, but if its value has to be computed from CSS variables on every frame, style recalculation remains. For the compositor thread to carry the motion without the main thread, the values to play have to be given directly as `transform` or `opacity` keyframes. The fact that the final property is `transform` does not move the calculation in front of it onto the compositor thread.

The native branch of [`engine/index.ts` before the change](https://github.com/yceffort/number-flow/blob/92e7d01eb83fb2d988260032213fe402ec694258/packages/number-flow/src/engine/index.ts) ran the keyframes it received like this.

```ts
el.animate(keyframes as PropertyIndexedKeyframes, {
  ...timing,
  composite: 'accumulate',
})
```

The digit spin animated a registered custom property, `--_number-flow-d`. A registered custom property is a CSS variable whose value type and inheritance are declared with `@property`. number-flow put the number's displacement into this variable and had each numeral element compute CSS `mod()` and `round()` expressions from the inherited value. The end result is a `transform`, but getting there required a style calculation on every frame.

The `mod()` expression exists because of how digits move. When a digit goes from 9 to the next 0, the numeral positions wrap around. The expression works out how far each numeral is from the current position and whether it belongs above or below. Part 1's rAF fallback moved this calculation, which old browsers lack, into JavaScript; this time the result of the same calculation is baked into keyframes ahead of time.

Width and horizontal position also went through custom properties before becoming a `transform`. Some movement animations did use `transform` directly, but under the existing `accumulate` compositing they did not get compositor acceleration in this trace. Both the custom-property path and the way overlapping animations were combined had to be addressed.

Forcing Part 1's rAF engine does not solve this. That engine computes in JavaScript the values the same CSS consumes and writes them to inline styles. Style recalculation stays and JavaScript work is added. Improving modern-browser performance meant changing the animations handed to the browser.

## Hand the result of the CSS math to keyframes

The basic idea of the new engine, expressed as a simple movement, looks like this. It is not library code; it only shows the shape of what is handed to the browser.

```js
element.animate(
  [{transform: 'translateX(20px)'}, {transform: 'translateX(0px)'}],
  {
    duration: 900,
    easing: 'ease-out',
    composite: 'replace',
  },
)
```

It starts 20px to the right and arrives at its original position 900ms later. The browser interpolates the values in between according to `easing`. If an animation can be played this way, the application does not need to write positions on every frame or recompute CSS variables to get the displacement.

In the real number-flow, digit spins, width changes, and enter and exit transitions overlap. [`engine/compositor.ts`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/engine/compositor.ts) manages them as channels by kind. A channel here is the unit in which animations of the same kind on one element are computed together. `classify()` extracts the kind of request and its starting delta, and `bake()` computes the actual on-screen properties from those deltas. A delta is the difference from the target value.

For example, when one digit changes from 3 to 7, the final target can be set to 7 first, with a delta of -4 shrinking to 0. It starts at `7 + (-4) = 3` and ends at `7 + 0 = 7`. A real spin adds the wrap direction and per-numeral positions on top, but the principle of separating the target from the motion is the same.

Moving the time slider in the example below keeps the target 7 fixed and changes only the delta. A spin position of 4.5 is the midpoint where 4 moves up and 5 comes in. The list of numerals below shows which elements are inside the mask at that moment. The demos in this post have Korean labels.

<LiveDemo src="/demos/number-flow/animation-lab.html?scene=delta" title="An explanatory animation that adds the remaining delta to the target 7 to move from 3 to 7" height={700} />

| Channel   | Previously animated value                      | New keyframes                                                |
| --------- | ---------------------------------------------- | ------------------------------------------------------------ |
| `tx`      | Additive compositing of horizontal `transform` | A combined `translateX()`                                    |
| `spin`    | Digit delta `--_number-flow-d`                 | A `translateY()` per numeral                                 |
| `number`  | Position delta and width delta                 | Translation and scale on the outer element, inverse on inner |
| `opacity` | Opacity delta `--_number-flow-d-opacity`       | A computed `opacity`                                         |

The values the existing CSS would have produced at each moment are computed ahead of time in JavaScript and handed to WAAPI. The new path's `el.animate(keyframes, timing)` does not specify `composite`, so the default `replace` applies. With `replace`, the animation replaces the property value. Combining the effects of several requests, which the browser did under `accumulate`, now has to be prepared by the engine.

The DOM is unchanged. Each digit still has numeral elements from 0 to 9, and the structure that separates the accessibility state of the current numeral from the rest stays. `digitYPercent()`, which computes the spin position, shares the formula from Part 1's rAF engine. In modern browsers, though, the function is used to build keyframes at update time instead of being called on every frame.

The timing of animation requests was gathered as well. On the native path, `animate()` in [`engine/index.ts`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/engine/index.ts) puts the request into `queue()` instead of running it immediately. `didUpdate()` in [`lite.ts`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/lite.ts) calls `flush(this)` after updating the prefix, the number, and the suffix.

`flush()` reads the styles and sizes it needs first, then swaps the animations. Replacing one element's animation and then reading the next element's style, over and over, can force the browser to compute the changes in between. Batching the reads and the writes reduces that repetition.

The new animations all get the same `document.timeline.currentTime` as their `startTime`. That way they start at the same moment even if building keyframes takes different amounts of time per digit. Updates that run without animation also drop the pending requests through `discard()`. This prevents an old request from running late after the number has already switched to its static final value.

## When a new value arrives mid-motion

`accumulate` was used to handle interruptions naturally. Each animation shrinks from some delta to 0, and when several animations overlap on the same property, their contributions add up. When a new value arrives, the earlier animation continues its remaining deceleration.

Switching to `replace` and simply starting a new animation from the current position changes that behavior. Even if the starting position matches, how fast the earlier animation would have kept moving is lost. For the same reason Part 1's fallback summed all active tweens, the remaining progress of earlier animations had to be preserved here too.

The example below shows the difference. Both numbers move from 3 to 7, and at 600ms the target changes to 5. The left one computes the earlier movement's remaining delta together with the new delta. The right one takes only the position at that moment and starts a new `ease-out` animation. For this example, the easing is unified to a simple curve that slows down toward the end.

<LiveDemo src="/demos/number-flow/animation-lab.html?scene=interrupt" title="The difference between a simple replace from the current position and summing the remaining contributions" height={900} />

Pressing `새 값이 들어오는 순간` (the moment the new value arrives) shows both numbers at the same position. Moving time a little further pulls the graphs and the numbers apart. On the left, the deceleration of the earlier movement and of the new movement both remain; on the right, only the single new curve continues. What 0.2.0 preserves is the summed result on the left. It does not force the speed to match before and after the new input; it reproduces the motion that `accumulate` produced afterward.

The new engine stores that information in a `Contribution`: the starting delta `from`, the start time `start`, the delay `delay`, the duration `duration`, and the easing function. When a new update arrives, it reads the `currentTime` of the running WAAPI animations and rebases the existing contributions onto the new start.

```ts
const activeEnd = (c: Contribution) => c.start + c.delay + c.duration

const shift = (contribs: Contribution[], by: number) =>
  contribs
    .map((c) => ({...c, start: c.start - by}))
    .filter((c) => activeEnd(c) > 0)
```

Say an animation shrinks from 30px to 0 over 900ms. After 250ms, a request is added that shrinks from -12px to 0 over 600ms. With `t` as the time since the new animation started, the values to combine during each animation's active interval are:

```text
first contribution  =  30 × (1 - first easing((250 + t) / 900))
second contribution = -12 × (1 - second easing(t / 600))
combined offset     = first contribution + second contribution
```

A contribution whose active interval has ended is 0. The first has `900 - 250 = 650ms` left and the second has 600ms, so the new animation ends 650ms later. Following only the new request's duration would lose the last 50ms of motion. [The interrupt test in `compositor.test.ts`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/test/compositor.test.ts#L126-L148) compares the summed result against the new keyframes under exactly these conditions.

This example also explains why `shift()` subtracts from the start time. If the original start was 0 and 250ms have passed, the existing animation starts at -250ms on the new timeline. Evaluating the existing contribution at new time 0 then yields the state 250ms into it. Keeping the past start time is what keeps the earlier easing from restarting from the beginning.

The summed curve going forward is put into a single `replace` animation. The existing animations being replaced get `finish()` rather than `cancel()`. `cancel()` rejects the `finished` Promise, while `finish()` resolves it. `lite.ts` collects these Promises to manage the `animationsfinish` event, so the way animations end has to fit the existing lifecycle.

## Not every update gets dense keyframes

Computing all the remaining motion adds work at update time. So the engine separates starting a single new animation from combining several contributions.

For a single new request, the original easing is handed to the browser as is whenever possible. This is the `fresh` branch of `bake()`. Instead of rebuilding a curve over time, it places property keyframes along the eased progress. A simple horizontal move needs only a start and an end. A spin also needs keyframes at the boundaries where numerals start or stop being visible. The inverse scale `1 / scale` used for width correction is nonlinear, so in that case progress is sampled into 64 segments.

Here is why progress and time are separated. Even when 50% of the duration has passed, an `ease-out` motion may have covered more than 50% of the distance. Easing is a function that turns time into progress, and keyframes define the property value at each progress. For a single new animation, the time conversion can be left to the original easing, and only the positions where numerals appear or disappear need to be recorded exactly.

When an interruption arrives, or when spin and width correction use an easing that overshoots its range, the curve over time is computed. What [`easing.ts`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/engine/easing.ts) returns grew accordingly. It used to need only the function that computes progress; it now also passes `stops`, the positions of a `linear()` easing's segments, and `overshoots`, whether the output can leave the 0 to 1 range.

`linear()` is piecewise linear, so its bend points are included in the samples. For curves such as `cubic-bezier()`, values are computed every `1000 / 240`ms. The 240 has nothing to do with the playback frame rate; it is the interval for sampling the curve while preparing keyframes. Channels with the same timing in the same update share the result of `grid()`.

CSS `linear()` also needs to be distinguished from the `linear` keyword, which means constant speed. Writing `linear(0, 0.7 40%, 1)` creates a bent line that passes progress 0.7 at 40% of the time. The segments between points are straight, but the overall speed is not constant. The new engine uses this notation to hand the browser the time curve of several summed contributions.

For one-dimensional channels, the time curve of the summed delta becomes a single CSS `linear()` easing, and each target only gets the keyframes needed to map that delta to on-screen properties. For example, numerals in a spin share the same delta curve, but each one comes into view over a different range. `piecewise()` adds the boundaries where a numeral's movement bends or wraps, and `simplify()` removes points that can be dropped within the tolerance.

[The end of `bake()`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/engine/compositor.ts#L566-L597) does this. For each sample, the summed delta is converted to a ratio between `lo` and `hi`, the minimum and maximum it will pass through, and used as a `linear()` point; keyframes between `lo` and `hi` are placed only where each target's function bends.

```ts
// When re-baking, the summed delta follows one curve over time, shared by
// all of the channel's targets. It becomes the easing (a linear() through
// the normalized samples), so each target only needs keyframes where its
// own function bends:
const shared = !fresh && hi > lo
const curve = shared
  ? {
      duration: end,
      endDelay,
      easing: `linear(${simplify(
        samples.map((s) => [s.x, (s.v[0]! - lo) / (hi - lo)]),
        [tol / (hi - lo)],
      )
        .map(([x, g]) => `${g} ${x! * 100}%`)
        .join(', ')})`,
    }
  : timing
return targets.map(({el: target, F, breaks, frame}) => ({
  el: target,
  keyframes: (shared
    ? piecewise(
        [
          {x: 0, v: [lo]},
          {x: 1, v: [hi]},
        ],
        F,
        breaks,
      )
    : simplify(piecewise(samples, F, breaks), [tol])
  ).map(([offset, y]) => ({offset, ...frame(y!)})),
  timing: curve,
}))
```

Feeding the 30px and -12px example from the previous section into the v0.2.0 code produces the single animation below. As in the interrupt test, the first request uses a spring-shaped `linear()` easing and the second uses `ease-in-out`. Values are rounded to four decimal places and positions to two, and only some of the 37 `linear()` points are shown.

```js
keyframes: [
  {offset: 0, transform: 'translateX(-7.9272px)'},
  {offset: 1, transform: 'translateX(0.0490px)'},
]
timing: {
  duration: 650,
  easing: 'linear(0.5220 0%, 0.4272 1.99%, 0.3508 3.85%, …, 0.0001 22.21%, …, 1 91.67%, 0.9980 98.44%, 0.9939 100%)',
}
```

There are only two keyframes. A horizontal move writes the delta straight into `translateX()`, so nothing bends, and only the two ends of the range it will pass through remain. All of the motion over time lives in `linear()`. Plugging the starting progress 0.5220 into the keyframes gives `-7.9272 + (0.0490 + 7.9272) × 0.5220 = -3.763px`, the same value as the formula above at `t = 0`. The first contribution shrinks quickly because it is a spring, while the second shrinks slowly at first because it is `ease-in-out`, so the offset moves further left to -7.93px at 22% (about 144ms). Around 600ms the second contribution has almost vanished, leaving only what remains of the first request, so the offset turns positive up to 0.049px and reaches 0 at 650ms. This is the final 50ms that would have been lost by following only the new request's duration.

Numerals that never come into view are excluded from animation. Having 10 numeral elements in a digit does not mean all 10 have to move. Numerals that stay parked at the 100% positions above or below, outside the mask, for the whole run are left alone. This reduces the number of actual animations without trimming the DOM.

That does not mean only the currently visible numerals are chosen. Moving from 3 to 7 can involve 4, 5, and 6 passing through. `bake()` looks at the range the summed delta will pass through and finds every numeral that comes into view at least once within it. A numeral that is hidden now but will appear shortly still has to be animated.

Because of curve sampling and dropped points, the result is not mathematically identical. The simplification tolerance is 0.01 CSS px for positions and 0.0001 for opacity. The error on the final screen, where several transforms overlap, is not bounded by those constants, so the browser results at the same instants were compared separately, as described later.

## The mask keeps main-thread work

Not every animation could become `transform` and `opacity`. The mask that softly clips the edges of the number remained.

When the width of the number changes, number-flow applies `scaleX()` to the outer element. To keep the numerals inside from being squashed, the inner element gets the inverse scale. The new engine also [builds this transform directly as keyframes](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/engine/compositor.ts#L440-L462): `translateX(dx) scaleX(scale)` for the outer element and `scaleX(1 / scale) translateX(-dx)` for the inner one.

For example, if the previous number was 120px wide and the new one is 100px wide, the element sized for the new width can be shown at 1.2x at first and scaled down to 1. Applying `1 / 1.2` to the inner numerals makes the scale actually applied to them `1.2 × (1 / 1.2) = 1`. The structure keeps the glyphs from stretching or squashing while the outer area changes width.

The outer element's mask, however, is affected by the scale too. That is why [`styles.ts`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/styles.ts) divides the mask's fade width by `--scale-x`. To keep the fade width on screen constant, the mask has to be corrected while the number's width is changing.

The mask decides where the number starts to fade and where it is fully hidden. Even with a horizontal fade width of 24px, if the outer element is stretched 1.6x, the fade spans 38.4px on screen. The width inside the mask has to be reduced to `24 / 1.6 = 15px` in advance to come back to 24px on screen. The example below uses a large fade width so the difference is easy to see.

<LiveDemo src="/demos/number-flow/animation-lab.html?scene=mask" title="How the numeral shape and the mask's fade width are each corrected when the width changes" height={850} />

Both examples apply the inverse scale to the inner numerals. The right one also corrects the mask width, so the orange bar below stays at 24px. The left one keeps the numeral shapes, but the width of the fading area changes. This was the visual difference that `transform` keyframes alone could not preserve.

Freezing the mask at rest would have cut main-thread work further. But in [the PR's comparison](https://github.com/yceffort/number-flow/pull/11), the fade width differed by up to 6.6px when the digit count changed. That difference was too large to accept under the goal of keeping the existing motion and appearance, so the optimization was left out.

Instead, the `--_number-flow-d-width` animation stays for mask correction, but only runs for as long as it is needed. `bake()` finds the last sample where `Math.abs(1 - 1 / scale)` exceeds `1 / 512` and updates the mask up to the next sample. The criterion recorded in the code is the point after which leaving the mask at rest would differ by less than one 8-bit alpha step (`1 / 255`). At the corners the difference grows by up to about 1.42x, but `1.42 / 512` is still below `1 / 255`. This narrows the range so the custom property does not keep animating after the width has settled.

Remaining style changes were also kept from spreading to every digit. The horizontal position variable used to be inherited, but only `.number` and `.number__inner` actually consume it. The value is now reset on `.section` below them. Below is the style template with the variable names expanded.

```css
.number__inner > .section {
  --scale-x: 1;
  --_number-flow-dx: 0px;
}
```

This change applies to the rAF path for old browsers too. Separate from replacing the animation engine, it narrows inheritance so that the width and position correction on the parent does not turn into style recalculation for every numeral.

Applying `font-variant-numeric: tabular-nums` to the number leaves room to reduce this cost further. With fonts that support it, all numerals have the same width, so updates that keep the same digit and symbol layout happen without a width change. More updates then need no mask correction at all. That is why the measurements below separate regular numerals from tabular ones.

## Some inputs have to go back to the old path

The new engine does not reproduce every timing the public API can accept. [`toContribution()`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/engine/compositor.ts#L121-L152) checks conditions such as a finite positive `duration`, a single iteration, and the default direction. Discontinuous easings like `steps()`, repeated playback, reverse direction, and any `fill` other than `auto` or `none` are sent to the old WAAPI `accumulate` path. When a user changes the default movement or opacity styles through `::part()`, targets whose styles the new calculation could overwrite also stay on the old path.

Such an input can arrive while an animation is in flight. Throwing away the existing contributions at that point would break the motion this work set out to preserve. The `demote` handling in `flush()` restores each remaining contribution as an animation in its original form and moves its `startTime` back to the past start. The new `accumulate` request is added on top. Timing information has to be kept not only when moving to the new engine but also when falling back to the old one.

To sum up, what moved onto the compositor thread in 0.2.0 is the playback of movement and fades. Processing updates and computing keyframes, mask correction, and the compatibility exceptions stay on the main thread, and old browsers keep using the rAF engine. In the diagram below, the top row is what happens the moment a new value arrives, and the bottom two rows are the paths that play the animation afterward. Clicking a node shows the corresponding 0.2.0 source file and line numbers. GitHub source links open from the view opened in a new tab. The diagram labels are in Korean, and the viewer's fixed menus are in English.

<LiveDemo src="/demos/number-flow/engine-path.html?present=1" title="0.2.0's animation path: keyframes are computed on the main thread at update time, and movement and fades play on the compositor thread" height={600} />

## How much did performance change?

The before-and-after comparison was run separately from the original issue's measurement. The numbers below are the results recorded in [PR #11](https://github.com/yceffort/number-flow/pull/11). The comparison is not between the upstream library and the fork; it is the fork before and after the performance work.

> Playwright Chromium 151 ran headless on an Apple M5, and main-thread work over 10-second windows was converted to a per-second average. 1x is no CPU throttling; 6x and 20x are DevTools CPU throttling settings. Each cell is before and after, in ms/s. The once-per-second scenarios use a 900ms `cubic-bezier` timing.

The first thing to check was whether the animations actually moved onto the compositor thread. As when investigating the issue, I counted the `compositeFailed` values recorded on the trace's `Animation` events, per animation. In the scenario with one number updating once per second, all 15 animations before the change recorded a nonzero value. After the change, splitting animations per numeral element raised the count to 39, but 37 of them were 0. The two failures were the `--_number-flow-d-width` animations kept on the main thread for mask correction. This count came from the same measurement that produced the table below and is not in the PR description.

Comparing only the runs without CPU throttling as bars looks like this. Shorter bars mean less main-thread time per second.

<BarCompare title="Main-thread work before and after the 0.2.0 performance changes" unit="ms/s" before="Before" after="After" rows="One number|199|59;Tabular numerals|152|14;Update every 300ms|149|119;10 rows|455|177" />

| Scenario                                         |        1x |        6x |       20x |
| ------------------------------------------------ | --------: | --------: | --------: |
| One number, updated once per second              |  199 → 59 |  244 → 42 | 864 → 149 |
| Same conditions, `tabular-nums`                  |  152 → 14 |  125 → 14 |  534 → 55 |
| New value into the running animation every 300ms | 149 → 119 | 366 → 148 | 986 → 606 |
| 10 rows, each updated once per second            | 455 → 177 | 998 → 690 | 990 → 983 |

In the first scenario without CPU throttling, main-thread work dropped by about 70%. With tabular numerals it dropped by about 91%. Because of the mask work described above, the after numbers for the two conditions also differed, at 59ms/s and 14ms/s. The 218ms/s from the original problem and the 59ms/s after the change in this table are not chained together because the measurement conditions and windows differ.

Frequent interruptions shrank the improvement. With the value changing every 300ms, the unthrottled result went from 149ms/s to 119ms/s. According to the same PR, at 1x, the processing time of a single interrupted update grew from about 5ms to 15ms. Per-frame style calculation went down, but re-summing the remaining contributions and building keyframes was added at update time.

Main-thread time and dropped frames had to be looked at separately. Running 10 rows at 20x throttling, the main thread stayed nearly the same, from 990ms/s to 983ms/s. Yet the dropped frames recorded in the PR for the 10-second window went from 533 to 0. Advancing animations on the compositor thread and freeing up the page's main thread are different outcomes.

Translating throttling factors into real low-end device performance also has limits. In an auxiliary measurement in the PR, 6x throttling slowed a pure JavaScript loop by 5.9x but short per-frame style work by only about 1.6x. That suggests the absolute values under throttling are likely lower than on real low-end devices, and there are no direct measurements on a low-end Android WebView yet.

## Checking that the motion stayed the same

Even with less main-thread time, if the way numbers move had changed, it would be hard to call this an improvement to the same library. Preserving the position at the moment of interruption and the motion after it was a requirement of this implementation.

The repository's [`compositor.test.ts`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/test/compositor.test.ts) mocks WAAPI and records the keyframes and timings passed to it. As time advances, it compares the values the new keyframes produce against the sum of the original contributions. It checks movements and spins interrupted by new values, the opacity of an element that re-enters while exiting, the inverse transform between the outer and inner elements, switching to an unsupported timing, and more. What this test verifies is the calculation; the results in browsers were compared separately.

The browser comparison results are [recorded separately in the PR](https://github.com/yceffort/number-flow/pull/11). In Chromium and WebKit 26, every animation was paused, and a test harness that sets the time to compare aligned the before and after. Comparing two screens playing side by side by eye can make positions look different if the start times are off even slightly. Freezing both at the same instant and reading positions, opacity, and mask width is what makes the implementations comparable. The 15 scenarios included interruptions, sign changes, digit-count changes, the `continuous` plugin, separate spin timing, overshoot, delay, and consecutive updates within one task.

The recorded differences were within 0.026px in position, 0.00011 in opacity, and 0.024px in mask fade width. The DOM was identical, and the screenshots after the animations ended were identical too. Pixel differences remained mid-flight, but shifting the before rendering by just 0.005px produced differences of the same size. They come from the quantization of glyph subpixel positions. The browser comparison harness and the original performance traces are not included in the 0.2.0 tag, so the PR's results are cited.

The Safari problem left over from Part 1 turned out, on remeasurement, not to be a rendering problem. On WebKit 17.4 and 18.2 the selftest reported the width scale and the enter fade as failures, but the failures appeared only in the values `getComputedStyle()` reported. In recorded playback frames, both effects were drawn exactly as on WebKit 26.5 even with the code before the change. The measurements are described in the correction to the Safari section of [Part 1](/2026/08/number-flow-fork-for-old-browsers). Because 0.2.0 animates both effects directly as `transform` and `opacity` keyframes, `getComputedStyle()` now reports the mid-animation values too. The selftest passed all 44 assertions on the two macOS WebKit builds recorded in the PR, and the known-failures list in [`test-webkit-versions.mjs`](https://github.com/yceffort/number-flow/blob/v0.2.0/scripts/test-webkit-versions.mjs) was emptied. What changed is not the screen but the values the test reads.

Mask correction still goes through a custom property. The `--_number-flow-d-width` animation runs on the `.number` element and reaches `-webkit-mask-size` through `--scale-x` [on the same element](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/styles.ts#L164-L183). The selftest only checks that the mask is drawn, so I [measured it separately](https://github.com/yceffort/blog-experiments/tree/main/number-flow-webkit-mask) while writing. With a black background on `::part(number)` so the mask fades its edges, I measured the fade width visible on screen while changing the number from 9 to 123456, using screenshots and recorded playback frames. On WebKit 17.4, 18.2, and 26.5 alike, the fade width stayed around 16px, which is `0.5em`, while the scale changed. A still frame with the mask width changed to `1.5em` read as 47.8px, confirming that this measurement does pick up values other than 16px.

The browsers rerun for this release were old Chromium 100 and 114 and WebKit 16.4, 17.4, and 18.2. Firefox could not be checked because Playwright's binary did not launch, and Chromium 66 through 87 could not be checked this time because Rosetta is not installed.

## The result of moving the summation to update time

The original author gave up on compositing because of interruptions. `accumulate` let the browser add overlapping animations together but could not run on the compositor thread, and switching to `replace` broke the earlier motion. At least for number-flow's motion, it was not a choice between the two. If the summation the browser did on every frame is done once, ahead of time, the moment a new value arrives, the result fits into a single `replace` animation.

The cost moved to update time. A single interrupted update got heavier, from about 5ms to 15ms, and the improvement was small when the value changed every 300ms. Mask correction also stayed on the main thread. For a counter that changes about once per second, the trade-off came out strongly ahead, and removing width changes with `tabular-nums` left little work behind. I think the right call can differ depending on the update interval and the number of digits.

This calculation was possible because Part 1 had already moved the CSS math and the easing into JavaScript for old browsers. I don't plan to propose this change upstream; it stays in this fork. The code is in the [0.2.0 tag](https://github.com/yceffort/number-flow/tree/v0.2.0), and the measurement conditions and comparison results are in [PR #11](https://github.com/yceffort/number-flow/pull/11).
