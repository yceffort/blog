---
title: 'Measuring the Cost of Going Through a <em>Service Worker</em>: Building in the Lab the Control Group GA4 Could Not Give Me'
tags:
  - web-performance
  - service-worker
  - pwa
  - nextjs
published: false
date: 2026-08-28 20:00:00
description: 'I set out to confirm the 500 ms hint that part 2 left behind, but the hard reloads that would form the control group arrive at under one a day. So I built the control group myself, with Playwright and a shaping proxy, and found that going through the worker costs 2 ms on a navigation, and that the cost is not latency but the bytes the worker fetches in the background on every click. The gap I had left between the lab and the field turned out, only after the post was written, to be a measurement definition difference created by 103 Early Hints. Third part of the service worker caching deep dive series.'
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

This table is what made me drop the plan to wait. Fewer than one visitor a day performs a hard reload, so three more weeks would still yield 16 samples and six weeks something in the thirties. And 12 events are not 12 observations. Expanded down to `dateHourMinute`, 7 of the 12 sit in three buckets on August 22, at 13:12, 13:14, and 13:16, which is me repeating hard reloads for five minutes to check that the instrumentation was working. Add the one other event from the same profile and 8 of the 12 came from my own browser. Counted as distinct visits it is six over 16 days; counted as distinct profiles it is five. Not 0.8 a day but one every three days, and more than half of that is my own traffic, generated while going to look at the control group. If the sample is small not because the observation window is short but because the behavior itself is rare, more time does not look likely to fill it. The property that makes a hard reload a control group, that it bypasses the worker, comes with the property that leaves that control group empty.

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

The `reload` contrast that averaged 500 ms is 75 ms at p50, and the `navigate` contrast, which must carry the confounding caveat, sits around 35 ms regardless of device type. The 75 ms on the `reload` side, though, stands on the burst above. Drop the 7 burst events from the 11 desktop `no` samples and four remain: 12, 20, 25, and 64 ms. However you take the median it is in the twenties, which puts the gap against `yes` 131 ms over 100 ms rather than at 75. That is not a bigger-gap conclusion; it means the size cannot be stated. The 833 ms that stood for the `yes` tail is likewise a single event at 15:28 on August 22, and since it comes from the same profile as the burst it is most likely mine too.

Part 2's "returning visitor TTFB +525 ms" should be reread in this light. The worker did not add 500 ms to everyone; it added tens of milliseconds to most users and much more to some, and that tail pulled the average up. That reading is closer to the data. One more caveat has to be attached to those "tens of milliseconds" later on, because whether the +34/+36 ms in this table is latency the worker created is itself uncertain. The fourth trap comes back to it.

I applied the same method to the LCP breakdown that part 2 added to the instrumentation. This is the two days of August 27 and 28, after the corrected `sw_controlled` detection was deployed, `navigate` navigations only.

| LCP stage p50 (ms)     | no (79) | yes (36) |
| ---------------------- | ------- | -------- |
| LCP                    | 1,220   | 752      |
| lcp_ttfb               | 99      | 159      |
| resource load delay    | 0       | 0        |
| resource load duration | 0       | 0        |
| element render delay   | 1,026   | 494      |

The two resource rows are 0 because this blog's LCP element is almost always the article title `h1` (text), so LCP is effectively TTFB plus render delay. The worker path is 60 ms slower in the TTFB stage and half as long in render delay. That matches part 2's picture: the worker's cost sits before the first byte and its benefit after it (static assets and fonts). `lcp_ttfb` reads the same `responseStart` that web-vitals sends as TTFB, so the caveat attached to the table above attaches to this 60 ms as well. But the `yes` column here is mostly returning visitors, and a returning visitor would have had the same assets in the HTTP cache too, so this table cannot tell whether the halved render delay comes from Cache Storage or simply from "a return visit with a full cache". That question comes back in the lab.

The limits of this aggregation showed quickly, though. I had deployed navigation preload on August 23 and wanted to see whether `yes` TTFB moved around that date, but plotting daily p50 showed it was not a resolution at which a deploy could be read.

![Daily TTFB p50 by worker involvement. Daily p50 swings between 42 and 521 ms and the preload deploy on August 23 is not distinguishable](./images/service-worker-caching/rum-daily-ttfb-p50.en.png)

Daily samples range from 12 to 78, so daily p50 swings between 42 and 521 ms. Percentiles fix the average's outlier problem but not the sample size problem. This was as far as the field data would go: the cost of going through the worker is on the order of tens of milliseconds, that cost sits before the first byte, and picking out the effect of an individual measure like preload inside that range is beyond this traffic.

## Second attempt: building the control group

The field data's two problems (the control group does not form, and when it does it is confounded) do not exist in a lab by definition. Same device, same network conditions, toggle only the worker. The lab has its own problems instead: how close are the conditions to reality, and how do the numbers connect back to the field data. The first could be answered by design; the second only got its answer once this post was nearly finished.

> Measurement environment: Apple M5 MacBook, macOS 26.5.2, Chrome for Testing 151.0.7922.34 as downloaded by Playwright 1.62.1. The target is this blog built with `next build` and served locally with `next start` (Next.js 16.3.1); the service worker is `sw.js` as deployed at the time of measurement (code v4); later in this post I find and fix a defect in that v4, and the tables here are from before the fix. Network conditions come from the proxy described below. Each condition ran 25 times (10 for the CPU-throttled conditions), and figures in the text are p50 unless stated otherwise. The lab measurements in this section ran on August 28 and 29; the production-domain measurements further down ran separately on September 1, on macOS 26.6.2. The measurement scripts and raw data live in the repository under `apps/blog/scripts/sw-lab/`.

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

