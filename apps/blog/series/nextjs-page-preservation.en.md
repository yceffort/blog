---
name: 'Page Preservation in Next.js'
title: 'Page Preservation in <em>Next.js</em>'
description: 'How Next.js with cacheComponents hides and restores pages: Activity lifecycle conflicts, measured retention across route segments, and deciding which state to keep and which work to stop.'
art:
  undraw: opened-tabs
  hue: cyan
  tone: light
---

This blog enables `cacheComponents` in Next.js. When navigating to another page, some previous screens remain hidden inside React Activity. Keeping them allows their state to be restored, but it can also conflict with a library's lifecycle assumptions or retain the DOM of several screens at once.

Part 1 follows a three.js canvas that went blank on the about page. Source analysis and reproduction connect the point at which Next.js hides the screen, React cleans up its Effects, and react-three-fiber disposes of its WebGL context.

Part 2 explains why repeated navigation retained three posts in one case and nine in another, then considers what to change to manage memory. It separates work that should stop when hidden from state worth restoring, and examines DOM size, retained data, and caches outside the page. Measured results are kept distinct from proposed improvements whose memory savings have not yet been measured.
