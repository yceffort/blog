---
title: 'Why Does the Body of a Static Page Wrapped in <em>Suspense</em> End Up in a Hidden div?'
tags:
  - react
  - debugging
  - nextjs
  - blogging
  - html
published: true
date: 2026-11-09 19:27:00
updated: 2026-11-09 19:39:31
description: 'Since React 19.2, content wrapped in Suspense can be moved into a hidden element even on a static page whose render has already finished. I traced how the post bodies on this blog shipped that way from May to early November, using the React source, version-by-version reproductions, and the HTML left in the Wayback Machine.'
art:
  undraw: files-missing
---

## Table of Contents

## Two commits that wrapped the body

This year two commits that create a Suspense boundary went into this blog. On May 1 I added `loading.tsx` to the post route, and on August 10 I wrapped the whole page in `<Suspense fallback={null}>` in the root layout. The first is code written the way the Next.js docs describe, and the second is code I wrote wrongly, but the result was the same. Even though these were static pages whose render had finished at build time, the body was moved into a `<div>` with the `hidden` attribute.

In a browser a script puts the body back where it belongs, so nothing showed on screen. I only found out in early November, when I happened to see the body missing in an environment that does not run JavaScript.

The first commit, [`a111fed6`](https://github.com/yceffort/blog/commit/a111fed64721d6896a7162a471149fccc28e0e11), is a skeleton to show while a post renders for the first time. It added one `loading.tsx` each to the Korean and English post routes.

```tsx
export default function PostLoading() {
  return (
    <div className="page-view relative" aria-busy="true">
      <div className="post-back" aria-hidden="true">
        <span className="dot" />
        <span style={{visibility: 'hidden'}}>BACK TO INDEX</span>
      </div>
```

The second commit, [`10c5ed9b`](https://github.com/yceffort/blog/commit/10c5ed9b39b88a096f8a65b483d4ceae8c6f6ac3), wrapped the components that use `usePathname()` in the layout with a boundary.

```diff
-          <NavigationDirection />
+          <Suspense fallback={null}>
+            <NavigationDirection />
+          </Suspense>
           <AmbientEffects />
           <Providers>
-            <LayoutWrapper>{children}</LayoutWrapper>
+            <Suspense fallback={null}>
+              <LayoutWrapper>{children}</LayoutWrapper>
+            </Suspense>
           </Providers>
```

Neither commit caused a problem on screen. What changed was the HTML the server sent.

## The HTML the two commits produced

I fetched the HTML of one post (`/2026/03/why-still-nextjs`) at several points in time and counted the characters outside `hidden` elements and the characters inside them separately. The characters outside `hidden` elements are the text a client that does not run JavaScript receives in its original position. No production HTML from after August 10 survives, so I built the commit just before the fix locally and fetched it from there.

| When                 | Where the HTML came from                                                                                      | Characters outside `hidden` elements | Characters inside `hidden` elements |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | -----------------------------------: | ----------------------------------: |
| April 20             | [Wayback Machine](https://web.archive.org/web/20260420004339id_/https://yceffort.kr/2026/03/why-still-nextjs) |                               12,686 |                                   0 |
| May 2                | [Wayback Machine](https://web.archive.org/web/20260502034722id_/https://yceffort.kr/2026/03/why-still-nextjs) |                                  197 |                              12,680 |
| July 10              | [Wayback Machine](https://web.archive.org/web/20260710144307id_/https://yceffort.kr/2026/03/why-still-nextjs) |                                  205 |                              13,111 |
| Commit of November 2 | Local build of `b6b64e47`                                                                                     |                                    0 |                              13,348 |
| November 9           | Production                                                                                                    |                               13,348 |                                   0 |

Snapshots of other posts looked the same. The 2 snapshots from March 5 and April 20 had the body in its original position, and all 11 snapshots (8 posts) between May 2 and August 7 had 197-205 characters outside `hidden` elements. The Wayback Machine has no snapshots between August 11 and November 3.

Abbreviated, the place where the body should be and the end of the document in the May 2 snapshot look like this.

```html
<main id="main">
  <!--$?--><template id="B:1"></template>
  <div class="page-view relative" aria-busy="true"><!-- skeleton --></div>
  <!--/$-->
</main>
<!-- footer and scripts -->
<div hidden id="S:1"><!-- post body --></div>
<script>/* definitions of $RB, $RV, $RC */ $RC("B:1","S:1")</script>
```

In the build of the November 2 commit the boundary sits directly under `<body>` and the fallback is `null`, so the boundary is empty. Even the header and footer went into the `hidden` element.

```html
<body>
  <!-- theme init script -->
  <!--$?--><template id="B:0"></template><!--/$-->
  <script>requestAnimationFrame(function(){$RT=performance.now()});</script>
  <div hidden id="S:0">
    <a href="#main" class="skip-link">본문으로 건너뛰기</a>
    <header>...</header>
    <!-- post body and footer -->
  </div>
  <script>/* definitions of $RB, $RV, $RC */ $RC("B:0","S:0")</script>
</body>
```

The string of each piece is written by Fizz, React's server renderer, and is defined as a constant in [`ReactFizzConfigDOM.js`](https://github.com/react/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-dom-bindings/src/server/ReactFizzConfigDOM.js#L4647-L4655).

```js
// Suspense boundaries are encoded as comments.
const startCompletedSuspenseBoundary = stringToPrecomputedChunk('<!--$-->');
const startPendingSuspenseBoundary1 = stringToPrecomputedChunk(
  '<!--$?--><template id="',
);
const startPendingSuspenseBoundary2 = stringToPrecomputedChunk('"></template>');
const startClientRenderedSuspenseBoundary =
  stringToPrecomputedChunk('<!--$!-->');
const endSuspenseBoundary = stringToPrecomputedChunk('<!--/$-->');
```

```js
const startSegmentHTML = stringToPrecomputedChunk('<div hidden id="');
const startSegmentHTML2 = stringToPrecomputedChunk('">');
const endSegmentHTML = stringToPrecomputedChunk('</div>');
```

`<!--$-->` marks a Suspense boundary whose content was written in its original position. `<!--$?-->` marks a boundary whose content has not arrived yet, and the `<template>` right after it points to the boundary's position. If there is a fallback, it follows. The actual content is in a segment that starts with `<div hidden>`, and `$RC` in the last script connects the boundary and the content.

`$RC` is a minified [`completeBoundary`](https://github.com/react/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-dom-bindings/src/server/fizz-instruction-set/ReactDOMFizzInstructionSetShared.js#L408-L461). It finds the boundary and the content, puts them in the queue `$RB`, and, if the first frame has not been painted yet, schedules the reveal function `$RV` with `requestAnimationFrame`.

```js
  // Mark this Suspense boundary as queued so we know not to client render it
  // at the end of document load.
  const suspenseNodeOuter = suspenseIdNodeOuter.previousSibling;
  suspenseNodeOuter.data = SUSPENSE_QUEUED_START_DATA;
  // Queue this boundary for the next batch
  window['$RB'].push(suspenseIdNodeOuter, contentNodeOuter);

  if (window['$RB'].length === 2) {
    // This is the first time we've pushed to the batch. We need to schedule a callback
    // to flush the batch. This is delayed by the throttle heuristic.
    if (typeof window['$RT'] !== 'number') {
      // If we haven't had our rAF callback yet, schedule everything for the first paint.
      requestAnimationFrame(window['$RV'].bind(null, window['$RB']));
    } else {
```

[`revealCompletedBoundaries`](https://github.com/react/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-dom-bindings/src/server/fizz-instruction-set/ReactDOMFizzInstructionSetShared.js#L32-L100), which corresponds to `$RV`, removes the fallback nodes, moves the children of the `hidden` element into the boundary, and then changes the comment to `<!--$-->`.

```js
    // Insert all the children from the contentNode between the start and end of suspense boundary.
    while (contentNode.firstChild) {
      parentInstance.insertBefore(contentNode.firstChild, endOfBoundary);
    }

    suspenseNode.data = SUSPENSE_START_DATA;
```

A browser runs this script as soon as it meets it while reading the HTML, and boundaries queued before the first frame are all moved in the first `requestAnimationFrame`. It is hard to notice any difference on screen. A client that does not run scripts is left with the `<template>` and the `<div>` carrying `hidden` as they are.

`<head>` is outside the boundary, so the title, description, and OG image tags were fine. Collectors that read only `<head>`, such as link previews, are unaffected, and only collectors that read the body text get a different result. Whether to read the text of an element with the `hidden` attribute depends on each collector's implementation, and I did not look into how individual collectors handle it. I did not check the effect on search either. Google [says it indexes the result of rendering JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), so I think it is likely there was no effect, but I have not confirmed it in Search Console.

## `loading.tsx`, used as documented

The first commit does not contain the string `<Suspense>`. Next.js creates the boundary. The [official docs](https://nextjs.org/docs/app/api-reference/file-conventions/loading) explain it this way.

> In the same folder, `loading.js` will be nested inside `layout.js`. It will automatically wrap the `page.js` file and any children below in a `<Suspense>` boundary.

The shape of the May 2 snapshot matches this description. The skeleton from `loading.tsx` sits at the boundary as the fallback, and the 12,680 characters of the body are in `<div hidden id="S:1">`. The 197 characters outside `hidden` elements are the header, the footer, and the fixed strings in the skeleton. Some of the skeleton strings are hidden with `visibility: hidden`, so this is not the number of characters visible on screen.

This commit used the convention the Next.js docs describe, as is. That alone was enough for the post bodies to ship in a `hidden` element well before the August 10 commit. In other words, the same thing would have happened on post pages even if I had not wrapped the layout wrongly.

On October 26, in [`5da53183`](https://github.com/yceffort/blog/commit/5da5318379046a2e62ce590a29621d762252c937), I deleted `loading.tsx` while switching from the skeleton to a pending indicator under the clicked link. Without the second commit, the post bodies would have returned to their original position at that point. In practice the boundary in the layout was still there, so nothing changed.

## The layout I wrapped wrongly

The second commit went in the day after I upgraded Next.js from 16.2.12 to 16.3.0. 16.3 introduced Instant Navigations validation, and according to the [docs](https://nextjs.org/docs/messages/blocking-prerender-client-hook), `usePathname()` fails this validation on a route that has dynamic params and is rendered per-request. This blog had `cacheComponents: true`, and the post route `/[year]/[...slug]` prerendered only some posts and rendered the rest when a request came in. Under those conditions, the 16.3.0 dev server reported the following error.

```text
Error: Route "/[year]/[...slug]": Next.js encountered URL data `usePathname()` in a Client Component outside of `<Suspense>`.

This blocks prerendering because the value is only available at runtime.

Ways to fix this:
  - [stream] Wrap the component in `<Suspense fallback={...}>` so the hook value streams in after prerendering
  - [block] Set `export const instant = false` to allow a blocking route

Learn more: https://nextjs.org/docs/messages/blocking-prerender-client-hook
```

If I check out the commit just before the upgrade and the one just after and start the dev server on each, the code that uses `usePathname()` is the same, but 16.2.12 reports no error and 16.3.0 reports this one. `next build` passed without Suspense. The commit message is "Wrap usePathname consumers in Suspense", and it wrapped the three places that use `usePathname()`, following the first fix the error suggests.

Of the three, only `LayoutWrapper` caused a problem. The other two are components that render nothing on screen, so their content is 0 bytes, and in the HTML they were written in place as empty `<!--$--><!--/$-->`. `LayoutWrapper` contains the header, `{children}`, and the footer, so from then on the characters outside `hidden` elements dropped to 0 on every page, not just posts. I confirmed this on a local build of the commit just before the fix by fetching 6 posts, the home page, `/about`, `/series`, and a 404 page.

This commit is close to a case of me writing the code wrongly. At the time `LayoutWrapper` read `usePathname()` to decide the container width by path, and the same component also rendered the header, `<main>{children}</main>`, and the footer. The component that read the path was also the one wrapping the body, so wrapping that component in a boundary as the error suggested put the body inside the boundary too. Up to 16.2.12 this structure produced no warning, and when the error appeared in 16.3.0 I left the structure as it was and settled for wrapping it from the outermost point. Had I separated the part that depends on the path from the body, the boundary would never have contained the body. Passing `null` as the fallback is the same kind of problem. Until the script runs, nothing is left at the boundary.

## When a completed boundary is moved out

The one thing the two commits have in common is that the body ended up inside a Suspense boundary. But in both cases there was no data to wait for. The posts are static pages whose render finished at build time, yet the HTML carries `<!--$?-->`, the marker used for boundaries waiting on data.

[`flushSegment`](https://github.com/react/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-server/src/ReactFizzServer.js#L5897-L5937), which writes a boundary to HTML, splits boundaries into four cases. The first two are boundaries to be re-rendered on the client and boundaries that have not finished yet, and boundaries whose render has finished (`COMPLETED`) split into two more.

```js
  } else if (
    // We don't outline when we're emitting partially completed boundaries optimistically
    // because it doesn't make sense to outline something if its parent is going to be
    // blocked on something later in the stream anyway.
    !flushingPartialBoundaries &&
    isEligibleForOutlining(request, boundary) &&
    (flushedByteSize + boundary.byteSize > request.progressiveChunkSize ||
      hasSuspenseyContent(boundary.contentState, flushingShell) ||
      boundary.defer)
  ) {
    // Inlining this boundary would make the current sequence being written too large
    // and block the parent for too long. Instead, it will be emitted separately so that we
    // can progressively show other content.
    // We add it to the queue during the flush because we have to ensure that
    // the parent flushes first so that there's something to inject it into.
    // We also have to make sure that it's emitted into the queue in a deterministic slot.
    // I.e. we can't insert it here when it completes.

    // Assign an ID to refer to the future content by.
    boundary.rootSegmentID = request.nextSegmentId++;

    request.completedBoundaries.push(boundary);
    // Emit a pending rendered suspense boundary wrapper.
    writeStartPendingSuspenseBoundary(
      destination,
      request.renderState,
      boundary.rootSegmentID,
    );
```

A boundary that meets the condition is written with the same `<!--$?-->` marker as a pending boundary even though its render has finished, and its content moves to the `completedBoundaries` queue and goes out later in the same response as a `hidden` segment and a `$RC` call. If it does not meet the condition, the `else` right below writes the content in its original position.

```js
  } else {
    // We're inlining this boundary so its bytes get counted to the current running count.
    flushedByteSize += boundary.byteSize;
```

React's source calls the former outlining and the latter inlining, and the rest of this post uses the same terms.

[`isEligibleForOutlining`](https://github.com/react/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-server/src/ReactFizzServer.js#L499-L515) filters first for whether a boundary can be outlined at all.

```js
function isEligibleForOutlining(
  request: Request,
  boundary: SuspenseBoundary,
): boolean {
  // For very small boundaries, don't bother producing a fallback for outlining.
  // The larger this limit is, the more we can save on preparing fallbacks in case we end up
  // outlining.
  return (
    (boundary.byteSize > 500 ||
      hasSuspenseyContent(boundary.contentState, /* flushingInShell */ false) ||
      boundary.defer) &&
    // For boundaries that can possibly contribute to the preamble we don't want to outline
    // them regardless of their size since the fallbacks should only be emitted if we've
    // errored the boundary.
    boundary.preamble === null
  );
}
```

Leaving aside the cases that wait for stylesheets or images (`hasSuspenseyContent`) and the case where the experimental `defer` prop explicitly asks for a delay, and keeping only the size conditions, the rule is two lines. The boundary's content must exceed 500 bytes, and the bytes written so far (`flushedByteSize`) plus this boundary must exceed `progressiveChunkSize`. Boundaries that can contain `<html>`, `<head>`, or `<body>` (`preamble`) are excluded regardless of size.

The default value of `progressiveChunkSize` and the reasoning behind it are in [a comment in the same file](https://github.com/react/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-server/src/ReactFizzServer.js#L447-L462).

```js
// This is a default heuristic for how to split up the HTML content into progressive
// loading. Our goal is to be able to display additional new content about every 500ms.
// Faster than that is unnecessary and should be throttled on the client. It also
// adds unnecessary overhead to do more splits. We don't know if it's a higher or lower
// end device but higher end suffer less from the overhead than lower end does from
// not getting small enough pieces. We error on the side of low end.
// We base this on low end 3G speeds which is about 500kbits per second. We assume
// that there can be a reasonable drop off from max bandwidth which leaves you with
// as little as 80%. We can receive half of that each 500ms - at best. In practice,
// a little bandwidth is lost to processing and contention - e.g. CSS and images that
// are downloaded along with the main content. So we estimate about half of that to be
// the lower end throughput. In other words, we expect that you can at least show
// about 12.5kb of content per 500ms. Not counting starting latency for the first
// paint.
// 500 * 1024 / 8 * .8 * 0.5 / 2
const DEFAULT_PROGRESSIVE_CHUNK_SIZE = 12800;
```

It sets 12,800 bytes as the amount of new content that can be shown every 500ms on slow 3G. Even if the render has finished on the server, those bytes take time to reach the browser, and writing a large piece of content inline delays the moment its parent appears on screen by that much. Wrapping something in `<Suspense>` signals that this part may appear later, so React chooses to paint the fallback first and send the content afterward.

`flushedByteSize` is [initialized to `request.byteSize`](https://github.com/react/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-server/src/ReactFizzServer.js#L6168) when the shell (the part that belongs to no boundary and goes out first) starts being written.

```js
      flushedByteSize = request.byteSize; // Start counting bytes
```

`request.byteSize` and `boundary.byteSize` accumulate in [`finishedSegment`](https://github.com/react/react/blob/cbb046ab92b66dfc4ad1e1ea30d4b8beae6f2c24/packages/react-server/src/ReactFizzServer.js#L5121-L5141) each time a segment finishes rendering.

```js
function finishedSegment(
  request: Request,
  boundary: Root | SuspenseBoundary,
  segment: Segment,
) {
  // $FlowFixMe[invalid-compare]
  if (byteLengthOfChunk !== null) {
    // Count the bytes of all the chunks of this segment.
    const chunks = segment.chunks;
    let segmentByteSize = 0;
    for (let i = 0; i < chunks.length; i++) {
      segmentByteSize += byteLengthOfChunk(chunks[i]);
    }
    // Accumulate on the parent boundary to power heuristics.
    if (boundary === null) {
      request.byteSize += segmentByteSize;
    } else {
      boundary.byteSize += segmentByteSize;
    }
  }
}
```

So 12,800 bytes is closer to a budget for one run of consecutive output than to a limit on a single boundary. If the shell outside the boundaries already exceeds 12,800 bytes, every boundary over 500 bytes becomes a candidate for outlining. The post bodies exceed this condition in both commits.

To check the conditions I read from the source, I built the smallest possible page. It puts a `<header>` outside the boundary and an `<article>` inside it, and changes only the character counts. Nothing suspends, so the boundary is always in the completed state.

```js
import {createElement as h, Suspense} from 'react'
import {prerender} from 'react-dom/static'

async function render(headerChars, articleChars) {
  const {prelude} = await prerender(
    h(
      'html',
      null,
      h(
        'body',
        null,
        h('header', null, 's'.repeat(headerChars)),
        h(
          Suspense,
          {fallback: null},
          h('article', null, 'b'.repeat(articleChars)),
        ),
      ),
    ),
  )
  return new Response(prelude).text()
}
```

This is the output when `<article>` is 12,000 characters and when it is 13,000. I shortened the repeated characters and the function definitions in the script.

```html
<!-- article: 12,000 characters -->
<!DOCTYPE html><html><head></head><body><header></header><!--$--><article>bbb...</article><!--/$--></body></html>

<!-- article: 13,000 characters -->
<!DOCTYPE html><html><head></head><body><header></header><!--$?--><template id="B:0"></template><!--/$--><script id="_R_">requestAnimationFrame(function(){$RT=performance.now()});</script><div hidden id="S:0"><article>bbb...</article></div><script>/* definitions of $RB, $RV, $RC */$RC("B:0","S:0")</script></body></html>
```

With the `<header>` character count fixed, I used binary search to find how many `<article>` characters it takes for outlining to start.

| Characters in `<header>` outside the boundary | `<article>` characters at which outlining starts |
| --------------------------------------------: | -----------------------------------------------: |
|                                             0 |                                           12,765 |
|                                         1,000 |                                           11,765 |
|                                         5,000 |                                            7,765 |
|                                        12,000 |                                              765 |
|                                        20,000 |                                              482 |

The numbers match the conditions in the source to the byte. The tags themselves are 17 bytes for `<header></header>` and 19 bytes for `<article></article>`, so the first row is 17 + 12,765 + 19 = 12,801 bytes, the first value over 12,800. In the last row the shell alone already exceeds the budget, so only the 500-byte condition remains, and 482 + 19 = 501 bytes is the first value over 500.

## `progressiveChunkSize`, switched on in React 19.2

The 12,800-byte comment and the size comparison quoted above are also in [`v18.0.0`](https://github.com/react/react/blob/v18.0.0/packages/react-server/src/ReactFizzServer.js#L1712).

```js
  } else if (boundary.byteSize > request.progressiveChunkSize) {
```

The [`renderToPipeableStream` options](https://react.dev/reference/react-dom/server/renderToPipeableStream#parameters) in the official docs also list `progressiveChunkSize`, described as "The number of bytes in a chunk". Reading only this far leads to the conclusion that large boundaries have been outlined since React 18. But rendering the same page with each version gives a different result. React 18 has no `prerender`, so for this comparison only I took the output from `onAllReady` of `renderToPipeableStream`.

| react-dom                       | `<header>` 0 chars |  5,000 chars | 12,000 chars | 20,000 chars |
| ------------------------------- | -----------------: | -----------: | -----------: | -----------: |
| 18.3.1                          |       not outlined | not outlined | not outlined | not outlined |
| 19.1.0                          |       not outlined | not outlined | not outlined | not outlined |
| 19.2.0                          |             12,765 |        7,765 |          765 |          482 |
| 19.2.8                          |             12,765 |        7,765 |          765 |          482 |
| 19.3.0-canary-cbb046ab-20260731 |             12,765 |        7,765 |          765 |          482 |

The values are the `<article>` character counts at which outlining starts, and "not outlined" means the content was still written inline even when I raised it to 60,000 characters.

The reason nothing is outlined in 18.3.1 and 19.1.0 is in the source. In `ReactFizzServer.js` at `v18.0.0` and `v19.1.0`, `byteSize` appears only three times: the type declaration, the `byteSize: 0` initialization, and the comparison above. No code adds to the value, so the comparison was always `0 > 12800`. The byte counting in `finishedSegment` quoted in the previous section first appears at the `v19.2.0` tag.

The change that added this counting is [PR #33027](https://github.com/react/react/pull/33027), and the first paragraphs of its description say exactly what happened.

> Since the very beginning we have had the `progressiveChunkSize` option but we never actually took advantage of it because we didn't count the bytes that we emitted. This starts counting the bytes by taking a pass over the added chunks each time a segment completes.
>
> That allows us to outline a Suspense boundary to stream in late even if it is already loaded by the time that back-pressure flow and in a `prerender`. Meaning it gets inserted with script.

The option had been there from the start but was never used because the bytes were not counted, the counting starts now, and as a result boundaries that have already loaded and boundaries in a `prerender` can also be inserted by script. This change appears as a single line in the [React 19.2.0 release notes](https://github.com/react/react/releases/tag/v19.2.0), in the React DOM list under All Changes.

> Enable the `progressiveChunkSize` option for server-side-rendering APIs (@sebmarkbage #33027)

The follow-up [PR #33029](https://github.com/react/react/pull/33029) changed the check from the size of a single boundary to accumulated bytes and added the 500-byte floor. The PR also includes an expectation that the default limit is fairly high, so content within the viewport would rarely be outlined.

> The limit is still fairly high though so it's unlikely that by default you'd start outlining anything within the viewport at all.

Given that the accumulation starts from the size of the root, I expect outlining to happen more often than that on ordinary pages, where the header and navigation alone come to several KB.

This change has already been reported in several places. In the React repository, [issue #34966](https://github.com/react/react/issues/34966) was opened on October 23, 2025, three weeks after the 19.2.0 release. It reports that streaming scripts and hidden elements end up in the HTML even when waiting for `onAllReady` or using `prerenderToNodeStream`, and it is still open as of November 9, 2026. In the React Router repository, [issue #14733](https://github.com/remix-run/react-router/issues/14733) reports that since 19.2 fallbacks remain in the HTML even when waiting for `onAllReady` on bot requests, and [discussion #14726](https://github.com/remix-run/react-router/discussions/14726) asks about the same thing happening for Googlebot. The answers in both React Router threads were the same: this is React's behavior, so it is not something React Router can fix, and passing `Infinity` as `progressiveChunkSize` in `entry.server` restores the old output. PR #33027 also says you can set it to `Infinity` to opt out if you want to make sure there are never any scripts.

However, what `Infinity` turns off is outlining by size. When I passed `Infinity` on 19.2.8, a 50,000-character boundary was written inline, but a boundary containing a stylesheet with `precedence` was outlined even when it held a single `<span>`. 19.2.0 behaved the same. On `19.3.0-canary-cbb046ab-20260731`, the version Next.js 16.3.5 bundles, the same boundary was written inline, because `hasSuspenseyContent` was changed so that stylesheets are not treated as a reason to outline boundaries that go out with the shell.

With React Router the user owns the server entry, so one option line settles it. The Next.js App Router is different. First, the renderer's version is not the one in `package.json`. The App Router renders with the React canary bundled in Next.js, so it received this change before React 19.2.0 was officially released on October 1, 2025. I checked the bundled React commit in `package.json` at each Next.js tag and compared it with the commit of PR #33027. The result is below. Next.js 15.4.1 was released on July 14, 2025.

| Next.js tag | Bundled React                     | Includes PR #33027 |
| ----------- | --------------------------------- | ------------------ |
| v15.3.5     | `19.2.0-canary-3fbfb9ba-20250409` | No                 |
| v15.4.1     | `19.2.0-canary-97cdd5d3-20250710` | Yes                |
| v16.3.5     | `19.3.0-canary-cbb046ab-20260731` | Yes                |

Second, I could not find a way to pass the option. In `next/dist` of Next.js 16.3.5 and 16.4.5, the only place that sets a value for `progressiveChunkSize` was `1024 * 1024` in `server/app-render/make-get-server-inserted-html.js`. That call renders HTML the server inserts, such as style tags, and the call that renders the page body passes no value, so the body renders with the default of 12,800 bytes.

This problem has also been reported in the Next.js repository. [Issue #100730](https://github.com/vercel/next.js/issues/100730), opened on October 26, 2026, reports that for requests from bots matching `htmlLimitedBots`, completed boundaries over 12.8KB go out in a `hidden` element, and it also notes that Next.js does not pass `progressiveChunkSize` for the App Router page render. [PR #100760](https://github.com/vercel/next.js/pull/100760), opened the next day, makes requests with streaming metadata disabled, that is, requests identified as coming from bots that read only HTML, pass `progressiveChunkSize: Infinity`. As of November 9 it has not been merged.

That said, what this PR changes is two option objects in `renderToStream`, which renders at request time. Static HTML generated at build time is served as the same file whether or not the requesting client is a bot, so I do not expect prerendered pages to change even if the PR is merged. The posts on this blog were such pages.

## The fix and where things stand

On November 3, in [`b74ccf5a`](https://github.com/yceffort/blog/commit/b74ccf5a1241d143ec492d4be8784a34a8fd622c), I removed the three boundaries in the layout.

```diff
           <Providers>
-            <Suspense fallback={null}>
-              <LayoutWrapper enSlugs={enSlugs}>{children}</LayoutWrapper>
-            </Suspense>
+            <LayoutWrapper enSlugs={enSlugs}>{children}</LayoutWrapper>
           </Providers>
```

At that point I regarded only the second commit as the cause. I had searched the repository history for commits that added the string `Suspense`, and `loading.tsx` does not contain it. I found the first commit in the HTML of August 7, while fetching Wayback Machine snapshots to write this post. In the meantime `loading.tsx` had been deleted on October 26 for an unrelated reason, so removing only the layout boundaries was enough to bring the post pages back.

In the same commit I also changed how many posts are prerendered. Until then only the 50 most popular posts of the past year by GA4 and the 8 most recent were generated at build time, and the rest were generated on request. I did not separately check how a post generated at request time responds when the layout has no boundary. Instead I chose to generate every public post at build time and remove that path. Now the dev server reports no `usePathname()` error even though the layout has no boundary. Going by the condition in the docs, this is probably because no post is rendered per-request anymore. As of writing there are 284 Korean posts and 81 English ones. Building the two commits under the same conditions, the number of statically generated pages goes from 406 to 674.

In development, the post is rendered at request time by calling `connection()`, and that call needs a boundary. So I kept one boundary that wraps only the post body in development, and the production render does not go through it.

This fix gave up three things. The skeleton on the post route cannot come back, because `loading.tsx` is itself a boundary around the body. The number of pages generated at build grows with the number of posts. And from now on I cannot place a boundary anywhere that wraps the body. If the layout ever needs a value like `usePathname()`, I have to wrap only the small component that uses the value, not the body. For the same reason two of the three places in the second commit were harmless, a boundary whose content is 500 bytes or less is not outlined because of its size. Boundaries that actually suspend, and boundaries that meet a condition unrelated to size such as the stylesheet case above, are exceptions.

After the fix was deployed, I fetched 16 paths from production again. 14 of them, including posts, lists, tags, series, and the about page, had no `hidden` segment. On the 2 home pages (`/`, `/en`) the post list was still inside a `hidden` segment. The home component has its entire content wrapped in a single `<Suspense>`, and on November 3 I had checked only the post pages. I fixed the home pages the same way. The boundary stays only in development, and the production render is not wrapped.

You can check whether your own site is affected with one line. If it prints even one line, part of that page is only visible once a script runs.

```bash
curl -s https://example.com/some-page | grep -o '<div hidden id="[^"]*S:[0-9a-f]*"'
```

On screen, `<Suspense>` is a tool for handling loading states. In the server renderer since 19.2 it carries one more meaning. It is permission to insert the wrapped content later by script, and it applies based on conditions such as size, regardless of whether the render has finished. For content that has to be readable from the HTML alone, I think it is safer not to put it inside a boundary.
