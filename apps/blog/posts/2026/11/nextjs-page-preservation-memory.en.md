---
title: "Why Did Next.js's <em>Last Three</em> Leave Nine Posts Behind?"
tags:
  - nextjs
  - memory
  - web-performance
  - caching
  - debugging
published: true
date: 2026-11-14 18:29:00
series: 'Page Preservation in Next.js'
seriesOrder: 2
description: 'Next.js is said to preserve the last three pages, yet nine posts remained on this blog. A sequential navigation experiment measures how far preservation reaches, then looks at managing memory by separating work to stop when hidden from state worth keeping.'
art:
  undraw: browser-stats
  layout: glyph
  hue: cyan
  tone: light
  hero: '3 × 3'
---

When I visited 20 posts from 2026 on this blog one after another, the DOM of the final screen still held 3 posts. When I visited 20 posts alternating between 2026, 2025, and 2022, 9 remained. In both cases, only 1 post was actually on screen.

In [the previous post](/2026/09/nextjs-cache-components-activity), I confirmed in the source that Next.js hides the pages you leave with React Activity and keeps up to the last three at each segment level. This time I measured how many screens that rule actually leaves behind after a series of navigations, and how much memory they use. I asked Codex to run sequential navigation experiments on a production build of this blog, recording the paths of the remaining screens along with the JavaScript heap after GC.[^measurement]

The results made me change the unit I judge memory by. The memory the currently open page needs is not the whole picture. The DOM and state preserved in pages I left, and the work those pages started, have to be counted too. Next.js limits how many entries it keeps, but what goes into each entry, and how much, is up to application code.

