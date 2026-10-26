---
title: 'The Order of <em>Performance Work</em> in Practice: Preparation, Observation, Response, Verification, Measurement'
tags:
  - web-performance
  - software-engineering
  - essay
published: true
date: 2026-10-26 17:59:00
description: "I think order matters more than technique in performance work. This post lays out the practical flow: settle the support range and dependencies first, measure before picking a technique, decide what to fix first, choose a response when the cause lives in someone else's code or infrastructure, prove nothing broke and keep it guarded, and report numbers by grade."
art:
  undraw: route-planning
---

## Table of Contents

## Order Comes Before Technique

Over the past two months of improving one service's performance, the time spent applying techniques was shorter than I expected. Deleting unused code, loading heavy modules later and merging duplicate dependencies took less time than the work before and after them. Most of the time went into finding what was heavy, deciding what to do when the cause was not in my code, and confirming the effect with numbers.

Initial-entry JavaScript transfer dropped 40.1% in production. Whether users actually feel faster because of this bundle work, however, I have not yet confirmed with production metrics. The existing instrumentation could not tell the change apart, so I am rebuilding the collection path. The speed effects of the first bundle improvement are explained with values measured in a sandbox or locally.

The second improvement that followed was the October release, which shipped a framework upgrade and bundler switch, CSS reduction, a fix for layout shift when the banner appears, and a number animation improvement together. This time even the existing dashboard showed CLS p75 dropping by nearly half, and FCP and LCP starting to go down. After the number animation change, main-thread occupancy measured locally dropped from 85.8% to 49.6%. I only looked at the production metrics right after the deployment, so I have not yet confirmed how much of this change holds over time.

Inside the company I heard quite a few comments that the service had become faster, but I kept those separate from what production metrics confirmed. The experience of reassembling a third-party SDK also led to a talk at FEConf 2026.

Based on that experience, this post lays out the order in which performance work proceeds and the decisions made at each step. If the book _Frontend Performance Optimization Deep Dive_ covered the techniques one by one, this post is about when, and on what grounds, to choose them. The details are covered in the posts linked from each section.

The overall flow looks like this.

<LiveDemo src="/demos/performance-workflow/flow.html" title="A performance workflow that settles the support range and dependencies, picks a response by where the cause lives, and converges on verification and measurement" height={1160} />

Set the support range, clean up dependencies and server code leaking into the client, then check the production dashboard and measure in the lab under fixed conditions. When observation turns up new duplicates or server code leaks, clean them up again. Once you find causes, separate what the problem is from whose code it is, and set priorities. For your own code, apply the technique that fits the cause; when the cause is in someone else's code or infrastructure, first decide how it can be fixed at all. After a change, verify the behavior and put a regression guard in place. Report the measurements and check production instrumentation again after deployment, and that result tells you what to work on next.

In this order, what you confirmed earlier feeds the next decision. You need the support range to judge what can be deleted, and you need measurements to decide what to fix first. You also need to know where the cause lives to choose between fixing it yourself and asking another team or the vendor.

> The example is a single Next.js service opened in an app webview, improved from late August to October 2026. The decisions come from the conditions of an app webview, server rendering and a monorepo, so parts may not fit a static site or a client-rendered-only app as is. The scope is mostly loading performance, and interaction performance (INP) is covered only in part. Production numbers are bytes served by the CDN and RUM aggregates. Sandbox numbers are medians of Chrome traces recorded on a cold first visit with iPhone 16 Pro Max emulation and 4x CPU throttling. Values aggregated differently are marked in the text. Some vendor and package names are pseudonyms.

## What to Settle Before Looking at Performance

Before opening the Performance tab, look at the supported browsers and the installed dependencies. To judge what can be removed you need the support range, and to find what to remove you need to know which packages are installed. Server-only code leaking into the client is checked along with the dependencies.

The support range is decided once at the start and used as the baseline for later decisions. Dependencies and server code leaks, on the other hand, are not checked once and done. When observation reveals a new duplicate or leak path, you come back and check again.

With the support range settled, you can decide whether to delete a polyfill, whether to ship syntax as is, and whether to patch an external library to support old browsers. Cleaning up duplicate dependencies also explains why the same code shows up several times in the bundle. If you trace which package pins an old version, you can separate what you can fix yourself from what you have to ask the owning team for. Packages that are hard to ask about come back later when choosing other responses.

The results of this cleanup are useful for other work too. The support range config is shared with the team's other services, and the cleaned-up dependencies save the next analysis from tracing duplicates all over again.

## Set the Support Range

