---
title: 'Reducing Forced Synchronous Layout in the <em>number-flow</em> Update Path'
tags:
  - web-performance
  - browser
  - debugging
  - oss
published: true
series: 'Improving number-flow'
seriesOrder: 3
date: 2026-11-01 08:35:00
description: 'Every time the value of number-flow changed, style and layout were being recalculated several times over. This post records the performance change observed after 0.2.1 reordered how the library reads and writes the DOM, and the costs that remain.'
art:
  undraw: bento-grid
---

## Table of Contents

## One update recalculated style 12 times

`15 / 103 / 91 / 2 / 11 / 11 / 11 / 11 / 11 / 11 / 109 / 54`. These are the element counts Chrome recorded each time it recalculated style while a single number changed, in order. One update triggered 12 style calculations, and the next update repeated the same sequence. The run of six 11s in the middle was the trace of a 9-digit number recalculating style once for every digit whose value changed.

[Part 2](/2026/10/number-flow-compositor-performance) dealt with style being recalculated on every frame during the 900ms the animation played. Moving the translation and fade to `transform` and `opacity` keyframes in 0.2.0 reduced the cost during playback. What I did not look at then was the moment the value of `<NumberFlow>` changes, that is, the time the library spends updating the DOM. On the page I examined this time, with 4x CPU throttling, that single update task took 50-60ms.

The two problems were also distinguishable in the trace. The style recalculation during playback sat directly under `RunTask`, outside any JavaScript call. It was work the browser did on each frame. This time, the calculation was wedged inside a running JavaScript function. The code asked for the latest coordinates, and the browser ran the layout calculation it had deferred, right then. This is called a forced synchronous layout.

Since the browser sometimes recalculates only style and skips layout, the browser measurement tables in this post count style recalculation (`UpdateLayoutTree`) and layout (`Layout`) separately. The fork's [0.2.1](https://github.com/yceffort/number-flow/releases/tag/v0.2.1) reduced the repeated calculation by changing the order in which the DOM is read and written. How many calculations actually happen depended on the page state and the kind of update.

