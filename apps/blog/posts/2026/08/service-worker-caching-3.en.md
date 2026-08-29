---
title: 'Measuring the Cost of Going Through a Service Worker: Building in the Lab the Control Group GA4 Could Not Give Me'
tags:
  - web-performance
  - service-worker
  - pwa
  - nextjs
published: false
date: 2026-08-28 20:00:00
description: 'I set out to confirm the 500 ms hint that part 2 left behind, but the hard reloads that would form the control group arrive at under one a day. So I built the control group myself, with Playwright and a shaping proxy, and found that going through the worker costs 2 ms on a navigation while the real cost is the nearly 80% more traffic spent on every article read. It is a cost no web vital reports. Third part of the service worker caching deep dive series.'
thumbnail: /thumbnails/2026/08/service-worker-caching-3.png
series: 'Service Worker Caching Deep Dive'
seriesOrder: 3
---

## Table of Contents

## I thought three weeks would be enough

[Part 2](/2026/08/service-worker-caching-2) left one number unconfirmed. A hard reload bypasses the service worker, so samples whose `navigation_type` is `reload` form a clean control group that differs only in whether the worker was involved, and two weeks of them came to `no` 51 ms (12 samples) and `yes` 595 ms (64 samples). It reads as a hint that going through the worker costs around 500 ms, but 12 samples are not enough to settle it, so I noted that I would look again once a few more weeks had accumulated.

Before waiting out those weeks there was one thing worth checking: how fast samples actually accumulate at the current rate. Splitting TTFB events over the 16 days from August 13 to 28 by `navigation_type` and worker involvement gives the following (crawler traffic from Singapore is excluded, as it is for every GA4 figure in this post).

| Segment           | 16-day total | Per day | Projected after 3 weeks |
| ----------------- | ------------ | ------- | ----------------------- |
| navigate, yes     | 700          | 43.8    | about 920               |
| navigate, no      | 661          | 41.3    | about 870               |
| back-forward, yes | 263          | 16.4    | about 345               |
| reload, yes       | 65           | 4.1     | about 85                |
| **reload, no**    | **12**       | **0.8** | **about 16**            |
| back-forward, no  | 8            | 0.5     | about 11                |

This table is what made me drop the plan to wait. Fewer than one visitor a day performs a hard reload, so three more weeks would still yield 16 samples and six weeks something in the thirties. If the sample is small not because the observation window is short but because the behavior itself is rare, more time does not look likely to fill it. The property that makes a hard reload a control group, that it bypasses the worker, comes with the property that leaves that control group empty.

The thought that follows naturally is to compare `navigate` samples instead, which are plentiful, but that path is blocked for a different reason. In the two days of August 27 and 28, 87 of the 95 `no` TTFB samples came from new visitors and 67 of the 100 `yes` samples from returning ones. Navigations that skipped the worker are mostly first visits and navigations that went through it are mostly return visits, so the difference between the two groups mixes the worker's cost with everything that separates new from returning visitors (connection state, device and region mix, which articles they read, the state of the browser cache). That composition would not change even with far more visitors, so time is unlikely to resolve this side either. An A/B experiment that randomly registers the worker for half the visitors could solve it, but turning the browsers of people who came here to read into an experimental apparatus is not something I wanted to do on this blog.

So this part became a record of "then how do you measure it". I drew on the field data once more, confirmed what it could not give me, and then built the control group in the lab. I have not gathered the conclusions up front, because how far each of the three attempts got and where each one stopped is the story I want to tell here.

## First attempt: percentiles instead of averages

Every number in part 2's accounting was an average. The GA4 Data API returns only metric sums and event counts, so an average is the only thing you can compute, and part 2 already showed an average dragged along by a single 41.7-second outlier from one article. I needed percentiles.

The workaround is simple. Split events by `dateHourMinute`, worker involvement, `navigation_type`, device category, and city, and at this blog's traffic level most rows end up holding a single event. For August 27 and 28, all five metrics together came to 688 rows, 657 of which held one event. A one-event row's sum is the event's value itself, so listing the rows and sorting them yields an approximate p50 and p75. The skeleton of the query:

