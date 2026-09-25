---
title: 'I Grew Never-Executed JavaScript to <em>10MiB</em>'
tags:
  - web-performance
  - javascript
  - browser
  - bundler
published: true
date: 2026-09-16 18:00:00
description: 'How much do you lose when 10MiB of functions you never call ships to the browser? I ran 855 measurements to separate the cost created by bytes from the cost created by the shape of the code. Uncalled declarations cost about 21ms per MiB and did not grow when I slowed the CPU by 4x, while initialization code that runs the moment the file is read added 201ms per MiB to the main thread. With real libraries, merely importing a module was enough to evaluate it.'
art:
  undraw: app-benchmarks
  layout: gridChart
  hue: warm
  tone: light
---

## Table of Contents

## The same 10MiB, but five times the time to get ready

I loaded a 10MiB JavaScript file into a browser with the CPU slowed down 4x, and the script took 432.4ms to become ready. Not one function inside that file was ever called. When I changed the same 10MiB so that every function was invoked right after it was declared, the number became 2,254.8ms. The bytes coming down the wire were identical; only what the code did was different, and the gap was five times.

So is that 432.4ms entirely the fault of functions that are never called? No. About half of it is what you pay simply because the file is 10MiB, and the rest is what the browser adds while processing those function declarations. To pull the two apart, I measured a control file filled with the same number of bytes as comments.

We often say to use libraries that tree-shake well: import only what you need and keep unused code out of the bundle. I think that advice mixes two different things. One is **the gain from having fewer bytes**, and the other is **the gain from having less code**. The first follows from deleting any bytes at all; the second only comes from deleting code.

So I kept the page identical and grew only a file the button never uses, from 128KiB up to 10MiB. There were three variants: functions that are declared but never called, functions that are called immediately after being declared, and, to decompose the two costs, a control filled with the same bytes as comments.

The measurements billed the cost to three different places: the transfer wait created by the bytes themselves, the background work and heap created by scanning function declarations, and the compilation and execution that move onto the main thread the moment a function is called. Those three grow in completely different ways depending on the user's environment. The time added by uncalled functions barely moved when I slowed the CPU 4x, going from 22.1ms to 21.4ms per MiB, while initialization code went from 61.1ms to 200.7ms, a factor of 3.3.

## One button, and only the code loaded behind it changed

The test page is an HTML document with a single button. Pressing it increments a number on screen. The extra JavaScript has nothing to do with what that button does. I opened the page first, then added one same-origin external script, and measured how late the button responded while that was happening.

Swapping in a particular library changes its size along with its dependencies, its initialization, and the structure of the screen. So this time I generated the unused code directly. These are not numbers from comparing real library bundles with tree shaking on and off; this is **a simplified reconstruction of the situation where unused code survives into the final file and gets delivered**. There is no React and no other framework in it.

### The same bytes, filled three ways

| Code shape         | 5MiB file name        | What it does inside the file                           |
| ------------------ | --------------------- | ------------------------------------------------------ |
| Comments           | `comment-5120.js`     | Function-shaped text wrapped in one large comment      |
| Uncalled functions | `functions-5120.js`   | Functions declared and left alone                      |
| Top-level init     | `initialized-5120.js` | Functions called right after declaration, results kept |

The comment file is not code anyone would ship; it is a control for the instrumentation. I was not trying to reproduce a situation where several MiB of comments actually get emitted. What I needed was **the same amount of text delivered without being processed as function declarations**. The compressed sizes show it played that role well. At 10MiB, the comments gzip to 1,215,401 bytes and the uncalled functions to 1,215,390 bytes. An 11-byte difference means the amount crossing the wire is effectively identical.

That said, a control is not free. Comments still have to be downloaded, and the browser still scans that source. The counter initialization and the final marker sit outside the comment.