Write the supported browsers down. Without a baseline, "Can we delete this polyfill?" and "Can we ship this syntax as is?" have to be debated every time. Packaging a [browserslist](https://github.com/browserslist/browserslist) config that the team shares also aligns the build targets with the same baseline. This config is in fact used by four other services now.

I think it is better to split targets into modern and legacy. modern follows the framework's default supported browsers, and legacy is based on the actual usage environment. App webviews still have old Android WebViews that stopped updating and old Safari tied to an iOS version, so the framework defaults may not cover every user. When setting the lower bound of legacy, use the browser distribution recorded in RUM or access logs as evidence.

This baseline keeps being used after the build config is done. When removing polyfills from a third-party SDK, compare the minimum support of each web API the SDK uses against the target one by one. Because you can explain what the removal was based on, the same discussion repeats less. Syntax targets and web API support must be checked separately. Building for ES2017 does not guarantee that `TextEncoder` or Web Crypto is available.

I did not measure how much size the config alone saved. The support range is less a means of shrinking size than a baseline for later decisions, so I don't think its value needs to be proven in bytes.

## Analyze and Clean Up Dependencies

Look at dependencies in this order.

1. **Find duplicates.** Use [pnpm why](https://pnpm.io/cli/why) to check how many versions of the same package are installed.
2. **For duplicates, check consistency before size.** Check whether two objects with the same role get created at runtime. In the service I worked on, the bridge package that talks to the app was installed in two versions, each creating its own native bridge instance, and communication with the app got crossed. Cleaning up the duplicate cut First Load JS by only 12kB, but consistency was the reason for doing it. How I cleaned up the app webview bridge and environment branches is written up separately in [Running One Web on Multiple WebViews](/2026/09/one-web-on-multiple-webviews).
3. **Trace who pinned the old version.** Align the versions you can in your own `package.json` right away, and list the ones pinned by other packages. Use that list to ask the owning teams, or to choose another approach in "When the Cause Is in Someone Else's Code" later.
4. **Count usages.** Before swapping a dependency for a lighter library, count which functions are used in how many places. If the only function you actually use from lodash-es is `uniq`, replace it with `Array.from(new Set())` and delete the dependency itself.
5. **Check circular imports here too.** Find and break them with a tool like [dpdm](https://github.com/acrazing/dpdm), and block them from coming back with a CI check.

The last item may seem unrelated to size, but when circular imports get tangled with the bundler's module merging, runtime behavior can change. I wrote up a case where a module-scoped singleton became two in [Next.js Turbopack Turned One Singleton into Two](/2026/08/turbopack-scope-hoisting-singleton-split).

The hardest part of the dependency cleanup was peer dependencies. In an old codebase where external packages had been added piecemeal, each package required a different peer version range. Upgrading one package pushed another out of its peer range, and fixing that meant changing yet another package, over and over. On top of that, pnpm installs a package with peer dependencies separately for each resolved peer combination ([How peers are resolved](https://pnpm.io/how-peers-are-resolved)). Even the same version can be installed twice if the peer combinations differ. You can find these duplicates by looking for lockfile entries where the same version is followed by different peer combinations.

For peer dependencies, I think it works better to fix the version of the baseline packages, such as React or the app bridge, first and align the rest to them. I also asked the people building internal packages to specify peer versions broadly, within the range they actually tested. The rule is to list the tested major versions like `^17.0.0 || ^18.0.0 || ^19.0.0`, and not to use `>=`, which allows unverified future versions. The narrower the range, the more likely the consuming services hit version conflicts. This rule is in the training material [Package Guide Part 4: dependencies, devDependencies, peerDependencies](https://research.yceffort.kr/slides/best-practice-for-package-4).

Forcing versions with overrides is only a stopgap, removed once the offending package is fixed. In practice, only after upgrading the log adapter package to a new version could I remove the override that forced the SDK version. Still, not every duplicate collapsed into one. react-intersection-observer and the user-agent packages only went from three installed versions down to two.

## Check Whether Server Code Is Going to the Client

After looking at the installed dependencies, check whether server-only packages also end up in the client bundle. When server and client code share one repository, as in Next.js, a server logger or HTTP wrapper imported through a shared module easily ends up in the client bundle too.

Opening the client chunks in a bundle analyzer reveals such packages. In the service I worked on, a server logger that writes logs to files (winston) was in the client bundle. It was 256kB by First Load, the largest single item. A buffer polyfill imitating a Node built-in module was shipped along with it.

In this case you need to look at both the config that excludes the package from the bundle and the client's call path.

1. **Exclude it from the client build with bundler config.** With webpack, set the package's alias to `false` only in the client build.

   ```js:next.config.js
   webpack: (config, {isServer}) => {
     if (!isServer) {
       config.resolve.alias = {...config.resolve.alias, winston: false}
     }
     return config
   },
   ```

   With Turbopack, use the `browser` condition of [`turbopack.resolveAlias`](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#resolving-aliases). It points to a replacement module only in the client build. The docs only show the form that specifies a replacement module path instead of `false`, so add an empty module file and point to its path.

   ```js:next.config.js
   turbopack: {
     resolveAlias: {
       winston: {browser: './src/lib/empty-module.js'},
     },
   },
   ```

   ```js:src/lib/empty-module.js
   module.exports = {}
   ```

2. **Make sure the client never calls that code.** If the logger is created at the top of the module, the creation code runs the moment it is imported, and the bundler cannot remove it. Changing it to be created on the first log keeps the client from reaching that code. It helps to think of excluding from the bundle and not calling as a pair.
3. **Split the entry points.** For modules shared by server and client, such as an HTTP client wrapper, keep separate server and client entry points.
4. **Block it from coming back.** Adding a [server-only](https://www.npmjs.com/package/server-only) guard to a server-only module makes the build fail when the client imports it. This explanation is based on Server Components in the App Router. The package itself resolves to an empty module under the `react-server` condition, but [Next.js handles this import internally on its own](https://nextjs.org/docs/app/getting-started/server-and-client-components#preventing-environment-poisoning). The Pages Router also builds page code and API Routes differently, so you need to distinguish where it is used.

A workaround in bundler config has to be revisited when you switch bundlers. In fact, when switching to Turbopack, I removed the webpack alias workaround and added a server-only guard to the logger. Looking back, it would have been better to mark it as a server-only module with a guard from the start.

## Look at the Production Dashboard Before the Lab

Before measuring in the lab, I looked at the production dashboard. You need to know what users currently experience to decide what to improve. But although the graphs looked fine, opening the panel queries showed the data was being displayed wrong.

| Panel        | What it actually plotted                                                                                                                                                                                 | If you trust it as is                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Sample count | Applied [increase()](https://prometheus.io/docs/prometheus/latest/querying/functions/#increase) to a value that goes up and down rather than a monotonic counter, treating every drop as a counter reset | The sample count is inflated, so you can't even tell whether the sample sizes before and after a deployment are similar |
| FCP p90, p95 | Despite the name, plotted documentLoad, not FCP                                                                                                                                                          | You wrongly conclude that the slow-user range of FCP hasn't changed                                                     |
| URL filter   | Selected only values exactly equal to the service URL                                                                                                                                                    | Entries with a query string (about 14% by FCP count) are dropped entirely                                               |

Some values were correct yet hard to use for decisions. The histogram boundaries stopped at 1 second, so 63% of LCP piled into the last bucket, and there was no p95 at all. The p50, p75 and p90 precomputed by the pipeline could not be recomputed per route or OS either. Without information to separate entry type, cache state and device capability, I also couldn't look only at the users likely to benefit most from the bundle reduction (cold first visits, slow devices).

The mean being larger than p90 also looked strange at first. But p90 can stay within the range of the fast majority while a slow minority pushes the mean up a lot, so that alone was not evidence of an instrumentation error.

While improving the service, I also started fixing the collection path. Instead of precomputed quantiles, it keeps counts per bucket (histograms), and puts the conditions for segmenting users in at collection time. Quantiles cannot be merged, but bucket counts can, so p75 can be recomputed for any combination of the collected conditions. The conditions are entry type ([PerformanceNavigationTiming.type](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming/type)), a device tier from core count and memory, the network as seen by [effectiveType](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType), and whether the HTML was cached. Values can be re-aggregated later, but a condition not collected from the start cannot be recovered.

It is worth putting alerts on the state of the instrumentation too. If the order of quantiles flips, the series for an expected label combination drops to zero, or the sample count suddenly changes, you can first check whether something is wrong with the instrumentation.

Fixing the collection path took longer than improving the service. It meant requesting changes to shared infrastructure, and finding workarounds when they were refused. That process is covered later in "When the Cause Is in Someone Else's Infrastructure." In the meantime, I measured the effect of the bundle improvement in a lab (sandbox) under fixed conditions. Even re-aggregating the raw time series of the existing dashboard with [sum_over_time](https://prometheus.io/docs/prometheus/latest/querying/functions/#aggregation_over_time) after deployment, the production FCP mean before and after the deployment that cut the bundle by 40% moved only 1.7%, from 594.0ms to 584.1ms.

This result alone makes it hard to judge whether there was an effect in production. Even for the same build, FCP was 1,119ms in the lab and 594ms as the production mean. The lab fixes conditions where the benefit is likely to be large (cold first visit, slow device) and compares before and after, but in production such users are only part of the whole. Their gains may have been diluted in the mean, but whether that actually happened could not be confirmed with the existing instrumentation.

I checked the new dashboard by the same standard. The collector dropped and restarted the cumulative value of any series not updated for more than 5 minutes, so counts computed with `increase()` came out lower than reality. So I judged only by ratios and quantiles, and labeled the count panels as undercounted.

After the second improvement, the existing dashboard did show a change. On panels comparing against the same time 7 days earlier, CLS p75 dropped by about half right after deployment, from around 0.30 to around 0.15 (CLS is collected only on Android). FCP and LCP also started falling below the values from the same time 7 days earlier from the moment of deployment, while server response time (TTFB) stayed the same.

However, this was observed over only about 10 minutes after deployment, and at that point the difference in FCP and LCP was around 1%. That is about the same size as the production FCP change from the first deployment, so I need to check again whether the difference holds over a longer observation period.

The October release that shipped the second improvement included a framework upgrade, a bundler switch, and code reduction through an icon wrapper. It also included shrinking the initial-entry CSS with partial CSS imports (29% by gzip), compressing the banner fallback image (286KB to 58KB), and fixing layout shift when the banner appears. Since cleaning up duplicate BE API calls in server rendering, removing unnecessary re-renders of the holdings balance and the number animation improvement were all deployed at once, I did not split out how much each change contributed.

## Measure Before Picking a Technique

Since the effect of the bundle improvement was hard to judge from production metrics, I measured it in the lab. First I fixed the device emulation, the CPU throttling factor and the cache state. For every trace I also checked that cache hits were zero and that network throttling was actually applied. If these conditions vary, before and after cannot be compared properly.

Under these conditions, look at the following.

- **Where the main thread gets blocked**: look with the [Performance panel](https://developer.chrome.com/docs/devtools/performance). For example, find a span where rendering work bunches up for 0.5 seconds at the 2-second mark of loading, or places in an animation where the gap between frames opens up by 74-116ms.
- **What came into the bundle from where**: look at each chunk's composition with [source-map-explorer](https://github.com/danvk/source-map-explorer), and follow the source map's original paths to count which package each byte came from. This is how I found that 63% of the design system chunk was unused code.
- **Whether the downloaded code actually runs**: look with Chrome's [Coverage](https://developer.chrome.com/docs/devtools/coverage) tab. Coverage works per generated file, though, so it does not directly tell you which source file the unexecuted code came from.
- **Whether the main thread stays busy after loading**: on screens that render real-time data, work continues after loading finishes. Feed data at a constant rate and look at re-renders and style recalculation in the Performance panel. Locally, with the CPU slowed 4x and price ticks sent to 13 holdings 10 times per second for 10 seconds, main-thread occupancy was 85.8%. Of that, 4,016ms of the 10 seconds went to per-frame style recalculation for the number animation. In production this kind of work can show up as input delay in INP.

To connect the unexecuted code found by Coverage to source files, I built [coldpath](https://github.com/yceffort/coldpath), an analyzer that merges source maps with V8 coverage. It separates, per source file, code executed on the first screen from code executed only on interaction. Usage and an example analysis are in [Tracing When This Blog's JavaScript Actually Runs](/2026/09/tracing-bundle-waste-with-v8-coverage-and-sourcemaps), and the implementation is in [Building a Bundle Analyzer with V8 Coverage and Source Maps](/2026/09/building-coldpath-v8-coverage-analyzer). Classification errors caused by bundlers keeping import information differently are covered in [How Bundlers Remember Imports](/2026/10/how-bundlers-remember-imports).

When organizing the observations, separate the nature of the cause from its location. First check whether it is a duplicate install or a server code leak, whether code needed only in certain environments is in every build, and whether code that is large but not always needed sits in the first chunk. Then check whether the cause is in your code, or in someone else's code or infrastructure. The same problem calls for different responses depending on what you can fix directly. Looking back, most of the time went into observing and classifying up to this point, and applying techniques took less time.

## Decide What to Fix First

Organizing the observations turns up many things to fix at once. Treating them all with equal weight makes it easy to spend time first on things with a small effect. In this work I set the order by whether it affects the first screen, where the bottleneck is, and which cost it can reduce.

First, I narrowed the scope to the first screen. The first wait users experience is the time until the screen appears and becomes usable. The first batch of work was even named ATF (above the fold) optimization. The targets were the entrance animation of the top banner, the JavaScript shipped on first load, and the rendering work bunched up at the 2-second mark of loading.

Break LCP into phases to find the bottleneck. Even when LCP is slow, it is hard to conclude right away that the image download is the cause. The web-vitals [attribution build](https://github.com/GoogleChrome/web-vitals/tree/v6.2.1#attribution-build) splits LCP into TTFB, the delay until the resource request starts, the time to download the resource, and the render delay from download to paint. In the pre-improvement trace on a slow network, the download of the LCP element, the banner image, finished at 2.0 seconds. Then it took another 7.5 seconds to reach LCP while waiting for the screen code (hydration). In this case JavaScript was the bottleneck, so reducing JavaScript came before optimizing the image.

<BarCompare title="Until the LCP banner image is painted (slow 4G, mean of 5 runs)" unit="s" before="Before" after="After" rows="LCP total|9.52|7.67;Banner image download done|2.0|2.0;Wait until paint after that|7.5|5.6" />

After the improvement, the wait dropped to 5.6 seconds. Since it is a mean of 5 runs, though, the size of the improvement should be taken only as a reference. It was a release that also included a framework upgrade and a bundler switch, so I did not split out the contribution of each change. Finding the bottleneck in the pre-improvement trace and separating the effect of each change after the improvement were separate tasks.

Even at the same code size, the cost differed by how the code runs. In an experiment, function declarations that are never called cost about 21ms per MiB, barely increasing even with the CPU slowed 4x. Initialization code that runs as soon as the file is read, by contrast, added about 201ms of main-thread work per MiB ([I Grew Never-Executed JavaScript to 10MiB](/2026/09/unused-javascript-cost)). Based on this, I reduced the code executed on the first screen first, and pushed back work where only a transfer reduction was confirmed or where there was no evidence it reduced CPU cost.

I also dropped approaches with a small effect partway through. When shrinking a third-party SDK, I checked two possibilities: whether code remained because the bundler could not prove it had no side effects, or because it was actually used. To check the first, I forcibly added [PURE annotations](https://esbuild.github.io/api/#pure) to the distributed build. A bundle importing just one constant shrank 74%, so it looked solvable with a few annotations, but the bundle that actually initializes the client shrank only 1%. Had I looked only at the minimal example, I would have ended the work by adding annotations.

I dropped the annotation approach there and switched to cutting the imports that lead to unused features. That meant reassembling and maintaining the SDK myself, so I first worked out the conditions under which that cost was acceptable. The conditions are in the vendor SDK section later. In the end, the gzip size of the event-sending entry dropped 69%. That was measured within the scope of web event collection, though, and the burden of re-verifying every time the vendor version changes remains.

There were also problems I found and did not fix. While reassembling the SDK I found several defects in the vendor code, but fixing them would change the meaning of the data before and after the swap, so I left them as they were and reported them to the vendor. I think stopping is also necessary once the effect is confirmed to be small in real use, or once the cost of keeping the improvement grows larger than its benefit.

## The Nature of the Cause Decides the Technique

When the cause is in your own code, you can pick a technique to fit the nature of the problem. After cleaning up server code leaks and duplicate installs, I looked at the new problems found during observation by the same standard.

| Nature                                   | What to check                                      | Technique                    | Examples                              |
| ---------------------------------------- | -------------------------------------------------- | ---------------------------- | ------------------------------------- |
| Code needed only in certain environments | Does the condition fold into a build-time constant | DCE via build-time constants | Mock server (msw), dev-only validator |
| Code that is large but not always needed | Is it needed on the first screen                   | dynamic import               | lottie-web, swiper                    |

Even after picking a technique, the conditions under which code actually drops out had to be checked separately.

To remove code with DCE, the branch condition must be computable as a build-time constant. If you branch on the return value of a runtime function, the bundler cannot prove the condition is always false. With a condition replaced by a string at build time, like `process.env.NEXT_PUBLIC_APP_PHASE === 'mock'`, even the dynamic import is removed in non-mock builds. Objects shared between the production path and dev-only code are also worth checking, since sharing a single object can pull in the whole module. Separating the zod schema that log routing shared with a dev-only validator cut first-load JS by 86.5KiB.

Even if you pass a flag that turns a feature off at runtime, the code stays in the bundle if the import at the top of the shared module remains. In that case you have to move the import itself into another file to cut the link. As with the PURE annotation case earlier, the minimal example and real use need to be measured separately.

For lazy loading, look at transfer reduction and CPU time reduction separately. Splitting code with [next/dynamic](https://nextjs.org/docs/app/guides/lazy-loading) reduces the initial transfer, but whether CPU time also drops depends on the shape of the code. Splitting swiper into a lazy load removed 94KB (about 30.6KB gzip) from the initial load. I found no evidence that CPU time dropped, so I described the effect only as a transfer reduction.

Beyond the bundle, I also looked at the rendering process. When a scale animation runs on the main thread and opacity on the compositor thread, the two animations drift apart when frames slip. A tween that grows `height` from 0 to `auto` forces layout to be recomputed every frame. I solved this by moving both animations to the same CSS transition and replaying the push-down of the content below as a FLIP that uses only `transform`. Impression logging was also deferred until after the motion ended. The process of fixing it against the original motion is in [Killing Frame Drops in a framer-motion Banner](/2026/08/framer-motion-banner-frame-drop). Cutting re-renders on same-price ticks from 98 per 100 ticks to zero, and cleaning up duplicate BE API calls in server rendering (a 40.8% duplicate rate in production logs before the fix), were also found and handled at this stage.

After the first deployment, initial-entry JavaScript transfer confirmed in production dropped 40.1%, from 839.9KB to 503.3KB. In the sandbox, main-thread work in the 5 seconds after opening the page dropped 30%, from 4,073ms to 2,850ms. The biggest drop was in rendering work, from 1,041ms to 226ms. With fewer elements to draw, the work that had bunched up for 0.5 seconds at the 2-second mark of loading was also broken into smaller tasks.

## When the Cause Is in Someone Else's Code

Tracing a problem often leads into other teams' packages or external libraries. Fixing it at the source would be best, but this time I fixed things myself more often than I waited for upstream fixes.

Contact was hard to make, and even when it was made, the issue fell down upstream's priorities. While waiting, users kept downloading unused code. Since I had already measured which code stayed in the bundle and why, fixing it myself was faster than explaining it and waiting for a fix. The second improvement also had to land with the October release that included the framework upgrade, so the schedule was tight.

I could fix things myself because I could prepare a way back to the original. Making a copy, a wrapper or an API-preserving fork without modifying the original meant I could return to the pre-swap state if something went wrong.

Since this is a decision to increase the code I maintain directly, I weighed four things before choosing a response.

- Who owns the code
- How far the change spreads if the original is modified
- What keeps being lost while waiting for a fix
- Whether you can return to the original if something goes wrong

The responses chosen in this work, and the costs left afterwards, are as follows.

| Situation                                                 | Response                                     | Remaining cost                                               |
| --------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| A shared package where a fix affects every other service  | Copy only the code you need                  | Maintaining the copy, folding it back into the package later |
| A design system owned by another team                     | Keep the original, wrap only what you use    | Tracking upstream changes, equivalence tests                 |
| A package depended on wholesale for one piece             | Internalize                                  | Maintaining it yourself                                      |
| A vendor SDK with no committed improvement schedule       | Restore from the distribution and reassemble | Re-verification per vendor version, a rollback path          |
| Open source that doesn't support the environment you need | An API-preserving fork                       | Tracking upstream changes                                    |

The methods differ, but they share preserving the original and preparing a way back.

### If an Internal Package Is Hard to Fix, Bring It In

Sometimes a shared workspace package pins an old version, and changing it would affect every other service. Such a change can be hard to take on within one service's performance work. Copying only the needed code into the service and cutting the workspace dependency is an option to consider here. You accept the cost of maintaining the same code in two places, but keep it ready to be folded back into the shared package later. Workspace dependencies are convenient, but you also have to accept the dependency versions that package decides.

For the design system managed by another team, I kept the original and built a local wrapper. The icons were exported as a map collected with `import *`, so they were not tree-shaken even with `sideEffects: false`. Only 13 icons were actually used, but 126 were in the bundle. I re-exported the 13 needed icons via named imports and tested that the rendered markup matched the original. Code importing the original directly was blocked with [no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports). This change cut initial-entry JS by 133KB.

If you pull in an entire package for a single component, it is worth considering moving the needed implementation into the service. This is the case where keeping it as a package brings no benefit and only leaves the constraint of not being able to set dependency versions yourself.

When bringing code in, attach tests that check it behaves the same as the original, block the original package from coming back with lint, and pin the imported version. Since you take over maintenance after copying, it needs to stay in a state where you can return to the original or fold it into the shared package.

### Ask a Vendor SDK With Evidence, and Reassemble It If That Fails

For the vendor SDK, I first organized measured evidence and requested an improvement. I also verified the causes and alternatives the vendor suggested in its reply. The vendor of the experimentation platform SDK said the size came from a conservative minimum supported browser, and recommended its React SDK as an alternative. But the React SDK also re-exported the entire web SDK, and polyfills that depend on the browser target were only 13.3% of the whole. Neither explanation matched the measurements. The reply also said no improvement schedule had been set.

To cut the transfer cost while waiting, I reassembled the SDK myself. The source map's `sourcesContent` contained the full original source, so the code could be obtained. The event and experiment-assignment logic is the basis of the dashboard numbers, so it had to stay as is and be verifiable against the original. I also had to bear the cost of re-verifying every time the vendor version changes. After confirming these conditions, I rebuilt only the entries and dependency wiring, and cut the gzip size of the event-sending entry by 69% compared with the vendor original.

How to restore the original from source maps, the assembly structure that cuts imports, and the verification process are covered in detail in [Tearing Apart a Third-Party SDK and Rebuilding It My Way](/2026/08/rebuilding-a-vendor-sdk) and my FEConf 2026 talk [Reassembling a Third-Party SDK](https://research.yceffort.kr/slides/feconf-2026-vendor-sdk).

### For Open Source, Check Upstream and Build an API-Preserving Fork

When open source doesn't support the environment you need, first check upstream issues. The number animation library [number-flow](https://github.com/barvian/number-flow) relied on recent CSS features, so on Chrome below 125 and Safari below 17.2 the animation silently turned off. The same request ([#131](https://github.com/barvian/number-flow/issues/131)) and report ([#164](https://github.com/barvian/number-flow/issues/164)) were open but unresolved, so I built a fork that keeps the API and visual result and replaces only the engine. Since the API is the same, the calling code doesn't need to change, and since I manage the fork, I could fix performance problems myself. Later, 0.2.0 moved the animation to the compositor thread and cut style recalculation time by 81-85%.

Locally, I compared with the CPU slowed 4x and price ticks sent to 13 holdings 10 times per second for 10 seconds. Main-thread occupancy, averaged over 3 runs per version, dropped from 85.8% to 49.6%. With 100 holdings it dropped from 84.3% to 29.5%. Even without CPU throttling, updating one number once per second, main-thread work per second dropped 70%, from 199ms to 59ms.

I built this fork in a personal public repository. The original was MIT-licensed open source, and old-browser support and compositor performance applied to other users of the library too. I saw no reason to have the company take on maintaining a general-purpose library. The internal GitHub Actions environment had limits, so public CI was the better choice, and npm publishing and Storybook could be used as is. Internal services just installed the public npm package.

Because the API stays the same as the original, I can return to upstream if it solves the same problems. The fork itself started about two weeks before the service performance work. The vendor SDK, by contrast, was kept only as an internal package. Its license (ISC) was permissive, but the work restored code from the distribution of a vendor that does not publish its repository, so I kept it private out of consideration for the relationship with the vendor.

The porting process is in [Porting number-flow to Old Browsers](/2026/08/number-flow-fork-for-old-browsers), and the move to the compositor thread is in [Improving number-flow Performance](/2026/10/number-flow-compositor-performance).

## When the Cause Is in Someone Else's Infrastructure

Observability infrastructure shared by many teams is hard to change directly the way service code is. I had to send reproducible requests and prepare alternatives for when requests were not accepted. In the meantime I also looked for ways to solve things in the service code.

This step was the most unfamiliar. Before, tools like Sentry or GA4, which give you a dashboard once you attach the SDK, were enough. This time, even writing a request required understanding how the OpenTelemetry collector, Grafana Tempo and Mimir fit together. I studied tail sampling and the conversion of delta values to cumulative values one at a time, and worked out what to request and how to work around a refusal. What I learned along the way went into the [Collecting Core Web Vitals Yourself](/series/cwv-collection) series.

Write requests so the recipient can reproduce the same result. Rather than stopping at "it doesn't seem to be stored," include the query, the time and the result. For example, if the collector responded `200` when CWV was sent as spans but Tempo still returned 404 for that traceID nine minutes later, also include the fact that other spans from the same page load can be queried. When there are several requests, prioritize them too. A storage failure can be P0, the metrics path and query range P1, and checking retention and ingestion limits P2.

When proposing alternatives, I think it is better to write down the roles you need before naming specific products. Splitting the requirements into roles like a raw event store, a histogram store and a receiving endpoint lets you consider everything from just widening the buckets of the existing path to a self-hosted collection server. Separating collection from sending in the frontend code also means you don't have to rewrite collection code when the sending path changes.

Some requests were not accepted. spanmetrics, which builds metrics from traces, could not be used because of the resource load, and the collector's tail sampling policy (wait 15 seconds, then drop traces with fewer than 2 spans) could not be changed. So the browser builds histogram metrics directly and sends them, and traces are used only for root-cause analysis in the verification environment. The root span is sent along with the first metric so that tail sampling does not drop it.

This collection path works in the sandbox but has not reached production yet. All production RUM numbers in this post come from the existing path.

Check platform limits in advance too. iOS webviews do not support [LayoutShift](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift), so CLS is not collected, and LCP and INP arrive only on iOS 26.2 and later. When web-vitals reports values, how to send them when leaving the page, and where they get lost in shared infrastructure are covered in turn in [When Does web-vitals Report Core Web Vitals](/2026/10/web-vitals-report-timing), [Sending Core Web Vitals at the Moment of Leaving the Page](/2026/10/cwv-send-on-page-leave) and [Sending the Core Web Vitals of an App Webview to a Shared Observability Platform](/2026/10/cwv-to-tempo-and-mimir).

## Prove You Didn't Break It Before Proving You Shrank It

How much size dropped was relatively easy to measure. What took longer was confirming that behavior did not change. I widened the scope of checks from the build output to comparison with the original and then to the actual execution path.

1. **Check the build output directly.** Search whether removed modules remain in the production build chunks. Which entry pulls in which module is checked by bundling the entry and reading the import relationships in the esbuild [metafile](https://esbuild.github.io/api/#metafile). There was a case where a module that looked unrelated from grepping source usages turned out to be connected through a config loader.
2. **Compare against the original.** If the goal is the same behavior as before, it is better to run the original alongside and compare outputs for the same inputs instead of writing expected values by hand. The vendor SDK distribution was run side by side in a separate jsdom. The rendered markup of the icon wrapper and the output of the base64 replacement were also compared with the originals. For base64, every padding boundary and 2,000 fixed-seed Unicode strings were checked.
3. **Check that the tests catch errors.** I ran mutation testing, which checks whether tests fail when the source is deliberately broken. Among the passing tests, one never even reached the code it meant to check because of a `history.pushState` patch left by an earlier test. It wasn't enough that the code ran; I also had to check that the results were properly asserted.
4. **Run the actual execution path.** Splitting entries can drop the wiring of behavior you never call directly, like automatic events or sending on page leave. A missing registration throws no error and the events just silently disappear, so run initialization, routing and page leave to confirm real sends.

Even changes not meant to reduce size, like switching bundlers, can change runtime behavior. The case where a module-scoped singleton became two after switching to Turbopack is written up in [Next.js Turbopack Turned One Singleton into Two](/2026/08/turbopack-scope-hoisting-singleton-split).

Verification results also record what was checked and how. I separated comparisons run side by side with the original (compared), values asserted by our own tests (self-asserted), and parts that could not be run (unverified). If everything just says "confirmed," the difference in evidence is hard to see.

## Leave Guards That Keep the Improvement

Even after cutting bundle size and execution time, the next PR can grow them again. For changes that passed verification, I also added checks so the same problem doesn't come back. Collecting the guards described so far:

| What can come back                                      | Guard                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Circular imports                                        | dpdm check in CI                                                          |
| Imports of the original package that bypass the wrapper | ESLint `no-restricted-imports`                                            |
| Server-only modules leaking into the client             | `server-only` guard (App Router, build fails on client import)            |
| Per-entry size growth of the reassembled SDK            | A measurement script comparing against a baseline file                    |
| Missing rules in CSS switched to partial imports        | A test that detects omissions against the original CSS                    |
| Changes that drift from the original behavior           | Original-comparison tests, a test guarding vendor defects left on purpose |
| Growth in bundle size and first-screen executed code    | coldpath comparison against a baseline build                              |

The tests guarding original behavior include a check that keeps the vendor's defects as they are. If someone fixes a defect left in during the SDK reassembly, the meaning of the data before and after the swap changes. So I checked that the original-comparison test fails when code with the defect fixed is deliberately injected. What this check guards is behavior identical to the original.

I track changes in overall bundle size by applying [coldpath](https://github.com/yceffort/coldpath) to the service. Analyzing the baseline build and the new build the same way shows, per source file and package, where size grew and which modules came in. It can also post the comparison as a comment on every PR through a GitHub Action, and fail CI when a byte budget is exceeded. With this, the reason for any growth can be checked in review.

## Grade the Numbers When You Report Them

Measuring the same change gave very different numbers depending on tools and conditions. When reporting, I separated values confirmed directly, values that vary with conditions, and values converted under assumptions.

| Grade     | Meaning                                                                  | Example                                                          |
| --------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Confirmed | Counted directly in production                                           | JS bytes served by the CDN -40.1%                                |
| Range     | A value whose spread depends on the instrument or conditions             | FCP -18% to -44% (traces and Performance API snapshots disagree) |
| Converted | A confirmed value turned into something else by assumption, not measured | -1.9s download on slow 4G (bytes divided by bandwidth)           |

When comparing and explaining numbers, I also checked the following.

- Look at an asset whose size did not change in the deployment (for example CSS) as a control. It helps check whether other factors, like the traffic mix, got mixed in. Align comparison dates by days since deployment.
- When measurement tools disagree, don't merge them into one number; report a range. To confirm a value, pick one tool, verify the conditions, and measure again 15 or more times.
- Check that the conditions you set were actually applied. Once, computing effective bandwidth from the download time of an external asset of the same size showed over 30Mbps, which revealed that throttling had not been applied. The time saved in that result had to be interpreted as a reduction in main-thread work.
- Look for data missing in collection. The -46% from the first production measurement was inflated by missing collection. After remeasuring with CDN bytes, it was corrected to -40.1%.
- If several changes were deployed together, don't claim their individual effects. That was the case when a major framework upgrade and a bundler switch were in the same release. Splitting time windows was also needed. Main-thread work up to LCP dropped 17%, but the 2 seconds after LCP grew 86%, so the totals were about the same. The total work hadn't shrunk; it had only been pushed later.
- State what a ratio refers to and when, as in "a 40.8% duplicate-call rate before the fix." That value must not be presented as the reduction after the fix.

Why measurements under different conditions must not be mixed is also covered in [Remeasuring the First Screen After Fixing the Blog](/2026/09/blog-performance-after-migrations).

## Turn the Report Into Scenes Users Experience

Showing only FCP and TBT numbers to planners or executives makes it hard to convey what got better. A report needs to spell out how the change connects to the user's experience.

I spelled out metric names, but tried not to attach meanings the metric cannot confirm. FCP can be described as "the moment something is first drawn on screen," and TBT as "the total time the main thread was blocked long enough that input handling could be delayed." DCL ([DOMContentLoaded](https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event)) is the point when HTML parsing and the execution of deferred scripts have finished. It does not wait for async scripts to complete, so it should not be described as the point when the screen is ready for the user to interact with. Keep the original metric name in parentheses next to the plain description.

When explaining numbers, I included the situation the user is in, such as a cold first visit or a slow network. Stating which users are expected to see a small effect also helps avoid overestimating the improvement. For effects not yet confirmed by production metrics, I explained the reason up front. That reduces the chance of someone judging it a failure because the dashboard didn't move.

Condensing a real report according to these principles looks like this.

> **Results of the first-screen bundle cleanup deployment**
>
> **Summary**: We cut the JavaScript downloaded on first visit by 40%. The effect users feel, however, has not yet been confirmed with production metrics (see below).
>
> **Confirmed changes** (measured at the production CDN)
>
> - JavaScript downloaded: down 40.1%, from 839.9KB to 503.3KB
> - HTML document size: down about 10%
>
> **Changes users experience** (pre-deployment test environment measurements and conversions)
>
> - On a cold first visit, the time spent looking at a blank screen drops by 0.2-0.5 seconds. The size varies by measurement method.
> - Where the network is slow (at 1.44Mbps), the time to download the initial JavaScript drops by up to 1.9 seconds (transfer divided by bandwidth).
> - The time during loading when scroll or tap handling could be delayed gets shorter, and we expect a larger effect on lower-end devices.
> - Users on recent devices with fast networks are expected to notice little difference.
>
> **Why the effect is currently hard to confirm with production metrics**: The existing instrumentation lacks the information to tell first visits and lower-end device users apart. Whether the improvement confirmed in the lab also appears in production must be checked after the new instrumentation is deployed.
>
> **Next step**: After deploying the new instrumentation to production, recheck against the same criteria.

The report also included a chart showing how the same transfer reduction turns into different time savings depending on network speed.

<BarCompare title="Time to finish downloading the initial JavaScript (transfer divided by bandwidth, a converted value)" unit="ms" before="Before" after="After" rows="Slow 4G (1.44Mbps)|4778|2863;Fast 4G (8.1Mbps)|849|509" />

Converted to time, the same 336.6KB reduction makes a 1.9-second difference on a slow network and 0.3 seconds on a fast one. The bandwidth used in the calculation is the effective value of the Chrome DevTools network presets. To keep it from being mistaken for a measured download time, the chart title also says it is a converted value.

Reporting this way separates changes confirmed in production, test environment measurements, and values converted under assumptions. The users expected to see little effect and the parts that still need production confirmation stay on record too. Why the existing dashboard was hard to judge by is explained earlier in "Look at the Production Dashboard Before the Lab."

## The Techniques Were Short, the Judgment Was Long

While cutting initial-entry JavaScript by 40%, the time spent applying techniques was shorter than expected. Setting the criteria for what could be removed, measuring in the lab the effects the existing dashboard could not judge, and deciding what to fix first and where to stop took longer. I also had to decide how to handle causes in other people's code and infrastructure. After changing the code, there remained verifying behavior, putting regression guards in place, and explaining the measurements without exaggeration.

When fixing code managed by others, I came to think especially about maintenance cost. I looked at who owns it, how far a change reaches, what waiting costs, and whether it can be rolled back. From the moment you copy or reassemble, you have to maintain it yourself, so I think the important call is whether you can bear that cost too.

What remains is confirming with production metrics whether the effect of shrinking the bundle actually reached users. Once the new instrumentation is in production, the next round of work can check whether effects confirmed in the lab also show up in production.
