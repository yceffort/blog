---
name: 'Improving number-flow'
title: 'Improving <em>number-flow</em>'
description: 'A record of forking number-flow to support older browsers and improving its animation performance in modern browsers.'
---

I made a [fork](https://github.com/yceffort/number-flow) of [number-flow](https://github.com/barvian/number-flow) so that its number animations also work in older browsers. The first post covers an rAF fallback engine that preserves the original motion. The second post covers how the animation was reshaped so that it can run on the compositor thread, to reduce the style recalculation that remained even in modern browsers.