```javascript
const [res] = await client.runReport({
  property,
  dateRanges: [{startDate: '2026-08-13', endDate: '2026-08-28'}],
  dimensions: [
    'customEvent:sw_controlled',
    'customEvent:navigation_type',
    'deviceCategory',
    'dateHourMinute',
    'city',
  ].map((name) => ({name})),
  metrics: [{name: 'eventCount'}, {name: 'eventValue'}],
  dimensionFilter: {
    filter: {fieldName: 'eventName', stringFilter: {value: 'TTFB'}},
  },
  limit: 100000,
})

// Most rows have eventCount 1, so repeating each row's mean by its count gives an approximate distribution
const values = []
for (const row of res.rows) {
  const n = Number(row.metricValues[0].value)
  const mean = Number(row.metricValues[1].value) / n
  for (let i = 0; i < n; i++) values.push(mean)
}
values.sort((a, b) => a - b)
const p50 = values[Math.floor(values.length * 0.5)]
```

Rows with two or more events are expanded by repeating their mean, so this is not an exact percentile. It does, however, stop one outlier from dragging the whole thing. One aside: the `value` parameter that web-vitals sends must be queried as the standard `eventValue` metric, not as a custom metric (asking for `customEvent:value` returns `INVALID_ARGUMENT`).

Re-aggregating the 16 days this way changes the picture considerably from part 2.

| TTFB p50 (ms)     | no        | yes       | Delta |
| ----------------- | --------- | --------- | ----- |
| navigate, desktop | 148 (542) | 182 (567) | +34   |
| navigate, mobile  | 147 (119) | 183 (131) | +36   |
| reload, desktop   | 56 (11)   | 131 (35)  | +75   |

The `reload` contrast that averaged 500 ms is 75 ms at p50, and the `navigate` contrast, which must carry the confounding caveat, sits around 35 ms regardless of device type. Part 2's "returning visitor TTFB +525 ms" should be reread in this light. The worker did not add 500 ms to everyone; it added tens of milliseconds to most users and much more to some (p75 for `reload, yes` was 833 ms), and that tail pulled the average up. That reading is closer to the data.

I applied the same method to the LCP breakdown that part 2 added to the instrumentation. This is the two days of August 27 and 28, after the corrected `sw_controlled` detection was deployed, `navigate` navigations only.

| LCP stage p50 (ms)     | no (79) | yes (36) |
| ---------------------- | ------- | -------- |
| LCP                    | 1,220   | 752      |
| lcp_ttfb               | 99      | 159      |
| resource load delay    | 0       | 0        |
| resource load duration | 0       | 0        |
| element render delay   | 1,026   | 494      |

The two resource rows are 0 because this blog's LCP element is almost always the article title `h1` (text), so LCP is effectively TTFB plus render delay. The worker path is 60 ms slower in the TTFB stage and half as long in render delay. That matches part 2's picture: the worker's cost sits before the first byte and its benefit after it (static assets and fonts). But the `yes` column here is mostly returning visitors, and a returning visitor would have had the same assets in the HTTP cache too, so this table cannot tell whether the halved render delay comes from Cache Storage or simply from "a return visit with a full cache". That question comes back in the lab.

The limits of this aggregation showed quickly, though. I had deployed navigation preload on August 23 and wanted to see whether `yes` TTFB moved around that date, but plotting daily p50 showed it was not a resolution at which a deploy could be read.

![Daily TTFB p50 by worker involvement. Daily p50 swings between 42 and 521 ms and the preload deploy on August 23 is not distinguishable](./images/service-worker-caching/rum-daily-ttfb-p50.en.png)

Daily samples range from 12 to 78, so daily p50 swings between 42 and 521 ms. Percentiles fix the average's outlier problem but not the sample size problem. This was as far as the field data would go: the cost of going through the worker is on the order of tens of milliseconds, that cost sits before the first byte, and picking out the effect of an individual measure like preload inside that range is beyond this traffic.

