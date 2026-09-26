---
title: 'Tracing Toss Securities JavaScript Without Source Maps'
tags:
  - debugging
  - web-performance
published: true
date: 2026-09-26 18:00:00
description: 'Chuseok side quest, part 3: with love, to Toss Securities'
series: 'Building coldpath'
seriesOrder: 3
art:
  undraw: file-search
  layout: bands
  hue: cyan
  tone: light
  hero: '70.3%'
---

## Table of Contents

## 70.3% Was Unobserved on First Entry

When I opened [Toss Securities](https://www.tossinvest.com/)'s first screen, the browser received 61 JavaScript files totaling 9,139.4KB. Of this, V8 recorded execution for 2,715.3KB, and the remaining 70.3% was never executed on first entry. The largest file, the `pages/_app` chunk, was 3,474.2KB, and within it, 2,168.6KB went unexecuted.

Among the unexecuted code was a rich text editor (tiptap and ProseMirror) that has no obvious place on a securities app's first screen. Following the references between modules, I traced a path from the home page through the layout, the sidebar, and an order form, to a one-line hook that reads a panel's tab context. The module containing that hook statically imported a comment component, and the comment component statically imported the editor. This post is the process of tracing that path without source maps.

This post uses Toss Securities as the analysis target for [coldpath](https://www.npmjs.com/package/@yceffort/coldpath). **It aims to check what a tool can observe and how far it can trace on a real, source-map-free service.** It is not meant to judge Toss Securities' implementation as wrong or under-optimized. That is not a call I can make from a handful of logged-out visits, without knowing the internal requirements and design background.

[coldpath](https://github.com/yceffort/coldpath) is an analyzer that links the JavaScript a browser received to V8's execution record, and shows how much unexecuted code sits in which module. When analyzing an external site, I run the `snapshot`, `modules`, `analyze`, and `label` commands in order. The conclusion that leads to the editor mixes together what the commands told me directly, what I separately verified on top of the commands' output, and my own inference. To keep these three apart, this post is split into sections that follow the command order.

| Section                                 | Basis                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Sections on commands other than `label` | Output of coldpath commands                                                                       |
| `label`                                 | Model estimate. The command only checks that the evidence string exists                           |
| What I checked outside the commands     | Cross-checked the commands' output (JSON, graph, saved code, and V8 record) with separate scripts |
| Inference and improvement hypotheses    | My interpretation based on the results above. Not verified against the original build             |

> Collection: September 26, 2026, logged out, Chromium via Playwright 1.63.0, viewport 1280×900. I recorded 4 visits (first entry, search, stock screen, feed), each in a fresh browser. All results are based on the build received that day; later deployments may change module IDs and structure, so the same results may not reproduce.
>
> Analysis: npm's [`@yceffort/coldpath@0.3.1`](https://www.npmjs.com/package/@yceffort/coldpath/v/0.3.1), the version that includes the module-recovery fix covered in this post ([commit `7dca3ee`](https://github.com/yceffort/coldpath/commit/7dca3ee454c1f2630036ec35f041fbd92363b41e)). All sizes are counted from the generated code in UTF-8. 1KB was calculated as 1,000B, and the byte-level values are recorded in the measurement summary JSON. These values are not compressed transfer size or CPU time.
>
> Sources: [reproduction steps](/demos/coldpath/toss-reproduction-2026-09-26.md), [measurement summary JSON](/demos/coldpath/toss-summary-2026-09-26.json)

> What the numbers in this post do not tell you: unobserved means not executed across the 4 logged-out visits; I did not record what a logged-in user does. `Unmeasured: 0` is also a value within the 107 saved files. Module names are either the model's estimate or names I attached after reading the generated code, and the improvement effects further below are not values confirmed by fixing the original and rebuilding it.

## snapshot: The Code the Browser Received and the Execution Record

An external site has no local build to compare against. `snapshot` turns on V8's precise coverage in Chromium, opens the page, and saves the body of each external script that appears in the execution record, exactly as is. Everything downstream only takes this saved copy as input.

Besides first entry, I recorded 3 more actions. For search, I typed Samsung Electronics into the top search box and waited until stock code `005930` appeared in the results. For the stock screen, I clicked that same search result and waited 3 seconds. For the feed, I navigated to the feed link at the top and waited until the post list appeared. The action scripts are in the [reproduction steps](/demos/coldpath/toss-reproduction-2026-09-26.md).

**What this command told me is the files received on each visit and how they were loaded.** First entry had 61, search had 62, the stock screen had 106, and the feed had 62, for a union of 107. `loading.json` classifies how each file was requested. The 61 files from first entry broke down as follows.

| Loading category | Classification criteria                                             | File count | Generated code size |
| ---------------- | ------------------------------------------------------------------- | ---------: | ------------------: |
| `html`           | The requested document's HTML has a `<script src>` or `<link href>` |         27 |           7,229.7KB |
| `inline`         | No tag, but the file name appears inside the HTML                   |          1 |             353.6KB |
| `dynamic`        | Neither. Requested by another script at runtime                     |         33 |           1,556.0KB |

The 33 `dynamic` files included chunks from other pages, such as `pages/screener`, `pages/feed/[[...menu]]`, `pages/calendar`, `pages/stocks/[symbol-or-stock-code]/order`, and `pages/signin`, along with their dependency chunks. The requester was always `script`, and requests started roughly 0.8 to 1.7 seconds after the first request. The single `inline` file was `gtm.js`. This classification only tells you how a file was requested, not whether it was needed for first render.

During collection, `snapshot` sometimes refused to collect. `www.googletagmanager.com/gtm.js` came down alternating between two 353.6KB builds on each visit. The two builds differed only in two inserted spots, `c=Of(10);` and `e=Of(10);`. `snapshot` fails when a script at the same URL differs from the copy it already saved, because merging execution ranges from different code into one file would throw off the positions. I retried until the same build showed up, and the search visit was saved on the 12th attempt. Toss Securities' own scripts were the same build across all four visits.

## modules: Recovering Module Boundaries and the Sentry Code

The execution record alone doesn't tell you what's inside a 3,474.2KB file. `modules` parses webpack's module registration structure and builds a synthetic source map that splits each module function into a virtual source such as `webpack://inferred/webpackChunk_N_E/73681.js`. Module IDs are exactly the numbers found in the generated code.

```text
Recovered 6183 modules in 102 chunks, 5 whole-chunk sources
```

**What this command told me is the module boundaries for 102 of the 107 files.** The 5 files left as a single whole-file source were `_buildManifest`, `_ssgManifest`, the webpack runtime, the TradingView chart library's runtime, and `gtm.js`, all files where it couldn't find a webpack module table.

This result wasn't there from the start. Before the fix, `modules` found modules in only 64 files and left 43 as a single whole file. The `_app` chunk was one of them. Both the chunks where module recovery succeeded and the chunks where it failed had Sentry's debug-id code at the top, and the difference was in how that code connected to webpack's chunk registration code. The successful chunks ended the statement with a `;`, while the failed chunks joined the two expressions into one statement with a comma.

```text
!function(){try{var e=...;e._sentryDebugIds=e._sentryDebugIds||{},...}catch(e){}}(),
(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[636,1326,2518,5672],{34:(e,t,r)=>{...
```

[`chunkModules` in lib/modules.mjs](https://github.com/yceffort/coldpath/blob/8fbe871936f685f9a24fc670d86a3152bc5b00f0/lib/modules.mjs#L105-L133) only recognized a top-level statement as chunk registration when its expression was directly a `push(...)` call. An expression joined by commas is a `SequenceExpression` (one expression that chains several expressions with the comma operator), so it failed the check. Cross-checking against the first-entry saved copy, all 30 comma-joined chunks failed, and all 27 chunks ending with `;` succeeded.

[Commit `7dca3ee`](https://github.com/yceffort/coldpath/commit/7dca3ee454c1f2630036ec35f041fbd92363b41e) changed this to unwrap comma-joined expressions one by one and check each, and shipped it as 0.3.1. On the same input, the result changed as follows.

| Item                                        | Before the fix (`8fbe871`) | After the fix (`7dca3ee`) |
| ------------------------------------------- | -------------------------: | ------------------------: |
| Files with recovered module boundaries      |                         64 |                       102 |
| Module count including duplicates           |                      2,748 |                     6,183 |
| Files treated as a single whole-file source |                         43 |                         5 |

The byte total stays the same; only the way the bundle gets divided changes. Any webpack build using Sentry's bundler plugin can produce the same shape, and it's also common for a minifier to merge two statements with a comma.

## analyze: Per-Module Execution Volume

`analyze` takes the saved code, the execution record, and the synthetic source map `modules` built, and computes size and execution volume per module. The output combining the 4 visits was as follows.

```text
Generated UTF-8 bytes: 14151337 (107 bundles)
Observed: 4937525 | Unobserved: 9213812 | Unmeasured: 0
Unobserved means not executed during the supplied scenarios, not safe to delete.
```

**This command told me three things.**

First, the execution volume per visit. Each visit's record includes that visit's initial load.

| Record         | Action performed                                      | Measured code |  Observed | Unobserved | Unobserved ratio |
| -------------- | ----------------------------------------------------- | ------------: | --------: | ---------: | ---------------: |
| `initial.json` | Entering the first screen                             |     9,139.4KB | 2,715.3KB |  6,424.1KB |            70.3% |
| `search.json`  | Typing Samsung Electronics and waiting for `005930`   |     9,140.5KB | 2,805.6KB |  6,335.0KB |            69.3% |
| `stock.json`   | Clicking the search result to go to the stock screen  |    14,131.6KB | 4,914.1KB |  9,217.4KB |            65.2% |
| `feed.json`    | Navigating to the feed and waiting for the post list  |     9,159.1KB | 2,787.7KB |  6,371.5KB |            69.6% |
| Union of all   | Any range executed at least once across the 4 records |    14,151.3KB | 4,937.5KB |  9,213.8KB |            65.1% |

Moving to the stock screen increased observed execution by 2,198.8KB, but a good chunk of the 45 newly received files also went unexecuted, so the ratio only dropped by about 5 percentage points. Clicking more buttons improves the ratio, but nothing about the files or how they load has changed. That is why the unobserved ratio itself is hard to treat as a target.

Second, what shape the unexecuted code takes. On first entry, the `_app` chunk had 1,417 modules, and only 14 of them (10.9KB) had a module function that was never executed even once. The remaining 1,403 all had their module function executed. When webpack `require`s a module for the first time, it runs the module function once to define the functions and components it will export; the bodies of those functions are not executed until something calls them. Most of the unexecuted code in `_app` was **not modules that loaded but never ran, but functions inside already-evaluated modules that were never called**.

Third, candidates to investigate. The modules with the largest unobserved amount on first entry were as follows.

| Module  | File               | Loading category |    Size | Unobserved |
| ------- | ------------------ | ---------------- | ------: | ---------: |
| `72627` | `2627-...js`       | `dynamic`        | 533.4KB |    480.4KB |
| `75745` | `8814-...js`       | `html`           | 295.7KB |    264.0KB |
| `96245` | `8814-...js`       | `html`           | 263.7KB |    251.8KB |
| `55707` | `pages/_app-...js` | `html`           | 223.8KB |    177.5KB |
| `59041` | `pages/_app-...js` | `html`           | 200.3KB |    161.3KB |
| `95428` | `4429-...js`       | `dynamic`        | 188.4KB |    130.7KB |
| `61750` | `31f91cad-...js`   | `html`           |  95.2KB |     92.7KB |

`analyze` also produces this result as an HTML report containing a treemap. Below is the report combining the 4 visits.

<iframe src="/demos/coldpath/toss-report-2026-09-26.html" title="Toss Securities analysis report" width="100%" height="720" loading="lazy" frameBorder="0"></iframe>

[Open the Toss Securities analysis report in a new window](/demos/coldpath/toss-report-2026-09-26.html)

To avoid redistributing Toss Securities' code, I built this report without `--details`. You can see per-module size, execution volume, and labels, but there's no feature to expand and view the generated code and execution ranges. Even so, the HTML file is about 11.5MB, so I set it to load only when it gets close to the viewport. A rectangle's area is code size, and its color marks which scenario first observed its execution. The blue regions are code that was not executed in any of the 4 visits. Typing `73681` into the search box finds the module I look at later.

## label: Names the Model Attached

Module ID alone doesn't tell you what `61750` is. `label` sends a portion of the code and a sample of strings from sources with large unobserved amounts to a model, which estimates a name and description. This time I sent 80 sources to `claude-haiku-4-5`, using 224,945 input tokens and 24,051 output tokens. This step sends the code to a model provider. Attaching names doesn't change the execution tally.

**What this command told me is candidate names for modules to investigate.** In the table above, `61750` was named `prosemirror-view`. Besides that, `73681` was estimated as `@tiptap/core`, `42120` as `tiptap`, and `33036` as `prosemirror-model`, and all four modules were in files classified as `html`. Evidence strings like `There is no node type named ...` and `ProseMirror-selectednode` came along with them. Since no text-writing input box is visible on the securities app's first screen, I picked these four modules as the next thing to investigate.

In `analyze`'s per-scenario tally, the execution volume of these four modules did not change by a single byte.

| Module                               |   Size | First entry | Search | Stock screen |  Feed |
| ------------------------------------ | -----: | ----------: | -----: | -----------: | ----: |
| `61750`, estimated prosemirror-view  | 95.2KB |       2.4KB |  2.4KB |        2.4KB | 2.4KB |
| `73681`, estimated @tiptap/core      | 60.2KB |       5.2KB |  5.2KB |        5.2KB | 5.2KB |
| `42120`, estimated tiptap            | 52.3KB |       5.0KB |  5.0KB |        5.0KB | 5.0KB |
| `33036`, estimated prosemirror-model | 45.3KB |       1.3KB |  1.3KB |        1.3KB | 1.3KB |

There were cases where the label may have been wrong. `55707` was named `toss/slash`. The evidence strings `DatePicker.Content` and `TimePicker.FieldBoxInput` do exist in the code, so they passed coldpath's evidence check. But these strings are just component names and don't tell you which package they came from. The same module also had `data-keen-slider-` and dropzone-related strings. For 2 sources, the evidence strings were filtered out or the model answered `unknown`, so the name was dropped and only a summary was kept.

The evidence-string check only guarantees the model didn't make up the string, not that the name is correct. The `≈` before a name in the report means it's an estimate.

To gauge how accurate the labels are, I once labeled and scored the same way on [GitLab's explore page](https://gitlab.com/explore), which has public source maps. I split a record collected on September 25 with `modules`, without using the source maps, and labeled the 50 sources with the largest unobserved amount using `claude-haiku-4-5`. The ground truth was set as the `node_modules/<package>` path found in the source map's original path, and a package name only counted as correct when it matched exactly.

| Item                                                    | Result |
| ------------------------------------------------------- | -----: |
| Distinguishing package code from app code               |  43/46 |
| Package name matched exactly                            |  21/27 |
| Modules not scored because multiple packages were mixed |      4 |
| Modules not scored for name because they were app code  |     19 |

The wrong names included cases that just differ in notation, like `rails-ujs` versus `@rails/ujs`, a case where bootstrap-vue vendored inside `@gitlab/ui` was correctly answered as bootstrap-vue, and a clear miss where Sentry's code was answered as `@vercel/ai`. The sample is small and comes from a single webpack 4 build, so I can't carry this accuracy rate over to Toss Securities. Still, I got a sense that it was usually right when a unique error message or CSS class was the evidence, and hard to trust when only a component name was the evidence. Scoring criteria are in [issue #15](https://github.com/yceffort/coldpath/issues/15), and per-item results are in the [validation summary JSON](/demos/coldpath/gitlab-validation-2026-09-25.json).

For `55707`, separate from the label, I searched the generated code myself. The component names formed a UI component collection spanning date pickers, file uploads, and tabs, such as `DatePicker.Calendar`, `DateRangePicker.Trigger`, `Dropzone.ListItem`, `SegmentedControl.Item`, and `Tabs.TabItem`, and I found no public package name or version string. The code handling the `data-keen-slider-` attribute and the `rubberband` and `dragSpeed` options appears to come from the slider library keen-slider, since the same strings (including `earlyExit`) are present in npm's keen-slider 6.8.6 distribution file. I could not confirm the version.

## modules --graph and --why: The Reference Path

Adding `--graph` to `modules` builds a dependency graph using `n(id)` calls inside recovered module functions as edges. This graph had 5,935 modules and 22,835 edges (22,741 `unknown`, 94 `dynamic`). 143 calls pointing to modules that couldn't be recovered were excluded. In webpack's generated code, a static import and a `require()` become the same call, which is why most edges are `unknown`.

Passing this graph to `analyze --graph` and asking `--why` about `73681` gives you one shortest path starting from an entry module in the graph.

```text
Import path (recovered graph): webpackChunk_N_E/14966.js -> webpackChunk_N_E/79386.js -> webpackChunk_N_E/54017.js -> webpackChunk_N_E/42120.js -> webpackChunk_N_E/73681.js
```

**What this command told me is that a path reaches the editor, and that path passes through the comment module `54017`.** But the starting point, `14966`, is in the `pages/community/lounges/[subjectId]` chunk. In `analyze`'s tally, this chunk was only executed on the feed visit, and it's entirely absent from the first-entry record. `--why` starts from whichever entry module in the graph is closest, so it can't answer "why did this module end up on the first screen." There is currently no feature to pin the starting point to an entry module of the first screen.

## analyze --export and --replay: Handing Over Evidence

Sharing only the report makes it hard for the recipient to re-verify the numbers. The full input is 107 files plus 4 coverage records, tens of MB, and most of it has nothing to do with the editor path.

Adding `--export` and `--export-select` to `analyze` makes an excerpt containing only the chosen files. I chose the 7 chunks on the path covered later. In the coverage, only these chunks' entries are kept, but the original offsets, call counts, and source bodies are preserved. The 202 omitted inputs are recorded in the manifest by role and SHA-256. The compressed evidence bundle is about 4.1MB. However, this bundle contains Toss Securities' chunk bodies and coverage with the source bodies intact, so I did not publish it. The bundle's SHA-256 is recorded in the [measurement summary JSON](/demos/coldpath/toss-summary-2026-09-26.json).

Whoever receives the bundle checks it with `--replay`. `--replay` checks the input hashes in the bundle and recomputes the byte counts and execution ranges for the 7 selected chunks.

```text
Replay verified an excerpt, not a complete reproduction: 7 selected bundles reproduced their counts and spans; 202 omitted inputs and the full-analysis totals were not checked.
```

The exit code here is `4`, kept separate from success (`0`) so an excerpt isn't mistaken for a full reproduction. A grand total like 70.3% does not get reproduced from this bundle.

## What I Checked Outside the Commands

The commands so far told me that the editor is in a first-screen file, that its execution volume stays the same regardless of the visit, and that some path reaches it through the comment module. What the command output alone couldn't tell me was why the editor ended up on the first screen. This section's content came from cross-checking `report.json`, `graph.json`, the saved code, and the V8 record with separate scripts.

### From the Home Entry Module to the Editor

I fixed the starting point at `3084`, the entry module of the home page chunk, and found the shortest path in `graph.json` excluding `dynamic` edges. Then I verified each edge in the generated code.

```text
3084   home page entry
→ 34486  home page component
→ 5099   layout
→ 75745  sidebar
→ 57427  order form picker by order type
→ 70388  order form
→ 96245  263.7KB module with two exports, pF and Hi
→ 54017  comment component
→ 42120  likely tiptap → 73681 likely @tiptap/core
```

Here's what I confirmed in the generated code.

- `5099` renders `V` from `75745` in the sidebar area.

  ```text
  a=(0,r.Y)("div",{className:"_19phvif1",children:(0,r.Y)(f,{children:(0,r.Y)(d.V,{})})},"sidebar")
  ```

- `75745` renders `CG` from `57427` inside a popover whose section name is `Popover__EditOrderPopover`. `57427` picks a form from `70388` based on the order type (`buy`, `sell`, `oco`, `oto`).
- `70388` uses only `Hi` from `96245`. It passes the `tabList` it read to `T.p`, along with the string `주문하기__조건주문`.

  ```text
  n="주문하기__조건주문",...,{tabList:l}=(0,p.Hi)()??{},{targetRef:i}=(0,T.p)(n,{params:{featureTab:t,tabList:l}})
  ```

- In `96245`, `Hi` is a one-line function that reads and returns the context `un`. The other export, `pF`, is a panel component that takes `panelId` and `initialTabState`.

  ```text
  n.d(t,{pF:()=>uf,Hi:()=>ur})
  function ur(){return(0,r.use)(un)}
  ```

- `96245` renders the comment component `L` from `54017` within the same module.
- `54017` calls a hook from `42120` in its comment input component. This component renders with `mode:"create"` and `mode:"edit"`.

In the graph, besides `54017`, there were 2 more modules in the same chunk that import `42120`.

### Not Just Received, But Executed

A reference in the HTML alone doesn't tell you whether a file was merely received via `<link rel="preload">` or actually executed. I checked two things.

First, I found the function entries matching each module function's start position in the saved V8 record and read the call counts. The 6 modules on the path above (`5099`, `75745`, `57427`, `70388`, `96245`, `54017`) plus the 4 editor modules, 10 module functions in total, were each called exactly once on all four visits. V8 attached the module ID as the name for these functions, because a property key like `73681:(e,t,n)=>{...}` in the webpack module table gets inferred as the function name. I did this check with the script `verify-toss-factories-2026-09-26.mjs`, and I included the script in the evidence bundle I did not publish.

Second, I read the last line of the home page chunk.

```text
e.O(0,[8667,6411,1277,3876,1087,3191,1882,6965,5313,5445,4017,7982,7340,5614,8814,532,8809,4664,636,6593,8792],()=>e(e.s=3084))
```

webpack's runtime `e.O` executes entry module `3084` after all the chunks in the list have loaded. The list includes chunk 8667 (`31f91cad-...js`), which holds prosemirror-view, chunk 6411 (`17312c0e-...js`), which holds @tiptap/core, and chunk 3876, which holds tiptap and prosemirror-model.

### Code Reachable Only Through the Editor

Using the 18 modules executed on first entry that no other module imports as starting points, I counted how many modules became unreachable once every edge going into `42120` was cut. That came to 13 modules, 311.7KB, of which 18.4KB (18,407B, 5.9%) was executed on first entry. These are uncompressed sizes, and references that go through runtime modules that couldn't be recovered are absent from the graph, so they're excluded.

### Per-Visit Execution Volume for Modules on the Path

I pulled two more modules on the path from `analyze`'s per-scenario tally.

| Module                      | First entry | Search | Stock screen |   Feed |
| --------------------------- | ----------: | -----: | -----------: | -----: |
| `96245`, panel and comments |      12.0KB | 12.0KB |       36.3KB | 12.0KB |
| `54017`, comment component  |       2.6KB |  2.6KB |       12.2KB | 13.6KB |
| Sum of the 4 editor modules |      13.9KB | 13.9KB |       13.9KB | 13.9KB |

The comment component's execution volume increased on the stock screen and the feed, but the editor stayed the same.

## Inference and Improvement Hypotheses

From here on, this is my interpretation based on the facts above. For each hypothesis, I've noted the evidence, the counterargument, and what I would use to tell them apart if this were my own project.

> The module IDs and paths in this section are based on the build received on September 26, 2026 (`_next/static/LCgFIQwFsag3GrRgpJus7`), and may not match later deployments.

### Modules That Appear in the Hypotheses

Since a module ID alone doesn't tell you what it refers to, I first laid out what I saw in each module's generated code. The names in parentheses are ones I attached myself after looking at these strings.

| Module                          |    Size | Export                                   | What appeared in the generated code                                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ------: | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `5099` (layout)                 |   1.0KB | `M`                                      | Renders three areas with the `sidebar`, `gnb`, `main` keys. Renders `V` from `75745` in the sidebar area                                                                                                                                                                                                                                                   |
| `75745` (sidebar)               | 295.7KB | `V`                                      | `RemoconProvider 안에서 사용해주세요`, `MarketTab`, `AddStockToWatchListButtonComp`, watchlist groups and account-switching UI, section name `Popover__EditOrderPopover`, "알림을 눌러 토스 앱에서 연금저축계좌를 만들 수 있어요." (tap the notification to open a pension savings account in the Toss app)                                                |
| `57427` (order form selector)   |   2.0KB | `Rw`, `CG`, `P$`, `EW`, `w_`             | A `switch` choosing one of `BuyOrderForm`, `SellOrderForm`, `OcoOrderForm`, `OtoOrderForm`                                                                                                                                                                                                                                                                 |
| `70388` (order form)            |  10.7KB | `H8`, `xX`, `_D`, `bU`, `lc`             | "구매 조건 주문" (buy conditional order), "판매 조건 주문" (sell conditional order), "연속주문" (continuous order), "최대한 빠른 가격" (fastest possible price), `주문하기__조건주문`, `OrderFormHeader`                                                                                                                                                   |
| `96245` (quote and order panel) | 263.7KB | `pF`, `Hi`                               | 10 occurrences of `createContext`, 19 occurrences of `tabList`, `QuotesTradingFloatingUiProvider`, `BuyOrderBookKrComp`, `AveragingCalculatorPanel` (cost-averaging calculator), `ProgramTradingPanel`, "현재 시간에는 PIP 주문을 할 수 없어요" (PIP orders are not available at this time), renders comments via the section path `["커뮤니티","게시글"]` |
| `54017` (comments)              |  41.6KB | `K`, `L`                                 | `togglePinComment`, `CancelEditDialog`, "편집중인 내용이 모두 사라지고, 되돌릴 수 없어요" (everything you're editing will be lost and cannot be undone), "하나의 글만 고정할 수 있어요" (only one post can be pinned), "로그인 하고 의견을 남겨보세요" (log in and leave a comment)                                                                        |
| `42120` (estimated tiptap)      |  52.3KB | `U1`, `s`, and others (11 exports total) | `react-renderer`, `closeHistory`, `mention`, "의견을 남겨주세요." (please leave a comment.)                                                                                                                                                                                                                                                                |
| `75808` (account opening)       | 117.8KB | `D`                                      | `AccountOpenContext is not initialized`, `/api/v1/multi-account-open/init`, "비대면 계좌개설이 차단되어 있어 계좌를 만들 수 없어요" (remote account opening is blocked, so an account cannot be created), terms agreement and PIN confirmation steps                                                                                                       |
| `72627` (order page body)       | 533.4KB | `b`, `_`                                 | `/api/v1/stock-detail/ui/wts/{stockCode}`, "차트, 호가, 옵션목록을 한 화면에서 볼 수 있어요" (see the chart, quotes, and options list all on one screen), several order-error dialogs                                                                                                                                                                      |

Size is the byte count of the generated code recovered as a module boundary, and can differ from the first-entry tally by a few bytes, because the tally excludes the module function's header as an unattributed region.

### How the Editor Ended Up on the First Screen

Every edge on the path came from a top-level variable declaration in a module function (in the form `p=n(96245)`). None of the 8 edges are a `require` inside a function or a conditional, so once a module is evaluated, the modules it imports are unconditionally evaluated too. That leaves the question: why were these imports statically connected? I came up with four hypotheses.

**Hypothesis 1. Several source files became a single quote-and-order panel `96245` through module concatenation.** webpack's module concatenation (`concatenateModules`, an optimization that merges several ES modules into one module function) hoists all the imports of the merged files to the top of the module function. `96245` has 10 occurrences of `createContext`, and packs a quote component (`BuyOrderBookKrComp`), an averaging-down calculator (`AveragingCalculatorPanel`), a program-trading panel (`ProgramTradingPanel`), a tab list (`tabList` in 19 places), and community comment rendering into one module. I think it's more likely that a panel, the tab content inside it, and several context-definition files were merged, than that one file was originally written with 10 contexts and this much unrelated functionality. There's a counterargument too: one file could genuinely have been this large, and the generated code alone doesn't reveal the original file boundaries. If this were my project, checking this module's `modules` list (the merged source files) in webpack's `stats.json` would settle it immediately.

**Hypothesis 2. A barrel file (an `index.ts` that re-exports several modules) and the `sideEffects` setting.** The order form `70388` only uses one thing, `Hi`. `Hi` is `function ur(){return(0,r.use)(un)}`, a one-liner that reads the panel's tab context. If `Hi` and the panel component `pF` are exported together from an `index.ts` in the same folder, then even code that only wants the hook ends up importing that `index.ts`. Without `"sideEffects": false` in the package, webpack treats even an unused re-export's module as possibly having side effects and keeps it in the evaluation order. This hypothesis can overlap with hypothesis 1: a barrel file could be the cause, and module concatenation could just be the way that result got merged into one module. Still, the fact that `96245` only exports `pF` and `Hi` leans more toward a single panel folder having been merged than a barrel file gathering several features. Telling them apart would require checking, in the original source, the path that imports `Hi`.

**Hypothesis 3. The layout's sidebar statically imports the order-edit popover.** The layout `5099` renders the sidebar `75745` regardless of login state. The sidebar has UI like watchlists, account switching, and market tabs, plus a popover whose section name is `Popover__EditOrderPopover`, and it imports the order form selector `57427` for that popover. The order form only needs to render once the popover opens, but the import already happened at module-evaluation time. A logged-out visitor has no order to edit, so this import never gets used. That said, this is just where the shortest path I found happens to start; besides `70388`, there are 5 more modules in the same chunk that call `Hi` from `96245`. Changing this one import alone might not remove the panel from the first screen.

**Hypothesis 4. The comment component statically imports the editor.** The comment module `54017` combines list features, such as pinning a comment (`togglePinComment`), an edit-cancel dialog (`CancelEditDialog`), and reply filtering, together with input features. The input component renders with `mode:"create"` and `mode:"edit"`, and there it calls the export `s` from `42120` as a hook, wrapped in `U1`. `42120` also had the placeholder string "의견을 남겨주세요." If the code that displays the comment list and the code that lets you write a comment live in the same module, then just showing the list is enough to evaluate the editor. The observation that the comment module's execution volume grew from 2.6KB to 13.6KB on the feed visit while the editor stayed the same fits this hypothesis.

The four hypotheses are not mutually exclusive. Hypotheses 3 and 4 answer "where was it imported from," and hypotheses 1 and 2 answer "why did the import scope grow wider than necessary."

### Prefetched Pages Also Get Evaluated on the First Visit

While calculating the improvement effect, I found something I didn't expect. Of the 18 entry modules (modules no other module imports) executed on first entry, 12 were in chunks received as `dynamic`, and 10 of those were **entry modules of other pages**, such as `pages/screener`, `pages/calendar`, and `pages/stocks/[symbol-or-stock-code]/order`. They weren't just received; their module functions were executed too.

Toss Securities' `main` chunk had the string Next.js 15.4.6 along with the following code.

```text
...n.href=t,document.head.appendChild(n)})}):[])).then(()=>{(0,i.requestIdleCallback)(()=>this.loadRoute(t,!0).catch(()=>{}))})
```

This looks like code where the Pages Router's link prefetching receives a file via `<link rel="prefetch">`, then actually loads that page with `loadRoute` when the browser is idle. Looking at Next.js 15.4.6's `route-loader.ts`, once prefetching finishes, it [calls `loadRoute(route, true)` inside `requestIdleCallback`](https://github.com/vercel/next.js/blob/v15.4.6/packages/next/src/client/route-loader.ts#L445), and once the page chunk registers, [`onEntrypoint` evaluates the page module with `execute()`](https://github.com/vercel/next.js/blob/v15.4.6/packages/next/src/client/route-loader.ts#L348-L351). This matches the observation that other pages' entry modules were executed in the first-entry record.

This finding forced me to split the effect calculation into two branches. Even if I cut some import to remove code reachable from the initial HTML's entry points, if a prefetched page imports the same code, it still ends up getting fetched and evaluated during idle time. I need to distinguish whether what shrinks is "JS evaluated at the initial entry points" or "JS across the entire first visit."

### Changes I Would Consider If This Were My Project

In the recovered graph, I assumed, for each candidate, that every static import into that module was cut, and counted the first-entry size of the modules that become unreachable. I used two starting points. **From initial HTML entry points** starts from the 6 entry modules of the chunks the initial HTML requested. **From all observed entry points** starts from the 18 entry modules executed on first entry, including prefetched pages. Since this is a value counted by graph reachability, it doesn't tell you when this code is evaluated, before or after screen paint or hydration.

| Candidate                              | Import changed                           | From initial HTML entry points | From all observed entry points |
| -------------------------------------- | ---------------------------------------- | -----------------------------: | -----------------------------: |
| E. Lazy-load the editor                | 3 places that import `42120`             |            311.7KB, 13 modules |            311.7KB, 13 modules |
| H. Split the hook from the context     | 6 places that only use `Hi` from `96245` |         1,197.0KB, 411 modules |                            0KB |
| O. Lazy-load the order form            | 3 places that import `57427`             |         1,245.9KB, 436 modules |                2.0KB, 1 module |
| M. Lazy-load the comment component     | 5 places that import `54017`             |           546.0KB, 170 modules |             51.9KB, 32 modules |
| A. Lazy-load the account-opening modal | 3 places that import `75808`             |            132.2KB, 13 modules |            132.2KB, 13 modules |
| F. Estimated framer-motion module      | 2 places that import `25134`             |               95.0KB, 1 module |               95.0KB, 1 module |
| G. Estimated gsap module               | 2 places that import `63575`             |               86.4KB, 1 module |               86.4KB, 1 module |

This table is an estimate close to an upper bound, computed by graph reachability. It doesn't account for how the bundler would re-split chunks, post-compression size, references through runtime modules that couldn't be recovered, or the request cost of newly created chunks. You'd only know the real effect by fixing the original source and rebuilding.

**E. Lazy-load the editor.** Among the candidates whose value is the same under both criteria (E, A, F, G), this is the largest. The editor is also used on prefetched pages, but since those pages go through the same comment component that statically imports the editor, changing all 3 places removes it under either criterion. One approach: wrap the input component that uses the editor in `54017`, `5172`, and `8351` with `next/dynamic`, and load it when the input box gets focus or the edit button is pressed. The cost is a wait, the first time you write a comment, to receive and evaluate 311.7KB of uncompressed code. Preloading when the mouse hovers over the input box could cut that wait. Since the blast radius is narrow, limited to the input component, and the effect is solid under both criteria, this is the candidate I would try first.

**H. Split the hook from the context.** This breaks the structure where the 6 places that only use `Hi` end up dragging in the entire panel. The change is to separate the context definition and `Hi` from the panel file and move them into a small module that doesn't import the panel. From initial HTML entry points, this removes 411 modules, 1,197.0KB. The editor, comments, the panel, the order form `7367`, and the drag-and-drop module `9334` are all included here. But from all observed entry points, it's 0B, because `72627` on the prefetched order page uses the panel `pF` directly. So what H reduces is not the transfer volume of the first visit, but **the amount of code evaluated at the initial entry points**. Even that effect only materializes if the bundler re-splits these modules out of the home page's chunk, and I can't tell from this data how much this change would move up screen paint or interactivity, so I'm leaving it as a hypothesis.

**O. Lazy-load the order form.** This addresses hypothesis 3. If the order form is loaded only when the sidebar's order-edit popover opens, this removes 1,245.9KB from initial HTML entry points, a bit more than H. From all observed entry points, it's 2.0KB, because the order form is used on the order page, so prefetching ends up bringing it in anyway. Since this is a path a logged-out visitor never uses, I think the risk is small, apart from a slight wait when the popover opens. H and O cut different points on the same path, so doing either alone gives a similar effect under the initial-entry-point criterion.

For the rest, I kept only a summary here and moved the detailed analysis to a [separate document](/demos/coldpath/toss-candidates-2026-09-26.md). For M (comment component), what's left to gain after doing E first is mostly the comment component itself and its dependencies. For A (account-opening modal), the function that opens the modal, `initOpenAccount`, is already an `async function`, so the structure looks easy to switch to `await import()`. For F and G (estimated animation libraries), the code runs when a dialog opens, so I think the risk is large relative to the effect. Link prefetching (P), the reason H and O had no effect under the all-observed-entry-points criterion, is also a candidate for adjustment. Of the 33 prefetched files, 1,556.0KB, on first entry, 1,258.9KB went unexecuted, but deciding which links to prefetch requires knowing the actual navigation rate.

### What I Would Check After Making a Change

Whichever candidate I pick, after making the change I would recollect the same visit records and compare the following.

- Whether the chunk holding the editor or the panel dropped out of the home page chunk's `e.O` list
- How the size of files classified as `html` and the observed execution on first entry changed. I'd look at the amount evaluated at the initial entry points, not the unobserved ratio
- Whether files received as `dynamic` and their evaluated amount increased. H and O might just be moving code to idle time
- The wait the first time a lazily loaded UI opens. I'd open the comment input, the order-edit popover, and the account-opening modal, each in turn

Since the synthetic source map is built after collection, every file is left with `source-map=unverified`.

This kind of tracing was possible partly because Toss Securities was built with webpack, which leaves module functions in the generated code. Rollup-family bundlers flatten modules into a single chunk's scope, so in a source-map-free Vite build, there is no boundary at all for `modules` to split. When I ran 0.3.1's `modules` on the JavaScript from Excalidraw's first screen, saved on September 25, the result was likewise `Recovered 0 modules in 0 chunks, 5 whole-chunk sources`.
