---
name: 'OG Scraping Server Design Notes'
title: '<em>OG Scraping</em> Server Design Notes'
description: 'What should you decide first when building a link preview server? Following the principles from the reasoning behind the runtime choice to SSRF, encoding, and cache stampedes, and running every piece of code written along the way'
---

On paper, a link preview is a three-line feature. Open the URL, parse the HTML, pull out the `og:` tags. In production, though, those three lines break in quite a few places, and many of them are lumped together behind a single number, "the error rate is high", where they are hard to see.

This series is a set of design notes that follows, in order, the places where those three lines break. Part 1 splits failures by cause, examines where the runtime choice actually makes a difference, and goes on to raise coverage with User-Agent and encoding handling and to set up caching and target numbers. Part 2 deals with the risk of a server opening a URL on behalf of a user, and looks at how it gets broken before how to block it.

The focus is on why the design ends up the way it does rather than on usage, and every piece of code shown was run on Node.js `v24.14.1`. In the process I found that four of the things I had first written down plausibly were wrong, and I left them in place instead of deleting them. That contrast is also what I most wanted to say in this series.
