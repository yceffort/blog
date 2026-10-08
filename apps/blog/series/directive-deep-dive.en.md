---
name: 'Directive Deep Dive'
title: '<em>Directive</em> Deep Dive'
description: "'use client', 'use server', 'use cache'. Following what a single line at the top of a file turns into at build time and at runtime, all the way down to the source"
---

A directive in React and Next.js is nothing more than a string written on the first line of a file. What that line produces, however, is far more than a string. The module graph splits, functions turn into network endpoints, and cache boundaries appear. This series starts from that gap: directives are easy to write but hard to explain.

Each of the three parts takes one of `'use client'`, `'use server'`, and `'use cache'`, and follows what transformation the directive goes through at build time and what code it runs as at runtime, going down into the bundler and React source. The version tag of the analyzed source is pinned at the start of each part, so if later versions change something, you can compare against that baseline.

Since the series is closer to one topic, boundaries, split into three, the order does not matter much. That said, the first part on the client boundary sets up the terminology for the other two.
