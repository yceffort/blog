---
title: 'When <em>z-index: 1</em> Slows Down Layer Merging in Chrome'
tags:
  - browser
  - web-performance
  - debugging
  - algorithm
  - css
published: true
date: 2026-11-21 22:15:00
updated: 2026-11-22 15:22:41
description: "Giving a sticky tab bar a positive z-index makes Chrome's Layerize slow down in proportion to the number of layers that never merge. Starting from a reproduction page, I add the conditions one at a time and match each one to the layer merging code in Chromium 159."
art:
  undraw: building-blocks
---

Chrome does not turn the whole page into a single image when it draws the screen. It splits the painted output into several composited layers, draws each one into pixels, and stacks them together when it puts a frame on screen. This stacking is called compositing. The compositing directory in the Chromium source has a README that describes the algorithm for splitting painted output into layers, and the description ends with this sentence.[^1]

> In the worst case, this algorithm has an O(n^2) running time, where n is the number of `PaintChunks`.

`PaintChunks` (paint chunks) are the units Chrome uses when it assigns painted output to layers. Splitting into layers lets an opacity animation or a scroll fade or move a layer without repainting, but every layer uses its own memory. So Chrome merges chunks that do not need to move on their own into a layer it has already built whenever it can. It takes the chunks one by one in paint order and looks for a layer to merge into, checking the layers it has already built from the most recent one backward. The worst case is when every chunk ends up checking all the earlier layers, and then the time grows with the square of the number of chunks. This step is what shows up as `Layerize` on the main thread in the DevTools Performance panel.

In February 2025, a feature landed to guard against that worst case: an upper limit on how many layers the search walks back through looking for a merge target. A limit of 16 became the default on February 27, then was reverted on March 3 because its performance impact was unclear.[^2] So with Chrome 159's defaults, there is effectively no limit.

This worst case comes from a more common CSS combination than you might expect. Give a sticky tab bar `z-index: 1`, have the list under it split into many paint chunks, and have a few small composited layers that are painted before the tab bar and never merge with other layers (elements split off by an animation or `will-change`). On a reproduction page with all three conditions, changing the tab bar's `z-index` from `auto` to `1` raises the time of one Layerize from 0.44ms to 2.08ms (with a 4x CPU slowdown). Remove any one condition and the difference almost disappears.

What I measured is the cost of one pass of the full path, where Layerize recomputes the layer structure from scratch. Layerize also has a fast path that reuses the previous result, so how often the full path runs depends on what changes on the page. On the reproduction page I forced it to repeat by toggling a layer every 50ms, and in the last section I measured separately which changes trigger it.