> The code analysis is based on `v0.2.1`, released on October 31, 2026, commit [`477893f`](https://github.com/yceffort/number-flow/tree/477893f382cff2562df1c8522c6f1aa6a63e3f87). The changes are in [PR #18](https://github.com/yceffort/number-flow/pull/18) and [PR #19](https://github.com/yceffort/number-flow/pull/19), and the code before the change is [`v0.2.0`](https://github.com/yceffort/number-flow/tree/v0.2.0), the same as in Part 2. The browser measurements taken on the issue's page are the results recorded in [issue #17](https://github.com/yceffort/number-flow/issues/17) and PR #18. The three-build comparison in the latter half comes from a separate page that reproduces part of the load conditions, and the [experiment code, inputs, results, and trace files](/demos/number-flow/forced-layout-experiment-2026-11-01.zip) are provided with it. The jsdom test model numbers come from applying the same test to the three commits.

## I started with the functions the profiler showed

Issue #17 is a measurement from a page that used both `@yceffort/number-flow` and the React wrapper at 0.2.0. It was a Next.js production build on React 19, with a single `<NumberFlow>` of about 9 digits, with a prefix and suffix, updating about once per second. Elsewhere on the same page, text nodes were changing about 180 times per second. Desktop Chrome 156 emulated a mobile viewport with 4x CPU throttling. No extensions were installed.

The six update tasks I picked from a 10-second trace all followed the same pattern.

| One update task                                            | Count | Time each |
| ---------------------------------------------------------- | ----: | --------: |
| Total length                                               |       |   50-60ms |
| Style recalculation inside JavaScript (`UpdateLayoutTree`) | 11-13 | 0.1-5.5ms |
| Layout inside JavaScript (`Layout`)                        |  9-11 | 0.2-1.8ms |

To see how much this element contributed, I compared two things. First I replaced `<NumberFlow>` with plain text showing the same value and measured 10 seconds before and after. Since this removes the animation as well, it served to find the upper bound of the cost an optimization could remove. The combined time spent on style recalculation and layout fell from 104ms/s to 22ms/s, and tasks over 50ms went from 13 to 0.

Next I reduced the other updates on the page to about 36 per second. The long tasks that appeared once per second stayed at 13 in 10 seconds. Reducing the background updates alone did not make the problem go away. Since only the count of tasks over 50ms was compared, though, this does not show that the update time was the same or that the background load had no effect.

A browser can defer the calculation when the DOM or styles change, until the next rendering step. But if code asks for the current position or size in between, through `getBoundingClientRect()` or `offsetWidth`, the browser has to finish the necessary calculation first to return an accurate value. If the DOM and styles have not changed since, the result can be reused, though the time to call the API itself does not disappear.

Not every DOM change leads to a layout calculation. The problem arises when changes that require layout alternate with coordinate queries. The browser cannot batch the calculation and has to run it on every read. This pattern is called layout thrashing.

The demo below runs the same job, reading and changing the width of boxes, in two orders. One reads and immediately changes each box's width; the other reads every width first and then changes them all at once. Both start from the same width, and the timer runs until the layout calculation for the last change has finished. Paint and compositing time are not included.

<LiveDemo src="/demos/number-flow/layout-lab.html?scene=thrash" title="Time to change box widths and calculate layout" height={760} />

Since a forced layout happens while the function that asked for coordinates is running, it appears under that function in the trace. In a 20-second CPU profile, I grouped the self time of `getBoundingClientRect` by caller. Chrome's Forced reflow insight put the forced layout time in the same trace at 261ms.

| Caller of `getBoundingClientRect`        | Self time |
| ---------------------------------------- | --------: |
| `Digit.didUpdate`                        |     186ms |
| `Section.addNewAndUpdateExisting`        |     178ms |
| `Section.didUpdate`                      |     129ms |
| `Sym.didUpdate`                          |      85ms |
| `Section.willUpdate`, `Digit.willUpdate` |       9ms |

At first I thought the cause was `didUpdate` calling `animate()` right after reading coordinates, and I wrote that in the issue. But the code showed that this explanation did not fit this case. The native engine's `animate()` only pushes the request into `queue()`. The rAF engine, when the duration is positive, also just schedules the work for the next frame. Neither touches the DOM at that point.

The actual cause was what had run before: adding the `is-spinning` class, writing `--width`, and the DOM moves of the update phase. Because of those changes, the next coordinate read had to recalculate style and layout. I corrected this in a comment on the issue. The profiler shows the function that requested the calculation, but to find the cause I also had to look at which code had changed the DOM before it.

## DOM writes and coordinate reads alternated in four places

In [`lite.ts` at `v0.2.0`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/lite.ts), a value update had three phases. `willUpdate()` reads the coordinates of every section and character, `update()` changes the DOM, and `didUpdate()` reads the new coordinates and requests an animation covering the distance moved. This is the FLIP approach (First, Last, Invert, Play): take the positions before and after, apply the difference in reverse, and animate back to the resting position. Inside `update()` and `didUpdate()`, though, DOM writes and coordinate reads alternated as each section and character was processed. PR #18 found the following four places.

| Where                             | What it wrote                                              | What it read right after                                      |
| --------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| `Section.addNewAndUpdateExisting` | Re-`append` of every existing char, insertion of new chars | Section rect, once per section (pre, integer, fraction, post) |
| `NumberSection.update`            | Return every char to the flow, record values               | `offsetTop` and `offsetLeft` of each disappearing char        |
| `Digit.didUpdate`                 | Add the `is-spinning` class                                | Rect of the next digit, once per digit whose value changed    |
| `Num.didUpdate`                   | `--width`                                                  | Rect of the suffix section                                    |

The first one calculated layout unnecessarily even when no characters were being added. [`addNewAndUpdateExisting()`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/lite.ts#L493-L535) queries the section rect to find the starting position of new characters. But the loop before it was also calling `append` or `prepend` on characters that already existed.

```ts
forEach(
  parts,
  (part) => {
    let comp: Char
    // Already exists/needs update, so set aside for now
    if (this.children.has(part.key)) {
      comp = this.children.get(part.key)!
      updated.set(part, comp)
      this.unpop(comp)
      comp.present = true
    } else {
      // New part
      comp = this.addChar(part, {startDigitsAtZero: true, animateIn: true})
      added.set(part, comp)
    }
    this.el[op](comp.el)
  },
  {reverse},
)

if (this.flow.computedAnimated) {
  const rect = this.el.getBoundingClientRect() // this should only cause a layout if there were added children (?)
  added.forEach((comp) => {
    comp.willUpdate(rect)
  })
}
```

Re-appending an element that is already a child makes the browser remove and reinsert it, even if the final order is the same. The DOM has moved and the parent's layout has to be recalculated, and the `getBoundingClientRect()` right below always runs when `computedAnimated` is true. The comment says a layout should only be needed when children were added, but in practice one forced layout occurred in each of the four sections.

The second one appears when the digit count shrinks. [`NumberSection.update()`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/lite.ts#L569-L593) briefly puts the digits about to disappear back into normal layout flow, measures their new positions, then pins them there and takes them out of the flow. This lets the disappearing digits move along with the width changes of their neighbors. But [`pop()`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/lite.ts#L481-L491), which measures the positions, also alternated reads and writes for every character.

```ts
protected pop(chars: Map<any, Char>) {
  // Calculate offsets for removed before popping, to avoid layout thrashing:
  chars.forEach((char) => {
    char.el.style.top = `${char.el.offsetTop}px`
    char.el.style[this.justify] = `${offset(char.el, this.justify)}px`
  })
  chars.forEach((char) => {
    char.el.setAttribute('inert', '')
    char.present = false
  })
}
```

As the comment says, `inert` is set after the measurement is done. But the measuring part itself reads `offsetTop` and writes `top`, then reads `offsetLeft` and writes `left` or `right`. Repeating that order produces two reads-after-write per character. This is why the test model described later counted 34 for an update that drops digits.

The third is where the trace showed the run of 11s. [`Digit.didUpdate()`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/lite.ts#L771-L805) reads the digit's rect and requests the translation animation. Then it adds the `is-spinning` class to digits whose value changed.

```ts
didUpdate(parentRect: DOMRect) {
  const rect = this.el.getBoundingClientRect()
  const offset = rect[this.section.justify] - parentRect[this.section.justify]
  const halfWidth = rect.width / 2
  const center =
    this.section.justify === 'left' ? offset + halfWidth : offset - halfWidth
  const dx = this._prevCenter! - center

  if (dx)
    animate(
      this.flow,
      this.el,
      {
        transform: [`translateX(${dx}px)`, 'none'],
      },
      this.flow.transformTiming,
    )

  const delta = this.getDelta()
  if (!delta) return

  this.el.classList.add('is-spinning')
  animate(
    this.flow,
    this.el,
    {
      [deltaVar]: [-delta, 0],
    },
    this.flow.spinTiming ?? this.flow.transformTiming,
  )
  // Hoisting the callback out prevents duplicates:
  this.flow.addEventListener('animationsfinish', this._onAnimationsFinish, {
    once: true,
  })
}
```

The stylesheet rule `.digit:not(.is-spinning) .digit__num[inert] { display: none; }` hides the numerals other than the current value. Adding `is-spinning` stops the rule from applying, so the numerals the spin passes through become visible. When the animation ends, `animationsfinish` removes the class, so the next update adds it again. In the loop that processes digits in order, the class is added to one digit and then `getBoundingClientRect()` is called on the next. Style is recalculated each time, so with 9 digits this part alone can add 8 more recalculations.

The fourth is where the width of the whole number is recorded. [`Num.didUpdate()`](https://github.com/yceffort/number-flow/blob/v0.2.0/packages/number-flow/src/lite.ts#L380-L404) runs `didUpdate()` on the integer and fraction parts, then reads the new width and stores it in `--width`. This value is used for the mask correction described in Part 2. When `_post.didUpdate()` runs next and reads coordinates, one more layout calculation occurs.

```ts
didUpdate() {
  const rect = this.el.getBoundingClientRect()

  // Do this before starting to animate:
  this._integer.didUpdate()
  this._fraction.didUpdate()

  const dx = this._prevLeft! - rect.left

  const width = this.el.offsetWidth
  // We convert scale to width delta in px to better handle interruptions and keep them in
  // sync with translations:
  const dWidth = this._prevWidth! - width
  this.el.style.setProperty('--width', String(width))

  animate(
    this.flow,
    this.el,
    {
      [dxVar]: [`${dx}px`, '0px'],
      [widthDeltaVar]: [dWidth, 0],
    },
    this.flow.transformTiming,
  )
}
```

On top of these, after the update phase changes `--current` and `inert` in every section and moves the DOM, a calculation occurs when `_pre.didUpdate()` reads coordinates for the first time. Each function tried to group its reads, but because sections and characters were processed one after another, the changes made to the previous element meant that reading the next element's coordinates required a recalculation each time.

This structure came from upstream. The upstream `main` commit of September 20, 2026, [`c5906cf`](https://github.com/barvian/number-flow/blob/c5906cf/packages/number-flow/src/lite.ts), still has the same loop and comment. Upstream has not collected a trace under the same conditions, though, so I cannot say the actual cost is the same.

The demo below shows the order in which these four parts run during one update. I ran the fork's code in jsdom and recorded the order of DOM reads and writes. The left side is `v0.2.0`, the right side is `v0.2.1`, and reads that follow a write are shown in purple. Choosing the example where the digit count shrinks shows how `pop()` reading coordinates for every character pushes the count up to 34. The native engine example also marks where `flush()` reads values.

<LiveDemo src="/demos/number-flow/layout-lab.html?scene=order" title="The order in which v0.2.0 and v0.2.1 read and write the DOM during one update" height={800} />

On the right, reads and writes are each grouped together. In the same-digit-count example, purple appears once; in the examples where characters are added or digits drop, it appears twice. Purple marks the reads-after-write recorded by the test, not the number of times the browser actually calculated layout.

## Read every section, then write all at once

As proposed in the issue, measurement and commit were separated: read everything that is needed first, and run the work that applies to the DOM later. Reading and writing one section at a time was not enough. After changing one section, reading the next section's coordinates requires a recalculation again. So 0.2.1 changed the order to read all three sections, the prefix, the number, and the suffix, before running the writes.

| Phase            | Kind  | What it does                                                                                                     |
| ---------------- | ----- | ---------------------------------------------------------------------------------------------------------------- |
| `willUpdate`     | Read  | Rects of every section and char, layout positions of symbols to pin when they leave                              |
| `update`         | Write | Diff the changes, take leaving symbols out of the flow, return leaving digits to the flow, insert and move chars |
| `measureAdded`   | Read  | Starting positions of added chars, only when chars were added                                                    |
| `updateValues`   | Write | `--current`, `inert`, leaving digits to 0                                                                        |
| `measureRemoved` | Read  | Positions of leaving digits in the new layout, only when digits leave                                            |
| `popRemoved`     | Write | Pin leaving digits at the measured positions and take them out of the flow                                       |
| `measure`        | Read  | Final rects, returns a commit closure per section and char                                                       |
| Commit           | Write | `is-spinning`, `--width`, `animate()` calls, then `flush()`                                                      |

[`set data`](https://github.com/yceffort/number-flow/blob/v0.2.1/packages/number-flow/src/lite.ts#L228-L239) runs the first six phases in the order below. Each phase finishes with every section it needs before moving on to the next.

```ts
// Each phase finishes its DOM writes across every section before the
// next one reads layout, so an update forces one layout (one more when
// it adds chars, one more when it drops digits) instead of one per
// section plus one per digit (yceffort/number-flow#17):
this._pre!.update(pre)
this._num!.update({integer, fraction})
this._post!.update(post)
const sections = [this._pre!, this._num!, this._post!]
sections.forEach((s) => s.measureAdded())
sections.forEach((s) => s.updateValues())
this._num!.measureRemoved()
this._num!.popRemoved()
```

The last two phases run in [`didUpdate()`](https://github.com/yceffort/number-flow/blob/v0.2.1/packages/number-flow/src/lite.ts#L309-L315). Each section's `measure()` reads coordinates, computes the distances to move, and returns the work to apply to the DOM as a closure. Once all three sections have been measured, the closures run in order.

```ts
// Measure every section and char (and what the engine will need) before
// any of them writes to the DOM:
const sections = [this._pre!, this._num!, this._post!]
const commits = sections.map((s) => s.measure())
if (usesNativeEngine()) prepare(this)
commits.forEach((commit) => commit())
if (usesNativeEngine()) flush(this)
```

`prepare()` was added in PR #19 and is described later. Looking at a digit's [`measure()`](https://github.com/yceffort/number-flow/blob/v0.2.1/packages/number-flow/src/lite.ts#L820-L856), the coordinate computation is the same as the earlier `didUpdate()`. Only the part that adds `is-spinning` and calls `animate()` moved into the returned function.

```ts
measure(parentRect: DOMRect): Commit {
  const rect = this.el.getBoundingClientRect()
  const offset = rect[this.section.justify] - parentRect[this.section.justify]
  const halfWidth = rect.width / 2
  const center =
    this.section.justify === 'left' ? offset + halfWidth : offset - halfWidth
  const dx = this._prevCenter! - center

  return () => {
    if (dx)
      animate(
        this.flow,
        this.el,
        {
          transform: [`translateX(${dx}px)`, 'none'],
        },
        this.flow.transformTiming,
      )

    const delta = this.getDelta()
    if (!delta) return

    this.el.classList.add('is-spinning')
    animate(
      this.flow,
      this.el,
      {
        [deltaVar]: [-delta, 0],
      },
      this.flow.spinTiming ?? this.flow.transformTiming,
    )
    // Hoisting the callback out prevents duplicates:
    this.flow.addEventListener('animationsfinish', this._onAnimationsFinish, {
      once: true,
    })
  }
}
```

`measureAdded` and `measureRemoved` exist to preserve how the existing animation computes positions. A newly added character has to be measured for its starting position before its value is written. For a digit, that means measuring while it still reads 0. The earlier `addNewAndUpdateExisting()` processed it in this order as well, and that measurement was split out as `measureAdded`.

A leaving digit has to be pinned at the position it would occupy after the remaining digits change to the new value. In a proportional font, widths differ by digit, so pinning it at its previous position can make neighboring digits pass over it. The phase that measures this position is `measureRemoved`. [`NumberSection`](https://github.com/yceffort/number-flow/blob/v0.2.1/packages/number-flow/src/lite.ts#L603-L634) collects the leaving digits and handles them in this phase. This is why one more measurement is needed when the digit count shrinks. The PR added a test that simulates 1,111 changing to 222 in a proportional font and checks the pinned positions.

Symbols are handled differently. A leaving symbol is pinned at its position before anything moves, so no extra measurement is needed. With this behavior moved into the base implementation, the `SymbolSection` class was removed.

PR #18 also changed how invisible elements are handled. Previously, `willUpdate()` measured every section and character, and the `visible(this)` check in `didUpdate()` discarded the measurements of invisible elements. Now `willUpdate()` checks first and skips the measurement. Since `visible()` also reads `offsetWidth` and `offsetHeight`, it is called last, after the other conditions. If the earlier conditions decide the element cannot animate, no layout values are read at all.

## Verifying the read and write order with jsdom

I added a test so that later code changes would not mix reads and writes again. jsdom does not calculate layout, so it cannot measure time or calculation counts the way a real browser would. Instead it counts how many times layout or computed style is queried after the DOM was changed. [`forcedLayouts()` in `lite.test.ts`](https://github.com/yceffort/number-flow/blob/v0.2.1/packages/number-flow/test/lite.test.ts#L73-L125) does this. The function name says layout, but what it checks is the call order.

```ts
// Counts the layouts a browser would be forced to run during fn(): every
// layout read that follows a DOM write since the previous read. jsdom does no
// layout, so the writes are observed through MutationObserver's synchronous
// takeRecords() instead (yceffort/number-flow#17):
const forcedLayouts = (el: TestFlow, fn: () => void) => {
  const observer = new MutationObserver(() => {})
  observer.observe(el, {attributes: true})
  observer.observe(el.shadowRoot!, {
    subtree: true,
    childList: true,
    attributes: true,
  })
  let forced = 0
  const read = () => {
    if (observer.takeRecords().length) forced++
  }

  const rect = Element.prototype.getBoundingClientRect
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      read()
      return rect.call(this)
    },
  )
  // Resolving a computed value also flushes pending style changes (it may be
  // a spy from the native suite, so wrap by assignment, not vi.spyOn):
  const computed = window.getComputedStyle
  window.getComputedStyle = (...args) => {
    read()
    return computed.apply(window, args)
  }
  const counting: LayoutGetter = (_el, original) => {
    read()
    return original()
  }

  observer.takeRecords() // writes before fn() aren't its fault
  try {
    withLayout(
      {
        offsetWidth: counting,
        offsetHeight: counting,
        offsetTop: counting,
        offsetLeft: counting,
      },
      fn,
    )
  } finally {
    window.getComputedStyle = computed
    observer.disconnect()
  }
  return forced
}
```

`MutationObserver` callbacks run as microtasks, but calling `takeRecords()` retrieves the accumulated mutation records synchronously. On every read, the test pulls these records, and if there are any, it concludes the DOM changed since the previous read. The reads it watches are `getBoundingClientRect()`, `getComputedStyle()`, and the `offsetWidth`, `offsetHeight`, `offsetTop`, and `offsetLeft` accessors swapped in through `withLayout()`. Reading inline styles through `el.style` does not force layout, so it is excluded.

The count this test produces is not the same as the actual number of layouts. It records attribute changes that do not affect layout as writes too, and it cannot tell whether the browser only updated style or reused a previous result. In the other direction, the mock Web Animations API lacks the browser's internal style updates, so some work is missed. The value therefore cannot be compared directly with a browser trace or taken as an upper bound of the real count. It is a test that reads and writes have not been interleaved again.

The numbers below were obtained by applying the `v0.2.1` test file to the source of each of the three commits. Since the test only checks a maximum allowed count, I deliberately set the expectations wrong and read the actual counts from the failure messages.

| Reads after a write (with prefix and suffix) | `v0.2.0` | PR #18 (`90a7539`) | `v0.2.1` |
| -------------------------------------------- | -------: | -----------------: | -------: |
| Same digit count                             |       13 |                  1 |        1 |
| Digits added                                 |       14 |                  2 |        2 |
| Digits removed                               |       34 |                  2 |        2 |
| Only a symbol removed                        |        7 |                  1 |        1 |
| Same digit count, native engine              |       12 |                  2 |        1 |

The top four rows are results with the rAF engine. The last row used the native engine. jsdom has no Web Animations, so I created a mock `Animation` to let `flush()` run, and had `getComputedStyle()` return the style values of an animation at rest. PR #18 and PR #19 differ only in this last row, for reasons explained later. The pre-change values 13, 14, and 34 matched the numbers in the PR #18 description. The 7 for removing only a symbol was not in the PR and was measured additionally this time.

## On the real page, update time halved

I also checked how much it improved in a real browser. On the issue's page, I alternated the PR #18 branch (`90a7539`) with 0.2.0 and collected three 10-second traces per build. This comparison had only updates that kept the digit count.

|                                                  |       0.2.0 |    PR #18 |
| ------------------------------------------------ | ----------: | --------: |
| Average update task                              |      53.9ms |    26.0ms |
| Forced style recalculations / layouts per update | 11.9 / 10.6 | 3.5 / 2.2 |
| Tasks over 50ms per 10 seconds                   |         7.7 |         0 |
| number-flow self + children time                 |    51.2ms/s |  24.3ms/s |
| `getBoundingClientRect` time                     |    28.6ms/s |   3.5ms/s |

After each update I compared the digits shown on screen with `valueAsString`, and all 15 matched. The time spent in `getBoundingClientRect` fell to an eighth, but 3.5 forced style recalculations per update remained. Following the call stacks of the `UpdateLayoutTree` and `Layout` events inside the task through the source map, the remaining calculations came from the following four places.

| Remaining read                                                                                             | Cost per update                                         |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `overridden()` in `flush()`: `getComputedStyle(el).transform` per channel, `offsetHeight` of the spin unit | 5.3ms style + 1.2ms layout                              |
| `shadowRoot.getAnimations()` in `didUpdate()`, right after `flush()`                                       | 3.1ms style                                             |
| `getBoundingClientRect()` in `Section.measure()` (the FLIP read)                                           | 2.4ms style + 1.2ms layout                              |
| `visible(this)` in `willUpdate()`                                                                          | 0.1-0.5ms, only when layout already needs recalculating |

The third row is the one the test model counted. It is the measurement FLIP needs: reading the final coordinates after the DOM has changed. The test at the time ran with the rAF engine, so the work in `flush()` and `getAnimations()`, which exist only in the native engine, was not included. These two parts alone took 9.6ms, longer than the FLIP measurement. Both had been in the code since 0.2.0, so they were not a new problem introduced by PR #18. They were left for a follow-up PR.

`overridden()` is used for the exception handling described in Part 2. It checks that the new engine does not overwrite translation or opacity styles the user applied through `::part()`. When a channel's element is at rest, it gets the transform and opacity values through `getComputedStyle()` and compares them with the defaults. For the spin channel, it gets the height of one numeral cell through `offsetHeight` to use as the unit for `translateY()`.

Inside `flush()`, these values were already being read together up front. But `flush()` itself ran after the commit phase. It came right after `is-spinning` and `--width` had been changed, so the first read had to recalculate style.

`getAnimations()` was used to decide when to dispatch `animationsfinish`. It collects the `finished` promises of the animations started during the update and dispatches the event once they have all settled. Because this method also finds and returns CSS animations and transitions, it has to update style at the moment of the call. The trace showed 3.1ms of style recalculation under this call as well. The fact that it came right after `flush()` started new animations most likely added to the cost.

## Reading what flush() needs ahead of time

PR #19 reads the values `flush()` needs in advance and removes the `getAnimations()` call that followed. First, [`prepare()`](https://github.com/yceffort/number-flow/blob/v0.2.1/packages/number-flow/src/engine/compositor.ts#L242-L259) was added to obtain the necessary values before the commit. It is the function called after `measure()` in the `didUpdate()` shown earlier.

```ts
/**
 * Reads what flush() needs from layout and computed style. Call it before the
 * update writes to the DOM: none of those writes change these values
 * (`is-spinning` only shows the inert numerals, which are absolutely
 * positioned), and reading them after the writes would force a style update.
 */
export const prepare = (scope: object) => {
  const set = tracked.get(scope)
  set?.forEach((ch) => {
    if (!ch.el.isConnected) {
      set.delete(ch)
      return
    }
    if (ch.kind === 'spin') ch.unit = ch.el.offsetHeight || 100
    // flush() only asks for a channel at rest:
    if (localTime(ch) == null) ch.authorStyled = authorStyled(ch)
  })
}
```

`tracked` holds the channels that `flush()` has handled at least once for the element. `prepare()` drops the channels of elements detached from the DOM, then checks and stores the numeral height for spin channels and whether author styles apply to channels at rest. `flush()` then uses the stored values and queries only the channels it sees for the first time. So on the first animated update, or when new characters were added, `flush()` still has to read values. The stored values are cleared when the update ends and obtained again on the next update.

The values can be read early because the writes in the commit do not affect them. Adding `is-spinning` reveals the numerals hidden with `display: none`, but those elements are `position: absolute` and do not change the digit's height. `--width`, on the other hand, is written in this very commit, so it cannot be read in advance. Checking the inline style on `el.style` does not force layout, though, so that part was left in `flush()`.

When `prepare()` runs, the browser has finished the layout calculation in the preceding measurement phase. The same result can therefore be reused. The JavaScript time to query and process the values is of course still spent.

In place of `getAnimations()`, [`animationsOf()`](https://github.com/yceffort/number-flow/blob/v0.2.1/packages/number-flow/src/engine/compositor.ts#L79-L101) was added. It keeps the `Animation` objects the compositor started, per element, and returns only those still in flight.

```ts
const start = (
  scope: object,
  el: HTMLElement,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  timing: KeyframeAnimationOptions,
) => {
  const a = el.animate(keyframes, timing)
  setOf(live, scope).add(a)
  return a
}

/**
 * The scope's animations still in flight: what `shadowRoot.getAnimations()`
 * would list, minus the style update that call forces.
 */
export const animationsOf = (scope: object): Animation[] => {
  const set = live.get(scope)
  if (!set) return []
  set.forEach((a) => {
    if (!inFlight(a)) set.delete(a)
  })
  return Array.from(set)
}
```

Every `el.animate()` call in `flush()` now goes through `start()`. Animations started on the compositing path from Part 2, on the exception path that uses `accumulate`, and from unclassified requests are all collected in the same set. `didUpdate()` takes the `finished` promises from this list and dispatches `animationsfinish` once they have all settled. The rAF engine from Part 1 already managed its own list of tweens and provided `finishedOf()`, and the same approach was applied to the native engine.

This change also altered what `animationsfinish` waits for. The old `getAnimations()` returned every animation inside the shadow root, so the event could be delayed until a CSS animation or transition the user applied through `::part()` finished. Now, like the rAF engine, it waits only for the animations the engine started.

There is also a difference for characters removed from the DOM mid-animation. The old `getAnimations()` dropped an animation from its list once the element was gone, while the new implementation keeps waiting for it. In the part that finishes in-flight animations on a non-animated update and in `disconnectedCallback`, `getAnimations().forEach(finish)` was kept. Those two cases run rarely and did not appear in this trace.

The test for a same-digit-count update on the native engine went from 2 in PR #18 to 1. That is the last row of the earlier table. PR #19 recorded no browser measurements. Judging from the PR #18 trace, I expected it to remove the 6.5ms in `flush()` and the 3.1ms in `getAnimations()`. The next section compares the three builds together on a separate reproduction page. The page and browser are different, so it is not an experiment that checks whether exactly 9.6ms is saved.

## Comparing the three builds again with the same inputs

The issue's page belongs to a company service and cannot be used in this post, so I built a separate page that reproduces part of the load conditions. The tables below are the result of having a coding agent run this page and the measurement script again while reviewing the post. The [experiment ZIP, about 13MiB](/demos/number-flow/forced-layout-experiment-2026-11-01.zip) contains the code, the fixed inputs, per-run results, and 18 trace files. The SHA-256 of each file is included as well.

> The sources of `v0.2.0`, PR #18's commit `90a7539`, and `v0.2.1` were bundled with esbuild 0.28.2. A single `<number-flow>` with a prefix and suffix was updated 10 times, once per second, while 24 background text nodes changed 2 at a time every 11ms. The conditions were Playwright 1.62.1, headless Chromium 151.0.7922.34, a 390×844 viewport (scale factor 3), and 4x CPU throttling. Measured on an Apple M5 on November 1, 2026 (KST).

The numbers and the background text use the seed `0x20261101`, generated from independent random sequences. Every build processes the same 10 numbers in the same order, and the locale was fixed to `en-US`. The digit-count-change experiment starts at 9 digits, drops to 7 on the first update, and then alternates between 9 and 7.

The background text also changes in the same order. The actual times and counts at which the timers run can vary with browser scheduling, though, so they were recorded with the results. In this measurement it was about 181 per second. The build order rotated through A/B/C, B/C/A, and C/A/B, measuring each build 3 times.

A `performance.mark()` was recorded right before each update, and the task containing that mark was picked as the update task. Within it, the `UpdateLayoutTree` and `Layout` events nested inside `FunctionCall` were counted separately, and the first animated update was included in the averages. The `FunctionCall` time in the tables includes the time of the style and layout calculations beneath it. It is not the time spent running JavaScript alone. And since the page has no React or Next.js, its execution times are hard to compare directly with the issue's page.

<BarCompare title="Average length of one update task (4x CPU throttling, mean of 3 runs)" unit="ms" before="v0.2.0" after="v0.2.1" rows="Same digit count|14.6|8.7;Digit count changes|15.3|11.0" />

| 9 digits to 9 digits, mean of 3 runs per build        |         `v0.2.0` |           PR #18 |         `v0.2.1` |
| ----------------------------------------------------- | ---------------: | ---------------: | ---------------: |
| Average update task                                   |           14.6ms |           12.7ms |            8.7ms |
| `UpdateLayoutTree` / `Layout` inside JS per update    |      15.2 / 13.3 |        4.0 / 3.0 |        2.2 / 2.2 |
| Forced style recalculation and layout time per update |            8.0ms |            6.0ms |            2.4ms |
| Whole-page style recalculation and layout             |         28.6ms/s |         26.7ms/s |         26.9ms/s |
| Total `FunctionCall` time (children included)         |         15.2ms/s |         13.3ms/s |          9.3ms/s |
| Average update task per run (ms)                      | 14.5, 14.6, 14.7 | 13.3, 12.5, 12.3 |    8.7, 8.5, 8.8 |
| Whole-page style and layout per run (ms/s)            | 28.2, 28.4, 29.1 | 28.4, 25.4, 26.3 | 27.1, 26.3, 27.3 |

| Alternating 9 and 7 digits, mean of 3 runs per build  |         `v0.2.0` |           PR #18 |         `v0.2.1` |
| ----------------------------------------------------- | ---------------: | ---------------: | ---------------: |
| Average update task                                   |           15.3ms |           13.4ms |           11.0ms |
| `UpdateLayoutTree` / `Layout` inside JS per update    |      17.4 / 15.5 |        5.0 / 4.0 |        3.6 / 3.6 |
| Forced style recalculation and layout time per update |            8.3ms |            6.6ms |            4.1ms |
| Whole-page style recalculation and layout             |         31.2ms/s |         30.3ms/s |         31.9ms/s |
| Total `FunctionCall` time (children included)         |         15.8ms/s |         14.0ms/s |         11.6ms/s |
| Average update task per run (ms)                      | 15.7, 15.2, 15.0 | 13.3, 13.5, 13.5 | 10.9, 10.8, 11.3 |
| Whole-page style and layout per run (ms/s)            | 31.8, 32.3, 29.6 | 30.7, 32.6, 27.7 | 31.0, 32.0, 32.6 |

With the same digit count, the average update task fell from 14.6ms to 8.7ms. But the total style and layout time, including the work outside JavaScript, fell only slightly, from 28.6ms/s to 26.9ms/s. When the digit count changed, the task shortened from 15.3ms to 11.0ms, while the total style and layout time rose a little, from 31.2ms/s to 31.9ms/s.

There is run-to-run variance and each build was measured only 3 times, so these small differences alone cannot show that overall performance got better or worse. What was confirmed is that the repeated calculation inside the update call and the task length decreased. Some of the work may have shifted to the later rendering steps, though, so this result should not be read as the page's total rendering cost falling by the same proportion.

The counts of elements whose style was recalculated also differed. In the first same-digit-count run, `v0.2.0` repeated a 10 for every digit. PR #18 showed `0 / 107 / 109 / 73`, and `v0.2.1` showed `0 / 107 / 109` or `0 / 107`. In `v0.2.1`, style was recalculated 2 or 3 times per update, 2.2 on average. That differs from the 1 the test model counted.

A `Layout` still occurred after the style update recorded with an element count of 0. Even when styles are unchanged, a change in the background text can require layout to be recalculated. This matches the situation where the first read in `willUpdate()` demands that calculation. The other one is the read of the final coordinates FLIP needs after the DOM changed.

Even with the same digit count, if `flush()` encounters an animation channel for the first time, it reads more values after the commit. So excluding the first update does not always leave exactly 2. When characters are added or digits drop, the phases that measure starting or pinned positions are needed too. In the digit-count-change experiment, both style recalculation and layout averaged 3.6.

The two experiments measured 180 update tasks in total. The string was checked once per run, 1.5 seconds after each 10-second run ended. The final string was reconstructed from the DOM using `--current` and `inert` and compared with the `Intl.NumberFormat` result, and all 18 matched. This check only verifies the value after the run has ended. It does not verify intermediate updates, the pixels on screen, or overlaps during the animation.

On this reproduction page, no build had a task over 50ms, including the one before the change. So this should be kept separate from the result of reducing long tasks in the original service.

## Less repeated calculation while a value changes

For updates that keep the digit count, the measurements needed after the DOM changes could be gathered into a single phase. Extra measurements are still needed when the first read hits a page whose layout has already changed, when a new animation channel is handled, or when the digit count changes. In particular, the FLIP measurement that obtains the final positions after the DOM change remains. Removing even that would require further design changes, such as computing positions ahead of time or delaying the measurement.

0.2.1 is a patch release that keeps the public interface, but some behavior changed too. Invisible elements skip the pre-measurement, and `animationsfinish` waits only for animations the engine started. It does not wait for user CSS animations, and it keeps waiting for the in-flight animations of characters removed from the DOM. Anyone running other work after receiving this event should check the effect. The final-string check alone cannot establish that every aspect of the animation behaves as before.

The verification recorded in PR #19 shows 61 unit tests passing along with the Chromium and WebKit selftests and 8 SSR e2e tests. Selftests, 44 each, also ran on WebKit 16.4 (rAF), 17.4 and 18.2 (native), and Chromium 100 and 114 (rAF). Firefox's Playwright binary would not run, and Chromium 66 and 80 could not be checked without Rosetta. The additional measurement here also ran only on a single headless Chromium. There are still no measurements of 0.2.1 on the company service, nor performance numbers from real low-end devices or other browsers.

Part 2 reduced the cost while an animation played; this time it was the time spent at the moment a value changes. Following the coordinate reads that took long in the profiler led to the order of the DOM writes that preceded them. Together with the native engine's advance measurement and animation tracking, that went into 0.2.1. The changed code is in the [0.2.1 tag](https://github.com/yceffort/number-flow/tree/v0.2.1), and the measurement conditions of the original service are left in [issue #17](https://github.com/yceffort/number-flow/issues/17) and [PR #18](https://github.com/yceffort/number-flow/pull/18).
