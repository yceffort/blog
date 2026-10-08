---
name: 'Building coldpath'
title: 'Building <em>coldpath</em>'
description: 'Why coldpath was built, how its V8 coverage analysis works, and how it traced the JavaScript dependencies of Toss Securities without source maps.'
---

I built [coldpath](https://www.npmjs.com/package/@yceffort/coldpath) to see which JavaScript this blog needs and when. Knowing how much code goes unexecuted was not enough to decide what to change. I also had to connect that code to the path it was loaded through and to the interaction that first uses it. This series covers the change candidates found on this blog, the verification of how execution is counted, and tracing the code of Toss Securities without source maps.

The tool can be installed from [`@yceffort/coldpath` on npm](https://www.npmjs.com/package/@yceffort/coldpath/v/0.3.1). The usage instructions in each post are based on `@yceffort/coldpath@0.3.1`, and the version used at the time is noted separately for measurements and implementation analysis.
