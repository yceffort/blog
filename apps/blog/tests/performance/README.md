# Performance comparison

The final StyleX comparison is in [RESULTS.md](RESULTS.md), with every trial in [results.json](results.json). The first, utility-only migration is archived in [ROUND-1.md](ROUND-1.md) and [round-1.json](round-1.json). The later comparison of the complete StyleX and WASM migrations, including first and repeat visits, is in [series-overall/README.md](series-overall/README.md); it uses different throttling settings and a baseline from before both migrations.

The runner is [`scripts/compare-performance.mjs`](../../scripts/compare-performance.mjs). It drives a fresh Google Chrome for Testing process through Playwright and the **Chrome DevTools Protocol (CDP)**. It records real throttled navigation and DevTools traces, rather than calculating a simulated Lighthouse score.

## Run

Build and start two production versions with the same Node/pnpm versions, content, environment, and Next.js bundler. The migration baseline is commit `7c4fa58e`; use a separate worktree and install its own locked dependencies so shared packages also come from that commit. Development-server timings include compilation and are unsuitable for this comparison.

The comparison uses an empty `GA4_PROPERTY_ID` for both builds/servers to keep external analytics data out of page generation. Other environment settings must match. On a busy machine, `CIRCLE_NODE_TOTAL=3` limits Next.js static generation to two workers; this only controls the build, not the measured browser CPU.

Install the test browser once:

```sh
pnpm --filter blog exec playwright install chromium
```

With the original production server on port 3104 and the current production server on port 3100, run from the repository root:

```sh
PERF_BEFORE_DIR=/Users/yceffort/private/.blog-tailwind-perf/apps/blog \
PERF_AFTER_DIR=/Users/yceffort/private/blog/apps/blog \
pnpm --filter blog test:performance http://localhost:3104 http://localhost:3100 .cache/performance/full-stylex
```

Optional `PERF_BEFORE_DIR` and `PERF_AFTER_DIR` environment variables point to each blog app directory. These record build IDs, commits, and working-tree status in the results. The third positional argument overrides the output directory, relative to the process working directory.

## Default conditions

| Setting            | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| Viewport           | 390 × 844, touch/mobile, device scale factor 2                              |
| Appearance         | Light theme; normal animations and canvas rendering                         |
| CPU                | 20× slowdown                                                                |
| Network            | 400 Kbps download and upload; 400 ms minimum request-to-response latency    |
| Repetitions        | Five per version per route: 20 measured trials                              |
| Routes             | `/` and `/2026/08/k8s-for-frontend-1`                                       |
| Observation window | Through five seconds after `load`, `document.fonts.ready`, and network idle |
| Browser cache      | Fresh browser/profile per trial; HTTP cache disabled and cleared            |
| Service workers    | Bypassed/blocked in both versions                                           |
| Analytics          | Google Analytics/Tag Manager requests blocked in both versions              |

The runner warms server routes and assets once before measurement. It alternates AB/BA order across rounds/routes. Run it while builds, visual tests, and other CPU-intensive work are idle. CPU slowdown is relative to the host machine; this is a controlled local comparison, not a prediction of a physical phone's absolute speed or production server latency.

`PERF_ROUNDS`, `PERF_CPU`, `PERF_LATENCY_MS`, `PERF_DOWNLOAD_KBPS`, `PERF_UPLOAD_KBPS`, and comma-separated `PERF_ROUTES` override the defaults. For a short instrumentation check, use `PERF_ROUNDS=1 PERF_ROUTES=/` and a separate output directory; do not mix those results into the full comparison.

## What is measured

- FCP and the last observed LCP entry, including the LCP element.
- CLS using the maximum session window (one-second gap, five-second maximum).
- DOMContentLoaded/load timing and the exact observation end.
- Main-thread task, script, style recalculation, and layout durations from `Performance.getMetrics`.
- Long tasks and `loadBlockingMs`: time beyond 50 ms in long tasks between FCP and observation end. **This is not Lighthouse TBT**, whose measurement window differs. No INP claim is made.
- Encoded network transfer bytes (including protocol-reported overhead), split by CSS, JavaScript, fonts, and images. The resource list and cache flags are saved.

The site's pinned jsDelivr KaTeX stylesheet is loaded normally on both sides; CDN timing and header variation remain part of the experiment.

The script verifies that requests actually received the network-throttling rule. HTTP errors, unexpected network failures, missing paint measurements, JavaScript errors, and cached responses invalidate a trial instead of being silently omitted. Tracing runs equally on both sides, so the numbers include its overhead.

## Outputs

Results are written to `apps/blog/.cache/performance/` by default; the command above uses its `full-stylex/` subdirectory:

- `results.json`: settings, browser/host details, every trial, per-resource transfers, and median/min/max summaries.
- `*.trace.json.gz`: the Chrome performance trace for each trial.
- `*.png`: the final viewport for each trial, to inspect the loaded page.

In Chrome DevTools, open **Performance → Load profile** and select a trace. If the installed Chrome does not accept gzip directly, decompress it with `gunzip -k file.trace.json.gz` and open the JSON. The raw artifacts are ignored by Git; the runner and this methodology are kept in the repository. Report the sample count and spread alongside the median, and do not treat small differences within run-to-run variation as established improvements.

References: [CPU throttling](https://chromedevtools.github.io/devtools-protocol/1-3/Emulation/#method-setCPUThrottlingRate), [network throttling rules](https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-emulateNetworkConditionsByRule), and [DevTools Performance](https://developer.chrome.com/docs/devtools/performance/overview).