On a request it waits one one-way delay before forwarding upstream, waits another one-way delay after the response headers arrive before sending them down, and streams the body in 4 KB chunks through a global token bucket (`nextFree`) paced at 450 KB/s. Because the bucket is global, concurrently open responses share the bandwidth. The values were picked with mobile 4G in mind (75 ms round trip, 90% of 4 Mbps download) and are slower than the DevTools Fast 4G preset (90% of 9 Mbps download, a 60 ms target round trip), but what matters more than the absolute values is that page, worker, and preload all pass through the same proxy. Upload is not paced; everything measured is a GET with no request body.

The `flushHeaders()` line above was not there at first, and in that state the dry run's no-worker TTFB came out at 205 ms, when 75 ms of round trip plus server time should have landed around 90. Node's `res.writeHead()` does not send headers immediately; it holds them until the first `write()`, so the transmission time of the first chunk was sitting inside TTFB. The proxy at the time of that dry run wrote the body in one piece rather than splitting it, so that first chunk was the whole 55 KB of compressed HTML, which is 122 ms at 450 KB/s. Add 122 to 75 and you land around 205.

The code above is the final version, with 4 KB sub-chunking, so the same number does not come back out of it, and that is worth saying plainly. With sub-chunking the headers leave the moment the first 4 KB is written, so what rides on TTFB is 9 ms rather than 122, and because `next start` streams the HTML the upstream's own first chunk is small enough that even those 9 ms did not reproduce. Removing only `flushHeaders()` from the final code and measuring with `curl` gives a `time_starttransfer` of about 79 ms either way. I kept the line anyway, because TTFB is better off not depending on how the upstream happens to chunk its body. Either way, running the real measurement in that state would have had me interpreting a 100 ms that had nothing to do with the worker. Before trusting the proxy I had to measure the proxy.

### Four traps

Beyond the proxy, four more things nearly invalidated the measurement. I stepped on the first three while building the lab; the last one I only found after the lab had finished running and this post's conclusion was already written.

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

**The lab and the field data were not measuring the same moment.** I had been holding the `navigate` +34/+36 ms from the first attempt next to the single-digit milliseconds the lab is about to produce as if they were the same kind of number. The two were timing different moments.

Per spec, `responseStart` returns `firstInterimResponseStart` when that is not 0, and falls back to `finalResponseHeadersStart` only when it is[^3]. Chrome 115 had moved `responseStart` to the final headers and Chrome 133 reverted it over a compatibility problem, which is how the definition ended up here[^4]. So on a site that sends 103 Early Hints, `responseStart` is the moment the 103 arrived, not the moment the final headers did.

yceffort.kr sends 103. Confirming that cost me a detour, because a plain `curl` only ever shows the 200. The 103 appears once you attach `sec-fetch-mode: navigate` so the request looks like a navigation. A Chrome UA and `accept: text/html` are not needed, and `sec-fetch-dest: document` on its own does not do it. Its content is two lines, `server: Vercel` and `x-vercel-id`, with no `link` header, so it is not even being used for preloading. It is a signal that the edge received the request, and nothing more.

The problem is that this value changes once the worker is in the path. I attached Playwright to the production domain and ran twelve pairs, alternating the blocked and the allowed condition on each iteration to cancel out drift over time (all 24 runs came back `x-vercel-cache: HIT`; a response that passed through the worker reports an empty `nextHopProtocol`, so h2 only shows up in the twelve no-worker runs). The side opened with `serviceWorkers: 'block'` came to a median `firstInterimResponseStart` of 8.8 ms against a median `finalResponseHeadersStart` of 46.0 ms, and `responseStart` took the former. The worker-controlled side, with the controller acquired in all twelve, came to a median `firstInterimResponseStart` of 36.3 ms, and `finalResponseHeadersStart` was 0 in all twelve. On the worker path the interim timing appears not to be propagated, and the final header time lands in the interim slot instead. The no-worker side was reporting when the 103 arrived and the worker side when the final headers arrived, under the same name. Line the final headers up against each other and it is 36.3 against 46.0, with the worker side nearly 10 ms faster; but the two conditions travel different paths, so that difference should not be read as an improvement either, only as far as "it is not +35 ms".

A controlled experiment varying only the 103 says the same thing. I stood up one server that sends the 103 and one that does not, fixed both to release the final headers 40 ms later, and read `responseStart` across the worker conditions, 15 runs per condition.

| Condition                  | responseStart p50 | Range        |
| -------------------------- | ----------------- | ------------ |
| No SW, 103 sent            | 1.4 ms            | 0.5~1.8 ms   |
| No SW, no 103              | 42.3 ms           | 41.2~43.5 ms |
| SW, 103 sent               | 43.9 ms           | 42.3~45.3 ms |
| SW, no 103                 | 43.3 ms           | 41.8~44.5 ms |
| SW (preload off), 103 sent | 42.7 ms           | 41.5~44.9 ms |

Without the 103, the difference between having the worker and not having it is 1 ms. The 41 ms that had been showing up was definition, all of it. The experiment also shows that even in a condition where no 103 is ever sent, under worker control the interim slot fills with a value in the forties, and that `finalResponseHeadersStart` was never 0 across the thirty no-worker runs and always 0 across the forty-five worker-controlled ones.

The size matches too. Across the twelve production runs above, the span between the 103 and the final headers was between 23 and 55 ms (once it spiked to 304), and measuring it separately five times with `curl --trace-time` gives 37 to 66 ms. It swings that much with the line and the time of day, but it is clearly the same order of magnitude as the first attempt's `navigate` +34/+36 ms. The +60 ms on `lcp_ttfb` rides the same artifact, since web-vitals reads the same `responseStart`. The reach is not narrow either: of the 2,014 TTFB events between August 13 and 28, 1,774 (88.1%) came from Chromium-family browsers, and of the 1,657 from Chrome, 1,544 (93.2%) were version 133 or later.