## Second attempt: building the control group

The field data's two problems (the control group does not form, and when it does it is confounded) do not exist in a lab by definition. Same device, same network conditions, toggle only the worker. The lab has its own problems instead: how close are the conditions to reality, and how do the numbers connect back to the field data. The first is answered by design; the second remains unanswered in the last section of this post.

> Measurement environment: Apple M5 MacBook, macOS 26.5.2, Chrome for Testing 151.0.7922.34 as downloaded by Playwright 1.62.1. The target is this blog built with `next build` and served locally with `next start` (Next.js 16.3.1); the service worker is `sw.js` as deployed at the time of measurement (code v4); later in this post I find and fix a defect in that v4, and the tables here are from before the fix. Network conditions come from the proxy described below. Each condition ran 25 times (10 for the CPU-throttled conditions), and figures in the text are p50 unless stated otherwise. The measurement scripts and raw data live in the repository under `apps/blog/scripts/sw-lab/`.

### Design: the shape of one run

One run starts from an empty browser profile and makes five moves.

1. Load the home page. In conditions that allow the worker, registration and activation happen here; the script waits for `navigator.serviceWorker.ready` and `controllerchange`, then pauses so precaching can finish.
2. Hard-navigate to article A. The worker has just activated, so it is **warm**.
3. Quit the browser entirely, reopen it with the same profile, and hard-navigate to article B. This is the worker's **cold** start.
4. Hard-reload the same page through CDP's `Page.reload({ignoreCache: true})`. This is the navigation that bypasses the worker, the lab counterpart of the field data's `reload, no`.
5. Go back home and click an article link. Collect the soft navigation and the `?_rsc=` prefetch requests that precede it through `PerformanceResourceTiming`.

Articles A and B are different articles (of different length), so comparing warm against cold vertically is meaningless; the design is for comparing conditions horizontally within the same phase. In each move, the following is read from inside the page.

```javascript
const [nav] = performance.getEntriesByType('navigation')
const fcp = performance.getEntriesByName('first-contentful-paint')[0]
return {
  workerStart: nav.workerStart,
  fetchStart: nav.fetchStart,
  responseStart: nav.responseStart, // TTFB
  fcp: fcp?.startTime,
  lcp: window.__lcp, // updated by a PerformanceObserver planted via addInitScript
  controlled: !!navigator.serviceWorker?.controller,
}
```

Worker startup time is `fetchStart - workerStart`. `workerStart` is the moment the browser began starting the worker to handle the navigation (or, if it was already running, the moment just before dispatching the fetch event), and `fetchStart` is when the actual fetch began afterwards, so the difference is the time spent waiting for the worker to be ready[^1]. It is the same calculation that produced the 2 ms warm startup in part 1.

