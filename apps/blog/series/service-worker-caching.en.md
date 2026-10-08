---
name: 'Service Worker Caching Deep Dive'
title: '<em>Service Worker</em> Caching Deep Dive'
description: 'The third cache layer that did not fit in the caching chapter of Frontend Performance Optimization Deep Dive. From the general theory of proxies, lifecycles, and strategies to applying it to a Next.js blog and measuring it with GA4'
---

The browser has three cache layers: the HTTP cache, the CDN cache, and the service worker cache. The first two got a full chapter in my book, but the last one was cut for length. This series pays off that debt.

It comes in three parts. Part 1 is the general theory: where a service worker sits in the request path and what lifecycle it lives through, what kind of storage Cache Storage is without a TTL, and what to base the choice among the five caching strategies on. Part 2 applies that theory to a real blog on the Next.js App Router. It goes through the traps set by soft navigation, prefetching, and `next/image`, and checks the change before and after deploying the service worker with real-user data from GA4. Part 3 measures the cost of going through the worker, which Part 2 left unresolved. After confirming why real-user data never produces a control group, it builds one directly with Playwright and a shaping proxy, and separates the shares of worker startup, navigation preload, and CPU speed.

Reading in order is recommended, but if you are already familiar with service workers, starting with the case study in Part 2 is fine.
