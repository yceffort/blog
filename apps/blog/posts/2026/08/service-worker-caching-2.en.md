---
title: 'Applying <em>Service Worker</em> Caching: App Router Traps and GA4 Field Data'
tags:
  - web-performance
  - service-worker
  - pwa
  - nextjs
published: true
date: 2026-08-27 20:00:00
description: 'Armed with the theory from Part 1, I made this blog (Next.js App Router) open offline. On the first deploy, the post I had just read would not open offline; on the second, posts opened but every image was broken. This is a chronicle of fixing, one deploy at a time, the traps created by soft navigation, prefetching, and next/image, and a record of settling the results with GA4 real-user data. Returning-visitor FCP improved by 634ms on average, while TTFB worsened by 525ms on average. The second post of the Service Worker Caching Deep Dive series.'
thumbnail: /thumbnails/2026/08/service-worker-caching-2.png
series: 'Service Worker Caching Deep Dive'
seriesOrder: 2
art:
  scene: 'a paper airplane flying through an open window into a stormy sky, leaving a glowing trail of small photographs behind it'
  composition: diagonal
  layout: bands
  hue: cyan
  tone: dark
  hero: '634ms → 525ms'
---

## Table of Contents

## A Blog That Opens in Airplane Mode

This blog now opens in airplane mode. Once you have read a post, it stays fully readable, body images included, even when the network drops, and navigating to a post you have never visited shows an offline notice page. Everything it took to get here is a single service worker file of about 400 lines, but I did not reach those 400 lines in one pass. The commit history reads "Add PWA support" followed by a string of "Fix visited pages not opening offline" and "Fix body images not being cached."

Where the service worker stands on the request path, what kind of storage Cache Storage is, and by what criteria you choose a caching strategy were all organized in [Part 1](/2026/08/service-worker-caching-1). This post is the record of what happened while actually deploying with that general theory in hand. It starts from the design, performs an autopsy on each of two failed deploys, passes through the problem of deploying the worker itself, and settles the bill at the end with GA4 real-user data. The shapes of requests that the framework produces, like soft navigation, RSC (React Server Components) requests, and the `next/image` srcset, are the center of the story, and these particulars are exactly the part a general-purpose library like Workbox cannot handle for you. The framework behavior confirmed in this post is based on Next.js 16.3, the version this blog runs.

## The Design That Started Without Workbox