There are five conditions: no worker (Playwright's `serviceWorkers: 'block'`), worker as deployed (navigation preload on), worker with preload off, and the first two repeated under a 6x CPU throttle (`Emulation.setCPUThrottlingRate`). The preload-off variant swaps one line of `sw.js` on disk for the duration of the measurement.

```bash
sed -i '' 's|self.registration.navigationPreload?.enable(),|undefined,|' \
  apps/blog/public/sw.js
```

`next start` reads `public/` files at request time, so no rebuild is needed, and since every run registers the worker afresh in a new profile the swapped file is installed immediately. When the measurement ends, `git checkout` restores it.

Step 3, the cold start, is unremarkable as code.

```javascript
await context.close()
;({context, page, cdp} = await open(userDataDir))
await page.goto(BASE + POST_COLD)
```

It just calls `launchPersistentContext` again with the same `userDataDir`. Getting here took one detour, told in the traps section.

### Network conditions came from a proxy

My first plan was DevTools network throttling (`Network.emulateNetworkConditions`). But that setting applies to the page target the CDP session is attached to; the service worker is a separate target, and navigation preload requests are issued by the browser on the worker's behalf. If the worker's requests escape the throttle, the worker conditions get a faster network and the comparison collapses. Rather than verify whether they escape, I chose the option that needs no verification: a 30-line Node proxy in front of `next start` that delays every response.

```javascript
const RATE = (4 * 1000 * 1000 * 0.9) / 8 // 450,000 bytes/s
const ONE_WAY = 75 / 2 // ms
let nextFree = 0

// Write the chunk at the moment it would have finished arriving over the wire; the first chunk is delayed by its transfer time too
function paced(res, chunk) {
  const now = performance.now()
  const start = Math.max(now, nextFree)
  nextFree = start + (chunk.length / RATE) * 1000
  return new Promise((r) =>
    setTimeout(() => {
      res.write(chunk)
      r()
    }, nextFree - now),
  )
}

http
  .createServer((req, res) => {
    setTimeout(() => {
      const up = http.request(
        {port: 3000, path: req.url, method: req.method, headers: req.headers},
        (u) => {
          setTimeout(async () => {
            res.writeHead(u.statusCode, u.headers)
            res.flushHeaders() // send headers right away; pace only the body
            for await (const chunk of u) {
              for (let o = 0; o < chunk.length; o += 4096) {
                await paced(res, chunk.subarray(o, o + 4096))
              }
            }
            res.end()
          }, ONE_WAY)
        },
      )
      req.pipe(up)
    }, ONE_WAY)
  })
  .listen(3100)
```

On a request it waits one one-way delay before forwarding upstream, waits another one-way delay after the response headers arrive before sending them down, and streams the body in 4 KB chunks through a global token bucket (`nextFree`) paced at 450 KB/s. Because the bucket is global, concurrently open responses share the bandwidth. The values are modeled on the DevTools Fast 4G preset (75 ms round trip, 90% of 4 Mbps download), but what matters more than the absolute values is that page, worker, and preload all pass through the same proxy. Upload is not paced; everything measured is a GET with no request body.

The `flushHeaders()` line above was not there at first, and in that state the dry run's no-worker TTFB came out at 205 ms, when 75 ms of round trip plus server time should have landed around 90. Node's `res.writeHead()` does not send headers immediately; it holds them until the first `write()`, so the transmission time of the first chunk (122 ms for 55 KB) was sitting inside TTFB. One line fixed it, but had I run the full measurement in that state I would have started interpreting a 120 ms that had nothing to do with the worker. Before trusting the proxy I had to measure the proxy.

### Three traps

Beyond the proxy, three more things nearly invalidated the measurement.

**`route()` disables the HTTP cache.** Even against a local server the page sends events to GA4 under the production measurement ID, so analytics requests had to be blocked, and I blocked them with Playwright's `context.route()`. Then, in the no-worker condition, all 33 static assets were re-downloaded on every warm navigation. A `curl` confirmed that `next start` serves `/_next/static/` with `cache-control: public, max-age=31536000, immutable`, so it was not a header problem. As the Playwright docs state, enabling routing disables the HTTP cache[^2]. The worker conditions serve assets from Cache Storage and are unaffected; only the no-worker condition suffers, which tilts exactly the comparison I was making. I switched the block to DNS mapping, with no interception involved.

```javascript
const context = await chromium.launchPersistentContext(userDataDir, {
  serviceWorkers: COND === 'nosw' ? 'block' : 'allow',
  args: [
    '--host-resolver-rules=MAP *.google-analytics.com 127.0.0.1, MAP *.googletagmanager.com 127.0.0.1',
  ],
})
```

Warm-navigation re-downloads then dropped to 15 of 33 (chunks first used by that article) and cold after restart to 4 of 37. This also confirmed that the disk cache survives a browser restart, which is the basis for saying the cold comparison later is not "empty cache versus full cache".

**`stopAllWorkers` does not make a cold start.** My first way to produce a cold start was CDP's `ServiceWorker.stopAllWorkers` (which only the page session accepts, not the browser session). The worker's `runningStatus` did become `stopped`, but the startup measured on the next navigation was 1.6 ms. With the same renderer process still alive, only the script is reloaded, which is effectively warm. What resembles a user coming back after days, with the worker starting from nothing, is quitting the browser process and reopening it with the same profile, so I paid the cost of a restart in every run. Part 1 said a cold start cannot be reproduced with DevTools attached; here I learned that even without DevTools, a stop command alone is not enough.

**Responses that went through the worker report `transferSize` differently.** A navigation answered by the worker reports the uncompressed body size (236,137) while the same page fetched without the worker reports the compressed size (55,576). Static assets that went through the worker report 0. I first thought the proxy pacing was not applied; it was a difference in accounting. Byte counts cannot be compared across worker and no-worker conditions with this value, and hit counts like the "15 of 33" above can only be taken in the no-worker condition.

## Result: no cost to be seen

The five conditions in one table:

| Condition                | Phase                | Worker startup | TTFB             | FCP             | LCP               |
| ------------------------ | -------------------- | -------------- | ---------------- | --------------- | ----------------- |
| No worker                | warm / cold / reload | 0              | 81 / 82 / 81     | 116 / 120 / 356 | 528 / 584 / 376   |
| Worker + preload         | warm / cold / reload | 0 / 2 / 0      | 82 / 83 / 81     | 120 / 120 / 360 | 524 / 580 / 380   |
| Worker, preload off      | warm / cold / reload | 0 / 3 / 0      | 82 / **94** / 82 | 124 / 128 / 356 | 520 / 588 / 384   |
| No worker, CPU 6x        | warm / cold / reload | 0              | 80 / 82 / 83     | 204 / 260 / 600 | 896 / 1228 / 1080 |
| Worker + preload, CPU 6x | warm / cold / reload | 0 / 3 / 0      | 83 / 84 / 81     | 204 / 260 / 460 | 868 / 1060 / 1124 |

(ms, p50. The reload rows bypass the worker even in worker conditions, hence startup 0; in those runs `workerStart` was recorded as 0 and `controller` as `null`.)

The first two rows are the substance of the second attempt. Toggling the worker moved none of TTFB, FCP, or LCP by more than 5 ms at p50. Cold startup after a full browser restart was 2 ms (every one of the 25 runs landed at 2 to 3 ms), and warm startup was below measurement resolution. The warm startup of about 2 ms measured in part 1 turns out not to be much different cold. All 25 warm TTFBs fell within 79 to 83 ms without the worker and 80 to 83 ms with it, so a larger sample did not look likely to produce a different answer on this machine.

This was not the picture I expected. The field data pointed at tens of milliseconds, so I assumed the lab would land somewhere near. On this machine, the cost of going through this worker was effectively zero.

### Static assets: Cache Storage versus the HTTP cache

The FCP column being identical across conditions deserves its own note. In the worker conditions every static asset came from Cache Storage (assets with `workerStart > 0`: 33 of 33 warm, 37 of 37 cold), and in the no-worker condition they came from the HTTP cache (re-downloads: 15 warm, 4 cold). Different stores, same FCP: 116 versus 120 ms warm, 120 versus 120 ms cold. For a returning visitor, **Cache Storage is not faster than the HTTP cache**. Both read from disk, neither touches the network.

This answers the question left on the LCP breakdown table. The halved render delay on the worker path in the field data, and part 2's "returning visitor FCP -43%", are more likely the difference between a first visit with an empty cache and a return visit with a full one than a gain produced by Cache Storage. The 16-day FCP p50 by the same method is desktop `no` 1,208 ms versus `yes` 616 ms, and reading most of that difference as the return visit itself rather than the worker is what agrees with the lab. It puts numbers behind part 1's judgment that if returning-visit performance is the goal, this layer is probably not the answer. Cache Storage's value, of course, is offline rather than speed, and that is not what this table measures.

### Hard reload and soft navigation

The reload row ties into the field data's `reload` control group. In the lab, reload TTFB was 81 ms with or without the worker. That is the expected result (both bypass the worker), but it is the reference for reading the field data's `reload, no` 56 ms versus `reload, yes` 131 ms. That difference comes not from the reload itself but from the `yes` side having gone through the worker, and the lab could not find a cost in that passage.

The `?_rsc=` requests that part 2 identified as where the worker does most of its work turned out to have two faces. The 325 prefetches for links in the home page viewport were effectively identical: duration p50 of 81 ms through the worker and 80 ms without it, with time to first byte at 78 ms on both sides. All 325 had `workerStart` above 0 in the worker condition, so they clearly went through it, and going through it took 1 ms.

The RSC request that fires when you click an article that was not prefetched was a different matter. In all 25 runs it was 175 ms through the worker against 131 ms without it, a gap of 44 ms. Time to first byte was 80 ms versus 78 ms, so the entire difference came from receiving the body. This is the first place in the measurement where the worker's cost became visible.

### Where that difference comes from: traffic no metric reports

The first suspect for a slower body phase was the cost of cloning the response into the cache, but part 2's design offers a more plausible candidate. Soft navigations leave no HTML behind, so whenever this worker sees an RSC request that represents a real visit, it fetches the same path's HTML once more in the background and parses that HTML to pre-fetch the article's images as well. Those requests originate in the worker, so the page's resource timing never sees them. Counting what the page cannot see means moving the counter, so I attached one to the shaping proxy from earlier.

```javascript
let stats = []

http.createServer((req, res) => {
  if (req.url === '/__stats') {
    // hand back everything that has passed through, then clear it
    const body = JSON.stringify(stats)
    stats = []
    res.writeHead(200, {'content-type': 'application/json'})
    res.end(body)
    return
  }

  const rec = {url: req.url, bytes: 0}
  stats.push(rec)
  // ... the body pacing loop below adds rec.bytes += chunk.length
})
```

I loaded the home page, cleared the counter, clicked an article link once, and waited 8 seconds, measuring both the same-origin traffic that passed through the proxy in that window and the timing of the one RSC request the click produced. This is a separate measurement taken on a different day and a different article than the tables above, so the absolute numbers differ slightly, but the three conditions were measured back to back on the same article (10 runs each).

| Condition                   | Click RSC duration | Requests | Bytes   |
| --------------------------- | ------------------ | -------- | ------- |
| No worker                   | 146 ms             | 36       | 317,702 |
| Worker                      | 202 ms             | 41       | 589,056 |
| Worker, background save off | 148 ms             | 36       | 317,702 |

The third row settles the causality. Removing the single line in `handleRSC` that calls `savePageHTML` (leaving the RSC response caching in place) brought the request count and the byte count back to the no-worker condition without a single byte of difference, and 54 of the 56 ms disappeared with them. The remaining 2 ms is the cost of passing through the worker; the rest was the worker's background work sharing the same wire.

The five added requests break down like this.

| Added request                                 | Bytes   |
| --------------------------------------------- | ------- |
| One copy of the article HTML (`savePageHTML`) | 55,276  |
| Four `/_next/image` thumbnails                | 216,078 |

Reading one article through a soft navigation costs 310 KB of same-origin traffic without the worker and 575 KB with it, an increase of 85%. And that figure is smaller than reality: most of this blog's article images live on external domains and never pass through the proxy, and the worker fetches those too.

Hidden inside those 216 KB is a defect this measurement exposed. The worker is supposed to pick the srcset candidate closest to 1080 px when choosing which variant to store, yet all four it fetched were `w=3840`. Opening the HTML made the reason obvious. Next.js serves the attribute as `srcSet`, and the extraction regex is `(?:src|srcset)="`, so case sensitivity makes it miss the attribute entirely, leaving only `src`, which holds the largest variant. It had been storing a thumbnail rendered at 120 px on screen at 3840 px. HTML attribute names are case-insensitive, so the browser was never bothered; only the regex was.

```javascript
// Next.js renders the attribute as srcSet, so a case-sensitive regex misses every srcset candidate
const attrRe = /(?:src|srcset)="([^"]+)"/gi
```

The fix was one flag character. Running the same measurement again, the four images did switch to the `w=1080` variant as intended, but the bytes saved fell far short of what I expected. The four images together went from 216,078 to 196,709, a 9% reduction, and the total traffic for one click went from 589,056 to 569,687, a reduction of 3%. One of the four was actually larger at 1080 px than at 3840 px (51,147 against 60,851). These thumbnails are drawn in code by `/api/og/art` and use flat colors, so shrinking the width does not shrink the encoded size proportionally and the comparison can even invert depending on how the resampling lands. The defect was real, in other words, but the waste it created was smaller than it looked, and even after the fix one click still costs 79% more traffic. The real cost was never the badly chosen variant; it is the structure of fetching one more copy of the HTML and four more thumbnails in the background every time an article is read.

It is the kind of defect that never shows up as latency and only shows up as bytes, which is why it went unnoticed all through part 2 until I counted at the proxy.

One thing becomes clear here. The place where this worker's cost is largest is the soft navigation, and the metrics web-vitals reports are keyed to hard navigations, so the field data from the first attempt does not contain this stretch at all. Without moving to the lab, this cost would not have appeared in any metric.

## Turning preload off to locate the cost

The third row taught me the most. With preload off, cold-navigation TTFB alone shifted from 83 to 94 ms, an 11 ms difference; warm and reload stayed put.

![Cold-start navigation TTFB distribution by condition. Only the preload-off condition shifts by 11 ms; the rest sit within 82 to 84 ms regardless of the worker](./images/service-worker-caching/lab-cold-ttfb-by-condition.en.png)

This worker uses preload in the standard form shown in part 1. Navigations in `sw.js` go through `networkFirst()`, whose first line looks at the preload response.

```javascript
async function networkFirst(event, cacheName) {
  const {request} = event
  try {
    // For navigations, use the response that preload already started. For
    // non-navigations or without preload support it resolves to undefined and falls through to fetch
    const response = (await event.preloadResponse) ?? (await fetch(request))
    if (response.ok) {
      event.waitUntil(putWithTrim(cacheName, request, response.clone()))
    }
    return response
  } catch {
    // ... cache and offline page fallback
  }
}
```

What makes 11 ms interesting is that worker startup is only 3 ms. Navigation preload starts the navigation request without waiting for the worker to boot[^3], so the time preload hides ought to be the startup time, yet it is 8 ms more than that. The remaining 8 ms is the serial stretch that comes after the worker is up: dispatching the fetch event to the worker thread, the handler reaching `event.respondWith()`, and the `fetch(request)` in the code above leaving for the network service. Without preload the request cannot depart until that stretch ends; with preload the request departs together with the navigation and the worker merely picks up the already-arrived response via `event.preloadResponse` and hands it back.

The zero difference in the warm state is explained by the same picture. When the worker is already running and the path opened by the previous fetch is still alive, dispatch and fetch departure finish within a millisecond, leaving preload nothing to hide. Put the other way, preload's effect appears only on cold starts, and there more in the preparation stretch after startup than in startup itself. Part 2 listed preload as "the next task for recovering TTFB"; this measurement says the ceiling of that recovery on this machine is 11 ms. It also makes it natural that the August 23 deploy left no trace in the field data in the first attempt. On a graph where daily p50 swings by hundreds of milliseconds, a cold-start-only effect of around 11 ms cannot be read.

## Third attempt: slowing the device

11 ms falls short of the field data's 35 ms. Of the remaining candidates, the one a lab can manufacture is device speed. An M5 sits near the fast end of any real user device distribution, so the hypothesis was that a 6x CPU throttle would stretch worker startup and dispatch enough to narrow the gap.

Before testing the hypothesis there was something to check. I was not sure whether DevTools CPU throttling slows only the page's main thread or the worker thread as well. Startup time was the discriminator: if `fetchStart - workerStart` grows under throttling, the worker is affected. It came out at minimum 2 ms, p50 3 ms, p90 13 ms, maximum 13 ms, clearly up from the unthrottled 2 to 3 ms and with a tail, so the worker thread is throttled too.

That was all, though. Under the 6x throttle, the cold TTFB difference between worker and no worker was 82 versus 84 ms, or 2 ms. FCP was identical at 260 ms, and LCP, with only 10 samples, wobbled too much to call a direction (1,228 versus 1,060 with the worker lower, but reasons outside the sample cannot be ruled out). That the throttle certainly hit the page side shows in FCP going from 120 to 260 ms and warm LCP from 528 to 896 ms. Even inside that, the worker's share stayed in single digits. A worker whose startup stays in single-digit milliseconds even when slowed 6x could not produce 35 ms, at least not through the kind of slowness this throttle imitates.

## Leaving the gap

Lined up in one sentence, the three attempts read like this: field p50 points at +35 ms (navigate) and +75 ms (reload) for going through the worker, the lab points at 2 ms of startup plus an 11 ms serial stretch that preload hides, and slowing the CPU 6x does not leave single digits. Separating what was confirmed from what was not:

Confirmed. This worker's per-navigation cost lives more in the preparation stretch after startup than in startup itself, and navigation preload parallelizes the whole of it, returning double-digit milliseconds on cold starts only. The warm-state cost is unmeasurable. The far larger cost is in bytes rather than latency: every article read through a soft navigation adds nearly 80% more same-origin traffic, and that bandwidth contention comes back as roughly 50 ms on the click's own request. That stretch never reaches web-vitals, which reports per hard navigation. For a returning visitor Cache Storage is not faster than the HTTP cache, so much of what this series read as a returning-visitor FCP improvement belongs to the return visit itself rather than to the worker. In the field data, the `reload` control group arrives at under one sample a day and will not accumulate by waiting, and the `navigate` control group mixes new and returning visitors and will not get cleaner as samples grow.

Not confirmed. What fills the space between the lab's 11 ms and the field's 35 ms. Candidates remain: the lab is a local server with no CDN path, real users' Cache Storage lives under disk conditions and quota pressure, and CPU throttling does not imitate the memory and storage latency of a slow device. Recalling that p75 for `reload, yes` was 833 ms, the cost is likely not spread evenly across users but spikes in some environments, and failing to reproduce those environments on one M5 is the limit of this measurement. With a few real devices the next step would be clear; for now this is the honest line.

So this is about as much as the series can finally say about the cost of going through the worker. In latency the cost is real but small, its size ranges from single-digit milliseconds to hundreds depending on the environment, and for this blog's real users it is tens of milliseconds at the median. The larger cost sits in the bytes the worker fetches in the background, and since those bytes are what make an article readable offline, that side reads less as waste than as this feature's price tag. Navigation preload should stay on, and what it recovers is limited to cold starts. And most of the effort behind these numbers went not into the worker but into making the measurement trustworthy. It took one round to confirm that a control group would not form on its own, and three falls, over the proxy's headers, the interception's cache, and the definition of a cold start, before the first table appeared. Part 2 closed by saying that collecting real user metrics for a before-and-after comparison should come first; I would now add a sentence. When the real user metrics do not give you a control group, the cost of building one is part of the feature's cost.

---

[^1]: [PerformanceResourceTiming: workerStart](https://w3c.github.io/resource-timing/#dom-performanceresourcetiming-workerstart), Resource Timing. Returns the time just before the service worker is started, or just before the fetch event is dispatched if it is already running, and 0 if the request did not go through a worker. `PerformanceNavigationTiming` inherits this interface.

[^2]: [browserContext.route()](https://playwright.dev/docs/api/class-browsercontext#browser-context-route), Playwright docs. States "Enabling routing disables http cache."

[^3]: [NavigationPreloadManager](https://developer.mozilla.org/en-US/docs/Web/API/NavigationPreloadManager), MDN. Describes the mechanism that starts the navigation request in parallel with worker startup and `FetchEvent.preloadResponse`, through which the worker receives that response.