> Measurements are based on blog commit [`0318847a`](https://github.com/yceffort/blog/tree/0318847a1dc5c023755f32ebc0870747240f3404) from November 12, 2026, and Next.js 16.4.5. The project's `react` dependency is 19.2.8, but the measured App Router build contains React `19.3.0-canary-278794d7-20261002`, which Next.js bundles. I checked the version string in both the bundled package and the browser chunks. Next.js source links are pinned to `v16.4.5`, distinct from 16.3.5, the version analyzed in the previous post.

## Table of Contents

## The Last Three Are Kept Separately for Each Segment

I split the runs into three conditions: going back and forth between the same two posts, opening new posts within the same year, and moving across several years. Each condition ran 3 times in a fresh browser. The two-post condition made 20 navigations after the first entry, for 21 visits in total; the others made 19 navigations, visiting 20 different posts.

| Navigation path             | Posts remaining (hidden) | Median JS heap after GC (min-max) |
| --------------------------- | ------------------------ | --------------------------------- |
| Same two posts, repeated    | 2 (1 hidden)             | 14.52MiB (14.52-14.53MiB)         |
| 20 posts from the same year | 3 (2 hidden)             | 16.68MiB (16.62-16.92MiB)         |
| 20 posts from three years   | 9 (8 hidden)             | 18.34MiB (18.25-18.36MiB)         |

The table shows values taken after waiting an extra 5 seconds following the last visit. 1MiB is 1,048,576 bytes, and the number of remaining posts was identical across all three runs.

Plotting the JS heap after GC against the visit count gives the following. Gray circles are the two-post condition, blue squares the same-year condition, and orange triangles the three-year condition. The visit count on the horizontal axis includes the first entry.

<Chart src="/charts/nextjs-memory/heap.en.json" />

I also plotted the number of posts left in the DOM at the same moments. The count includes both the visible post and the hidden ones, and colors and shapes match the chart above. The two-post condition left 2, the same-year condition 3, and the three-year condition 9.

<Chart src="/charts/nextjs-memory/retained.en.json" />

Both charts show values taken 1.2 seconds after each visit. Lines are medians and shaded areas span the minimum and maximum; they are not statistical confidence intervals.

The heap on the path that left 9 posts was about 1.66MiB larger than on the path that left 3, but that difference cannot be read as the cost of preserving 6 extra screens. The posts visited, their DOM, the code loaded, and the prefetched data all differ.

The difference in screen count follows from the preservation rule covered in Part 1. In 16.4.5 as well, `MAX_BF_CACHE_ENTRIES` in [`bfcache-state-manager.ts`](https://github.com/vercel/next.js/blob/v16.4.5/packages/next/src/client/components/bfcache-state-manager.ts#L9) is 3 when `cacheComponents` is on, and `useRouterBFCache()` keeps the 3 most recently active entries, including the current screen, in React state. [`OuterLayoutRouter`](https://github.com/vercel/next.js/blob/v16.4.5/packages/next/src/client/components/layout-router.tsx#L583-L598) manages this list separately at each segment level, and because the browser version of [`createSegmentKey`](https://github.com/vercel/next.js/blob/v16.4.5/packages/next/src/client/components/router-reducer/create-segment-key.browser.ts#L3-L5) puts the actual parameter value into the key, `year=2026` and `year=2025` are different entries.

This blog's post route is [`app/[year]/[...slug]/page.tsx`](https://github.com/yceffort/blog/blob/0318847a1dc5c023755f32ebc0870747240f3404/apps/blog/src/app/%5Byear%5D/%5B...slug%5D/page.tsx). A single `[...slug]` receives both the month and the post name. After enough back and forth across three years, what remains looks like this.

```text
Preserved list at the year segment
├─ 2025
│  └─ the last 3 slugs in that year
├─ 2026
│  └─ the last 3 slugs in that year
└─ 2022
   └─ the last 3 slugs in that year
```

Within the same year, only the post list underneath changes. Switching years keeps the previous year along with its post list. Because [the Activity wrapping each list entry](https://github.com/vercel/next.js/blob/v16.4.5/packages/next/src/client/components/layout-router.tsx#L743-L758) hides inactive trees, I could find 8 posts in the DOM besides the current one. The paths remaining after each navigation also matched this rule.

So to predict how many screens will be preserved, you have to look at the actual route tree together with the navigation path. Getting 9 on this blog does not mean every Next.js app has a limit of 9. As shown in Part 1, this preservation has nothing to do with the browser's back/forward cache, and every navigation in this experiment was a `router.push()`.

## Screens That Stay and Memory That Builds Up

Visited posts did not pile up indefinitely, though. In an additional experiment, after visiting 20 posts across three years, I opened one more post each from 2021, 2020, and 2019, and the remaining posts dropped from 9 to 7, 5, and 3. This additional path was run once.

On the horizontal axis of the chart below, "Baseline" is the state after visiting the 20th post. After that, one post from each labeled year was opened. The vertical axis is the number of posts left in the DOM, including the visible one.

<Chart src="/charts/nextjs-memory/eviction.en.json" />

At the start, the year list in order of most recent visit was 2025, 2026, 2022. Opening a 2021 post drops the oldest tree, 2022, along with its 3 posts, and adds 1 new post. That is why the count becomes `9 - 3 + 1 = 7`. The 2026 and 2025 trees dropped out next. Each router's list is also React state, so when a parent tree unmounts, the lists and DOM below it disappear with it.

The JS heap after GC, measured in the same sequence, also fell from 18.35MiB to 17.58MiB, 16.13MiB, and 15.26MiB.

<Chart src="/charts/nextjs-memory/eviction-heap.en.json" />

This much is evidence that the preservation list is replaced as expected. It is not evidence that every object related to those screens was released. Even after leaving the DOM, objects can still be referenced by a global cache or an event listener.

That distinction also mattered in a diagnostic run that went back and forth between the same two posts for a long time. In one separate run I made 100 navigations and compared the same post after 20 and after 100 navigations. Both times 2 posts remained, the CDP DOM node count was 18,635, and the event listener count was 725. The heap after GC, however, grew by about 0.73MiB, from 14.52MiB to 15.25MiB after the final wait. A constant screen count alone was not enough to conclude that memory had stabilized too.

Comparing heap snapshots from the two points by object category showed growth in code objects and the browser's internal bookkeeping. But I did not trace retainer paths, and there was no control that repeated the same measurements without navigating. The effects of the mid-run snapshot and of the automation itself are mixed in, so I did not conclude that this growth is an application leak. The CDP node count is also not a count of only the HTML elements attached to the document.

If you see the same symptom in a real app, the next step is to fill the preservation list, then compare before and after repeating the same navigation path. With [DevTools heap snapshots](https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots), you can find the objects that grew using Comparison and follow what keeps referencing them under Retainers. If a global `Map` is holding onto pages pushed out of the list, the cache's eviction policy needs fixing; if a listener that was never removed is holding them, the subscription needs cleaning up. If the references lead into a preserved React tree, you can start by deciding whether that data should stay on that screen at all.

Even without a leak, there may be memory to cut. If a single screen within the count Next.js sets is too large, it keeps using a lot of memory even while preservation is working correctly.

## Work to Stop When Hidden and Restart on Return

The first thing you can change is work that is only needed while the screen is being viewed. Activity runs Effect cleanup when it hides a screen and runs setup again when it shows it. That lets you tear down subscriptions at that moment while keeping the DOM and state. This behavior is stated in [React's Activity documentation](https://react.dev/reference/react/Activity).

The charts in this post can apply this too. Each chart initializes when it comes near the viewport, and Chart.js 4.6.1 does its calculation and drawing in a Web Worker. The active charts in a tab share a single worker created with `new Worker()`. This is not the browser's `SharedWorker`. The implementation was added on November 14, so it is not included in the November 12 heap measurements above.

[Chart.js can take an OffscreenCanvas and draw inside a worker](https://www.chartjs.org/docs/latest/general/performance.html#parallel-rendering-with-web-workers). `chartClient.ts` hands over control of the canvas and sends the chart data and size in a message. Below is the sending part, after the worker has been acquired and errors handled. `lease` is the object returned by `acquireChartWorker()`, and `post()` attaches the chart's `id` to the message.

```ts
const offscreen = canvas.transferControlToOffscreen()
lease.post({type: 'init', canvas: offscreen, input, size}, [offscreen])
```

`input` carries the data, theme, and language; `size` carries the width and height in CSS pixels and the device pixel ratio. The worker's `chart.worker.ts` receives this message, calls `createChart()`, and keeps the chart instance by `id`. Functions that go into the Chart.js configuration are created inside the worker. Size changes and pointer coordinates are sent as separate messages, so tooltips still work.

With a shared worker, you cannot call `terminate()` just because one chart is hidden. `release()` in `chartWorkerPool.ts` removes that chart from the subscriber list and sends a `destroy` message. If other charts remain, the worker handles the message and calls `destroy()` on that instance only. Once the last subscriber is gone, the worker itself is terminated right away. This is the body of `release()`.

```ts
if (!current.subscribers.delete(id)) return

current.worker.postMessage({type: 'destroy', id})
if (current.subscribers.size === 0) {
  current.worker.terminate()
  if (pool === current) pool = undefined
}
```

In the React component, this cleanup is wired to the Effect's cleanup. `mountChart()` in `chartClient.ts`, which `ChartCanvas.tsx` calls, creates an object that manages the canvas, event listeners, ResizeObserver, and worker subscription together. `dispose()` cancels scheduled frames and timers, removes the listeners and observer, then calls `release()`. The component also clears the disposed object from its ref.

```tsx
useEffect(() => {
  if (!host.current) return undefined
  const mounted = mountChart(host.current)
  renderer.current = mounted

  return () => {
    renderer.current = null
    mounted.dispose()
  }
}, [])

useEffect(() => {
  renderer.current?.update({view, dark, locale}, label)
}, [view, dark, locale, label])
```

The first Effect manages the lifetime of external resources, and the second applies changes to the chart conditions and theme to the current renderer. When Activity shows the screen again, the setups of both Effects run again, so the new renderer also receives the preserved conditions. [`transferControlToOffscreen()` cannot be called again on the same canvas](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen#exceptions). So `dispose()` removes the old canvas, and the next `mountChart()` creates a new one. To avoid the canvas restoration problem from Part 1, disposing and recreating the instance have to line up.

I also checked this with real client-side navigation. Navigating from this post, with 1 worker running, to the list brought the count to 0, and going back and showing the charts brought it back to 1. I also confirmed that the document was not reloaded. If workers are unsupported or fail to start, a main-thread renderer starts on a new canvas instead. Only the key parts are excerpted here; the [implementation code](/demos/nextjs-page-preservation-memory/chart-worker/source.txt) with error recovery and message handling, a [source ZIP](/demos/nextjs-page-preservation-memory/chart-worker/source.zip), and [snapshot info](/demos/nextjs-page-preservation-memory/chart-worker/manifest.json) recording each file's SHA-256 are available separately.

I compared the effect of the worker separately, by main-thread task time. Under 4x CPU throttling, main-thread task time dropped by about 18%, but the time until render completion was confirmed stayed almost the same, and the renderer JavaScript grew.[^chart-worker] I did not measure savings that include the worker's own memory, so moving to a worker is not by itself a reason to conclude that memory went down. What this post confirms is that the worker stops when no screen is using charts and starts again on return. [`terminate()`](https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate) stops in-progress work immediately, so the same lifetime policy is hard to apply as-is to save operations that must finish even after leaving the page.

Even with this cleanup, large arrays in React state and the hidden DOM can stay. Effect cleanup is not a feature that wipes out a page's data.

## How Small Can the State to Restore Be?

In the experiment, the document from the two-post condition had 8,195 DOM elements attached, while the document with 3 posts remaining from the same year had 3,730. These are whole-document counts from `document.querySelectorAll('*').length`, and each was identical across three runs. Fewer remaining posts could still mean a larger DOM. Looking at what each screen contains may need to come before reducing the number of screens.

Say you preserve a log list screen. Restoring the search query, the selected item, and the scroll position on return is useful. That does not mean the full server response and every row ever loaded need to stay in state. You can send only the fields actually displayed to the client, limit how much pagination fetches, or decide when to drop old page data. Selection can also be represented with identifiers instead of whole response objects.

For long lists, [virtualization](https://tanstack.com/virtual/latest/docs/introduction), which renders only the rows near the viewport, can shrink the DOM. But if the full data array is still held, its memory remains. Depending on whether the DOM or the data is the bigger problem, you need to reduce the rendered range and the retained data separately. If fields needed only on the server are being passed as props to a Client Component, narrowing them to the values needed before passing them is part of this work too.

Caches outside the page need the same scrutiny. If a module-scoped `Map` keeps accumulating responses from visited pages, it can grow regardless of Next.js's limit of three. Caches the app owns need a cap on entry count or size and a point at which old entries are evicted, and the eviction has to actually happen. An implementation that only records an expiry time and checks it on lookup can keep entries that are never looked up again. And even after an entry is removed from the cache, it will not be reclaimed right away if a preserved component still references the same object.

This experiment did not measure how many MiB these measures would save. But what to work on is concrete: choose the UI state to keep while a screen is hidden, and match how long large, rebuildable data and external resources are retained to that choice. Clearing necessary state indiscriminately also throws away the restoration experience that page preservation was meant to provide.

## Can Configuration Shrink What Is Preserved?

Would a short `cacheLife` make hidden pages go away sooner? [`cacheLife`](https://nextjs.org/docs/app/api-reference/functions/cacheLife) sets how long results stay valid within a `use cache` scope. The `useRouterBFCache()` in 16.4.5 shown earlier does not read that time; it trims the list by the number of recent entries. When data is treated as stale and when a React tree is discarded are separate policies.

Route structure also affects how much is preserved. On this blog, each year got its own independent sub-list. Reducing nesting might change that, but recommending it as a way to save memory would require putting the same content into a different route structure and comparing. The current numbers come from visiting different posts, so they say nothing about the savings from changing routes.

Turning off `cacheComponents` is also a broad choice. In this version the preservation constant becomes 1, but the setting [also controls `use cache` and Partial Prerendering](https://github.com/vercel/next.js/blob/v16.4.5/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.mdx). If you change this setting because of preservation cost, server caching and rendering need to be reviewed as well. The current experiment gave me no grounds to turn it off on this blog.

## What to Check When Applying This to a Service

In admin tools or collaborative services that use page preservation, the screens you return to may hold large tables, documents being edited, and live charts. Just as mixing in several years changed how much was preserved compared to a test that stayed within one year, the screens left behind in a service will vary with the paths between lists, detail pages, and other workspaces. Rather than taking the screen count found on this blog as a service's limit, start by checking what remains along real work flows.

1. Test a path that opens several detail screens from customer A's list, moves to customer B or another workspace, then comes back. Include navigations where route nesting and parameters change. Instead of measuring only a single freshly loaded screen, repeat this path and compare the trend of the heap after GC, the remaining DOM, and the tab's memory usage together. The JS heap does not include the DOM's native memory, images, or GPU resources. [Chrome's memory diagnostics guide](https://developer.chrome.com/docs/devtools/memory-problems) also advises judging by the experience on the devices people actually use.

2. Check that the work cleaned up on hide restarts properly on return. A leftover ref must not cause reinitialization to be skipped, and subscriptions must not be duplicated on each return. Connections shared across screens, and save operations that must finish even after leaving the page, should be managed by the higher scope that owns that work, not by a screen's Effect.

3. Also check that the data on a restored screen is still valid. For values that can change, such as inventory or order status, decide when to fetch them again, and separate cache keys and reset scopes so that data from different accounts and workspaces does not mix. Test that the previous user's screens and data do not reappear after logging out or switching accounts. Separately from cleaning up client state, keep [authorization checks on the server](https://nextjs.org/docs/app/guides/authentication#authorization) for data reads and mutations.

After making changes, check together whether memory keeps growing when the same flow is repeated, whether work on hidden screens stops, and whether input and connections are restored correctly on return. A fixed amount of memory left by preserved screens has to be distinguished from unneeded objects that keep piling up with each repetition. If you still exceed the memory budget of your target devices, you can compare by changing the route structure or preservation settings while keeping the same content and navigation path.

What a service should decide first is, for each screen, the scope of state to restore, the work to pause while hidden, and when to treat data as invalid. With those criteria in place, you can weigh the convenience of page preservation against its cost.

[^measurement]:
    I kept `cacheComponents: true` on a production server started with `next build` and `next start` from a separate checkout. After the first entry, a test-only client component at the root called `useRouter().push(path, {scroll: false})`. I did not use `page.goto()`, which fetches a new document each time, or the browser's back button. Posts were chosen in URL order from published Korean posts of 8,000-50,000 bytes. The same-year condition used the first 20 from 2026, and the multi-year condition used 20 interleaved in the order 2026, 2025, 2022. The two repeated posts were [Complete Guide to Core Coding Agent Concepts](/2026/01/coding-agent-core-concepts) and [How to Efficiently Process Massive JSON Responses](/2026/01/handling-large-json-responses).

    I used Node.js 24.20.0, Playwright 1.64.1, and headless Chromium 156.0.8078.4. The viewport was 1280×900 with a device scale factor of 1, and the language was Korean. No CPU or network throttling was applied, and service workers and HTTP(S) requests outside the local server were blocked. The HTTP cache and ordinary link prefetching were left on. Each main comparison ran 3 times sequentially in a fresh browser process and profile, with the condition order reversed in the second round. There was no scrolling or interaction with in-post widgets.

    After each navigation I checked the URL, the visible title, and font readiness, then waited 1.2 seconds. Through the Chrome DevTools Protocol (CDP), I cleared the console log and requested GC, which reclaims memory from unreachable objects, twice at an 80ms interval. I recorded `usedSize` from [`Runtime.getHeapUsage`](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-getHeapUsage) and [`Memory.getDOMCounters`](https://chromedevtools.github.io/devtools-protocol/tot/Memory/#method-getDOMCounters), and at the end waited another 5 seconds and measured again.

    I attached a path string to each `.page-view` containing an `h1.post-title` and checked visibility with `Element.checkVisibility()`. Only values were returned, and no DOM objects were retained. I also verified that `performance.timeOrigin` stayed the same, that exactly 1 post was visible, and that there were no JavaScript errors or local HTTP errors. Visit paths and raw data are in [JSON](/demos/nextjs-page-preservation-memory/measurements.json), and the numbers are in [CSV](/demos/nextjs-page-preservation-memory/measurements.csv). The 11 runs in total were 9 main comparisons, 1 eviction check, and 1 100-navigation diagnostic that included mid-run heap snapshots. The additional experiments were not counted toward the main comparison's repetitions.

[^chart-worker]:
    I had Codex compare the two approaches on a single bar chart in the [forced layout post](/2026/10/number-flow-forced-layout). As medians of 7 runs per approach, main-thread task time was 223.9ms with main-thread rendering and 184.6ms with worker rendering. The time from just before scrolling until render completion was confirmed was 835.4ms and 840.7ms respectively. These values do not isolate the chart's drawing work, so they cannot be generalized to a whole-page performance improvement. Renderer-related JavaScript grew from 55.1KiB for the previous regular renderer to 63.3KiB including the worker code. These are gzip sizes, excluding shared page code.

    The comparison ran on the November 14, 2026 production build, with headless Chromium 156.0.8078.4, a 390×900 viewport, a device scale factor of 2, and 4x CPU throttling via CDP. Each run started in a fresh browser context, with 7 runs per approach in alternating order. To exclude the effect of a separate animation demo, iframe responses under `/demos/` were replaced with empty HTML. Both approaches used the same `chartEngine.ts`; for the regular rendering condition, `transferControlToOffscreen` was disabled before page scripts ran so that the fallback was used.

    I measured from just before scrolling to the chart, after the page's initial network activity had finished, until right after `[data-chart-state="ready"]` was confirmed. Main-thread task time is the increase in `TaskDuration` from CDP `Performance.getMetrics`. This window also includes scrolling, chunk loading, and the page's other main-thread work, and the render-complete signal may not coincide with pixels actually appearing on screen. The [per-run raw data](/demos/nextjs-page-preservation-memory/chart-worker/benchmark.json), [measurement script](/demos/nextjs-page-preservation-memory/chart-worker/benchmark.mjs.txt), [worker count check during navigation](/demos/nextjs-page-preservation-memory/chart-worker/lifecycle.json), and [worker version chunk sizes](/demos/nextjs-page-preservation-memory/chart-worker/bundles.json) are published alongside. The worker version's 64,870 bytes include 2,493 bytes of renderer code loaded on the main thread plus the worker chunks. They were computed with gzip level 9, together with the 56,411 bytes of the renderer before the worker was added, and 1KiB is 1,024 bytes. `bundles.json` contains only the worker version's values.