> Source quotes are from the Chromium `159.0.8154.13` tag (commit [`4d790f9e`](https://github.com/chromium/chromium/tree/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56)). Measurements were taken in Chrome Beta 159.0.8154.13 on an Apple M5 running macOS 27.2.1.
>
> The reproduction page and measurement scripts are in [blog-experiments `7efb581` sticky-z-index-layerize](https://github.com/yceffort/blog-experiments/tree/7efb581e8c4dab6da12975d1d79129f552caf18c/sticky-z-index-layerize). The measurement script opens a new tab over CDP, applies a 390x844, DPR 3 mobile viewport and a 4x CPU slowdown, then loads the page. After waiting 4 seconds, it records a trace for 10 seconds with the `devtools.timeline` and `blink` categories and averages only the `Layerize` events on the renderer main thread that contain `PaintArtifactCompositor::Update`. Each condition was measured three times and the median used, with the condition order reversed on the second pass. Only the DPR 1 measurements kept the same viewport size with DPR set to 1. The distance limit was measured in a Chrome with a separate profile launched with the flag. Layer counts and compositing reasons were read from the CDP `LayerTree` domain. The numbers for the common screen demo come from the same script measuring `pattern.html?auto=1` (which changes the stock number every frame right after loading). The number width comparison uses the total time of all `Layerize` events, fast path included, not only the full path.
>
> Rows that cannot be static, and Layout and Paint with fixed-width numbers, were measured with the same script in a separate run (`run-extra.sh`). The baseline came out higher in that run than in the first, so its numbers are compared only within that run.
>
> The demos in this post toggle a layer on every `requestAnimationFrame` for 5 seconds and measure how long it takes until a message posted with the start time over `MessageChannel` is handled. They run on the same main thread as the blog page, so they cannot be compared directly with the measurements above.

## Four conditions on a common screen

Before getting into the code, here is what a screen with this cost looks like. Below is a demo styled like a shopping app home screen. The numbers on the screen and the numbers in the panel at the bottom refer to the same conditions, and you can turn each condition off and on from the panel.

<LiveDemo src="/demos/sticky-z-index-layerize/pattern.html?lang=en" title="A common shopping app home screen. Change the four conditions one at a time in the panel below and measure for 5 seconds each" height={640} />

1. **The tab bar that sticks to the top of the screen has a `z-index` of 1 or more.** Switch ① to `auto` in the panel and scroll, and the product rows cover the tab bar. A positive `z-index` is often added to prevent exactly that. With `auto` or `0`, the cost in this post does not appear.
2. **The rows of the list under the tab bar are `position: relative`.** This is common when a sale badge is placed in the corner of a row with `position: absolute`. The cost appears more easily when every row has a clipped area, such as a truncated product name or a rounded badge.
3. **There are several small pulsing elements above the list.** In a loading skeleton, each bar is composited on its own. The more there are, the higher the cost.
4. **Something on the screen changes often.** A number whose digit count changes, like the remaining stock, or a short animation that starts and ends. Scrolling alone does not cause it, and neither does a number that changes while keeping the same width.

Measured the same way as the rest of this post, the screen gives the following. The stock number was changed every frame.

| Condition                             | One full Layerize pass               |
| ------------------------------------- | ------------------------------------ |
| All four                              | 1.33ms                               |
| ① tab bar `z-index: auto`             | 0.45ms                               |
| ② list rows `position: static`        | 0.34ms                               |
| ③ 8 skeleton bars                     | 0.65ms                               |
| ③ no skeleton                         | 0.35ms                               |
| ④ same-width updates (`tabular-nums`) | does not run (0 times in 10 seconds) |
| ④ no updates                          | does not run (0 times in 10 seconds) |

In short: as described above, when Chrome puts a newly painted chunk into a layer, it checks the layers it has already built one by one, starting from the most recent, looking for one to merge into. If the tab bar is painted before the list, that check ends at the tab bar. Chrome treats a sticky tab bar, which moves as you scroll, as a layer that might overlap anything on screen, and it stops checking when it meets an overlapping layer. Give the tab bar a positive `z-index`, though, and it is pushed to the very end of the paint order. It is drawn on top on screen, but it is painted last, so every chunk of the list has to check all the skeleton bars. And this check runs again every time the screen changes, as in ④.

```text
paint order     first -----------------------------------------------> last
z-index: auto   [skeleton bars x K] → [tab bar] → [row][row][row]...    rows stop checking at the tab bar
z-index: 1      [skeleton bars x K] → [row][row][row]... → [tab bar]    every row checks all K bars
```

To check your own screen, record a few seconds in the DevTools Performance panel and see whether the `Layerize` bars on the main thread get long whenever a change like ④ happens. From here on, I start from a simple reproduction page where nothing happens, add the conditions one at a time, and look at which code in Chromium 159 each condition touches.

## A page where nothing happens

The skeleton of the reproduction page is below. There are K red dots at the top, and under them a sticky tab bar and 200 rows inside a section.

```html
<div class="obst"><i></i><i></i>...</div>
<section id="sec">
  <div class="sticky">tabbar</div>
  <div id="list">
    <div class="row">row 0<b>0</b></div>
    ...
  </div>
</section>
```

```css
.obst {
  position: relative;
}
.obst i {
  width: 8px;
  height: 8px;
  will-change: opacity;
}
.sticky {
  position: sticky;
  top: 0;
  z-index: 1;
}
.row {
  position: relative;
}
.row b {
  position: relative;
  float: right;
}
```

Each red dot becomes its own composited layer because of `will-change: opacity`. On real pages, small elements with composited animations or elements with `will-change` become layers like these. Both the rows and the numbers inside them are `position: relative`, and the tab bar has a positive `z-index` so the rows do not cover it.

I measured with this page in a mobile viewport (390x844, DPR 3) in Chrome Beta 159 with a 4x CPU slowdown. A small element at the top had `will-change: opacity` toggled every 50ms so the layer structure changed every time.

Layerize first looks at the repainted output and asks whether the existing layer structure can be reused. If the number of chunks, each chunk's bounds and opaque area, and the property trees (explained in the next section) are unchanged, it ends on the fast path, which only swaps in the contents of the layers it already has. If any of them changed, it takes the full path (`PaintArtifactCompositor::Update`), which splits the layers again from scratch.[^3] Because of the toggle above, the full path ran 200 times in 10 seconds, and the numbers in this post are the median of three runs of the per-pass average of the full path. The rest of the method is in the quote at the start of the post.

In this first state, even with 32 red dots, one Layerize takes 0.11ms with `z-index: 1` and 0.15ms with `auto`, so there is no difference.

## When chunks split

When Chrome paints, it does not put down pixels directly. It records what to draw where as a list of display items. That list is then grouped into paint chunks, and the grouping is based on the property trees. Before painting, Chrome organizes the page's transforms, clips and effects such as opacity into three trees, one for each kind. An element with a `transform`, for example, creates a node in the transform tree, and all of its descendants are painted under that node. Each display item sits under one node in each of the three trees, and the combination of those three nodes is called its property state. A chunk is a run of consecutive display items painted with the same property state, and a new chunk starts only when the property state changes or a new chunk is forced.[^4]

```cpp
bool PaintChunker::WillCreateNewChunk() const {
  return will_force_new_chunk_ ||
         current_properties_ != chunks_.back().properties;
}
```

The 200 rows in the first state are all painted with the same property state, so under the measurement conditions the chunks did not split per row, and the layer merging step had only a few chunks to handle. Give the number inside each row rounded corners and `overflow: hidden`, and that changes.

```css
.row b {
  overflow: hidden;
  border-radius: 4px;
}
```

Now the inside of the number is painted under a clip node. The property state alternates between painting the row label and painting the inside of the number, so a new chunk starts in every row. Real lists also commonly get a clip in every row from rounded badges or truncated text.

There is one more case where chunks split. Positioned elements, like the rows and the numbers, force a chunk split under a few conditions, and one of them is when merging with the previous chunk would leave too much empty space. The threshold area includes DPR.[^5][^6] At DPR 3, the measurement condition, rows without clips showed no difference, but opening the same page at DPR 1 gave a difference even without clips: 0.63ms for `z-index: 1` and 0.24ms for `auto`. Widening the number to the full row width to remove the empty space made the difference disappear (0.13ms and 0.17ms), so this rule likely had an effect. The layer merging step has a similar area threshold that includes DPR, though, and I did not measure the two separately.

All measurements below were taken at DPR 3 with a clip in every row. A clip alone is not enough to slow things down. With clips but no red dots, one Layerize takes 0.47ms with `z-index: 1` and 0.39ms with `auto`.

## Layers that neither merge nor overlap

The full path of Layerize takes chunks out one by one in paint order and assigns them to composited layers. Each chunk first becomes a `PendingLayer` (a layer candidate that is not final yet), then walks backward from the candidate right before it, looking for somewhere to merge.[^7]

```cpp
    wtf_size_t candidate_index = pending_layers_.size() - 1;
    while (candidate_index > first_layer_in_current_group &&
           pending_layers_.size() - candidate_index <=
               layer_merge_distance_limit_) {
      --candidate_index;
      PendingLayer& candidate_layer = pending_layers_[candidate_index];
      auto merge_result = candidate_layer.Merge(
          new_layer, compositor_.lcd_text_preference_,
          compositor_.device_pixel_ratio_, is_composited_scroll);
      if (merge_result.merged) {
        if (composited_transform &&
            composited_transform->RequiresCompositingForStickyPositionOnly() &&
            candidate_layer.GetPropertyTreeState()
                    .Transform()
                    .NearestDirectlyCompositedAncestor() !=
                composited_transform) {
          merged_sticky_transforms_.push_back(composited_transform);
        }
        pending_layers_.pop_back();
        if (merge_result.scroll_range_dependent) {
          compositor_.AddRangeDependentScroll(
              candidate_layer.GetPropertyTreeState());
        }
        break;
      }
      if (new_layer.MightOverlap(candidate_layer)) {
        new_layer.SetCompositingTypeToOverlap();
        break;
      }
    }
```

Three things can happen while walking backward. If it merges into the layer being checked (`merged`), the new candidate disappears and the search ends. If it does not merge but might overlap that layer on screen (`MightOverlap`), the new candidate is kept as a separate layer and the search ends. The new chunk was painted after that layer, so on screen it has to be drawn above it. If the search went on to an even earlier layer and merged there, the chunk would be drawn beneath the overlapping layer and the order would flip, so the search stops when it meets an overlapping layer. If neither, it moves on to the layer built before that. The search distance is limited by `layer_merge_distance_limit_`, but its default is `0x10000000`, so in practice there is no limit.[^8]

```cpp
BASE_FEATURE(kLimitLayerMergeDistance, base::FEATURE_ENABLED_BY_DEFAULT);
BASE_FEATURE_PARAM(size_t,
                   kLayerMergeDistanceLimit,
                   &kLimitLayerMergeDistance,
                   "limit",
                   0x10000000);
```

The red dots create the third case. Each dot has its own node in the effect tree because of `will-change: opacity`, and two layers can merge only if their effect nodes are the same.[^9]

```cpp
  if (&GetPropertyTreeState().Effect() != &guest_state.Effect()) {
    return std::nullopt;
  }
```

The dots are at the top of the screen, so they do not overlap the list's chunks either. Every chunk of the list therefore passes all K dots before it finally merges into the page layer, the first layer that was built. To test overlap, the two layers' rectangles have to be mapped into the same coordinate space, so each comparison walks up the property trees to the common ancestor of the two nodes. A code comment describes the worst-case complexity of this step as the product of the number of chunks, the number of trials per chunk and the depth of the property trees.[^10]

```cpp
  // The worst case time complexity of the algorithm is O(pqd), where
  // p = the number of paint chunks.
  // q = average number of trials to find a squash layer or rejected
  //     for overlapping.
  // d = (sum of) the depth of property trees.
```

The red dots increase q, the number of trials. What this post measured is time, though, not the number of comparisons. With 200 rows fixed and the number of dots increased, the results are:

<BarCompare title="One Layerize by number of layers that never merge" unit="ms" before="z-index: auto" after="z-index: 1" rows="0 dots|0.39|0.47;16 dots|0.41|1.19;32 dots|0.44|2.08;48 dots|0.44|3.02" />

With `z-index: 1`, the time grows by about 0.85ms for every 16 more dots. Conversely, with 32 dots fixed and the row count set to 50, 100, 150 and 200, `z-index: 1` grows almost steadily at 0.62, 1.07, 1.51 and 2.08ms, while `auto` stays at 0.17, 0.32, 0.28 and 0.44ms. Time growing with both the dot count and the row count matches the source's description that each chunk is compared against as many layers as there are dots. This says the measured times fit the model inferred from the source; it does not mean I counted the comparisons.

With `auto`, the time barely changes even at 48 dots. The same chunks should pass the same dots, so why does `auto` not pay this cost?

<LiveDemo src="/demos/sticky-z-index-layerize/index.html?z=1&k=32&n=200&m=0&lang=en" title="The same 200 rows and 32 dots as in the text. Change the dot count and the tab bar z-index and measure for 5 seconds each" height={580} />

The rows and the tab bar in the demo have the same size and structure as the reproduction page. Pressing "Measure 5s" toggles a layer every frame and measures how long it takes until a message posted from `requestAnimationFrame` is handled as the next task. It is an approximate elapsed time that includes rendering, so waiting for other work can be mixed in, and because the demo shares the main thread with the blog page, it is not the same value as the Layerize numbers in the text. Measured in a standalone tab under the conditions in this post, the demo values moved in the same order as the Layerize times from traces. If the difference looks small, raise the dot count to 128 or open the demo in a new tab. As shown in the previous section, on DPR 1 screens or wide DPR 2 screens the difference remains even with the clip turned off. All measurements were taken in Chrome, so the demo assumes a Chromium-based browser.

## Why sticky gets an infinite overlap area

The difference comes from the tab bar. Overlap testing checks whether two layers might overlap on screen, and a sticky element moves as you scroll. In that case Chromium treats the sticky element's area as infinite.[^11]

```cpp
  if (for_compositing_overlap == ForCompositingOverlap::kYes &&
      (extra_result.has_animation ||
       extra_result.has_sticky_or_anchor_position)) {
    // Assume during the animation, the sticky translation or the anchor
    // position scroll translation can map |rect_to_map| to anywhere during
    // animation or composited scroll. Ancestor clips will still apply.
    // TODO(crbug.com/1026653): Use animation bounds instead of infinite rect.
    // TODO(crbug.com/1117658): Use sticky bounds instead of infinite rect.
    rect_to_map = InfiniteLooseFloatClipRect();
```

A tab bar with `z-index: auto` is painted after the red dots and before the rows of the list. That is because CSS paints these elements in document order, and the next section covers the exact rules. The first chunk painted after the tab bar meets the tab bar as soon as it starts walking backward. It does not merge with the tab bar, but because the tab bar's area is infinite the two overlap, so the first chunk is kept as a separate layer and the search ends right away. From the next chunk on, the candidate right before it is the layer that was just kept, so it merges on the first comparison.

The layer list shows the difference too. With `auto`, a row layer whose compositing reason is "Overlaps other composited content" appears right after the tab bar layer in the layer list. With `z-index: 1`, nothing comes after the tab bar, and all the rows go back and merge into the page layer, the first layer that was built. There are 41 layers with `auto` and 40 with `z-index: 1`. `auto` spends one more layer so that every chunk's search ends after one step, while `z-index: 1` saves that layer and makes every chunk pass all K dots again.

## How a positive z-index changes paint order

Where the tab bar is painted is decided by the CSS paint order. Within one stacking context, normal-flow blocks and inlines are painted first, then positioned elements with a `z-index` of `auto` or `0` in document order, then elements with a positive `z-index` in order of value.[^12] The `.obst` that holds the red dots, the tab bar, and the rows and numbers are all positioned elements, so a tab bar with `z-index: auto` is painted between the dots and the rows, following document order.

Once its `z-index` is positive, the tab bar moves to the last step and is painted after all the rows. The positive `z-index` added to keep the rows from covering the tab bar ends up moving the tab bar from its place between the rows' chunks and the red dots to the very end of the paint order. Whether the value is 1 or 201, it is the same step, so the result is the same (2.05ms for `z-index: 201` with 32 dots). `z-index: 0` stays in the same step as `auto`, so it behaves like `auto` (0.45ms).

With `0` or `auto`, however, rows that come later in document order are painted after the tab bar, so they cover it when it sticks to the top. That is why a positive `z-index` was added in the first place, so as long as the rows are positioned, reverting the `z-index` is not a fix. Making the rows not positioned is covered in the last section.

## Fixes that only went halfway

On real pages, more content follows below the section that holds the tab bar. I added 100 rows outside the section to the reproduction page and reduced the list to 100 rows. In this state, `z-index: 1` takes 2.04ms and `auto` takes 0.40ms. I then tried fixes that commonly come to mind, one at a time.

| Fix                                  | One Layerize |
| ------------------------------------ | ------------ |
| None                                 | 2.04ms       |
| `isolation: isolate` on the section  | 1.24ms       |
| `will-change: transform` on the list | 1.24ms       |
| Both of the above                    | 0.37ms       |
| `contain: paint` on the section      | 2.58ms       |

`isolation: isolate` makes the section a stacking context. The tab bar's `z-index: 1` then only matters inside the section, so the tab bar is painted after all the rows inside the section but before the rows outside it. The rows outside the section overlap the tab bar's infinite area again, so their search ends after one step. The rows inside the section are still painted before the tab bar, so the cost only drops by about half.

`will-change: transform` on the list cuts the other half. The list creates a node in the transform tree, and that node becomes a "directly composited" node, one that must have its own layer. All the chunks of the list sit under this node. The first chunk to use such a node cannot merge into any earlier layer, so Layerize makes it a new layer right away without searching.[^13]

```cpp
    // If the new layer is the first using the nearest directly composited
    // ancestor, it can't be merged into any previous layers, so skip the merge
    // and overlap loop below.
    const auto* composited_transform = new_layer.GetPropertyTreeState()
                                           .Transform()
                                           .NearestDirectlyCompositedAncestor();
    if (composited_transform &&
        !composited_transform->RequiresCompositingForFixedPositionOnly() &&
        !composited_transform->RequiresCompositingForStickyPositionOnly() &&
        directly_composited_transforms_.insert(composited_transform)
            .is_new_entry) {
      continue;
    }
```

The first chunk of the list becomes a new layer without searching, and from the next chunk on, the layer right before it has the same transform, so it merges on the first comparison. This time the rows outside the section keep searching, so again the cost only drops by half. Only with both fixes does it reach 0.37ms, close to `auto`.

`contain: paint` creates a stacking context just like isolation, yet it had no effect and was even slower than before. `contain: paint` adds a clip to the section. The infinite sticky area we saw earlier came with the note "Ancestor clips will still apply." The tab bar's area is clipped to the section, so the rows outside the section no longer overlap the tab bar. In the layer list, isolation produces a layer for the rows outside the section after the tab bar, but `contain: paint` does not.

<LiveDemo src="/demos/sticky-z-index-layerize/index.html?z=1&k=32&n=100&m=100&lang=en" title="The same 100 list rows, 100 rows below and 32 dots as in the text. Switch fixes and measure for 5 seconds each" height={580} />

## One line of will-change on the section

The two fixes can be combined into one line. With `will-change: transform` on the section, the section becomes a stacking context and also gets a directly composited transform node. It does what the two fixes did, all at once, and one Layerize drops to 0.41ms, close to `auto`.

It comes at a cost. `will-change` creates, in advance, the stacking context and containing block that the property would create if it had a real value.[^14] `transform` creates a containing block for absolute and fixed descendants, so a bottom sheet or toast with `position: fixed` inside the section would be positioned relative to the section instead of the viewport. One more composited layer holding the whole section is added as well. The fix that puts `will-change` on the list has the same nature, but its effect is limited to the list.

## The browser-side distance limit

The distance limit mentioned at the start of this post cuts exactly this search. Running Chrome with `--enable-features=LimitLayerMergeDistance:limit/16` sets `layer_merge_distance_limit_` to 16. Measuring the reproduction page again in this state, 2.08ms drops to 0.44ms with 32 dots, and 3.02ms drops to 0.43ms with 48 dots. The layer count went from 40 to 41. A chunk that walks back 16 times without finding a place to merge is kept as a separate layer, and the following chunks merge into that layer. The distance limit does what the tab bar did with `z-index: auto`.

The commit that added this feature named the worst case as many candidate layers that neither overlap nor merge. The commit that made 16 the default said that, tested with a limit of 8, it did not seem to affect Speedometer 3 or MotionMark. The revert said the performance impact was unclear and that the original default would stay until the impact and the right value were known.[^2] On the reproduction page, one extra layer was enough to make the cost go away.

## What to check in practice

Put in this post's terms, the four conditions from the common screen at the start look like this. The content is split into many paint chunks, and the composited layers painted before that content neither merge nor overlap with it. When, on top of that, the layer that used to cut the search is pushed to the very end of the paint order, the cost appears.

- A sticky element has a positive `z-index`, and a lot of positioned content is painted before it.
- Several composited layers that each cover only part of the screen are painted before that content. Elements with composited animations, elements with `will-change` and pulsing loading skeletons are common examples, and you can count them in the DevTools Layers panel.
- The content splits into many chunks. Clips inside rows (rounded corners with `overflow: hidden`, truncated text) are the typical case. On the reproduction page, the same cost appeared at DPR 1 even without clips.

And the cost is paid only when the full path of Layerize runs. On the same page (`z-index: 1`, 32 dots, 200 rows), I measured for 10 seconds what triggers the full path.

| Change                                                    | Full path in 10 seconds | Average per pass |
| --------------------------------------------------------- | ----------------------- | ---------------- |
| `will-change` toggle every 50ms (the method in this post) | 200 times               | 2.08ms           |
| A 200ms opacity animation restarted every 500ms           | 40 times                | 2.08ms           |
| The width of a number in an on-screen row, every 50ms     | 200 times               | 2.12ms           |
| Scrolling 1px every frame                                 | 0 times                 |                  |
| No changes                                                | 0 times                 |                  |

The animation ran the full path once when it started and once when it ended. Text updates that changed the width of a number ran it on every change, because the fast path cannot be used once a chunk's bounds change. Scrolling alone did not run it. In the Performance panel, the symptom is a longer `Layerize` on the main thread in every frame with such a change.

I build a service that receives values in real time over WebSockets. On screens like that, this cost gets bigger. Real-time updates do not change the cost of one Layerize, but the number of full passes grows with the update frequency. In the common screen demo, changing the digit count of the stock number every frame made the full path run 600 times in 10 seconds, once every frame. Total Layerize time including the fast path was 789ms per 10 seconds, so 79ms of every second went to Layerize alone (with a 4x CPU slowdown). With the tab bar at `auto`, the same conditions take 208ms. Rendering happens once per frame, so even if messages arrive more often than frames, the count does not exceed the number of frames. The more often values change on a screen, the more this cost piles up frame after frame when the conditions in this post come together.

Not every real-time update runs the full path, though. In the same demo, giving the stock number `font-variant-numeric: tabular-nums` and changing it only to values with the same digit count, the full path did not run once in 10 seconds. If the width of the number stays the same, the chunk bounds do not change, so it ends on the fast path. Total Layerize time dropped 89%, from 789ms to 88ms, with `z-index: 1`, and by more than half, from 208ms to 98ms, with `auto`. With a fixed width only the fast path runs regardless of `z-index`, so the two values end up close. On a real-time screen, it is worth checking whether the width of numbers can be fixed before touching `z-index`.

Fixing the width only cuts Layerize, though. I measured the same demo (`z-index: 1`) again in a separate run and counted Layout and Paint as well. Both the update that changes the digit count and the same-width update ran Layout 600 times and Paint 1,200 times in 10 seconds, and the totals were close: Layout 377ms and 361ms, Paint 373ms and 346ms. The text changed, so laying it out and painting it again stays regardless of width. In the same run, total Layerize went from 1,221ms to 177ms. What a fixed width saves is the cost of recomputing the layer structure from scratch, and that cost is larger the more of this post's conditions a screen has.

The fixes and their costs are below. The numbers are one Layerize measured on the reproduction page.

| Fix                                                       | Reproduction page                                                                                            | Cost                                                                                                                                                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Make rows and the elements inside them `position: static` | 2.08ms → 0.27ms (0.28ms with `z-index: auto`)                                                                | Elements placed inside rows with `position: absolute` or `z-index` need another approach                                                                                                               |
| `isolation: isolate` on the area wrapping the tab bar     | 2.04ms → 1.24ms, only content outside the area recovers                                                      | The `z-index` of elements inside the area only orders them within the area. Their order relative to elements outside follows the area's own order, so a descendant's `z-index` alone cannot reverse it |
| `will-change: transform` on the list                      | 2.04ms → 1.24ms, only the list recovers                                                                      | One more composited layer, and the list becomes the containing block for absolute and fixed descendants                                                                                                |
| Both of the above                                         | 2.04ms → 0.37ms                                                                                              | Both costs at once                                                                                                                                                                                     |
| `will-change: transform` on the area wrapping the tab bar | 2.04ms → 0.41ms                                                                                              | The stacking context and containing block cover the whole area, and the whole area becomes one composited layer                                                                                        |
| Reduce the layers that never merge                        | 2.08ms → 0.47ms (0 dots)                                                                                     | Requires changing animations or design                                                                                                                                                                 |
| Fix the width of updating numbers (`tabular-nums`)        | Total Layerize in the common screen demo 789ms → 88ms per 10 seconds (`z-index: 1`), full path 600 → 0 times | Not enough on its own when the digit count itself changes                                                                                                                                              |
| `contain: paint` on the area wrapping the tab bar         | 2.04ms → 2.58ms                                                                                              | No effect                                                                                                                                                                                              |

Making the rows static means they are painted in the normal-flow step. They are painted before the red dots, so they never pass the dots, and the tab bar is painted after the rows even with `z-index: auto` and stays on top. This removes the need for a positive `z-index` in the first place, so it is worth considering first.

Often, though, the rows cannot be made static. I added three such cases to the reproduction page and measured them the same way. In this run the baseline came out higher than in the earlier measurements, 3.53ms with `z-index: 1` and 0.80ms with `auto`, so the table below compares values only within this run.

| Row setup                                              | `z-index: 1` | `z-index: auto` |
| ------------------------------------------------------ | ------------ | --------------- |
| Baseline (rows and numbers `position: relative`)       | 3.53ms       | 0.80ms          |
| Rows and numbers `position: static`                    | 0.61ms       | not measured    |
| Static rows, number overlapped top right with grid     | 0.56ms       | 0.62ms          |
| Static rows, `transform: translateX(0)` on rows        | 5.26ms       | 0.77ms          |
| Static rows, `opacity: 0.99` on rows                   | 1.42ms       | 0.68ms          |
| Height of 200 rows, only 30 visible rows with absolute | 0.70ms       | 0.30ms          |

The most common case is an element floated in a row corner with `position: absolute`, like a discount badge. For the row to be the badge's reference, it has to be positioned. Here you can make the row `display: grid`, put the row content and the badge in the same grid area (`grid-area: 1 / 1`), and pin the badge to the top right with `justify-self: end` and `align-self: start`, which gives the same placement without position. On the reproduction page this brought the time down to the same level as static rows, at the cost of total Layout rising slightly from 29ms to 47ms per 10 seconds. The overlap order has to come from DOM order, because a grid item with a `z-index` other than `auto` creates a stacking context like a relative element even when it is `position: static`.[^15]

If the rows have a `transform` or an `opacity` below 1, making them static does not help. Lists that swipe rows away or fade each row are examples. The specs paint such elements in the same order as positioned elements with `z-index: 0`.[^16] So the rows are painted in the same step as positioned elements rather than the normal-flow step, and a tab bar with a positive `z-index` is still painted after them. On the reproduction page, the gap between `z-index: 1` and `auto` remained. Rows with a transform were even slower than the baseline, and I did not look into why.

Virtual scrolling libraries place rows with absolute and `top` or `transform`, so the rows cannot be static. On the other hand they only render the visible rows, so the number of chunks that drives the cost is small to begin with. With the height of 200 rows reserved and only 30 visible rows rendered, the gap between `z-index: 1` and `auto` remained but was far smaller than the baseline that renders all 200 rows. If the rows cannot be static, pick from the other fixes in the table.

The fixes that rescue the content outside the area (isolation and `will-change` on the area) rely on the check that treats sticky's area as infinite. Right above that check, though, sits a TODO to use sticky's actual range of movement. If that TODO is implemented, the tab bar's area will shrink to the wrapping area, and, as with `contain: paint`, the search for content outside the area is likely to get long again. Making the rows static or reducing the layers that never merge works regardless of that check. The distance limit from the previous section is not a setting a page can turn on in the user's browser.

The sticky element's `z-index` only moved the layer that used to cut the search to the very end of the paint order. So when Layerize gets long, rather than suspecting `z-index` first, I think the quickest way to the cause is to count, in the Layers panel, how many small composited layers are painted before the content that slowed down.

[^1]: [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/compositing/README.md` L31-L32](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/compositing/README.md?plain=1#L31-L32)

[^2]: [Chromium `3fbdbcc6` Feature LimitLayerMergeDistance](https://chromium.googlesource.com/chromium/src/+/3fbdbcc6108fc85ce394288ad813036233ac9c79), [Chromium `728717ef` Set LimitLayerMergeDistance:limit/16 by default](https://chromium.googlesource.com/chromium/src/+/728717eff66457327d5f632fce8c05fdc7fdd66d), [Chromium `eee22cd2` Revert "Set LimitLayerMergeDistance:limit/16 by default"](https://chromium.googlesource.com/chromium/src/+/eee22cd21ec03b98bff4d1ad8d9b142d2df036e1)

[^3]: [Chromium `4d790f9e` `third_party/blink/renderer/core/frame/local_frame_view.cc` L3585-L3595](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/core/frame/local_frame_view.cc#L3585-L3595), [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.h` L140-L150](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.h#L140-L150), [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc` L669-L685](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc#L669-L685), [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc` L568-L584](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc#L568-L584)

[^4]: [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/paint/paint_chunker.cc` L59-L62](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/paint/paint_chunker.cc#L59-L62)

[^5]: [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/paint/paint_chunker.h` L158-L160](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/paint/paint_chunker.h#L158-L160), [Chromium `4d790f9e` `third_party/blink/renderer/core/paint/paint_layer.cc` L2304-L2305](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/core/paint/paint_layer.cc#L2304-L2305)

[^6]: [Chromium `4d790f9e` `third_party/blink/renderer/core/paint/paint_layer_painter.cc` L272-L283](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/core/paint/paint_layer_painter.cc#L272-L283)

[^7]: [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc` L949-L978](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc#L949-L978)

[^8]: [Chromium `4d790f9e` `third_party/blink/common/features.cc` L957-L962](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/common/features.cc#L957-L962)

[^9]: [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/compositing/pending_layer.cc` L437-L439](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/compositing/pending_layer.cc#L437-L439)

[^10]: [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc` L860-L864](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc#L860-L864)

[^11]: [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/paint/geometry_mapper.cc` L284-L292](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/paint/geometry_mapper.cc#L284-L292)

[^12]: [CSS 2.2 Appendix E. Elaborate description of Stacking Contexts](https://www.w3.org/TR/CSS22/zindex.html)

[^13]: [Chromium `4d790f9e` `third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc` L930-L942](https://github.com/chromium/chromium/blob/4d790f9eb4c8abe65b8aaa3feba664e7c734ba56/third_party/blink/renderer/platform/graphics/compositing/paint_artifact_compositor.cc#L930-L942)

[^14]: [w3c/csswg-drafts `e8a75fa0` `css-will-change-1/Overview.bs` L296-L303](https://github.com/w3c/csswg-drafts/blob/e8a75fa0ddea1a9aae4fe01098f39f92102e7cb0/css-will-change-1/Overview.bs?plain=1#L296-L303)

[^15]: [w3c/csswg-drafts `e8a75fa0` `css-grid-1/Overview.bs` L1232-L1237](https://github.com/w3c/csswg-drafts/blob/e8a75fa0ddea1a9aae4fe01098f39f92102e7cb0/css-grid-1/Overview.bs?plain=1#L1232-L1237)

[^16]: [w3c/csswg-drafts `e8a75fa0` `css-color-4/Overview.bs` L4651-L4655](https://github.com/w3c/csswg-drafts/blob/e8a75fa0ddea1a9aae4fe01098f39f92102e7cb0/css-color-4/Overview.bs?plain=1#L4651-L4655), [w3c/csswg-drafts `e8a75fa0` `css-transforms-1/Overview.bs` L319](https://github.com/w3c/csswg-drafts/blob/e8a75fa0ddea1a9aae4fe01098f39f92102e7cb0/css-transforms-1/Overview.bs?plain=1#L319)