And the lab was an apparatus that could not catch this. The shaping proxy above is plain node `http`: it calls `res.writeHead()` and `res.flushHeaders()` and never forwards the `information` event that the upstream `http.request` raises. With no 103 in existence, both the worker condition and the no-worker condition were timing the final headers, which is why the gap between them came out under 5 ms. Having fussed that much over when the headers go out, it never occurred to me to pass the 103 along.

This finding changes the conclusion that follows. Left as it was, a reader would read the gap between the lab and the field as latency, so the last section sorts it out again.

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

The FCP column being identical across conditions deserves its own note. It is tempting to say that in the worker conditions every static asset came from Cache Storage, but `workerStart > 0` (33 of 33 warm, 37 of 37 cold) does not support that claim. A value above 0 only means the request went through the worker, and an asset the worker fetched from the network on a cacheFirst miss is above 0 too. That `transferSize` is 0 throughout the worker conditions is not evidence of a cache hit either; it is the accounting difference from the trap just above.

Moving the counter settles it directly. Using the counter attached to the shaping proxy to count how many `/_next/static/` requests cross the wire on the warm and cold navigations, the two conditions were exactly equal: 15 requests and 206,490 bytes warm on both sides, 4 requests and 150,609 bytes cold on both sides, down to the same set of URLs. In the worker condition, the warm navigation let the chunks first used by that article through as cacheFirst misses, and the `fetch()` those misses issued used the HTTP cache underneath. Where Cache Storage actually answered is the cold side, with the assets stored during the warm navigation surviving the browser restart.

With the two conditions pulling the same bytes off the wire, FCP is 116 versus 120 ms warm and 120 versus 120 ms cold. For a returning visitor, **Cache Storage is not faster than the HTTP cache**. Both read from disk, neither touches the network.

This answers the question left on the LCP breakdown table, but two different comparisons have to be separated before answering it.

One is the `sw_controlled` contrast within a single period. The halved render delay on the worker path in the field data belongs here, as does the 16-day FCP p50 of desktop `no` 1,208 ms versus `yes` 616 ms. On this side `no` is mostly first visits and `yes` mostly return visits, so reading most of the difference as an empty cache against a full one rather than as the worker is what agrees with the lab.

The other is part 2's "returning visitor FCP -43%", and that explanation does not work there. Both 1,463 ms and 829 ms are restricted to returning visitors, so a first visit with an empty cache is present on neither side. Instead, since the lab found no speed gain in Cache Storage, the remaining explanation leans toward a change in traffic composition between the two periods. Part 2 already logged the caveats: move the cut forward to just before the v3 deploy and -43% becomes -27%, and CLS, which the worker cannot touch, moved 19% over the same span. Those caveats now carry more weight.

Either way, none of this contradicts part 1's judgment that if returning-visit performance is the goal, this layer is probably not the answer. Cache Storage's value, of course, is offline rather than speed, and that is not what this table measures.

### Hard reload and soft navigation

The reload row ties into the field data's `reload` control group. In the lab, reload TTFB was 81 ms with or without the worker. That is the expected result (both bypass the worker), but it is the reference for reading the field data's `reload, no` 56 ms versus `reload, yes` 131 ms. That `no` side, though, is effectively timing five minutes of my own clicking, as seen earlier, so what can be used as a reference here is the direction and not the size. If there is a difference it comes not from the reload itself but from the `yes` side having gone through the worker, and the lab could not find a cost in that passage. And after the fourth trap, even whether that difference is latency is no longer certain.

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

Over the 8 seconds of clicking and staying, the same-origin traffic that crossed the proxy went from 310 KB to 575 KB, and the added 265 KB splits into two things of a different nature.

The one copy of the article HTML, 55 KB, is traffic the worker adds outright. A soft navigation carries no HTML, so the control group never receives those bytes under any circumstance.

The 216 KB of thumbnails is less an addition than an advance. Those four are the related-article thumbnails below the destination article, and the component that renders them is a `next/image` without `priority`, so it defaults to `loading="lazy"`. The control group did not receive them because the measurement waited 8 seconds after the click without scrolling, not because there was no worker. A real reader scrolls down, and then the control group receives these images too. It just receives a far smaller variant, the one that matches `sizes="(min-width: 768px) 120px, 84px"`. Against the worker's `w=3840`, that is still a large difference.

And this is a one-article sample. All 10 runs per condition repeated the same article, and that article happens to have no images in its body, so the five added requests were one copy of the HTML and four link thumbnails and nothing else. An article with body images would be larger still, since the worker fetches those in the background too, and an article using images from an external domain would leave that side out of this number entirely, since it never passes through the proxy.

Hidden inside those 216 KB is a defect this measurement exposed. The worker is supposed to pick the srcset candidate closest to 1080 px when choosing which variant to store, yet all four it fetched were `w=3840`. Opening the HTML made the reason obvious. Next.js serves the attribute as `srcSet`, and the extraction regex is `(?:src|srcset)="`, so case sensitivity makes it miss the attribute entirely, leaving only `src`, which holds the largest variant. It had been storing a thumbnail rendered at 120 px on screen at 3840 px. HTML attribute names are case-insensitive, so the browser was never bothered; only the regex was. The fix was one flag character.

```javascript
// After the fix. Next.js renders the attribute as srcSet, so without the i every srcset candidate is missed
const attrRe = /(?:src|srcset)="([^"]+)"/gi
```

