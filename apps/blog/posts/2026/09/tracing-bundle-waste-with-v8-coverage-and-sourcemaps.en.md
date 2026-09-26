---
title: "Tracing When This Blog's JavaScript Actually Runs"
tags:
  - web-performance
  - bundler
  - blogging
  - debugging
  - rust
published: true
date: 2026-09-22 18:00:00
description: 'Chuseok side quest, part 1: starting with my own blog'
series: 'Building coldpath'
seriesOrder: 1
art:
  undraw: data-analysis
  layout: contours
  hue: warm
  tone: light
  hero: '393KB'
---

## Table of Contents

## How Far Can I Reduce 393KB of Unobserved Code

In the [previous post](/2026/09/unused-javascript-cost), I grew JavaScript I never called up to 10MiB. Even without executing a function body, transferring and parsing the source still cost something. This time, instead of a synthetic test file, I wanted to look at this blog's own bundle. Which code isn't needed right now, and where did it come from?

I collected execution records from the production build's first screen. There were 13 JavaScript files with records, totaling 672,025B uncompressed. Of that, 393,540B, about 58.6%, was unobserved.

But once I mapped these numbers back to source files, several different problems turned out to be mixed together. The About page's component had already been downloaded before I ever visited that page. The search library had arrived before I even opened the search box. And even after finishing a search, more than half of the search library was still unobserved.

The About page's code was there because of link prefetching. The search library was there because of a static import in the shared layout. The code left over after searching included index-building and editing APIs that the browser never called. In coverage terms, all of these show up as the same kind of unobserved range, but where to fix them and what information you need to judge them are different.