When you start with service worker caching, you usually meet [Workbox](https://developer.chrome.com/docs/workbox) first. It is Google's library offering battle-tested implementations of precaching, runtime caching strategies, and expiration management, and in the general case I still think using Workbox or a framework integration built on it is the right call. Unless reinventing the wheel is the goal, that is.

Even so, on this blog I wrote the service worker from scratch. There were two reasons. One is the App Router's peculiar requests covered below (RSC payloads, prefetches, `next/image` variants). Deciding how to cache these was not a strategy pick at the level of "cache-first or network-first" but a problem of dissecting request headers and queries and even leaning on the framework's fallback behavior, and doing it at the bare metal was actually simpler than doing it on top of an abstraction. The other, honestly, is learning. If I papered over the topic the book could not cover with library configuration, I felt I would pass it by without understanding once again. The result was a single dependency-free `sw.js` of about 400 lines (446 lines at the time of writing, of which 44 are a web push handler unrelated to caching), and I can now explain everything that happens in it. Of course, I paid the cost of re-solving problems Workbox had already solved (entry caps, offline fallbacks).

The starting point of the design was deciding "what to cache under which strategy" per resource type. The reason one strategy cannot fit every request is plain: static assets with hashes stamped in their filenames are safe to cache forever, but HTML must change with every deploy. So I split the cache into four by purpose and assigned each a different strategy.

```javascript
const CACHE_VERSION = 'v4' // as of the deployed version at the time of writing
const STATIC_CACHE = `static-${CACHE_VERSION}`
const PAGES_CACHE = `pages-${CACHE_VERSION}`
const IMAGES_CACHE = `images-${CACHE_VERSION}`
const RSC_CACHE = `rsc-${CACHE_VERSION}`
```

The target and strategy of each cache are as follows.

| Cache    | Target                                          | Strategy                         |
| -------- | ----------------------------------------------- | -------------------------------- |
| `static` | `/_next/static/*` (hash included), web fonts    | cache-first                      |
| `pages`  | Page navigation HTML                            | network-first + offline fallback |
| `images` | `/_next/image`, OG images, external body images | cache-first + variant fallback   |
| `rsc`    | RSC payloads carrying the `?_rsc=` query        | network-first + MPA fallback     |

The criterion that split the strategies was the first question from [Part 1](/2026/08/service-worker-caching-1)'s catalog: **is it acceptable for this resource to be shown stale.** For hash-stamped static assets the URL is the content, so they cannot go stale. If it is in the cache there is no reason to look at the network, hence cache-first. Images are a slightly different story. The URL of `/_next/image?url=...` carries no hash of the original, so if the original at the same path is replaced, a stale variant can linger in the cache. I grouped images under cache-first by leaning on the operational reality of a blog that almost never swaps images after publishing, and this choice is not safe everywhere. HTML and RSC payloads, on the other hand, change content at the same URL with every deploy. Show the latest whenever online and use the cache only as insurance for offline: network-first is the right fit. The `Cache-Control` design covered in the book uses the same judgment criteria; only the point of enforcement has moved from headers to code. The range over which the rsc cache actually serves as insurance is narrower than this table suggests, though. The value attached to `?_rsc=` is a hash of four headers (the prefetch flag, the segment prefetch flag, the router state tree, and `Next-Url`), and among them the state tree describes the page you are currently on rather than the destination. Going to the same post from the home page and from another post therefore produces different URLs. As seen in Part 1, `caches.match()` compares the query string exactly, so a cached rsc response only lines up when you go from the same origin page to the same post again, and misses otherwise. What actually opens a post offline is not the rsc cache but the 503 fallback that comes up later.

The fetch handler becomes a router that applies this classification in order. Transcribing just the skeleton of the real code gives the following.

```javascript
self.addEventListener('fetch', (event) => {
  const {request} = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Hashed static assets and fonts: cache forever
  if (isStaticAsset(url) || isFontRequest(url)) {
    event.respondWith(cacheFirst(event, STATIC_CACHE))
    return
  }
  // Page navigations: network first, on failure cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event))
    return
  }
  // RSC requests from App Router soft navigations
  if (isRSCRequest(request, url)) {
    event.respondWith(handleRSC(event))
    return
  }
  // Images: cache first
  if (isImageRequest(url)) {
    event.respondWith(handleImage(event))
  }
})
```

One thing to add: requests that must not be cached, like analytics, are returned without calling `respondWith()` at all. A request the service worker does not touch rides its original network path (HTTP cache included) untouched. Letting go of the compulsion to intercept every request matters, not least because of the overhead problem seen in Part 1. And since the snippet above is a skeleton, the real file has a few more branches. Cross-origin requests are cached only for the font CDN and images with the rest passed through, `/api/*` is cacheable only on the OG image path, and remaining same-origin `/_next/*` requests that missed the branches above are handled network-first. When offline and even the cache comes up empty, failure responses like 408 or 503 are constructed and returned depending on the path.

For a traditional MPA, the design would have ended here. From this point on is the part that was not in the documentation.

## First Deploy: The Post I Just Read Won't Open Offline

The first hole surfaced right after the deploy. Click into a post from the home list, read it, switch on airplane mode, refresh, and the post I had just read would not open. Surely the network-first path was piling HTML into the pages cache, but opening the cache showed it empty.

### Soft Navigation Leaves No HTML Behind

The cause lies in how the App Router works. A soft navigation triggered by a link click produces no document (HTML) request. Instead it fetches only an RSC payload with a `?_rsc=` query attached and updates the screen on the client (the actual detection code checks not just this query but also the `rsc: 1` request header attached for the same purpose). In other words, the `request.mode === 'navigate'` branch is taken only on the first entry, and no matter how many posts you read after that, no HTML accumulates in the `pages` cache.

So when handling an RSC request, I built a detour that separately fetches and stores that page's HTML in the background.

```javascript
async function savePageHTML(request) {
  const url = new URL(request.url)
  url.searchParams.delete('_rsc')
  const response = await fetch(url.href)
  if (!response.ok) return
  await putWithTrim(PAGES_CACHE, url.href, response.clone())
  await saveImagesFromHTML(response)
}
```

Stripping the `_rsc` query yields the document URL of the same path, so that is fetched again and stored as HTML. There is the cost of one extra request, but it happens in the background (`event.waitUntil`) and does not block rendering. Of course, the bandwidth cost of fetching the HTML once more per visited post (plus the image pre-download that comes up later) is a real trade-off. This HTML is what makes offline refresh and direct URL entry possible. The snippet above is stripped to its skeleton: the real function also carries a try/catch that skips saving when offline, and the `postMessage` to the client that raises the toast introduced later.

### Why Prefetches Must Not Be Cached

Once you decide to store RSC requests, the next problem follows immediately. Next.js prefetches links that enter the viewport by default. Prefetches are the same `?_rsc=` requests, so storing them indiscriminately means **posts you never read pile up in the cache**. Left at that default, one scroll through a list page would have recorded dozens of posts as "visited." That wastes storage, but the bigger problem was that it corrupts the meaning of the "saved for offline" indicator coming up later.

To be precise, this blog never had the problem at that scale. The post links in the list and card components had carried `prefetch={false}` for other reasons since a month or so before the service worker was built, and the search and archive pages, added later, carried the same setting from the day they shipped. Counting the requests that go out while moving from the home page into a post, the only prefetches on post paths are the English toggle link and the next-post link in the series; every other prefetch goes to `/tags/*` and `/series/*`. Filtering was still not optional. An unread next post showing up as "saved for offline" is the same kind of problem as dozens of them piling up.

Fortunately, Next.js attaches identifiable headers to prefetch requests.

```javascript
function isPrefetchRequest(request) {
  return (
    request.headers.has('next-router-prefetch') ||
    request.headers.has('next-router-segment-prefetch')
  )
}
```

Prefetches flow through to the network untouched, and only real visits without these headers are stored. For the record, these headers are closer to framework internals than a public API, so I have to admit this is a spot that can break as Next.js versions climb. Fragility like this is exactly the cost you accept when writing a service worker by hand on top of a framework.

### Answering Offline RSC Failures with a 503

The hole in the opposite direction had to be plugged too. What should happen when a soft navigation goes to a post that is not in the cache while offline? If you return just any response when the RSC request fails, the App Router stalls without updating the screen. Here I used the framework's fallback behavior. The Next.js router falls back to an MPA-style navigation (a full document request) when an RSC fetch's response is not 2xx or does not carry the RSC content-type (`text/x-component`). This is behavior from the router source rather than official documentation, so it can change as versions climb, but trusting this fallback I returned an empty 503 for RSC requests missing from the cache. That document request then re-enters the service worker's `navigate` branch, which answers with the cached HTML if present, and the offline notice page if not. This is a picture the service worker cannot complete alone; it connects only once you also know how the framework reacts to failure.

## Second Deploy: The Post Opens but Every Image Is Broken

Deploying the fixes made posts open offline. But this time every image was a broken icon. There were two causes.

First, body images are lazy-loaded. Images outside the viewport never even produce a fetch event, so unless you scroll a post to the end, those images get no chance to enter the cache. So when storing the page HTML, I parse the `<img>` tags to extract image URLs and fetch and store them in advance in the background. External-domain images are fetched with `no-cors` and their opaque responses stored as they are. As seen in [Part 1](/2026/08/service-worker-caching-1), Chromium adds a random padding between zero and roughly 14.1MB to every opaque response, so this is not free. With an expected value a little over 7MB, filling the images cache cap of 300 entries introduced below with external images would run to about 2GB in accounting terms on average and over 4GB in the worst case, and short of giving up offline support for external images, pressing down on the total with the cap was the only reasonable answer.

Second, `next/image` produces variants at multiple widths from one original. Depending on the srcset, one device requests the 640px variant and another the 1080px variant, and when the cache holds only 1080px and a 640px request arrives offline, it fails outright. The URLs differ, so a cache miss is only natural. I solved this with a fallback that, on request failure, finds and returns another cached variant of the same original (the `url` parameter). Since it scans the cache from the front and uses the first variant it meets, an image larger or smaller than requested may go out, but the judgment is that it beats a broken image. When extracting and storing images from HTML, I also store only the single variant closest to 1080px per original, preventing variants from piling up without bound.

## The Cache Grows Silently: The ?dpl= Query and Entry Caps

Once the feature settled in, the next trap came from the infrastructure side. At the time this worker was built, Vercel attached a `?dpl=` query, a deployment identifier, to static asset URLs. Even when file contents are identical, the URL changes with every deploy, so the cache-first `static` cache accumulates **as many copies of identical files as there are deploys**. As seen in Part 1, Cache Storage has no TTL. Left alone, the cache grows monotonically.

I should add that this premise changed afterward. Since Vercel introduced content-addressed immutable static asset paths in July 2026 (enabled by default from Next.js 16.3)[^1], the static asset URLs of this blog no longer carry `?dpl=`. I kept the entry caps anyway. The structure that makes the cache grow monotonically, like chunks whose hashes change per deploy and image variants, remains as it was.

What Workbox's `ExpirationPlugin` would have done, I had to build myself. Each cache gets an entry cap, and on every insertion the overflow is deleted oldest-first.

```javascript
async function putWithTrim(cacheName, request, response) {
  const cache = await caches.open(cacheName)
  await cache.put(request, response)
  const max = MAX_ENTRIES[cacheName]
  const keys = await cache.keys()
  if (max && keys.length > max) {
    await Promise.all(
      keys.slice(0, keys.length - max).map((key) => cache.delete(key)),
    )
  }
}
```

Using the fact that `cache.keys()` guarantees insertion order[^2], deleting from the front approximates LRU behavior without managing separate timestamps. Strictly it is LRI (Least Recently Inserted), but since re-`put`ting the same key moves the entry to the end of the list per the spec, deletion proceeds oldest-first by reinsertion, which was sufficient for this purpose. The caps were set at static 500, pages 200, images 300, rsc 300. For reference, the deployed version of `putWithTrim` now carries one more line. The precached offline fallback and home page are the first entries inserted into the cache, so they are the first to be deleted the moment the cap is exceeded; those two URLs are therefore excluded from the trim candidates.

## The Problem of Deploying the Worker Itself

While the cache logic changed a few times, it became clear that deploying the worker itself is also a design concern. As seen in [Part 1](/2026/08/service-worker-caching-1)'s lifecycle, a new worker stays in the waiting state after installing, and a user who keeps a tab open and only refreshes remains trapped under the old cache logic. On this blog I chose to skip the waiting.

```javascript
const PRECACHE_URLS = [OFFLINE_URL, '/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).then(() => cache.match('/')))
      // If the SW installs mid page load, already-loaded images never pass
      // through a fetch event, so store the precached home's images here directly
      .then((home) => (home ? saveImagesFromHTML(home.clone()) : null))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !ALL_CACHES.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})
```

`skipWaiting()` activates the new worker immediately, and `clients.claim()` seizes control of open tabs right away. Then at activation, every cache with a different version is deleted. Raise `CACHE_VERSION` to `v4` and the old caches like `static-v3` and `pages-v3` are cleaned up at that moment. Setting the unit of cache invalidation at the version in the cache name, rather than individual entries, sidesteps the entire class of "new logic reading caches written by old logic" problems. For the record, the currently deployed `activate` carries one more line, `navigationPreload.enable()`. It was added much later than this point in the story, so it is left out of the snippet above and covered separately in the last section.

That said, `skipWaiting()` is not the universally right answer. Because it seizes control of running pages midstream, in apps that lazy-load code-split chunks, old HTML can meet the new worker's cache logic and chunk loads can break. This blog, being a Next.js app, is not free of this risk either. But it is a content-centric site where an open tab rarely lazy-loads a new chunk much later, and a read-only screen that a refresh recovers even if it breaks, so I judged it acceptable. Depending on the app's structure, keeping the waiting state and showing the user a "new version available" notice may be the right call.

## Making Offline Visible

Up to here the story was about storing resources. But offline support is not completed by storage alone. If the user never learns that "this post can be read offline too," the feature might as well not exist.

So at the moment a post read via soft navigation first enters the offline store, the service worker sends a message to the client and a "✓ Saved for offline" toast appears at the bottom of the screen (there is no toast yet when a page is stored via a hard navigation path like direct address-bar entry). On the service worker side you just call `client.postMessage()`, but on the page side there was one small, hard-to-find trap. Messages the worker sends are queued first, and the queue has to be enabled before they are dispatched as `message` events. Assigning a handler to `onmessage` enables it on the spot, but `navigator.serviceWorker.addEventListener('message', ...)` does not, and otherwise it is enabled only when the document finishes loading and `DOMContentLoaded` fires. `startMessages()` is the call that enables the queue without waiting for that point[^3].

```typescript
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js')
  navigator.serviceWorker.addEventListener('message', onMessage)
  navigator.serviceWorker.startMessages()
}
```

Entry to never-visited pages is answered with the `/offline` notice page precached in advance. Since install precaches the home page (`/`) alongside this notice page, at minimum the home opens offline right after installation. Add the manifest (`site.webmanifest`) and you have a PWA installable to the home screen, but the manifest itself is a static file declaring icons and a name, with nothing special to write about. The substance of a PWA ultimately lives on the service worker side.

![Entering a post via soft navigation shows a "Saved for offline" toast at the bottom](./images/service-worker-caching/offline-saved-toast.png)

![Cut the network and refresh, and the post you just read still opens with code highlighting and tables intact](./images/service-worker-caching/offline-article.png)

## Settling the Bill: The Numbers Left in GA4

Whether it worked did not need to be guessed. This blog collects visitors' Core Web Vitals as GA4 events via the [web-vitals library](https://github.com/GoogleChrome/web-vitals), so real-user data from before and after the service worker deploy was already piled up. The comparison conditions happened to be fairly clean, too. For a month or so before the caching worker deployed, no service worker was registered at all (the earlier push-only worker had been removed as well), and the post-deploy window was cut at the end of June, before the book's publication changed the traffic mix.

> Measurement setup: metrics reported by the web-vitals library were collected as GA4 events and aggregated via the GA4 Data API. The comparison windows are 2026-04-21\~05-25 with no service worker, and 2026-05-27\~06-30 with the initial worker running. The generation labels in this post are v1 for the first caching worker and v3 for the image-fix release that comes up later. The `CACHE_VERSION` string in the code starts at v2 to distinguish it from the push-only worker era, so it is off by one from these labels (post v1 = code v2, post v3 = code v4); to reduce confusion, the body text sticks to the post labels throughout. Limitations up front. First, the GA4 Data API does not provide percentiles, so every number below is a **mean**. It is not the p75 standard for Core Web Vitals, so it is exposed to outliers. As comes up later, this is a distribution where a 41.7-second value slips in, so even a mean over a thousand-plus samples can carry errors of several hundred ms, and the three-digit numbers below should be read within that resolution. Second, this is observational data, not a controlled experiment, so period-driven changes in content and traffic mix are folded in. Third, the new/returning split uses GA4's default classification as is, inheriting the limits of cookie-based identification. Fourth, the numbers below are aggregated with crawler-like traffic from Singapore excluded. The returning-visitor side has not a single Singapore event in either window, so the table does not change, but on the new-visitor side it grew sixfold from 24 to 147 events with a mean in the 3,000ms range, so whether it is included changes the conclusion.

To see the service worker's effect you need to **split new visitors from returning visitors** rather than look at the overall mean. The first page of a first visit runs before the service worker registers, so the impact is limited, and returning visitors with a warmed cache are the beneficiary group. The returning-visitor results are as follows.

| Metric (returning, mean) | No SW (n=1,090~1,421) | SW v1 (n=1,295~1,821) | Change         |
| ------------------------ | --------------------- | --------------------- | -------------- |
| FCP                      | 1,463ms               | 829ms                 | **-43%**       |
| TTFB                     | 148ms                 | 673ms                 | **+525ms**     |
| LCP                      | 885ms                 | 1,931ms               | **+118%**      |
| CLS                      | 0.168                 | 0.200                 | Slightly worse |

This table needs one footnote. The baseline LCP mean (885ms) is smaller than the FCP mean (1,463ms), and since LCP can never beat FCP within a single pageview, this inversion means the two metrics do not report over the same samples. web-vitals finalizes and sends LCP only upon user interaction or a tab switch, so which pageviews leave an LCP behind is itself a biased sample (the sample counts indeed shrink in the order TTFB > FCP > LCP). The per-metric before/after comparisons hold because each metric is compared against its own samples, but reading across metrics does not hold in this table.

The FCP improvement is substantial, and the evidence that strengthens the case for crediting the worker sits on the new-visitor side. Over the same period, new-visitor FCP went from 1,311ms to 1,227ms, a drop of 84ms. Set against the returning visitors' 634ms, that is roughly a seventh. The group that could hardly benefit improved only a little while the group that could improved far more, so it is natural enough to read this as the effect of answering static assets and fonts instantly from Cache Storage.

Still, using this contrast as proof of causation calls for reservations. For one, the contrast is not clean. New visitors also come under the worker's control from the second pageview of their first session. And the control group did not stay entirely put either. New-visitor FCP dropped by 84ms as well, and as shown right below, TTFB worsened in the same direction as for returning visitors. However much the control group moved along is a component that has nothing to do with the worker, so how much of the returning visitors' 634ms belongs to the worker cannot be settled by this contrast alone. Next, the size of the effect is not fully explained by the mechanism alone. A returning visitor would have had many static assets in the HTTP cache too, so a 634ms drop even against that baseline suggests some period-to-period mix change is folded in; that is the safer reading. To put one more number alongside: extending the v1 window past the end of June all the way to just before the v3 deploy puts the returning-visitor FCP mean at 1,066ms, making the improvement -27% instead of -43%. The period after July was excluded from the main comparison because the book's publication changed the traffic mix, but the fact that the number moves this much with the cut position is itself the resolution of this comparison. Period comparisons and visitor-type comparisons are approximations at best, and to make this split precisely, I later added the `sw_controlled` instrumentation described below.

The numbers pointing the other way deserve honest scrutiny too. TTFB worsened sharply for returning visitors, from 148ms to 673ms. New visitors rose as well, from 283ms to 373ms. With navigations riding the network-first strategy, worker startup and the fetch detour cutting in ahead of the first byte is the prime suspect. The magnitude, though, needs a reservation. Warm startup measured around 2ms in Part 1, so what built this mean must be mostly cold startups, and I have no direct measurement of a cold startup's size (as seen in Part 1, it cannot be reproduced with DevTools open). Attributing the full +525ms to the worker is therefore not yet a settled claim, and splitting it within the same period using the `sw_controlled` instrumentation below remains an open task. What is interesting is that FCP improved anyway. The first byte came later, but the render-blocking resources after it came instantly from the cache, so the total to first paint actually shrank. Watching TTFB alone, this deploy would have read as a performance regression. This is why a caching layer must never be judged by a single metric.

The quietest row of the table, CLS, deserves a note too. A service worker does not change the bytes of a response, so there is no plausible causal path for it to move CLS. That it still moved 19%, from 0.168 to 0.200, is best read as a signal that the two periods' content and traffic mixes were not fully homogeneous. The FCP improvement above carries that much uncertainty on top as well.

The problem was returning-visitor LCP worsening from 885ms to 1,931ms. At first I suspected a defect in the v1 worker. At the time, v1 failed to classify `/_next/image` optimization requests as images (extension-based detection missed query-string URLs) and let them flow network-first. On pages whose LCP element is an image, that means paying the worker detour cost every time with none of the cache's benefit: a plausible suspect.

But slicing the data further produced a different picture. By page type (measured over all visits, so the population differs from the returning-visitor table; this is for trend confirmation, not direct comparison), the home and list pages, whose LCP element is a thumbnail image, went from 629ms to 740ms, about +112ms, while the deterioration was concentrated on article pages whose LCP is mostly text (1,244ms to 2,043ms). That distribution does not fit the image hypothesis. Nor was it a device-mix change (desktop alone still shows +651ms). The remaining confounder was the content-mix effect of different posts being popular in different periods, so I paired identical posts with 30-plus samples in both periods. Then the picture changed. The sample-weighted mean deterioration across the 14 paired paths was +1,079ms, still large-looking, but one post's v1-period mean LCP was 41.7 seconds. A mean of 41.7 seconds over 30-plus samples is not one stray observation but some unidentified phenomenon happening persistently on that post during the v1 period. Excluding that post, the same-post deterioration is **+191ms**, a magnitude explained by every request passing through the worker once more; but since the excluded phenomenon could itself have been triggered by the v1 worker, both numbers have to stay in the conclusion. Including it, +1,079ms; excluding it, +191ms.

To sum up, the substance of the "1-second LCP regression" appears to be a regression of around 200ms from the worker detour, with one post's unexplained 41.7 seconds dragging the mean. It is a case where the GA4 Data API's limitation of offering only means, not p75, nearly led to the wrong conclusion (an image-caching defect as the main culprit). What the 41.7 seconds is, I still do not know. That it appears on one specific post only could mean a content problem, an instrumentation problem, or a landmine the v1 worker stepped on for that post alone, and with the current instrumentation collecting only a single value, this was as far as I could go. To be clear, this paired-path analysis was applied only to LCP, where the deterioration showed, and the same verification was not run on FCP, which came out as an improvement. That means I did not check whether the baseline window held extreme values in the opposite direction, so the -43% above carries the same kind of distortion risk.

So I fixed the instrumentation first. Replacing web-vitals with the [attribution build](https://github.com/GoogleChrome/web-vitals#attribution) delivers cause-tracing information alongside the metric value. For LCP, which element it was (CSS selector), which resource if an image (URL), and how the total time splits across TTFB, resource load delay, resource load duration, and render delay. On top of that, I attached the navigation type and service worker control status as parameters common to all metrics.

```typescript
const params = {
  value: Math.round(name === 'CLS' ? value * 1000 : value),
  navigation_type: navigationType,
  sw_controlled: navigator.serviceWorker?.controller ? 'yes' : 'no',
}

if (name === 'LCP') {
  const {attribution} = metric
  params.lcp_target = attribution.target // CSS selector of the LCP element
  params.lcp_url = attribution.url // resource URL if it is an image
  params.lcp_ttfb = Math.round(attribution.timeToFirstByte)
  params.lcp_resource_load_delay = Math.round(attribution.resourceLoadDelay)
  params.lcp_resource_load_duration = Math.round(
    attribution.resourceLoadDuration,
  )
  params.lcp_element_render_delay = Math.round(attribution.elementRenderDelay)
}
```

`sw_controlled` is especially handy. Until now the effect was estimated by a before/after period comparison around the service worker deploy, but from here on, worker-controlled and uncontrolled page views can be split directly within the same period. When the next extreme value appears, which element of which post got slow at which stage will be printed right into the data. For reference, custom parameters like these must be registered as event-scoped custom dimensions in the GA4 admin console before the Data API can query them.

About two weeks later, while checking how much data had accumulated, I found that the `sw_controlled` line above was wrong. All five metrics go out from the same page view, so the count of `no` values should be roughly the same for each metric. Yet over the five days from August 21, TTFB and FCP had 214 and 207 `no` values, while LCP had 40 and INP only 9.

The cause is when the check runs. This worker calls `skipWaiting()` and `clients.claim()`, so even a first-visit page gets a `navigator.serviceWorker.controller` the moment the worker activates, even though that page's navigation request never went through the worker. TTFB and FCP are reported as soon as loading finishes, so they usually come ahead of activation but not always, while LCP, CLS, and INP are reported when the user interacts or leaves the page, by which point `controller` almost always exists. As a result, most first-visit LCPs were labeled `yes`, and the five-day LCP contrast (`yes` 1,583ms vs. `no` 2,909ms) turned out to be a number with first-time visitors who stayed a while mixed in, not a worker effect.

I switched the criterion to a value independent of reporting time. `workerStart` on `PerformanceNavigationTiming` is the timestamp taken right before the request's fetch event is handed to the worker (right before the worker is started, if it is not already running), and it stays 0 for requests the worker did not answer.

```typescript
function isNavigationServedByServiceWorker() {
  const [navigation] = performance.getEntriesByType('navigation')
  return (navigation?.workerStart ?? 0) > 0
}
```

The lesson is modest. `controller` answers "is a worker controlling this page right now," while `workerStart` answers "did this page's response go through a worker." For a worker that uses `clients.claim()`, performance metrics need the latter.

I was also too generous at first about how much of the pre-fix data could be salvaged. I assumed TTFB and FCP go out right after load and would therefore be intact, and they are not. web-vitals' `onTTFB` waits for the `load` event when `document.readyState` is not `complete`, then defers one more task before reporting[^4]. Meanwhile the worker registration starts right after hydration, and install moves on to `skipWaiting()` once it has fetched its two precache URLs and stored the images linked from that home HTML. Even on a first-visit page, `controller` may already exist by reporting time. Comparing the 13 days before the criterion changed with the two days after, the share of new visitors classified as `yes` falls from 30% to 11% for TTFB and from 23% to 9% for FCP. The same share moves from 86% to 23% for LCP and from 99% to 32% for INP, so the scale of the misclassification is not the same, but TTFB and FCP were not free of it either. The pre-fix `sw_controlled` values for LCP, CLS, and INP have to be discarded, and TTFB and FCP have to be read with this much contamination in mind.

So I fixed `/_next/image` to classify as cache-first (this fix was bundled and deployed on the same day as v3, together with body-image precaching). It was not the main culprit, but it is indeed a spot where the worker detour cost can be removed. The initial one-day signal from deploy day shows returning-visitor mean LCP 951ms, TTFB 391ms, and FCP 603ms, all better than the full v1 window (aggregated not to the end of June like the earlier table, but across everything from late May when v1 started to just before the v3 deploy: 1,532ms, 859ms, and 1,066ms respectively). But unlike the earlier table, this baseline includes the traffic-shift period after the book's publication, making the comparison unfavorable to v1, and with only 120~170 samples per metric, plus the mean's vulnerability to a few extreme values seen above, it is reference-grade at best. Once a few weeks of data accumulate, I plan to follow up.

![Comparison of returning-visitor and new-visitor FCP and TTFB means before and after the service worker deploy](./images/service-worker-caching/ga4-fcp-ttfb-before-after.en.png)

## Remaining Work and an Honest Conclusion

The attribution of the TTFB deterioration (returning-visitor mean +525ms) could be partly checked with the TTFB `sw_controlled` values that survived the instrumentation flaw above. The `navigate` contrast is unusable, though: `no` means a first visit, so DNS and TLS connection costs are stacked on top and cancel out the worker cost, and indeed the two-week means from August 13 were nearly identical, `no` 556ms (510 samples) vs. `yes` 508ms (604 samples). Samples whose `navigation_type` is `reload`, on the other hand, are returning visits on both sides with the connection already open, so the difference narrows to whether the worker was in the path (a hard reload bypasses the worker). There it was `no` 51ms (12 samples) vs. `yes` 595ms (64 samples). The sample is too small to treat as more than circumstantial, but it points the same way as the hypothesis above that the worker detour costs somewhere around 500ms.

Once I expanded those 12 events down to the minute, though, "small" stopped being the right word for the problem. Seven of them were bunched into three minute buckets on August 22, at 13:12, 13:14, and 13:16, and only once I counted them did I realize the traffic was mine. Those are the reloads I kept pressing for five minutes to check whether a hard reload really does bypass the worker. Add one more I left on another day and 8 of the 12 are mine, and counted as distinct visits they are not twelve people but five. The `yes` side is not clean either: 10 of its 35 desktop events are mine as well. Both sides of the contrast were contaminated. Dropping the burst does not flip the direction. The remaining five events average 42ms, slightly faster, so the gap widens a little rather than closing. The trouble is not the direction but that this contrast is not the kind that improves by waiting. Time fixes a small sample; it does not fix a sample whose events are not independent. In traffic where hard reloads are rare to begin with, I end up producing more than half of the control group myself, by pressing reload to check.

Navigation preload, which launches the navigation request without waiting for worker startup, was the next task for winning that number back, and I had already enabled it on August 23 while writing this post. That puts the preload deploy date right in the middle of the two-week contrast from August 13 quoted just above. Both numbers therefore mix before and after, and whether the effect of turning it on can be teased out of real-user data is checked in [Part 3](/2026/08/service-worker-caching-3).

This blog's stated cause also needs a look. I built it under the banner of "reading that does not cut out when the subway enters a tunnel," but even that cause is only half fulfilled. A tunnel is often not fully offline but a state where the connection exists yet crawls endlessly (lie-fi), and since network-first falls back to the cache only when fetch fails, the current implementation without a timeout fallback is helpless in that state. It works fully only in offline that fails cleanly, like airplane mode.

Looking back, most of the work in this chronicle went not into the caching strategies themselves but into understanding the shapes of requests the App Router framework produces. And both the benefit and the cost were left in the real-user data, where watching any single metric alone would have led to a completely wrong evaluation of this deploy. If you are adopting service worker caching, I think the first step in order is putting real-user metric collection in place to compare before and after. Finally, **not building what you do not need is design too**. A fetch handler taxes every request, and a badly deployed worker must be recalled by your own hand. By that standard, I admit this blog itself is a borderline case, built on half a requirement and half a desire to learn. When the clear requirement of offline arrives, then, I hope this series serves as a map.

---

[^1]: [Optimized CDN caching and deploying of immutable static assets](https://vercel.com/changelog/optimized-cdn-caching-and-deploying-of-immutable-static-assets), Vercel Changelog (2026-07).

[^2]: [Cache.keys()](https://developer.mozilla.org/en-US/docs/Web/API/Cache/keys), MDN. States that requests are returned in insertion order.

[^3]: [ServiceWorkerContainer.startMessages()](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/startMessages), MDN, and [the startMessages() definition in the spec](https://w3c.github.io/ServiceWorker/#dom-serviceworkercontainer-startmessages). The client message queue is enabled by calling `startMessages()` and by the first assignment to the `onmessage` setter (spec 3.4.6 and 3.4.7); otherwise [the HTML spec's end-of-load steps](https://html.spec.whatwg.org/multipage/parsing.html#the-end) enable it inside the task that fires `DOMContentLoaded`.

[^4]: [web-vitals' `onTTFB` source](https://github.com/GoogleChrome/web-vitals/blob/main/src/onTTFB.ts), v6.1.0. When `document.readyState !== 'complete'`, `whenReady` waits for the `load` event and then defers the callback one more task with `setTimeout`.