Running the same measurement again, the four images did switch to the `w=1080` variant as intended, but the bytes saved fell far short of what I expected. The four images together went from 216,078 to 196,709, a 9% reduction, and the total traffic for one click went from 589,056 to 569,687, a reduction of 3%. One of the four was actually larger at 1080 px than at 3840 px (51,147 against 60,851). These thumbnails are drawn in code by `/api/og/art` and use flat colors, so shrinking the width does not shrink the encoded size proportionally and the comparison can even invert depending on how the resampling lands. The defect was real, in other words, but the waste it created was smaller than it looked. Even after the fix the traffic over those 8 seconds is still 79% higher, and the share of it the control group never receives is the one copy of the HTML, 55 KB, or 17%. The rest is the worker fetching in advance, and in a larger variant than the screen needs, what the control group would receive anyway once the reader scrolls. The real cost was never the badly chosen variant; it is the structure of fetching one more copy of the HTML and four more thumbnails in the background every time an article is opened.

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

What makes 11 ms interesting is that worker startup is only 3 ms. Navigation preload starts the navigation request without waiting for the worker to boot[^5], so the time preload hides ought to be the startup time, yet it is 8 ms more than that. The remaining 8 ms is the serial stretch that comes after the worker is up: dispatching the fetch event to the worker thread, the handler reaching `event.respondWith()`, and the `fetch(request)` in the code above leaving for the network service. Without preload the request cannot depart until that stretch ends; with preload the request departs together with the navigation and the worker merely picks up the already-arrived response via `event.preloadResponse` and hands it back.

The zero difference in the warm state is explained by the same picture. When the worker is already running and the path opened by the previous fetch is still alive, dispatch and fetch departure finish within a millisecond, leaving preload nothing to hide. Put the other way, preload's effect appears only on cold starts, and there more in the preparation stretch after startup than in startup itself. Part 2 noted that August 23, the day preload was turned on, falls in the middle of that post's TTFB contrast window, and handed over the question of whether the effect of turning it on can be teased out of real user data. The answer this measurement gives is that the ceiling of that recovery on this machine is 11 ms, and if so, it cannot. It also makes it natural that the August 23 deploy left no trace in the field data in the first attempt. On a graph where daily p50 swings by hundreds of milliseconds, a cold-start-only effect of around 11 ms cannot be read.

## Third attempt: slowing the device

11 ms falls short of the field data's 35 ms. Of the remaining candidates, the one a lab can manufacture is device speed. An M5 sits near the fast end of any real user device distribution, so the hypothesis was that a 6x CPU throttle would stretch worker startup and dispatch enough to narrow the gap.

Before testing the hypothesis there was something to check. I was not sure whether DevTools CPU throttling slows only the page's main thread or the worker thread as well. Startup time was the discriminator: if `fetchStart - workerStart` grows under throttling, the worker is affected. It came out at minimum 2 ms, p50 3 ms, p90 13 ms, maximum 13 ms, clearly up from the unthrottled 2 to 3 ms and with a tail, so the worker thread is throttled too.

That was all, though. Under the 6x throttle, the cold TTFB difference between worker and no worker was 82 versus 84 ms, or 2 ms. FCP was identical at 260 ms, and LCP, with only 10 samples, wobbled too much to call a direction (1,228 versus 1,060 with the worker lower, but reasons outside the sample cannot be ruled out). That the throttle certainly hit the page side shows in FCP going from 120 to 260 ms and warm LCP from 528 to 896 ms. Even inside that, the worker's share stayed in single digits. A worker whose startup stays in single-digit milliseconds even when slowed 6x could not produce 35 ms, at least not through the kind of slowness this throttle imitates.

## Leaving the gap

Lined up in one sentence, the three attempts read like this: field p50 points at +35 ms on `navigate` for going through the worker, the lab points at 2 ms of startup plus an 11 ms serial stretch that preload hides, and slowing the CPU 6x does not leave single digits. And that +35 ms is not latency; it is a measurement reference point shifted by 103 Early Hints. Separating what was confirmed from what was not:

What was confirmed comes first. Line the two conditions up on the same moment and no worker-detour latency is observable at p50 on this site. The lab pointing below 5 ms and the field pointing at 35 ms were not two different answers but two different reference points. Measured inside the lab, this worker's per-navigation cost lives more in the preparation stretch after startup than in startup itself, and navigation preload parallelizes the whole of it, returning 11 ms on cold starts only. The warm-state cost is unmeasurable. The cost that does exist is in bytes rather than latency: over the 8 seconds of clicking an article and staying on it, same-origin traffic goes from 310 KB to 575 KB, and that bandwidth contention comes back as roughly 50 ms on the click's own request. Of that, the only part the control group never receives is the one copy of the HTML, 55 KB; the 216 KB of thumbnails is what the worker fetches in advance, in a larger variant, of what the control group would receive anyway once the reader scrolls. Neither reaches web-vitals, which reports per hard navigation. For a returning visitor Cache Storage is not faster than the HTTP cache, so the `sw_controlled` FCP contrast within a single period is better read as mostly the return visit itself. And in the field data the `reload` control group amounts to six visits over 16 days with 8 of the 12 events being my own traffic from going to check on it, so it will not accumulate by waiting, while the `navigate` control group mixes new and returning visitors and will not get cleaner as samples grow.

What was not confirmed also comes in three parts. First, the tail. When the edge misses, the span between the 103 and the final headers stretches to somewhere between three and five seconds, and with no way to query each request's edge cache state in RUM I could not tell how much of part 2's +525 ms average that component accounts for. Next, Safari. Its `navigate` p50 is `no` 126 ms against `yes` 172 ms (81 and 80 samples), a gap comparable to Chromium's, but how Safari handles the 103 and how that lands in `responseStart` is something I did not check. Last, real devices. The lab is a local server with no CDN path, real users' Cache Storage lives under disk conditions and quota pressure, and CPU throttling does not imitate the memory and storage latency of a slow device. Failing to reproduce those environments on one M5 remains the limit of this measurement.