Deleting comments and deleting unused functions are not equally hard. The latter requires judging whether the code is actually used and whether it has side effects. [esbuild's documentation](https://esbuild.github.io/api/#ignore-annotations) treats `sideEffects` and pure-call annotations, which support exactly that judgment, as separate concerns. What this post cares about is the function that survived a failure of that judgment and reached the browser after the build.

### This is what went inside the files

Here is the first function in a generated file. I added line breaks and whitespace for readability; in the actual file each function is generated on one line.

```js
globalThis.__unusedCalls = 0
globalThis.__unusedData = []

function feature_000000(input) {
  globalThis.__unusedCalls++
  const scale = 1
  const label = 'feature_91b4d142823f7d20c5f08df6'
  const value = (input.value ?? 0) * scale

  return {
    id: 0,
    label,
    value,
    enabled: value > scale,
    tags: [label, 'group_0'],
  }
}
```

Each function contains arithmetic, strings, a conditional, and object and array creation. There are no busy loops added to make it slow. Function names increment: `feature_000000`, `feature_000001`, and so on. `label` is the first 24 characters of the SHA-256 of the number, and `scale`, `id`, and `group` also vary with the number. This is not the same empty function cloned, nor a file padded with whitespace.

In the uncalled condition, these functions are **declared and never called**. So `__unusedCalls` must stay 0 and `__unusedData` must stay an empty array. The code that creates objects and arrays lives in the function bodies, so under this condition it never runs.

In the initialization condition, each declaration is followed by a call.

```js
globalThis.__unusedData.push(feature_000000({value: 0}))
```

The next function is called with `{value: 1}`, with the input set to the function number modulo 131. The resulting objects pile up in `__unusedData`, but neither the button nor the screen uses them. This is the situation where initialization runs the moment the file is read, even if the user never uses the feature.

The number in a file name is KiB. `functions-5120.js` is exactly 5MiB and contains 22,666 functions. Call statements take bytes too, so `initialized-5120.js` holds 18,120. This comparison fixes the final byte count of the file rather than the number of functions. The generator adds functions one at a time, stops just before it would exceed the target size, and fills the remaining bytes with a short comment at the end of the file. At the very end sits `performance.mark('payload-evaluated')`, which records where evaluation finished. The shared instrumentation code and that marker count toward the target byte count as well.

The files are served exactly as generated, without going through a bundler, so that tree shaking cannot remove them. I verified that the decompressed byte count the browser received matched the generated file, and that in the uncalled condition the in-body call counter was 0 every time. A separate coverage run also confirmed that 0 of the 22,666 functions in the 5MiB file were called.

To be precise, **"never executed" here means the function bodies were never called**. It does not mean there was no work involved in processing the top-level function declarations.

### Script loading and button input were recorded together

A single measurement ran in this order.

1. Open the same HTML in a fresh browser context and wait for two `requestAnimationFrame` callbacks. The button's input handler is already registered at this point.
2. Read the main-thread task time and the JS heap size, then dynamically add the external script.
3. While the script is getting ready, dispatch input at the button's coordinates from Node.js outside the browser, over CDP.
4. When the script's `load` event fires, record the ready timestamp and the browser metrics. Confirm that the input sent during loading was handled, wait 150ms, and press the button three more times.
5. Check the call count and the number of bytes received, and store input timestamps, long tasks, and resource timing in the raw data.

The core of the page-side code that injects the script looks like this. `state` is the page's measurement record. Status display and error handling are omitted below; the full code is in the [experiment server source](https://github.com/yceffort/blog/blob/main/experiments/javascript-size/scripts/server.mjs).

```js
window.startBenchmark = (url) => {
  state.start = performance.now()
  state.done = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = url
    script.onload = () => {
      state.ready = performance.now()
      resolve()
    }
    document.head.append(script)
  })
  return state.start
}
```

`state.ready - state.start` is what this post calls the time to ready. It is a classic script with no `type="module"`, and this is not an experiment that measures HTML parsing or a full navigation.

On the button, I recorded the `pointerdown` event timestamp and the moment the handler was entered. The actual handler stores the input and then increments the number on the button.

```js
document.querySelector('#counter').addEventListener('pointerdown', (event) => {
  state.clicks.push({
    timestamp: event.timeStamp,
    handledAt: performance.now(),
    inputDelayMs: performance.now() - event.timeStamp,
    isTrusted: event.isTrusted,
    phase: state.phase,
  })
  document.querySelector('#counter').textContent = 'Clicks: ' + ++count
})
```

The input was not generated with `setTimeout` inside the page or with `button.click()`. To deliver input even while the page's main thread is busy, I used CDP's `Input.dispatchMouseEvent` from the Node.js process running Playwright. The mouse press and release events carried explicit dispatch timestamps, and the page also verified `isTrusted` on the events it received.

The main run dispatched input at roughly 25ms and 100ms after the start response. A separate follow-up experiment dispatched input every 50ms until the script was ready, because fixed-time input alone missed part of the timeline. I will get to that result later. Every timestamp was recorded along with the moment the input was actually injected, so nothing here assumes a timer fired exactly when it was scheduled.

## I limited CPU and network inside Codespaces

I used a coding agent to write the experiment code and run it repeatedly. The browser and the server both ran inside GitHub Codespaces, while my local Mac only aggregated results and drew charts. I did not measure by opening the Codespaces port from a local browser.

The measurement date is September 16, 2026. Chrome for Testing 153.0.8010.12 ran headless on an Ubuntu 24.04.4 VM with 2 vCPUs and 8GB of memory. Playwright was 1.63.0 and Node.js was 24.20.0.

| Condition            | CPU                  | File delivery                              |
| -------------------- | -------------------- | ------------------------------------------ |
| No limits            | VM's default speed   | In-VM communication, no compression        |
| CPU throttling       | 4x slowdown over CDP | In-VM communication, no compression        |
| CPU and slow network | 4x slowdown over CDP | gzip, 4Mbps download, 80ms latency setting |

The weaknesses of this environment are worth stating up front. The browser, the server, Playwright, and the Node.js process injecting input all share a VM with only 2 vCPUs. Add a 4x CPU slowdown and the thing being measured and the thing doing the measuring are splitting very few cores. Input delay in particular is measured against a dispatch time from Node.js inside the same VM rather than outside it, so a busy host can delay the injection itself. Read the input delay numbers below as values observed in this environment, not as perceived latency on a real device.

The 4x CPU slowdown is also relative to this VM's performance; it is not calibrated to match any particular phone. "No network limits" means the server and the browser communicated inside the same Codespace, not that transfer and resource processing cost exactly zero. Files and their gzip output were built in advance and held in server memory.

File sizes, before compression, are 128KiB, 512KiB, 1MiB, 2MiB, 5MiB, and 10MiB. 1MiB is 1,048,576 bytes. The baseline with no extra functions contains only 101 bytes of shared instrumentation. Across the three environments I measured 57 conditions including the baseline, 15 times each, for 855 runs total. Condition order was shuffled on every repetition, and browser measurements never ran in parallel.

The main run used a fresh browser context and a unique URL every time, with the HTTP cache disabled. It did not restart the browser process each time. Tables report medians; the shaded band in the charts is the IQR, the middle 50%. Repeat visits, repeated input, and internal traces were split into separate experiments.

In this post, **time to ready** means the interval from adding the external script to that script's `load` event. It is not a navigation or first-paint metric. The button is already visible and working before any of it.

## The cost created by bytes, and the cost created by the shape of the code

First, with no network limits, I grew only the file size. These are median times to ready under the 4x CPU slowdown.

| Extra file size | Comments | Uncalled functions | Top-level init |
| --------------- | -------: | -----------------: | -------------: |
| Baseline 101B   |   24.4ms |             24.4ms |         24.4ms |
| 128KiB          |   32.3ms |             35.8ms |         86.8ms |
| 512KiB          |   59.8ms |             78.6ms |        193.6ms |
| 1MiB            |   63.1ms |            123.2ms |        305.7ms |
| 2MiB            |   80.2ms |            169.2ms |        524.2ms |
| 5MiB            |  161.9ms |            289.1ms |      1,151.4ms |
| 10MiB           |  209.5ms |            432.4ms |      2,254.8ms |

Time to ready grew even though no function body was ever called. That much was expected. What deserves attention is the comment column on the same row. Of the 432.4ms for uncalled functions at 10MiB, 209.5ms also shows up with the same bytes as comments. In other words, about half is not the cost of "being functions" but the cost of "being 10MiB."

In the smaller sizes, that difference is not worth taking seriously. At 128KiB, the 95% interval around the median runs from 31.9ms to 58.3ms for uncalled functions and from 24.7ms to 35.5ms for comments, and the two overlap. They still overlap at 512KiB; under this condition the two shapes only separate completely from 1MiB onward.

![Time to ready by size for uncalled functions, top-level initialization, and the comment control with the same bytes. From left: no CPU limit, 4x CPU slowdown, and CPU slowdown with a slow network.](./images/unused-javascript-cost/functions-readyMs.png)

Gray is comments, blue is uncalled functions, orange is top-level initialization. Each panel has its own vertical scale, so heights should not be compared across panels. The point of the chart is the right panel, where gray and blue almost touch.

All three shapes grew close to a gentle straight line as size increased. Simple linear regressions over the 0 to 10MiB range had R² between 0.945 and 0.9999, and going from 5MiB to 10MiB, time to ready grew 1.50x for uncalled functions and 1.96x for initialization code under CPU throttling. At least in this range, I did not observe a curve where cost explodes as size grows. That is not proof of linearity beyond the measured range or on other devices, and it does not statistically reject an exponential model either.

## The extra cost of uncalled functions barely grew when I slowed the CPU 4x

Subtract the comment slope from each shape's slope and what remains is the time that the code shape laid on top of the bytes.

| Condition            | Comments (ms/MiB) | Uncalled functions | Added by shape | Top-level init | Added by shape |
| -------------------- | ----------------: | -----------------: | -------------: | -------------: | -------------: |
| No limits            |             13.07 |              35.16 |      **22.09** |          74.17 |      **61.10** |
| 4x CPU slowdown      |             18.37 |              39.75 |      **21.38** |         219.11 |     **200.75** |
| CPU and slow network |            251.33 |             263.31 |      **11.98** |         434.84 |     **183.51** |

I slowed the CPU by 4x and the added cost of uncalled functions actually went down slightly, from 22.09ms to 21.38ms. The added cost of initialization code, meanwhile, went from 61.10ms to 200.75ms, a factor of 3.3.

<BarCompare title="Time to ready that each code shape added on top of the comment control" unit="ms/MiB" before="Uncalled functions" after="Top-level init" rows="No limits|22.09|61.10;4x CPU slowdown|21.38|200.75;CPU and slow network|11.98|183.51" />

This comparison is the thing I most wanted to say with this experiment. **The explanation that "it gets more expensive on low-end devices" applies to initialization code, not to uncalled declarations.** The time added by uncalled declarations barely reacted to CPU speed.

### That work was not on the main thread

To find out why, I collected a separate trace at 5MiB.

V8 does not process every function body the same way from the start. It can pre-parse the body of a function that will be needed later in a lightweight pass and defer full parsing and compilation. Even then it has to collect the syntax and scope information it needs, so it is not skipping the body entirely. [V8's post on lazy parsing](https://v8.dev/blog/preparser) covers this process.

The trace recorded exactly that. In the uncalled condition, `V8.PreParse` appeared 22,666 times on `ThreadPoolForegroundWorker`, matching the number of functions in the file precisely. `v8.parseOnBackground` on the same thread pointed at the experiment file, and the parsing window inside it was 242.8ms. For the comment file of the same size it was 127.7ms. On the main thread, meanwhile, `EvaluateScript` was 31.8ms for uncalled functions and 6.0ms for comments.

Zero function bodies were called, but there was work involved in scanning the functions, and much of it was recorded off the main thread. That seems to be why the 4x CPU slowdown did not show up directly in time to ready. Throttling is not a main-thread-only setting, but in a window where transfer and background processing overlap, slowing one side does not stretch the whole proportionally.

Isolate the main-thread task time and the slowdown does show up almost exactly. For 10MiB of uncalled functions, main-thread task time went from 28.6ms with no limits to 122.6ms under a 4x slowdown, a factor of 4.3. Over the same interval, time to ready went from 358.5ms to 432.4ms, only 1.21x. The bottleneck in time to ready was not the main thread.

I used trace timings only as a reference here. Turning on detailed compilation events makes the instrumentation itself heavy. The 5MiB initialization diagnostic run had a time to ready of about 3,070ms, far from the 1,151ms median of the main run with instrumentation off. Trace and coverage runs were kept out of the 855-run statistics, and while I used their event counts as-is, I did not treat their timings as representative values.

### Functions I never called still occupied the heap

Not holding the main thread for long does not mean there is no cost. Here is the `JSHeapUsedSize` difference before and after ready, at 5MiB under a 4x CPU slowdown with no network limits.

| 5MiB file          | JS heap growth | Per source byte |
| ------------------ | -------------: | --------------: |
| Comments           |        0.06MiB |          0.012B |
| Uncalled functions |        4.52MiB |           0.90B |
| Top-level init     |       13.28MiB |           2.66B |

5MiB of comments barely moved the heap, but filling the same 5MiB with function declarations added 4.52MiB. Divided by 22,666 functions, that is about 209 bytes each. The 10MiB file gives 8.90MiB across 45,286 functions, about 206 bytes each, so the value is consistent.

In other words, functions you never call occupy roughly as much heap as their source size. This cost applies identically to every device regardless of CPU speed, and it hurts more the tighter the memory. If you are worried about low-end environments, I think memory rather than CPU is the more accurate argument to make about uncalled functions.

That said, these are differences read without a forced GC, so they do not represent retained memory or the browser's total memory. Nor can the small heap growth for comments be used to claim that "there is no memory anywhere holding those 5MiB of source."

## The moment you call it, the work moves to the main thread

These are values at 5MiB under a 4x CPU slowdown with no network limits.

| Code shape         | Time to ready | Main-thread task time | Long-task time over 50ms |
| ------------------ | ------------: | --------------------: | -----------------------: |
| Comments           |       161.9ms |                53.5ms |                      0ms |
| Uncalled functions |       289.1ms |                81.5ms |                      0ms |
| Top-level init     |     1,151.4ms |               915.3ms |                    799ms |

Main-thread task time is the increase in CDP's `TaskDuration` from just before the script was added to just after ready was confirmed. It includes instrumentation, button handling, and other work, and excludes background threads. It does not mean pure JavaScript parsing time.

Uncalled functions used 81.5ms of the main thread across a 289.1ms wait, and the total time over the 50ms long-task threshold was 0. That does not mean there was no work; it means no individual task crossed 50ms. This total is computed over the experiment window, so its boundaries differ from Lighthouse's TBT.

The initialization condition used 915.3ms, about 11.2x the uncalled condition. The file size did not change, only what the code did, and that was the gap.

![Main-thread task time by JavaScript size. Only top-level initialization climbs steeply; uncalled functions and comments stay near the floor.](./images/unused-javascript-cost/functions-mainThreadTaskMs.png)

The trace makes it fairly clear where that time went. In the 5MiB initialization condition, main-thread `EvaluateScript` was 2,043.3ms, and inside it `V8.CompileCode` appeared 18,146 times totaling 1,671.9ms. `V8.ParseFunction` was 18,144 occurrences at 447.2ms, and `V8.CompileIgnition` 18,151 occurrences at 310.0ms. In the uncalled condition for the same file, main-thread `V8.ParseFunction` appeared only 22 times.

The compilation that had been deferred all came back at once the moment the functions were called. Pre-parsing finished in the background, but actually running a function means parsing the body again and producing bytecode, and that happens on the main thread. [V8's post on compile hints](https://v8.dev/blog/explicit-compile-hints) also covers this lazy compilation and its overlap with downloading. Event counts include instrumentation code, so I did not map all of them one-to-one onto experiment functions.

Initialization cost is not only compilation. It also includes 18,120 function calls and that many object creations and array insertions. The 13.28MiB of heap growth is the trace of that. And this condition has 18,120 functions, fewer than the 22,666 in the uncalled file. This is not a comparison where calls were added to the same functions; it is the difference between spending the same byte budget on declarations and spending it on declarations plus calls plus object creation.

Real libraries rarely do this much work at the top level. This condition is closer to pushing things to an extreme to see which direction cost moves when more code runs the moment a file is read. Still, I think the direction itself holds regardless of scale. Declarations can be deferred; execution cannot.

## There was a 1.7-second long task, and input delay was 6ms

At first I dispatched input at roughly 25ms and 100ms after adding the script, meaning to see how late the button responded during early loading.

But under a 4x CPU slowdown at 10MiB of initialization, the median input delay at the 25ms mark was 6.2ms. The longest task under the same condition had a median of 1,739ms. Put those two numbers side by side and the input instrumentation looks broken.

The problem was when the input happened. Send input once early in loading and you can miss a long task that starts after that input is handled. Responding quickly at that moment did not mean it could keep responding afterward.

So I ran a separate experiment that dispatched input every 50ms until ready. Keeping the 4x CPU slowdown and no network limits, I measured 10 conditions 10 times each, 100 runs total.

| Code shape         |  Size | Median of max input delay observed during loading | Median input delay after ready |
| ------------------ | ----: | ------------------------------------------------: | -----------------------------: |
| Comments           |  5MiB |                                             7.8ms |                          2.5ms |
| Uncalled functions |  5MiB |                                            19.9ms |                          2.5ms |
| Top-level init     |  5MiB |                                           838.5ms |                          2.8ms |
| Comments           | 10MiB |                                             8.3ms |                          2.6ms |
| Uncalled functions | 10MiB |                                            40.5ms |                          2.6ms |
| Top-level init     | 10MiB |                                         1,709.5ms |                          2.9ms |

The loading column takes the maximum delay observed in each run first, then the median of those 10 maxima. The after-ready column takes the median of three inputs per run, then the median across runs. The aggregation differs, so you cannot compute an improvement ratio between the two columns.

<BarCompare title="Median of the max input delay observed during loading" unit="ms" before="5MiB" after="10MiB" rows="Comments|7.8|8.3;Uncalled functions|19.9|40.5;Top-level init|838.5|1709.5" />

Doubling the file size moved the comment control only 6.4%, while uncalled functions grew 103.5% and initialization code 103.9%. In the byte-only condition, loading-time delay barely changed; in the two conditions with real code shapes, it grew in proportion to size. At 10MiB of initialization, the median of the maximum input delay observed during loading was about 1.7 seconds, a delay that a single input at the 25ms mark never revealed. Uncalled functions also pushed an input out to 40.5ms at 10MiB, but next to 8.3ms for the same bytes as comments, the absolute number is small.

After ready, all three shapes sat around 3ms. Simply having loaded a large file once did not keep this simple button responding a second late.

What this gives you is a fact about measurement more than a fact about unused code. When you look at responsiveness during loading and measure it with a single click at a fixed moment, you can get a result where a long task looks like it is not there at all.

## On a slow connection, byte count outranked code shape

Apply a 4x CPU slowdown plus gzip, a 4Mbps download, and an 80ms latency setting, and the ordering changes.

| Code shape         | Time to ready at 5MiB | Time to ready at 10MiB |
| ------------------ | --------------------: | ---------------------: |
| Comments           |             1,351.2ms |              2,613.5ms |
| Uncalled functions |             1,400.2ms |              2,732.2ms |
| Top-level init     |             2,254.1ms |              4,445.0ms |

Uncalled functions at 10MiB take 2,732.2ms, and the same bytes as comments take 2,613.5ms. The part added by them being functions is 118.7ms, 4.5% of the total. The difference that accounted for about half under the earlier loopback condition is closer to noise here. When the connection is slow, how much you sent decides the time, not what you sent.

To read these times you first have to line up the units of file size and connection speed.

### 4Mbps is not 4MB per second

Mbps is megabits per second; MB/s is megabytes per second. There is a factor of 8 between lowercase `b` and uppercase `B`. Since a byte is 8 bits, the 4Mbps I configured converts to bytes like this. [NIST's unit definitions](https://physics.nist.gov/cuu/Units/binary.html) also distinguish bits from bytes and decimal prefixes from binary ones.

```text
4Mbps = 4,000,000bit/s
      = 500,000B/s
      = 0.5MB/s
      ≈ 488.28KiB/s
```

100Mbps converts to 12.5MB per second. Plugging a connection's Mbps number straight into a file's MB makes your transfer-time estimate 8 times too short. The `downloadThroughput` in this measurement script also takes bytes per second, so it got `500000`.

MB and MiB differ too. 1MB is 1,000,000 bytes and 1MiB is 1,048,576 bytes. So the naive calculation for sending 10MiB uncompressed at 500,000 bytes per second is about 20.97 seconds. **That 20.97 seconds is not a separate measurement of an uncompressed 4Mbps condition; it is byte count divided by speed.**

The actual time to ready, though, was about 2.7 seconds, because this network condition did not transfer the full 10MiB.

### What gets transferred is the compressed bytes

The gzip body of 10MiB of uncalled functions was exactly 1,215,390 bytes: about 1.22MB, or about 1.16MiB in binary units. Sending that at 4Mbps works out to about 2.43 seconds of body transfer.

```text
1,215,390B ÷ 500,000B/s = 2.43078s
```

The transfer calculations in the next table exclude latency and any additional processing. Actual request time is Resource Timing's `duration`, and time to ready runs from adding the script to `load`; both are medians of 15 runs.

| Uncompressed size of uncalled functions | gzip body size | 4Mbps body transfer calc | Actual request time | Actual time to ready |
| --------------------------------------- | -------------: | -----------------------: | ------------------: | -------------------: |
| 5MiB                                    |       608,575B |                   1.217s |              1.303s |               1.400s |
| 10MiB                                   |     1,215,390B |                   2.431s |              2.531s |               2.732s |

Setting 4Mbps does not make the body transfer calculation equal the actual time to ready. There was an 80ms latency setting, plus the browser's resource handling and script processing, and some of that overlaps with transfer. So you cannot call the remainder after subtracting transfer from time to ready "parsing time."

To check sizes before and after compression, Resource Timing distinguishes `encodedBodySize` from `decodedBodySize`: the former is the body size before decompressing gzip and the like, the latter after. You can record `transferSize` too, but it is hard to treat it as the exact byte count of every packet on the wire. The [Resource Timing specification](https://www.w3.org/TR/resource-timing/#dom-performanceresourcetiming-transfersize) defines adding a fixed value instead of the real header size, along with how caching is handled.

The compression ratio of these files does not carry over to other bundles. These are regularly generated functions, so gzip works unusually well: 10MiB shrinks to 1.16MiB, down to 11.6%. Real bundles compress less. To estimate download cost, check the compressed byte count of the actual response.

### Higher Mbps does not shrink every kind of waiting

A connection's Mbps does not guarantee the throughput one JavaScript request sustains from start to finish. Real throughput is affected by congestion and other transfers, and the wait for a response is a different quantity from the transfer rate. [Cloudflare's network explainer](https://www.cloudflare.com/en-gb/learning/performance/glossary/what-is-latency/) also separates bandwidth, actual throughput, and latency.

An experiment like this one, with the server and the browser on the same VM, does not reproduce the process of connecting to a server across the internet. 4Mbps and 80ms are controlled settings. You cannot look at a real user's plan or speed-test result and expect the loading times in this table.

A fast download does not eliminate initialization work either. The 5MiB initialization file here is about 576.91KiB after gzip, actually smaller than the 594.31KiB of uncalled functions. Yet under the slow network condition, time to ready was about 2.25 seconds for initialization code and about 1.40 seconds for uncalled functions. Fewer bytes to transfer can still mean a later ready time when there is more to execute.

**Compression reduces what you download. The browser processes the decompressed source, and the initialization code inside it still runs.** That is why uncompressed size, compressed transfer size, and main-thread task time need to be read together.

Under the same condition, main-thread task time for 10MiB of uncalled functions was 186.9ms. "You waited 2.7 seconds" and "input was blocked for 2.7 seconds" are different statements. The button in this experiment is independent of the extra file, so it worked first. If a real feature has to wait on that script, its time-to-usable slips even while the main thread sits idle.

## With a cache, the waiting looked different

I measured repeat visits separately. After three priming visits to the same URL, I measured the fourth, running six conditions 10 times each. In all 60 measured runs, the extra script's Resource Timing `transferSize` was 0.

Under a 4x CPU slowdown, time to ready for 10MiB of uncalled functions was a median of 432.4ms on the first measurement with no network limits, and 71.0ms on a cache-allowed repeat visit. On the slow network it went from 2,732.2ms to 71.1ms. First measurements are 15 runs per condition; repeat visits are 10.

Since this allows both the HTTP cache and the browser's code reuse, the entire reduction cannot be attributed to the V8 code cache alone. [V8's post on improved code caching](https://v8.dev/blog/improved-code-caching) also separates reusing an HTTP response from reusing compilation output.

The input-timing trap from earlier showed up again here. In the 10MiB uncalled condition with no network limits, input delay at the 25ms mark was 5.6ms on the first measurement and 45.5ms on the repeat visit. The script got ready far faster, yet a single input makes it look slower. When the timing of work during loading shifts, the work a fixed-time input lands on shifts too, so these numbers alone could not support a conclusion that the cache hurt responsiveness.

## Real libraries have the same fork in the road

Everything up to here was measured with code I generated. The initialization condition was an extreme where 18,120 functions were all called right after declaration, and real libraries rarely do that much work at the top level. So I measured the same axis again with real libraries.

> The measurements in this section come from a different environment than the 855 runs above. They were taken on a local macOS machine rather than in Codespaces, so I do not put them on the same line as the earlier tables. The comparisons here are among the conditions in this section.

I kept the page with the button as it was and swapped the injected file for real libraries bundled with esbuild 0.25.12, with `minify` and `format: 'iife'` on and `process.env.NODE_ENV` fixed to `production`. The libraries are msw 2.12.4, lodash 4.17.21, moment 2.30.1, and winston 3.19.0.

### First, whether it survives into the bundle

With the same library used the same way, the outcome diverged based on whether the branch condition was decided at build time.

```js
// The bundler can fold this condition. The whole block becomes dead code.
if (process.env.API_MOCKING === 'enabled') {
  globalThis.__libResult = [
    http.get('/api/quote', () => HttpResponse.json({price: 1})),
  ]
}

// The bundler cannot know the value without running it. All of msw stays.
if (globalThis.__API_MOCKING === 'enabled') {
  globalThis.__libResult = [
    http.get('/api/quote', () => HttpResponse.json({price: 1})),
  ]
}
```

| Condition              | Bundle raw |    gzip |  vs. baseline |
| ---------------------- | ---------: | ------: | ------------: |
| Baseline               |       332B |    226B |            0B |
| msw, build-time branch |       332B |    226B |        **0B** |
| msw, runtime branch    |   191,818B | 68,045B | **+191,486B** |
| msw, actually used     |   191,753B | 68,018B |     +191,421B |
| lodash, unused         |    73,799B | 26,960B |      +73,467B |
| lodash, used           |    73,824B | 26,966B |      +73,492B |
| moment, unused         |    62,199B | 20,320B |      +61,867B |
| moment, all locales    |   372,883B | 81,078B |     +372,551B |
| winston, unused        |   161,969B | 44,419B |     +161,637B |

<BarCompare title="Bytes each library added to the bundle" unit="B" before="Uncompressed" after="After gzip" rows="msw, build-time branch|332|226;msw, runtime branch|191818|68045;lodash, unused|73799|26960;moment, unused|62199|20320;moment, all locales|372883|81078;winston, unused|161969|44419" />

Wrapped in a build-time constant, msw has the same byte count as the baseline. Not a trace of it remains. Wrapped in a runtime value, all 191,818 bytes stay. The code does exactly the same thing, only the branch condition differs, and 68KB after compression hangs on that difference.

lodash and moment survived almost entirely even when merely imported and never used. The difference from the used conditions is 25 bytes and 34 bytes respectively. They are CommonJS modules, so the bundler cannot establish that they are side-effect free.

One pair here is worth noting. **The msw runtime-branch condition and the actually-used condition differ by 65 bytes.** The "same bytes, different code shape" I built synthetically earlier occurred here with a real library.

### If it stays, it runs

The msw that survived into the bundle never creates a single handler, because the branch is `false`. So is it just declarations sitting there? Coverage says no.

| Condition           | Functions | Executed functions | Executed bytes |     Ratio |
| ------------------- | --------: | -----------------: | -------------: | --------: |
| Baseline            |         8 |                  2 |           225B |     67.8% |
| msw, runtime branch |       323 |             **41** |       136,177B | **71.0%** |
| msw, actually used  |       324 |                 49 |       136,929B |     71.4% |
| lodash, unused      |       624 |             **85** |        20,485B |     27.8% |
| lodash, used        |       624 |                 90 |        20,926B |     28.3% |
| moment, unused      |       367 |             **37** |        15,632B |     25.1% |
| moment, all locales |       754 |                 44 |       268,440B |     72.0% |

Executed bytes is the total minus the union of ranges V8 reported with an execution count of 0. Data literals that are not functions count as executed, so conditions heavy in locale data show a high ratio.

<BarCompare title="Functions that run even when unused" unit="functions" before="Unused" after="Used" rows="msw|41|49;lodash|85|90;moment|37|68" />

With the branch `false`, msw still ran 41 functions, 8 fewer than the 49 in the condition that actually builds handlers. lodash ran 85 even unused, and moment ran 37.

I think this is the easiest part of the experiment to miss. **`import` is not a statement that brings in declarations; it is a statement that evaluates a module.** The branch only blocks the call that follows it, while the work of creating objects and registering them at module top level is already done. The "file with declarations and no top-level execution" from the synthetic experiment turns out to be a shape you rarely find in a real library.

### Blocking it with a branch cuts it roughly in half

These are medians of 15 runs per condition under a 4x CPU slowdown.

| Condition              | Bundle raw | Time to ready | Main-thread task | Heap growth |
| ---------------------- | ---------: | ------------: | ---------------: | ----------: |
| Baseline               |       332B |         2.5ms |            2.5ms |     0.04MiB |
| msw, build-time branch |       332B |         3.3ms |            2.9ms |     0.04MiB |
| msw, runtime branch    |   191,818B |        11.3ms |            9.8ms |     1.09MiB |
| msw, actually used     |   191,753B |        22.8ms |           21.5ms |     1.12MiB |
| lodash, unused         |    73,799B |        18.4ms |           17.6ms |     1.03MiB |
| lodash, used           |    73,824B |        19.2ms |           19.1ms |     1.03MiB |
| moment, unused         |    62,199B |         8.9ms |            8.0ms |     0.23MiB |
| moment, all locales    |   372,883B |        26.7ms |           25.5ms |     1.21MiB |

<BarCompare title="Main-thread task time during loading" unit="ms" before="No CPU limit" after="4x CPU slowdown" rows="msw, build-time branch|0.9|2.9;msw, runtime branch|3.3|9.8;msw, actually used|6.0|21.5;lodash, unused|4.6|17.6;moment, all locales|5.9|25.5" />

The build-time constant condition is effectively identical to the baseline. That follows from it being gone from the bundle, but set next to the other rows, you can see what that one line saved.

The msw wrapped in a runtime branch used 9.8ms of the main thread. That is less than the 21.5ms of the condition that actually builds handlers, so the branch blocked more than half, but compared with the 2.9ms of the condition where it was deleted, it still costs 7ms more. Heap growth was 1.09MiB versus 1.12MiB, nearly the same, which reads as most of the object creation finishing during module evaluation rather than inside the branch.

For lodash, the used and unused conditions sit together at 17.6ms and 19.1ms. Calling one function or calling none cost nearly the same.

The mismatch between size order and cost order stands out too. lodash is 73,799 bytes, 38% of the msw runtime-branch condition, yet its main-thread work is 17.6ms against 9.8ms, a factor of 1.8. The earlier conclusion, that the same bytes cost differently depending on what happens during module evaluation, points the same way here.

Converted per byte, all of these conditions sit above the uncalled-function slope from the earlier experiment. But the environment differs and the baseline itself was measured on a machine nearly ten times faster, so I did not subtract one experiment's slope from the other's.

### A server-only library could not even finish running

winston is a different case: code that cannot run in a browser shipped in the client bundle.

Building a browser bundle with esbuild fails with 26 errors because it cannot resolve Node built-ins like `util`, `os`, and `events`. So, as webpack used to do in client builds, I replaced the Node built-ins with empty modules, added a minimal `process` polyfill, and produced a bundle. It is not identical to a real build configuration, but this is how a bundle that passes the build and ships anyway comes about.

The resulting bundle was 161,969 bytes, 44,419 bytes after gzip. Evaluating that file in a browser runs 231 functions and then stops at `util.inherits is not a function`. It downloads, decompresses, parses, runs about a third of itself, and ends in an error. The functionality gained in exchange is nothing.

Since evaluation breaks partway, time to ready and main-thread task time do not hold for this condition, so I left it out of the table above. The nature of the cost is clear all the same. Of the three layers above, only the transfer cost is paid in full and the rest is thrown away mid-flight.

## Conclusion

Code you never execute does have a cost. It just is not one lump; it is billed in three separate places. The time to download it, the time the browser spends scanning the source, and the time that code running at import holds the main thread. I started by saying that tree-shaking advice mixes the gain from fewer bytes with the gain from less code, and having measured it, the former was far larger.

Move it to realistic sizes and the difference becomes clear. Say 300KiB of never-called code survives into your build output. Under a 4x CPU slowdown, that adds about 6ms to time to ready and about 270KiB to the heap. But the same 300KiB, gzipped to 90KiB and crossing a 4Mbps connection, costs about 180ms in body transfer alone. **Transfer is 30 times more expensive than processing.** That extrapolates the slopes linearly and assumes a 30% compression ratio, but the direction of the order of magnitude was consistent across every measurement here.

So when looking at unused code left in a bundle, I think this order works better.

**First, check whether it can be deleted.** If it goes, all three costs go to zero. In the real-library experiment, the biggest difference came not from the shape of the code but from whether the bundler could delete it. The same msw is 332 bytes wrapped in a build-time constant and 191,818 bytes wrapped in a runtime value. One branch condition decided 191KB. For a library used only on the server, the call is even simpler. The winston that landed in the client bundle carried 161,969 bytes and then blew up after 231 functions in the browser. You pay the full download and get nothing.

**If it cannot be deleted, you still pay the download.** Blocking execution does not stop the file from coming down. This share falls hardest on users with slow connections, and it shrinks the same whether you delete code or delete comments. Of the 2.7 seconds spent pulling 10MiB over a slow connection, only 0.12 seconds came from the code shape.

**Last, look at what the remaining code does when it is imported.** If it only declares and stops there, it is cheap at 21ms per MiB and barely grows on low-end devices, because that work finishes off the main thread. The problem is that such code is rare. lodash ran 85 functions on import alone, moment 37. Code that actually works at the top level cost 200.7ms per MiB under a 4x CPU slowdown, and it was the only condition where input during loading was pushed out to 1.7 seconds.

Check it with browser coverage. If dozens of functions are running for something you never use, you are already paying the third cost. If you can delete it, start by making the branch condition resolvable at build time; if you have to keep it, [code splitting](https://esbuild.github.io/api/#splitting) can defer it until it is needed. Either way, verify the effect with compressed transfer size, main-thread task time, and the input delay when the user presses that feature.

## What I did not measure

Here is how far these numbers go.

- **There is only one loading pattern.** I only looked at dynamically adding a classic script. ESM module graphs, React hydration, and full production bundles were not measured.
- **One browser engine, two desktop machines.** No Safari, no Firefox, no real mobile devices. The 4x CPU slowdown is also relative to each machine and does not reproduce any specific handset.
- **The two experiments ran in different environments.** The synthetic files were measured in Codespaces, the libraries on local macOS. I did not subtract their slopes from each other or put them in the same table.
- **Four libraries are not a sample.** They were bundled with a single esbuild configuration, so webpack or Rollup may produce different results, and the Node built-in replacement in the winston condition is not a copy of a real build configuration.
- **The effect of gzip was not isolated.** Loopback ran uncompressed and the slow network ran with gzip, so the difference between those conditions contains both compression and the connection limit. The 20.97 seconds is a calculation.
- **I only looked briefly past ready.** Memory pressure and GC over time, and interaction on complex screens, were not observed, and the heap numbers are differences read without a forced GC.
- **The synthetic files are regularly generated functions.** Their compression ratio and parsing characteristics may differ from real code, and the near-linear observation is limited to the 0 to 10MiB range.

Input delay is measured against a dispatch time from outside the browser, so host scheduling is mixed into it. That is why this post reads input delay only as differences between conditions rather than as absolute values.

## Experiment code and raw data

The [experiment code and raw data](https://github.com/yceffort/blog/tree/main/experiments/javascript-size) are in this blog's GitHub repository. It holds the generator, the server, the measurement scripts, the runtime environment, the 855 main runs, the 100 repeated-input runs, the 60 repeat visits along with priming records, and the separate trace and coverage runs. Pilot measurements are kept apart from the main statistics. For the numbers alone, see the [summary CSV](https://github.com/yceffort/blog/blob/main/experiments/javascript-size/analysis/summary.csv); for conditions not included in this post, see the [full tables](https://github.com/yceffort/blog/blob/main/experiments/javascript-size/analysis/tables.md).

After cloning the repository or opening it in GitHub Codespaces, you can run it from the repository root like this. To follow the original environment, run it inside Codespaces. Use a new run name so you do not overwrite the stored results.

```sh
cd experiments/javascript-size
npm ci --ignore-scripts --no-audit --no-fund
npx playwright install --with-deps chromium
node scripts/generate.mjs
node scripts/measure.mjs --run=my-run --repetitions=15
```

The [second experiment](https://github.com/yceffort/blog/tree/main/experiments/library-side-effects) that measured real libraries is kept separately. It contains entry points and bundle generation, measurement and coverage collection, with per-condition bytes and hashes in `fixtures/manifest.json` and the 270 runs in `results/main/raw.jsonl`.

The cache and repeated-input experiments, along with the aggregation commands, are documented in the [experiment README](https://github.com/yceffort/blog/blob/main/experiments/javascript-size/README.md). No outliers were removed by hand, and per-run values and input timestamps were kept in the raw data. The 95% bootstrap intervals around the medians are included in the aggregates as well. In the repeated-input experiment, conditions with no sample during loading were left as `null` rather than filled with 0ms. Browser versions and the SHA-256 of the running scripts were recorded too.