To tally this distinction automatically, I built a Rust analyzer called [coldpath](https://www.npmjs.com/package/@yceffort/coldpath). Even within the same unobserved range, code needed for the next page transition, code that could be deferred until a search, and an API bundled together with a library already in use each needed a different fix.

When I changed when the search library loads in a comparison copy, the encoded JS body on the first screen dropped by 5,643B, while the JS received by the time of the first search grew by 194B. On the actual blog, I also deferred the diagram zoom library the same way, and comparing builds before and after showed the JS body on the first screen of posts with diagrams dropped by 12,362B. Search latency was affected by the large index response, which made it hard to judge the cost and benefit of the extra chunk request from this condition alone. I had to pick where to make the change based on which code I was trying to reduce, and keep the results measured in bytes delivered separate from the results measured in latency.

I published the analyzer at [yceffort/coldpath](https://github.com/yceffort/coldpath) and shipped it to npm as [`@yceffort/coldpath`](https://www.npmjs.com/package/@yceffort/coldpath/v/0.3.1). It's a tool that compares execution records from the first screen against those from later actions, and lets you see the source files and import paths bundled together. This post covers why I built the tool, what I found on my own blog, and how to run it. The implementation that combines execution ranges with source maps continues in [part 2](/2026/09/building-coldpath-v8-coverage-analyzer).

> Reference point: the home-screen experiment was computed with the early analyzer (then called `bundle-trace`) at [blog commit `7f33d3bc`](https://github.com/yceffort/blog/tree/7f33d3bccd6ebc71d7c26c07a2527ced07846c3b/experiments/bundle-trace), and the September 25 results applied to the real blog were computed with [coldpath commit `24a1a99`](https://github.com/yceffort/coldpath/tree/24a1a995443dc494926e9d841091e32ac7c52860). Install and run commands are based on `@yceffort/coldpath@0.3.1`.

> What the numbers in this post don't tell you: unobserved means the code wasn't executed in the scenarios I observed, not that it's safe to delete. Bytes are the UTF-8 size of the generated code, not transfer size or CPU time. Per-source sizes are estimates allocated via source maps. This is an investigation of execution ranges across a handful of scenarios, not a statistical performance benchmark.

## Why I Built coldpath Myself

I should start with the tools that already exist. [source-map-explorer](https://github.com/danvk/source-map-explorer#code-coverage-heat-map) shows bundle contribution via source maps and overlays Chrome's execution record with `--coverage`. [monocart-coverage-reports](https://github.com/cenfun/monocart-coverage-reports) supports V8 byte statistics and source map conversion. [c8](https://github.com/bcoe/c8#c8-report) can also regenerate reports from saved records. Separating collection from analysis isn't a new feature by itself.

Still, I built my own because I wanted to move this computation into a Rust program that runs without Node. My goal was to understand exactly what positions the existing tools count, and to check, on the same input, where I agreed with them and where I chose to do things differently. Speed comparisons between the tools are not covered in this series.

While building it, I also added a few features I needed for investigating this blog.

- Code with no execution record is counted separately as **unmeasured**, instead of being mixed in with unobserved. As comes up again later, without this distinction, a chunk that's already split off for lazy loading rises to the top of the list of fix candidates.
- The `collect` collector records the SHA-256 of the JS and source map the browser read alongside the coverage data, and rejects a record from a different build during analysis.
- It splits the initial visit and later actions like search and zoom into scenarios, showing which code was first executed by which action. If you also feed in the bundler graph from esbuild, webpack, Rollup/Vite, or Turbopack, it also shows the import path the code came in through and review suggestions such as `split-review`.
- Passing a previous build's report as `--baseline` lets you compare per-source changes, and check in CI whether generated code size or initial-visit unobserved amount has grown past a limit.
- Even an external site with no source map can be analyzed by recovering webpack module boundaries from a saved script. The results of analyzing Toss Securities this way are covered in [part 3](/2026/09/tracing-third-party-javascript-without-sourcemaps).

The result is left as a single HTML report that opens directly in a browser, with no server needed.

## How About Page Code Ended Up on the First Screen

I broke down the 393,540B of unobserved range recorded on the home screen on September 22 by source. When I first looked at the per-source unobserved list, `AboutHero.tsx`, `TableOfContents.tsx`, and `Mermaid.tsx` stood out. The home page has neither the About page's screen nor a post's table of contents. Had they been merged into the shared bundle by mistake?

When I recorded request headers too, I saw RSC (React Server Components) requests with `next-router-prefetch: 1`. There were requests not just to `/about` but to post pages as well. [Next.js's automatic prefetch](https://nextjs.org/docs/app/guides/prefetching) runs in production and prepares the next navigation for links that enter the viewport. It's easy to miss this path if you only look at the home page's component tree on a dev server.

I opened the same build in a fresh browser, but this time blocked only requests carrying that header and recollected. Four JS chunks that had been recorded under the original setup disappeared under this condition.

| First-screen scenario     | JS with records | Uncompressed JS | Unobserved range |
| ------------------------- | --------------: | --------------: | ---------------: |
| Prefetch allowed          |              13 |        672,025B |         393,540B |
| Prefetch requests blocked |               9 |        607,873B |         343,559B |
| Difference                |               4 |         64,152B |          49,981B |

Once prefetch was blocked, the `AboutHero`, table of contents, and Mermaid components moved from unobserved to unmeasured. The code is still in the build; what disappeared was the execution record for that scenario.

I also collected a scenario that actually navigates to the About page. On the home page, only 23B out of the 3,449B attributed to `AboutHero.tsx` was in an observed state, but after navigating to the About page, all 3,449B became observed. If I had removed the component based only on the red range on the home screen, I would have deleted functionality needed for the next screen.

There's also an interesting discrepancy in the table. JS dropped by 64,152B, but the unobserved range only dropped by 49,981B. The unobserved range within the four chunks that disappeared was itself 63,443B. The remaining difference came from shared scripts. In the scenario where prefetch ran, the observed range of shared code was 13,462B wider.

```text
Unobserved amount in the disappeared chunks: 63,443B
  - Shared code additionally observed via prefetch: 13,462B
  = Difference in total unobserved: 49,981B
```

This is a real example where the amount delivered and the total unobserved amount don't move one to one. Performing more actions reduces the unobserved amount even within the same file. So reducing the unobserved ratio itself can't be treated as a performance goal.

I confirmed the cost of 64KB, but I didn't measure how much faster the next navigation became in return, so I didn't go as far as concluding that prefetch should be turned off. What I confirmed here is the **cause** behind code the home page didn't need arriving in the first place.

## The 62% of MiniSearch That Stays Unobserved Even After Searching

MiniSearch was different. Even with prefetch blocked, the same amount arrived on the first screen. Grouping `MiniSearch.ts`, `SearchableMap.ts`, `TreeIterator.ts`, and `fuzzySearch.ts` from the source map as the same package came to 17,080B.

I opened the search box, typed `javascript`, and ran it until 20 results were displayed.

| MiniSearch in the default build |   Total | Observed | Unobserved |
| ------------------------------- | ------: | -------: | ---------: |
| Only entered the home page      | 17,080B |     579B |    16,501B |
| Displayed search results        | 17,080B |   6,425B |    10,655B |

Even after searching, about 62.4% remained unobserved. My expectation that "since I used the feature once, most of the library would run" was also wrong.

This time, instead of stopping at the source-file level, I read the V8 function records for that chunk. The following method names survived even in the minified code. The sizes below are not sizes allocated via source map, but **values counted by cutting each function's V8 range directly out of the generated string**. They don't include other methods called from within them, so they can't be treated as the size of the search feature as a whole.

| Method        | Generated code size | Calls in search scenario |
| ------------- | ------------------: | -----------------------: |
| `loadJS`      |                385B |                        1 |
| `search`      |                380B |                        1 |
| `add`         |                586B |                        0 |
| `remove`      |                731B |                        0 |
| `autoSuggest` |                330B |                        0 |
| `toJSON`      |                448B |                        0 |

This blog builds its index on the server. Server-side code inserts documents with `addAll()` and serializes with `toJSON()`. In the browser, it reads the already-built index with `loadJS()` and calls `search()`. Yet the MiniSearch class that shipped to the client still had methods for adding or removing documents and serializing the index.

If dynamic property access means any method could be called, that's a reason for a bundler to keep it. To tell whether this result was actually caused by that, I needed to check whether the same preservation happens on a minimal input with no dynamic access.

### Where Tree Shaking Stops for Class Methods

I built a small separate app using the same Next.js 16.3.5/Turbopack version as the blog. I didn't include StyleX or any blog code. I had `search()` and `add()` each return only a unique string, and the client button called only `search()`. I checked whether the string from `add()`'s body remained in the generated client JS. Since a source map can also contain the original source of removed code, I excluded `.map` files from the search target. I also bundled the same input shapes separately with esbuild 0.25.12.

| Input shape                                                                   | `add()` body in Turbopack | `add()` body in esbuild |
| ----------------------------------------------------------------------------- | ------------------------- | ----------------------- |
| `search` and `add` each as named exports, only `search` imported              | Removed                   | Removed                 |
| Import the `Search` class and call `new Search().search()`                    | Kept                      | Kept                    |
| Call `new Search()[method]()` with a method name decided by an external value | Kept                      | Kept                    |
| Only `search` imported, separate `Unused` class left unused                   | Removed                   | Removed                 |
| Class declared in the calling file with no import, then `.search()`           | Kept                      | Kept                    |

Even in the direct-call case, the instance was never passed outward and there was no computed property access, yet `add()` still survived. An unused named export and an entire unused class were both removed. **This tool chain removes code at the granularity of exports or classes, but it doesn't remove individual methods of a class that's still in use.**

So I don't think it's reasonable to expect that trimming the app to call only `search()` would drop the editing methods too. Splitting the API into separate exports produced a different result, but whether a library that shares internal state like MiniSearch can be split that way is a separate piece of work. I left the input and output in `results/class-shaking.json` and the reproduction script in `scripts/study-class-shaking.mjs`.

This splits into two directions for fixing it. **Deferring the whole library until a search happens** can be done in the app as it stands now. **Stripping the index-editing API the browser doesn't need out of the library** needs different design and validation. I didn't delete the latter code based on a single search record alone.

## How Much Actually Shrank After Moving a Static Import

I checked the import path through which MiniSearch entered the first screen in the repository code.

```text
LayoutWrapper.tsx
  → SiteSearch.tsx
    → minisearch
```

Source maps don't tell you this graph. The September 22 implementation only had an optional feature for reading an esbuild metafile, so for this path, built with Turbopack, I traced it by reading the code directly. I later added a feature to coldpath that pulls the import graph from Turbopack's analysis output as well.

`SiteSearch` was already fetching the search index on click. But it imported the library statically at the top of the file.

```tsx
import MiniSearch from 'minisearch'

// Runs when the search box opens
const res = await fetch('/api/search-index')
const data = await res.json()
setIndex(MiniSearch.loadJS<SearchDoc>(data.index, miniSearchOptions))
```

Deferring the data and deferring the library were separate. For comparison, I made a copy of the app and built both a default build and a modified build from the same source path. The change was to keep the type import but start the library import together with the index request. Below is the core part, with error handling and such left out.

```tsx
import type MiniSearch from 'minisearch'

const [{default: MiniSearch}, res] = await Promise.all([
  import('minisearch'),
  fetch(locale === 'en' ? '/api/search-index/en' : '/api/search-index'),
])
const data = await res.json()
if (data.index) {
  setIndex(MiniSearch.loadJS<SearchDoc>(data.index, miniSearchOptions))
}
```

There's no reason to wait for `import` to finish before starting `fetch`. Neither request uses the other's result. They can both start at the same time when needed, and just need to both be ready by the time the index is restored.

In the modified build's first screen, MiniSearch was entirely unmeasured. The network record also showed the chunk wasn't received before searching, and a single new JS request appeared at the moment of the search. I also checked that search results came out in the same order.

| JS response body                                         | Default build | Dynamic import build |
| -------------------------------------------------------- | ------------: | -------------------: |
| JS received on home, after decompression                 |      672,025B |             654,518B |
| JS received on home, encoded response body               |      211,332B |             205,689B |
| Extra JS received on first search, after decompression   |            0B |              17,766B |
| Extra JS received on first search, encoded response body |            0B |               5,837B |

The network figures are Resource Timing's `decodedBodySize` and `encodedBodySize`. They're not the total transfer amount including HTTP headers, nor a per-package gzip estimate.

The amount reduced on the first screen was 17,507B uncompressed, 5,643B on an encoded-body basis. This also differs from the 17,080B the source map attributed to MiniSearch. After splitting, the chunk boundaries and generated code change, so a package's attributed size can't be carried over directly as the improvement amount.

For a visitor who also searches, the story changes. Summing all the JS bodies received in the modified build gives 211,526B, 194B more than the default build's 211,332B. The uncompressed JS across the whole build also grew from 7,246,076B to 7,246,335B, an increase of 259B. This change didn't remove code; it **changed when it was delivered**.

As a simple model, if p is the fraction of visitors who search, the difference in JS body for a single new visit is as follows.

```text
Dynamic import build - default build
  = -5,643B + p x 5,837B
```

If nobody searches, you save 5,643B; if everyone searches, it costs 194B more. This is a simple model that leaves out return-visit caching, navigation to other pages, and CPU cost, and I didn't measure the actual value of p either. Even so, it gives a criterion for judgment that the unobserved ratio alone doesn't provide: do you want to shift a cost that used to be sent to every visitor onto the visitors who search?

Search latency was a separate problem. The search index received from a local `next start` was 3,775,467B and had no compression applied. Since this input is much larger than the library chunk, it's hard to say the first search got faster just from the fact that the JS body shrank by 5.6KB.

In a separate measurement with coverage turned off, I applied 4x CPU throttling, 1.6Mbps download, and 150ms latency, and ran both builds alternately 4 times each. The median time from the click event to the search-result DOM being added was 20,019ms for the default build and 20,056.9ms for the modified build. The index response took about 19.2 seconds in both builds. In the [saved per-request record](https://github.com/yceffort/blog/blob/7f33d3bccd6ebc71d7c26c07a2527ced07846c3b/experiments/bundle-trace/results/study-timing.json), the extra JS chunk took about 241 to 247ms from the start of the request to the completion of the response, running in parallel with the index request.

Since the extra chunk request was buried within an index transfer of over 19 seconds, this result doesn't tell me how much waiting the dynamic import added. Judging the cost and benefit would require comparing when library loading and index preparation finish under conditions where the index is compressed or cached.

> The home-screen comparison experiment above was run locally on macOS on September 22, 2026. The comparison app was built with Next.js 16.3.5/Turbopack, and collected with Chromium 153.0.8010.12 and Playwright 1.63.0. The viewport was 1280x900, and each coverage scenario started in a fresh browser. For home, I observed 1 second after `networkidle`; for search, until results were displayed; for the About page, `networkidle` after navigation plus an additional 1 second. Service workers and cross-origin requests were blocked, and only the page target of the Chrome DevTools Protocol (CDP) was collected. These figures came from the comparison copy.

## After Applying It to the Real Blog

On September 25, I changed the blog so [MiniSearch is fetched when the search box opens](https://github.com/yceffort/blog/commit/42e9afa6257dec0b3d9324449158574940175f2b), and also changed so [Panzoom is fetched when the diagram zoom window opens](https://github.com/yceffort/blog/commit/cb27fb0afbf1352e13112680cf1372310f8a362a). Then, on a post with a Mermaid diagram, I recorded the initial visit, displaying search results, and zooming the diagram, each in a fresh browser. For search, I waited until the result DOM appeared; for zoom, until after Panzoom was applied and the zoom button was pressed. If I ended the recording right after the click, the state mid-way through loading a dependency could remain.

Keeping this action as Playwright code lets me collect with the same procedure even after the build changes. Fresh collection needs Playwright, so I install `@yceffort/coldpath@0.3.1` and `playwright@1.63.0` in the project, prepare Chromium, and then use `npx @yceffort/coldpath collect`. I gathered the [build and collection commands and the scenario code](/demos/coldpath/blog-reproduction-2026-09-25.md) into a separate reproduction document.

Execution amounts per source file were as follows. Note that the target page and build differ from the earlier home-screen experiment.

| Source file      | Observed on initial visit | Observed on search | Observed on zoom |
| ---------------- | ------------------------: | -----------------: | ---------------: |
| `SiteSearch.tsx` |                      837B |             4,181B |             837B |
| `MiniSearch.ts`  |                Unmeasured |             4,341B |       Unmeasured |
| `Mermaid.tsx`    |                    2,591B |             2,591B |           4,439B |
| `panzoom.es.js`  |                Unmeasured |         Unmeasured |           3,357B |

MiniSearch and Panzoom were unmeasured on the initial visit and only executed during their own respective actions. The report also flagged `measure-initial` on both files, suggesting I measure the initial visit. Coverage alone can't tell you there was no initial network request, so you have to look at the actual `import()` location and the network requests together.

`SiteSearch.tsx` includes the search button, so 837B executes even on the first screen. In the `Review actions` of the report with the import graph included, a `split-review` appeared alongside the static import path `LayoutWrapper.tsx → SiteSearch.tsx`, suggesting I review splitting out the functionality. Deferring even this file would first require deciding where to split the button implementation from the search box implementation. The 4,341B for `MiniSearch.ts` is also an execution amount attributed to that source file, not a transfer amount. Transfer amount was measured separately from the response bodies of the builds before and after the change.

### Response Bodies Before and After the Change

I built production versions of `27fc9749`, right before the two commits, and `cb27fb0a`, which includes both commits. The only difference between the two revisions is the two files `SiteSearch.tsx` and `Mermaid.tsx`. I summed Resource Timing's `encodedBodySize` the same way as in the earlier home-screen experiment.

| Encoded JS response body                   |   Before |    After | Difference |
| ------------------------------------------ | -------: | -------: | ---------: |
| Home first screen                          | 211,574B | 202,566B |    -9,008B |
| First screen of post with diagram          | 425,101B | 412,739B |   -12,362B |
| Extra JS received when searching in a post |       0B |   5,766B |    +5,766B |
| Extra JS received when zooming in a post   |       0B |   3,642B |    +3,642B |

A visitor who searches receives 418,505B after the change, 6,596B less than before. A visitor who zooms receives 416,381B, 8,720B less. In the copy experiment, a searching visitor received 194B more, but this time the effect of also deferring Panzoom remains. A visitor who both searches and zooms would compute to 422,147B by adding the two chunks, but I didn't measure that combination separately. In decompressed size, the first screen of the post dropped by 35,813B. I left the raw data in the [measurement result JSON](/demos/coldpath/applied-2026-09-26.json) and the [measurement script](/demos/coldpath/measure-applied-2026-09-26.md).

> Measured locally on macOS on September 26, 2026, running both builds with Next.js 16.3.5's `next start`. I used Chromium 153.0.8010.12, Playwright 1.63.0, and a 1280x900 viewport, starting each time in a fresh browser context with no HTTP cache. Service workers and cross-origin requests were blocked, and prefetch was left on. I waited 1 second after `networkidle` for the page, and both `networkidle` and 1 more second after the action. I ran both builds alternately 3 times each, and the byte counts were the same every time. Response compression is the local server's setting, so it may differ from a CDN's compression result.

I also recollected coverage for the same three scenarios on the same two builds. Passing the before-report as `--baseline` when building the after-report lets you see the same change at the source-file level. On the initial visit, `MiniSearch.ts` had only 523B observed before the change, with 13,043B left unobserved, but after the change all 13,590B became unmeasured. `panzoom.es.js` also went from 818B observed on the initial visit before the change to unmeasured. In the search and zoom scenarios, the execution amount of both files was nearly the same (`MiniSearch.ts` at 4,317B versus 4,341B, `panzoom.es.js` at 3,351B versus 3,357B). The generated-code difference of 8,499B at the top of the report is a total across the whole build, so it differs from the response-body figures in the earlier table.

<iframe src="/demos/coldpath/applied-report-2026-09-26.html" title="Blog before/after comparison report" width="100%" height="720" loading="lazy" frameBorder="0"></iframe>

[Open the before/after comparison report in a new window](/demos/coldpath/applied-report-2026-09-26.html)

This report holds the three scenarios of the after-build, and you can see the difference from before in `Change from baseline`. The HTML file is about 5.3MB, so I made it load only when it comes near the viewport, and it was generated without `--details`, so there's no code view.

I left the per-package sizes and per-scenario candidates in the [report saved at the time](/demos/coldpath/post-2026-09-25.md), and the result of recomputing the same records with 0.1.1 and 0.3.1 to check whether the values held, along with the locations of mapping warnings, in the [recalculation document](/demos/coldpath/recalculation-0.1.1-2026-09-25.md).

## Running coldpath on a Saved Execution Record

With Node.js 24 or later, you can run it via `npx` with no install. Analyzers for macOS and Linux, both ARM64 and x64, ship together, so on a supported environment you don't need to build Rust yourself. The Linux binary needs glibc 2.35 or later. Instructions for building it directly on other environments are in the [install documentation](https://github.com/yceffort/coldpath/blob/85187c3093711e0787b485b20903a92d11c14ba2/README.md#install).

First, let's run the analyzer on a saved example. Since the npm package doesn't include example data, I download 4 files pinned to the release commit: JavaScript, a source map, and V8 execution records. All of these are already-collected inputs, so this step needs no Playwright or browser. I wrote out the package name and version exactly in the command, leaving no room for npm to fetch and run a different package.

```bash
mkdir coldpath-demo
cd coldpath-demo
mkdir -p examples/recorded
for file in entry.js entry.js.map initial.coverage.json interaction.coverage.json; do
  curl -fsSL \
    "https://raw.githubusercontent.com/yceffort/coldpath/85187c3093711e0787b485b20903a92d11c14ba2/examples/recorded/$file" \
    -o "examples/recorded/$file"
done

npx @yceffort/coldpath@0.3.1 analyze \
  --dir examples/recorded \
  --coverage examples/recorded/initial.coverage.json \
  --coverage examples/recorded/interaction.coverage.json \
  --initial-scenario initial \
  --json artifacts/recorded.json \
  --treemap artifacts/recorded.html --details
```

The beginning of the output confirmed with `@yceffort/coldpath@0.3.1` looks like this.

```text
Generated UTF-8 bytes: 293 (1 bundles)
Observed: 208 | Unobserved: 85 | Unmeasured: 0
Unobserved means not executed during the supplied scenarios, not safe to delete.

Scenario initial: 177 observed | 116 unobserved | 0 unmeasured
Scenario interaction-delta: 31 observed | 262 unobserved | 0 unmeasured
```

Out of the total 293B, the range that was executed at least once across the two records is 208B, and the range not executed during observation is 85B. `interaction-delta` holds only the range collected after the initial execution. The total execution amount is the length of the union of the ranges from each record, and generally isn't obtained just by simply adding up the per-scenario numbers.

| Output       | What it tells you                                                            |
| ------------ | ---------------------------------------------------------------------------- |
| `Observed`   | Bytes of generated code where execution was observed in the supplied records |
| `Unobserved` | Bytes within a script that has records, where execution was not observed     |
| `Unmeasured` | Bytes not judged because the script has no execution record                  |

Opening `artifacts/recorded.html` in a browser shows a treemap with no separate server needed. The area of each rectangle is the size of the generated code, and the color shows which scenario first observed execution. Selecting a file also shows the code included via `--details` and the per-scenario execution ranges. The JSON is used when reading the same result from another script or comparing it against a previous result.

## What Belongs in Build Analysis and What Belongs in Execution Verification

The build I first investigated on the home screen had about 7.25MB of JavaScript, but the amount recorded on the home page was only about 672KB. The rest could be chunks for other routes or for lazy loading. If you paint everything without coverage as unused, a large library that's already split off to load late rises to the top of the fix priority list.

So I kept three states in the analysis result: **observed execution, unobserved within a record, and unmeasured with no record at all**. `[unmapped]`, where the source is unknown, is a separate axis from this. You can know whether something executed even without knowing its source name, and you can know the source name while still having no execution record.

In a build job you run without execution, you can check per-file and per-package contribution and size changes. To connect it to execution verification, you need to bring up that build and collect scenarios. The aggregation and report regeneration after that are handled by the Rust analyzer. `npx @yceffort/coldpath analyze` runs the platform binary shipped alongside it.

You need to separate unobserved from unmeasured in CI too, because a static analysis with no execution record has an unobserved amount of 0B. If you only check an unobserved budget, a build that measured nothing at all looks the best.

The gzip and Brotli sizes of per-source fragments can also be estimated with `--source-compression`. However, since the compression dictionary is shared with surrounding code, adding up fragments' compressed sizes doesn't give the actual transfer savings, and the report displays the two values separately as well.

Because coldpath showed execution amounts per source, I was able to find three change candidates of different character within the 393KB. The About page code traced back to prefetch requests, MiniSearch to a static import in the shared layout, and the API left over even after searching to the tree-shaking boundary of class methods. Each candidate also needs something different measured next: prefetch needs to be viewed alongside the latency of the next page transition, the dynamic import alongside the request added to the first search, and the leftover class methods alongside the library's API boundary. On the real blog, deferring MiniSearch and Panzoom dropped the JS body on the first screen of the post with the diagram by 12,362B, and visitors who search or zoom also received less than before. The cost and benefit of search latency is left for a future measurement.

[Part 2 looks at the process of computing these numbers with V8 coverage and source maps](/2026/09/building-coldpath-v8-coverage-analyzer). The topic there is how I handled and verified nested execution ranges, character-level offsets, and source attribution.