## So does it help performance

Everything measured above is cost. But this series has quoted numbers from the benefit side more than once without ever checking them. Writing "measuring the cost" in the title is part of why, and closing here would show only half the picture.

The largest of them is part 2's returning-visitor FCP average, 1,463 ms down to 829 ms, or -43%. As the previous section separated out, both sides of that comparison are restricted to returning visitors, so a first visit with an empty cache is present on neither, and the difference between new and returning visitors does not explain it. But the lab found the same FCP for Cache Storage and the HTTP cache, so the mechanism does not explain it either. The caveats part 2 attached to that table, that moving the cut forward to just before the v3 deploy turns -43% into -27%, and that CLS, which the worker cannot touch, moved 19% over the same span, are now less caveats than the main explanation. The reading that returning-visitor FCP improved because static assets came out of Cache Storage is one to drop here.

Closing on "there was no benefit" had a problem of its own, though. The lab is a local server with no CDN round trip. Real users might get a genuine gain from Cache Storage erasing the trip to the edge, and the lab's structure cannot measure that. So I attached the paired comparison from the fourth trap to the production domain again, this time collecting FCP and LCP as well: twenty-five pairs alternating the blocked and the allowed condition on each iteration, warm and cold both, counting only the runs that hit the edge cache.

| Phase | Metric  | No worker | Worker | Delta |
| ----- | ------- | --------- | ------ | ----- |
| warm  | TTFB    | 12.5      | 44.4   | +31.9 |
| warm  | FCP     | 96        | 132    | +36   |
| warm  | LCP p50 | 460       | 200    | -260  |
| cold  | TTFB    | 45.4      | 78.7   | +33.3 |
| cold  | FCP     | 136       | 132    | -4    |
| cold  | LCP p50 | 596       | 528    | -68   |

(ms, p50, 25 runs per condition.)

The two TTFB rows are the Early Hints artifact from earlier and must not be read as latency. The other four are what to read, and the warm LCP was not what I expected. In the lab, toggling the worker moved LCP by less than 5 ms; in production it appeared to drop to less than half. That -260 ms cannot be taken at face value. It is a real p50 over 25 pairs, but this is not a distribution a p50 is allowed to describe.

Sort the raw warm LCP values and it shows.

```text
No worker  168 180 184 188 192 200 200 240 356 448 448 452 460 460 464 500 516 520 520 532 536 536 540 548 628
Worker     168 172 172 176 180 180 184 188 188 192 192 196 200 200 204 208 220 224 224 224 232 232 240 348 452
```

Both conditions split into a fast cluster around 160 to 240 and a slow cluster around 450 to 550, with only two runs in between, at 356 and 348. What the condition changes is not the LCP value but the probability of landing in the slow cluster, and a median under those circumstances hops between the two clusters depending on whether that probability crosses one half. Bootstrap the no-worker p50 of 460 ms out of those same 25 values and the 95% interval runs from 240 to 520. One dataset gives both clusters as its answer. So warm LCP has to be read as a slow-cluster share, not a p50. Counting at a 350 ms boundary, warm is 17/25 for no worker against 1/25 for the worker, and cold is 24/25 against 25/25. Cold sits in the slow cluster in both conditions, so 596 against 528 is a difference within one cluster, and warm is the only phase the condition separates.

My first suspect was my own apparatus. Only the worker condition dwells an extra 3.5 seconds on the home page waiting for `controllerchange`. Matching the dwell across conditions and running twenty more pairs, and reversing the order in which the conditions run for another twelve pairs, both kept the direction (as p50s, 460 against 200 and 524 against 200, though for the reason just given those too only reflect the slow-cluster share), so it was not the apparatus.

To find the cause I dumped the full resource timings. The LCP element is the article title `h1` in every run, and fonts finish around 50 ms in both conditions, so it is not fonts. The difference sat in one place. Opening an article fires 31 `?_rsc=` prefetches at the header navigation, the series list, and the tag links. That is 23 distinct paths, eight of which go out twice, and the two are not the same URL. `_rsc` is a hash over four prefetch-related request headers (`next-router-prefetch`, `next-router-segment-prefetch`, `next-router-state-tree`, `next-url`), so the same path becomes a different URL once that combination changes. All 31 URLs are distinct. Without the worker all 31 go to the network and pull down 345,639 bytes, one of them 82,761 bytes on its own. With the worker the same figure reads zero bytes.

Read that zero as a cache hit and the conclusion is that the worker serves all 31 out of Cache Storage. Open `sw.js` and it cannot.

```javascript
async function handleRSC(event) {
  const {request} = event
  // Prefetches are not cached: only pages actually visited get stored
  const isVisit = !isPrefetchRequest(request)
  if (isVisit) {
    event.waitUntil(savePageHTML(request, event.clientId))
  }

  try {
    const response = await fetch(request) // prefetches come through here too
    if (isVisit && response.ok) {
      event.waitUntil(putWithTrim(RSC_CACHE, request, response.clone()))
    }
    return response
  } catch {
    // the cache is only consulted when the network throws
    const cache = await caches.open(RSC_CACHE)
    // ...
  }
}
```

A prefetch has `isVisit` false, so it is excluded from storage outright, and `cache.match()` sits inside the `catch` that only runs when `fetch()` throws. This worker has never served a prefetch out of Cache Storage, and with it turned on all 31 still go to the network. The zero is the same thing seen in the traps section and again in the static assets section: `transferSize` reads 0 on any response that came through the worker.

The data says the same. Re-aggregating the raw runs for the three conditions:

| Condition          | Prefetches | `transferSize` total | Last prefetch response ends |
| ------------------ | ---------- | -------------------- | --------------------------- |
| No worker          | 31         | 345,639              | 1,115ms                     |
| Worker             | 31         | 0                    | 1,142ms                     |
| No worker, blocked | 18         | 0                    | 898ms                       |

The worker condition sent all 31 in every one of its 12 runs, and the last response finishes at 1,142 ms against 1,115 ms, which is effectively the same. Pulling them from a cache could not produce that. The zero in the blocked condition is zero for a different reason again: a blocked request also reports `transferSize` 0. And the 325 prefetches from the earlier section, the ones that took 1 ms to pass through the worker with a duration matching the no-worker condition, now read differently. They were not fast; they were just passing through.

So why do these 31 go out again on every page load? Because of the response headers, which the browser cache cannot reuse.

```http
cache-control: public, max-age=0, must-revalidate
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
x-nextjs-stale-time: 300
```

These come from the 31 prefetch responses a real browser makes when opening an article page. All 31 carry that same `cache-control`, and 25 of them carry `x-nextjs-stale-time: 300`. Throw `curl` at the same URL and you get `private, no-store` back, but that is a response to a request that does not reproduce the header set named in `vary`, so the browser's values are the ones to use here.

There is no `no-store`, so the browser cache does store the response. But `max-age=0, must-revalidate` means a revalidation round trip to the server before every use, and as long as that round trip remains, most of the point of prefetching is gone. On top of that, of the four entries in `vary`, `next-router-state-tree` differs per originating page. The same target path splits into different cache entries depending on where you navigated from, so it gets stored and rarely matched again. It is not that nothing reuses the response: `x-nextjs-stale-time: 300` means App Router holds it in its own router cache for five minutes, but that cache is in memory and gone the moment the page is opened fresh. The only thing that survives on disk is Cache Storage, and neither `cache-control` nor `x-nextjs-stale-time` appears anywhere in its put and match algorithms. What a lookup reads is the method, the URL, and, unless `ignoreVary` is set, `vary`. Which means putting these in Cache Storage carries the `vary` splitting problem along with them.

That much is correlation. This series has read correlation as causation and walked it back three times, so it needed splitting once more. I added a fourth condition to the three above and ran all of them again, 30 runs per condition: no worker with prefetching as is, the deployed worker as is, the deployed worker with only `handleRSC` swapped for a variant that stores and consults prefetches too, and no worker with only the prefetches blocked. The blocking is done with CDP's `Network.setBlockedURLs`. Playwright's `route()` was unusable because, as the earlier trap showed, it disables the HTTP cache and penalizes only the no-worker condition; instead I enabled the Network domain itself in all four conditions so that its activation is a constant. The execution order was rotated on each iteration.

Getting the variant in took one detour of its own. Swapping the `/sw.js` response with `route()` was abandoned on measurement. Chrome runs a soft update on every navigation, refetching the worker script to compare it, and that request is intercepted by neither Playwright's `route()` nor a page-target CDP `Fetch` nor a browser-target CDP `Fetch`, so the variant reverted to the deployed worker within a navigation or two. But `sw.js` is a classic worker, so its top-level function declarations become properties of the worker's global object. Swapping only `self.handleRSC` through `worker.evaluate()` leaves both worker conditions running the same deployed file with that one function differing, and since `route()` is never used, the trap of it disabling the cache does not come along.

One more thing had to line up. `_rsc` URLs differ by originating page, so for the variant to serve anything from cache the same article has to have been reached once from the same page. So all four conditions visit the article once, then the HTTP cache and every worker cache except the RSC one are cleared, and the second visit is the one measured. Which is to say, the most favorable setup the variant could get.

| Condition                     | FCP p50 | LCP p50 | Slow cluster |
| ----------------------------- | ------- | ------- | ------------ |
| No worker                     | 96      | 448     | 20/30, 67%   |
| Worker (deployed)             | 100     | 320     | 14/30, 47%   |
| Worker (prefetches cached)    | 104     | 168     | 9/30, 30%    |
| No worker, prefetches blocked | 128     | 200     | 7/30, 23%    |

(ms, 30 runs per condition, all 120 an edge HIT. The cluster boundary is the same 350 ms as before, and no run falls between 324 and 416. The LCP p50 column is there for reference only: the deployed worker's 320 ms has a bootstrap 95% interval of 164 to 452, so the same data gives either cluster as its answer.)

Whether the variant really served from cache is not something I checked with `transferSize`. That is the accounting artifact from above. I put counters inside the worker and counted prefetch cache hits and network fetches directly. The deployed worker came out at 0 hits, 31 misses, 31 network fetches; the variant at 31 hits, 0 misses, 0 network fetches, in all 30 runs. Resource timings say the same. The 31 prefetches sum to 2,104 ms of duration on the deployed worker against 30 ms on the variant, and the last prefetch response ends at 1,224 ms against 863 ms.

Two things to read here. First, serving the prefetches from cache lands in the same place as blocking them outright. 9/30 against 7/30 is p = 0.77 by chi-square, indistinguishable. That prefetch traffic is what produces the slow cluster was already separated by no worker's 20/30 against blocking's 7/30 at p = 0.002 (the blocked condition differs from the no-worker one in nothing but the prefetches), and the variant shows that a different way of taking that traffic off the wire arrives at the same spot.

Second, where the deployed worker sits. 14/30 is between no worker's 20/30 and the variant's 9/30. The difference between the deployed worker and the variant is p = 0.29, not significant at this sample size, so no size can be claimed and only the direction remains; but if that direction holds, this worker is leaving part of an available gain on the table by design. It is because `handleRSC` neither stores nor consults prefetches, and that guard was put there deliberately in part 2, on the grounds that "articles nobody read pile up in the cache" and that it would ruin the meaning of the "saved offline" indicator. One design decision from part 2 comes back as a performance price in part 3.

Three things remain to be said. First, I never pinned down what the deployed worker does to turn 20/30 into 14/30 while taking not one prefetch off the wire. That it is not bytes is confirmed; what remains is a guess, that routing these requests through the worker changes their priority or how they contend with rendering, and resource timings cannot separate that. The FCP column in the same table reads as circumstantial support for the guess. The condition where the slow cluster is most frequent has the best FCP of the four at 96 ms, while the two where it is rarest are worse at 104 ms and 128 ms. That pattern is hard to get from pure byte contention, which points at render ordering, but that too is a guess.

Second, I never pinned down what the slow cluster actually is. There was a candidate worth suspecting. `tailwind.css` gives `::view-transition-old(root)` and `::view-transition-new(root)` an `animation-duration: 0.3s`, the article `h1` is wrapped in `<ViewTransition>`, and the step I was seeing was about 310 ms. So I put worker on/off against view transitions on/off in a 2x2 and ran 22 per cell. Swapping `startViewTransition` for a stub would change snapshot and commit timing along with it, so I left the mechanism alone and overrode only the animation duration to 1 ms. The manipulation took: transitions still fired three times in every cell, and only the interval between calls dropped from a p50 of 373 ms to 92 ms. Yet the slow cluster did not shrink; it grew, from 34% to 48% in aggregate (p = 0.28, so not significant either). The decisive part is where the slow cluster sits. With the animation off, all three transitions finish between 300 and 400 ms while slow-cluster LCP is 508 to 584 ms; with it on, the last call is at 830 ms while the slow cluster is 448 to 548 ms. The slow cluster is pinned to an absolute 450 to 580 ms regardless of the transition schedule, so this candidate is rejected.

That 2x2 did leave one clue. In all four cells, the slow-cluster runs have the _faster_ FCP (88 to 92 ms against 104 to 120 ms). Which suggests the split is not "slow, therefore late" but whether the `h1` made it into the first paint. In the fast cluster the first paint comes a little later but includes the `h1`, so FCP and LCP nearly coincide; in the slow cluster something else is painted before the `h1`, so FCP lands early and the `h1` slips to a second paint. If so, what remains are streaming and hydration order. `next.config.ts` has `cacheComponents: true` and the article route has a `loading.tsx`, so the shell does arrive before the body. But this side is a guess I did not measure.

Third, the worker is not as clean as blocking outright: 14 of the deployed worker's 30 runs still slipped. Sending the requests anyway and still arriving early is not the same as not requesting.

The number 31 needs a caveat too. It is the count of links inside the headless default viewport of 1280x720. On a smaller real device fewer go out at first and more follow as the reader scrolls. The direction carries over; the size does not.

Put this next to the byte cost settled earlier and it becomes clear the sign only points one way. What the lab measured was one soft navigation from an empty profile, and there the worker added 265 KB by fetching one copy of the HTML and four thumbnails in the background. What I just measured is a hard navigation after one visit to the home page, and there the worker neither removes nor adds the 345 KB of prefetching. It passes it straight through. I had meant to settle these two scenes as a balance with opposite signs, but with the credit side gone there is nothing to settle. As it is written today, what this worker does to bytes is either add to them or leave them alone. That the credit side is a matter of how you write it is what the variant condition showed.

So does it help performance? On this blog, yes. The share of warm runs landing in the slow cluster went from 17/25 without the worker to 1/25 with it, and the sign held across twenty more pairs with dwell time matched, twelve more with the order reversed, and a four-condition run of 30 on a different day (20/30 against 14/30). The size shifts from run to run, so no size can be claimed. What is solid as an observation is the direction.

Why it helps, I do not know. The explanation part 2 pointed at, putting static assets in Cache Storage to shorten returning-visit FCP, was dropped in both the lab and production. The explanation I reached for next, that the worker hands over the RSC prefetches the HTTP cache cannot serve without revalidating, was dropped by the code and the counters. This worker does not hand them over. A variant that does hand them over goes lower still, which is confirmed; but the share the deployed worker gains while taking nothing off the wire still has no explanation. That space is the one to leave empty.

Which means the third of the three reasons part 1 listed for reaching for a service worker, "when you need a strategy the HTTP cache cannot express", now has half an answer for this blog. The variant with `handleRSC` fixed to store and consult prefetches served all 31 of them from cache and brought the slow-cluster share down to a level indistinguishable from blocking prefetches outright. The worker did something the HTTP cache cannot do without revalidating. But this measurement was arranged in the variant's favor: entering the same article a second time from the same page meant the `_rsc` URLs matched the first visit. Real readers arrive from somewhere different each time and `next-router-state-tree` changes with them, and whether the hit rate survives that is something I did not measure.

One other sentence in part 1 has to be narrowed at the same spot. It said that if returning-visit performance is the only goal this layer is probably not the answer, on the grounds that it means rebuilding in code what the HTTP cache already does. The first half held up here: as far as static assets go, Cache Storage was not faster than the HTTP cache. What wobbles is the premise of "already does". That there is something the HTTP cache does not do well, like App Router's RSC prefetching, is confirmed by the headers, and that a worker can fill that spot is confirmed once. What is not confirmed is whether the gain survives real navigation patterns.

The conditions this conclusion stands on have to be drawn too. This blog has a CDN that is already fast (46 ms to the final headers on an edge HIT), `immutable` cache headers correctly set on static assets, and a text LCP element. Change those three and the answer changes. In particular, on a site with a slow origin or no CDN the round trip Cache Storage erases is a different size, and the gain could show up on static assets after all, an environment this series never measured once. What was found here is not "service workers are useless for performance" but "under these conditions there was a benefit, and where it comes from is still unpinned".

One last thing to admit. This series never once measured the axis on which this worker earns its keep: offline. Performance metrics are a ruler for how fast things are when the network is there, and the reason the feature exists is to make things open when it is not. Everything measured, walked back, and measured again across three posts was held against a ruler slightly askew from the feature's purpose. I do not think that makes it pointless. If offline is why you are reaching for it, performance is not the reason to adopt but a price paid or refunded alongside, and it is better to know which way and how much before you do.

## When and how to use one

When part 1 named its three conditions for adopting a service worker, all three were generalities. Having measured across three posts, one of them can at least carry a diagnostic. It is the case of needing a strategy the HTTP cache cannot express, and whether your own site has requests like that is something the response headers will tell you. In DevTools, pick the requests that go out repeatedly on every page and read two lines. First `cache-control`. If `no-store` is there, the browser cache does not store the response at all; if `no-cache` or `max-age=0, must-revalidate` is there, it stores it but has to ask the server before every use, so the round trip stays. Then `vary`. If a header whose value changes per request is listed there, a stored entry rarely gets matched again. Either way, if dozens of them go out per page you are in the same situation this blog was. App Router's RSC prefetches were not the `no-store` case but the revalidation and `vary` one. The more prefetches a framework fires on its own, the more likely this clause applies. A diagnosis is not a remedy, though. Whether a service worker can fill those requests in is something you only learn by building the worker that way and measuring again. The worker deployed on this blog does not store prefetches, so this diagnosis does not apply to it, and the variant that does store them has been measured exactly once.

To put it in one place.

| Situation                                                                 | What this series answers                                                                                                                             |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offline is an actual requirement                                          | Use one. Nothing else makes a site work offline                                                                                                      |
| Requests the browser cache cannot reuse go out by the dozen on every page | Measure, then decide. Warm LCP on this blog landed in the slow cluster less often, but not because the deployed worker served those requests instead |
| Many of your users are on unreliable networks                             | Use one, but put a timeout fallback on network-first first. Without it, a slow connection means an endless spinner                                   |
| Returning-visit performance on static assets is the only goal             | Do not. Filename hashes and `immutable` cover it, and Cache Storage was no faster in the lab or in production                                        |

If you do reach for one, add one item to the ways of cutting the cost listed at the end of part 1. If the design fetches anything extra in the background, count those bytes first. This worker pulled one copy of the HTML and four thumbnails on every article click, and no web metric caught it.

Going back to the 500 ms left at the end of part 2, three things were mixed into that number: the tail that dragged the average up, my own traffic making up more than half of the `reload` control group, and the reference-point difference from 103 Early Hints that produced the +35 ms left at p50. Take those three away and on this blog the worker-detour latency does not show up at the median. It was 2 ms in the lab, and in production, measured at the final headers, the worker side was not slower either. Whether what remains in the tail belongs to the worker is still unknown.

The cost was somewhere else instead. Every time an article is clicked the worker fetches 265 KB more in the background, and that bandwidth contention comes back as roughly 50 ms on the click's own request. It is a cost no web vital captures, and I did not know it existed until the proxy counted bytes. There was a benefit as well. The share of production warm LCP landing in the slow cluster went from 17/25 to 1/25. But the reason part 2 gave for that benefit, static assets served from Cache Storage, was refuted in both the lab and production, and the next candidate, serving RSC prefetches, is something the deployed worker does not do. What I did confirm is that a variant serving prefetches from cache comes down as far as blocking them, and that what stood in the way was the storage guard added in part 2. That is the one conclusion in this series that leads to a code change.

Most of this post went into measurement rather than the worker. The control group never formed by waiting, the one I built was wrong more than once (the proxy was holding the headers, and the two conditions were timing different moments), and the percentile I chose over the mean hopped between the two clusters of a bimodal distribution. Part 2 closed by saying that collecting real user metrics for a before-and-after comparison should come first; I would add one thing. When the real user metrics do not give you a control group, the cost of building one is part of the feature's cost, and checking that the two conditions of the one you built are measuring the same thing is part of the measurement.
---

[^1]: [PerformanceResourceTiming: workerStart](https://w3c.github.io/resource-timing/#dom-performanceresourcetiming-workerstart), Resource Timing. The spec defines the value only as Fetch's final service worker start time. The split between starting up and already running comes from [MDN](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/workerStart), which says it returns the time just before the service worker is started, or just before the fetch event is dispatched if it is already running, and 0 if the request did not go through a worker. `PerformanceNavigationTiming` inherits this interface.

[^2]: [browserContext.route()](https://playwright.dev/docs/api/class-browsercontext#browser-context-route), Playwright docs. States "Enabling routing disables http cache."

[^3]: [PerformanceResourceTiming: responseStart](https://w3c.github.io/resource-timing/#dom-performanceresourcetiming-responsestart), Resource Timing. "The responseStart getter steps are to return this's `firstInterimResponseStart` if it is not 0; Otherwise this's `finalResponseHeadersStart`."

[^4]: [Chrome 133 release notes](https://developer.chrome.com/release-notes/133), "Revert responseStart and introduce firstResponseHeadersStart". States that Chrome 115 changed the meaning of `responseStart`, which TTFB uses, to the final headers, and that Chrome 133 reverted it over a compatibility problem with other browsers and tools, introducing a separate attribute for the final headers instead.

[^5]: [NavigationPreloadManager](https://developer.mozilla.org/en-US/docs/Web/API/NavigationPreloadManager), MDN. Describes the mechanism that starts the navigation request in parallel with worker startup and `FetchEvent.preloadResponse`, through which the worker receives that response.
