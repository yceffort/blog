---
title: 'How Far Will Agents Fix <em>number-flow</em>?'
tags:
  - web-performance
  - animation
  - debugging
  - browser
  - ai
published: true
series: 'Improving number-flow'
seriesOrder: 4
date: 2026-11-03 17:56:00
description: 'I compared number-flow as fixed by five coding agents against my fork v0.2.1 once more. The post records performance reports that changed with the font, an anonymized code review, and the follow-up experiment that ended with keeping the mask default.'
art:
  undraw: chat-bot
---

<details>
<summary>Table of contents</summary>

- [The tests passed, but](#the-tests-passed-but)
- [I handed over the code from before my fixes](#i-handed-over-the-code-from-before-my-fixes)
- [Digits do not only move up and down](#digits-do-not-only-move-up-and-down)
- [Faster, with different motion](#faster-with-different-motion)
- [I measured my fork under the same conditions](#i-measured-my-fork-under-the-same-conditions)
- [I had the code reviewed with the names hidden](#i-had-the-code-reviewed-with-the-names-hidden)
- [What to keep from v0.2.1](#what-to-keep-from-v021)
- [I decided to keep the mask default](#i-decided-to-keep-the-mask-default)
- [Agents were worth trusting with performance work](#agents-were-worth-trusting-with-performance-work)
- [Experiment record](#experiment-record)

</details>

## The tests passed, but

> Moved digit rotation to transform animations and eliminated per-frame style recalculation during solo playback.

That was the final report from astra, one of the five coding agents I had asked to fix number-flow, a number animation library. It said it had written tests and confirmed they passed. But when I loaded the finished build on the reproduction page, style recalculation showed up on every frame. While the digits were rolling, the main thread was still working every frame.

At first I assumed the report was wrong. The animations that had failed to composite were in the trace too. But the report carried a condition, "during solo playback", so I started by turning off the background text updates on the reproduction page. Even with them off, it was 50.1 recalculations per second.

The difference was inside the test code. The font on the page astra had built was `monospace`. The page I used for the re-measurement was `system-ui`.

In a fixed-width font, a 9-digit number keeps the same width when it changes to another 9-digit number. In this experiment's `system-ui`, the width varied with the digits. When I switched only the reproduction page's font to `monospace`, the astra build's recalculation dropped to 4.9 per second. There was a condition under which the report and the tests agreed. That condition just was not in the report.

Changing the font condition below shows the same thing happening to the other builds. This chart shows results measured separately. It does not measure the performance of your current browser.

<LiveDemo src="/demos/number-flow/blind-compare/index.html?view=width" title="Style recalculation counts for seven builds while switching the digit width condition" height={670} />

When the digit width stayed the same, all five agent builds looked similar. Once the width changed, only opus stayed around 5 per second. My fork v0.2.1 also rose to 26.4. That does not mean opus produced the best code in every respect. Looking next at the motion during interrupts and at the code gave a different picture.

## I handed over the code from before my fixes

[number-flow](https://github.com/barvian/number-flow) is a library that rolls digits when a value changes. I forked it to make it move in older browsers and fixed performance problems I found on a production screen. [Part 1](/2026/08/number-flow-fork-for-old-browsers) covered older browser support, [Part 2](/2026/10/number-flow-compositor-performance) the main thread cost during playback, and [Part 3](/2026/10/number-flow-forced-layout) forced synchronous layout at the moment the value changes. The result is v0.2.1.

After writing the three parts, I became curious. If I handed the code I originally received to today's coding agents, how far would they get? Would they find the same problems without being told what I had learned from the service?

So I gave the upstream commit where Part 1 began, [`a7b78f5`](https://github.com/barvian/number-flow/tree/a7b78f5) (0.6.2), to five agents separately: opus, sonnet, and fable in Claude Code, and astra and terra in Codex CLI. I ran them in isolated environments so they could not see my fork or my posts. First they got only the code and the requirements, then a description of the service screen, and finally what I had seen in the profiler. The three prompts were fixed in advance. During the runs I neither answered questions nor gave direction.

I also used agents to re-measure the finished builds and to run the anonymized code review. They re-ran everything with a separate harness and inputs and compared the raw data against the code. Below I recorded both what was confirmed in that process and what was not.

The first request was short.

> Please extend this library's support so that animations also work in older Android WebView (around Chrome 66) and iOS 13 Safari. Also, find and fix everything needed to improve performance. Existing users must be able to swap it in without changing their code.

I deliberately left out "please measure". I wanted to see whether they would measure on their own.

All five agents built a path for older browsers. Four built a fallback engine driven by `requestAnimationFrame` and interpreted easing themselves. terra kept the Web Animations API and replaced `linear()`, which older browsers do not know, with a single `cubic-bezier()`.

opus and astra went as far as downloading a Chrome 66 binary from the Chromium snapshot repository and actually running it. I had asked for older browser support, but not for obtaining and running a binary. The prediction I had written down before the run was "they will go as far as static checks but will not run an old binary".

fable was fast somewhere else. It fixed the forced synchronous layout from Part 3 in the first turn. It even finished the change that completes all the DOM reads for a whole section first and then does the writes in one batch. The other four also deferred some of the reads. I had only arrived at that function after looking at the profiler, but it was a problem you could find by reading the code. Upstream even had a comment next to `getBoundingClientRect()` saying "this should only cause a layout if there were added children (?)".

On the other hand, nobody in the first turn pointed at the rotation path that recalculates style the whole time the digits are rolling. So in the second turn I described the screen. A roughly 9-digit number with a prefix and suffix changes every second, and the animation plays for 900ms. Elsewhere, text changes tens to hundreds of times per second, and the page is mostly viewed on mobile.

opus built a benchmark to that description. It changed other text 200 times per second, throttled the CPU 4x, and reported how much of the frame budget the playback cost took. If a new value arrives every second and the animation lasts 900ms, it is moving almost without pause. In Part 1, while explaining the JS tick cost the fallback engine adds, I too had estimated that "a single counter is negligible". I had not measured performance then. This time I had to check the playback cost separately under service conditions, including the native path.

fable also pointed out the scale and mask cost that comes with width changes and recommended `tabular-nums`. The rest mostly skipped updates for unchanged values or digits that did not change. In the third turn I gave them the observation directly: "During playback, style recalculation appears on every frame outside JavaScript. Inside the task where the value changes, recalculation and layout repeat about ten times."

After three turns, all five agents had moved digit rotation to `transform` keyframes and separated reads from writes during updates. The cumulative number that found the non-composited rotation path per turn was 0, 1, and 5. But the earlier fixes and working time accumulated along with it, so this was not an experiment that isolated the effect of adding the observation. The per-turn records and the full prompts are collected at the end of the post.

## Digits do not only move up and down

Why did the font difference produce such a large result? It is easier to understand if you split the directions number-flow's digits move in.

When the value changes, each digit rolls up or down. At the same time, if the number's width changes, neighboring digits and symbols slide sideways. The width of the area wrapping the whole number is corrected too. With fixed-width digits, this second motion is rarely needed as long as the digit count stays the same.

In the re-measurement, digit rotation composited in all five agent builds. What remained was the sideways movement and the overall width correction. opus moved that movement to `replace` `transform` keyframes as well. The other four left `accumulate` on the movement. sonnet, astra, and fable also kept a custom property for the width correction. A path that did not surface in fixed-width tests ran once the font changed.

Knowing this difference, you can reread the reports and tell how far each statement holds.

| Agent         | What it reported                                                                  | Range confirmed in the re-measurement                              |
| ------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| opus          | Without other changes, the digits create no per-frame main thread work            | Confirmed under both font conditions measured                      |
| astra         | Eliminated per-frame style recalculation during solo playback                     | True in the fixed-width condition, remained when the width changed |
| sonnet, fable | Rotation composites, and only the two width-path elements stay on the main thread | Rotation composited, but child elements were recalculated too      |

sonnet and fable reported even that the width correction stays on the main thread. But in practice it was not just two elements being recalculated. In the condition where the width changed, sonnet recalculated style for 71 elements per frame and fable for 111. In fable's transcript, the measurement page URL with `tabular-nums` on appeared far more often than the one with it off. sonnet's measurement script had no font setting, so I could not confirm whether the digit width was constant at the time.

Looking only at recalculation counts leads to another misreading. astra was at 50.1 per second, similar to upstream, but the time spent recalculating fell from 151.7ms/s to 51.1ms/s, about 66% less. The problem of working on every frame remained, and the cost of each unit of work went down. Only by looking at count and time together did the reduced cost show.

The trace's `compositeFailed` is the same. This value is a clue for finding which animation failed to composite and why. A reason like "no visible change" also counts as a failure. astra moves one strip per digit position and the other builds move several digit elements, so the total number of animations differs too. You cannot rank performance by failure ratio alone. I left the failure counts at the end of the post, but compared cost separately by time.

Separating the font and the failure targets gave this result: rotation was fixed, the fixed-width tests passed, and the cost of the other motion remained when the width changed. To judge the report's "recalculation eliminated", this condition had to be matched first.

## Faster, with different motion

opus eliminated the recalculation that continued throughout playback under both font conditions. So should I just take opus's code? There was something to compare beyond the performance table.

Consider the situation where the next value arrives while the digits are still rolling. Upstream does not cancel the previous animation. It adds the new animation's motion to the amount the previous animation still has to move. That is what `accumulate` did. It is different from starting toward the new target from the current position. The velocity during the overlap differs as well.

The part of Part 2 that took longest was moving this summation into `replace` keyframes. I did not want to throw away the existing motion just to play on the compositor thread.

The five agents ran into the same problem. opus, sonnet, fable, and terra switched to a new curve. Even where they carry over the current position or the remaining displacement, they do not add the previous animation's remaining time and velocity as they were. The ones that wrote this behavior difference in their reports were opus, fable, and terra. sonnet only wrote "continues without a break" and did not state that the curve changes. opus said the curve during the overlap differs, and terra said there was a possibility of a jump and that more verification was needed. In the fake-clock check of the follow-up code review, a case where fable's position broke was reported. It came from applying easing a second time to progress that was already eased.

astra switched engines midway. Normally it rotates on the compositor thread, and when a value arrives mid-animation it hands the previous easing and elapsed time to a JS engine and adds the new curve to it. It is a choice to come back to the main thread for the duration of the interrupt. I confirmed one case in a fake DOM and clock where the position continued right after the handover, but I did not verify numerically in a real browser that the whole curve matches upstream.

The demo below starts with a scene that changes the value several times in quick succession. You can turn on **Slow motion** or switch to **Update every second** to study the motion.

<LiveDemo src="/demos/number-flow/blind-compare/index.html?view=builds&scene=burst" title="Motion of the upstream, fork, and agent builds when interrupts occur" height={930} />

Each build receives the same value update requests in a separate iframe. The timing at which the messages are handled differs. Pause stops both the animations and the JS frame progression, but it is not a tool that puts every build at exactly the same virtual time. It is for observing motion, and I did not judge the curves to be the same just because the paused frames look similar. The cards describe how each build handles interrupts.

There was a difference in the mask too. The edges of the number have a fade that gradually turns transparent. When the element wrapping the number is stretched with `scaleX`, this fade stretches with it. opus accepted this difference for small width changes. v0.2.1 kept a correction to preserve the visible fade width. All 10 composite failures left in the fork when the width changed were this correction.

The prompt said "existing users must be able to swap it in without changing their code". It reads as keeping the API, but it did not say how far the animation's intermediate positions, velocity, and fade width had to stay the same. Each agent made a different choice, and those choices affected performance too. The numbers for each build alone cannot separate out the cost of preserving one particular behavior.

## I measured my fork under the same conditions

The cost at the moment the value changes was smaller in all five agent builds than in v0.2.1. My fork's update task averaged 9.4ms, and the agent builds were 2.9-8.3ms. astra was the shortest.

Instead of moving 10 separate digit elements per digit position, astra moved a single text strip with the digits joined together. The existing elements were kept for accessibility. Where the other agent builds created 658-668 animations across 10 updates, astra created 219. This is a plausible reason the update cost was smaller, but I did not run a comparison that toggled only this structural change.

Conversely, the page-wide style recalculation and layout time was shorter in v0.2.1 than in sonnet, astra, and fable. For opus and terra, the range of three runs overlapped with the fork, so by this post's criterion I could not distinguish a difference. Overlapping ranges are not proof of equal performance.

You can switch metrics below. The update task and page-wide cost come from the condition where the background text also changes. Recalculation during playback was measured separately with background updates off.

<LiveDemo src="/demos/number-flow/blind-compare/index.html?view=perf" title="Update task, page-wide cost, and recalculation during playback for seven builds" height={660} />

Placed next to upstream, v0.2.1's improvement was clear too. Under the same base condition, the update task went from 12.4ms to 9.4ms, and page-wide style recalculation and layout from 176.0ms/s to 34.5ms/s. But other builds showed a faster update path. I have no basis for saying it was unavoidably slow because it preserves the curve. I did not measure that cost separately.

Compatibility was a more direct problem. terra passed its tests in a modern Chromium with the older APIs removed, but in a real Chromium 66 it threw `Cannot read property 'then' of undefined` right after load. It called `animation.finished.then`, which is not supported there. In an environment that mimics old browsers by deleting APIs, any API missing from the deletion list kept working.

My fork had a hole too. `MediaQueryList.addEventListener`, used by the React `useCanAnimate` hook, does not exist before Safari 14. opus, sonnet, and fable pointed this out, and astra added an `addListener` path as well. v0.2.1 and terra had no alternative path. This was confirmed from the source and from a reproduction with the API removed, not from running on a real iOS 13 device. Even my own code, which claimed to extend older browser support, had an entry point I had not examined.

Including the follow-up review, I filed five fork defects as issues.

| Defect                                                               | Issue                                                    | Where the problem came from               |
| -------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| Media query subscription in older Safari                             | [#23](https://github.com/yceffort/number-flow/issues/23) | React hook missed when extending support  |
| Handling of fallback timing options such as iterations and direction | [#25](https://github.com/yceffort/number-flow/issues/25) | The fork's fallback implementation        |
| References left after a nested container is removed                  | [#26](https://github.com/yceffort/number-flow/issues/26) | Carried over from upstream                |
| rAF continuing after the element is detached                         | [#27](https://github.com/yceffort/number-flow/issues/27) | The fork's fallback implementation        |
| A reappearing digit deleted by the previous end listener             | [#28](https://github.com/yceffort/number-flow/issues/28) | Carried over from upstream, fixed by opus |

The corresponding PRs [#24](https://github.com/yceffort/number-flow/pull/24), [#29](https://github.com/yceffort/number-flow/pull/29), [#30](https://github.com/yceffort/number-flow/pull/30), [#31](https://github.com/yceffort/number-flow/pull/31), and [#32](https://github.com/yceffort/number-flow/pull/32) were all merged on November 3, and the five issues were closed. The fixes went into [v0.2.2](https://github.com/yceffort/number-flow/releases/tag/v0.2.2), released the same day. The measurements, code scores, and demos in this post are pinned to v0.2.1, before the fixes.

## I had the code reviewed with the names hidden

After measuring performance, I became curious about an evaluation of the code itself. This time I anonymized the five agent builds and my fork and had them reviewed. The reviewers were not given the authors, the model names, or the earlier performance numbers and comparison table. The core and the React wrapper were the common scope, and support for other frameworks was not scored. The same copies of the code were read in different orders, and the scores were fixed before the authors' identities were revealed.

The criteria were correctness and compatibility at 30 points, design and maintainability 25, lifecycle and resource management 20, tests 20, and change scope and documentation 5. There was no requirement to follow a particular curve or mask implementation.

The first two reviewers were separate conversations with the same model configuration. The specific model names of those two cannot be confirmed from the experiment records that remain. After fixing those two reports, I gave the same material to fable 5.1 in Claude Code. The third ran in a separate container with no access to the other reports or the identity map.

| Build  | Reviewer 1 | Reviewer 2 | Reviewer 3 (fable 5.1) |
| ------ | ---------: | ---------: | ---------------------: |
| astra  |         80 |         74 |                     80 |
| v0.2.1 |         69 |         69 |                     68 |
| fable  |         65 |         50 |                     76 |
| opus   |         62 |         56 |                     62 |
| sonnet |         56 |         46 |                     56 |
| terra  |         34 |         43 |                     48 |

All three reviewers rated astra highest. Not because of the fast update task. They were not given that number. The reasons that came up repeatedly were a design that separates execution paths from state, cleanup when elements are detached, and tests that check concrete behavior. There were tests that directly checked the final number after an interrupt, the event order, the state of elements removed from a group, and delayed rotation. The choice to switch from the composited path to JS summation during interrupts was also visible in the code.

The fork was rated well for tests that numerically check the summed curve and the inverse scale, SSR escaping, and bounded caches. It was weak in the hooks, fallback timing, and the handling when elements are released. opus's strengths were the separation of engine and measurement phases and fixing the deletion problem for reappearing digits, but it lacked regression tests guarding the new paths. astra also had remaining findings such as deletion of revived characters and SSR input handling.

fable's scores spread from 50 to 76. The third reviewer rated the read/write separation and the animation tracking structure highly. The second found more problems: an `Intl.Locale` cache key collision, interruption during non-linear easing, iteration timing, and the paused state. It also remains that the third reviewer is the same model that produced the fable build. Whether that caused the high score I cannot know, but erasing the names does not erase a model's preferences.

Three agent reviews are not enough to set a general quality ranking. Reproductions were mostly done in a minimal DOM with a fake clock. In particular, the third harness performs no real layout, so width and position corrections ran as 0, and the React wrapper and browser rendering were not exercised. The first two reviewers were not isolated at the filesystem level either. Rather than score differences of a few points, I used which code produced the same problems repeatedly to guide the follow-up fixes.

## What to keep from v0.2.1

After the comparison, I could no longer describe the value of my code as "I fixed it better than the agents did". Every agent build had a shorter update task, and they found defects I had missed. Instead, what the code was built to protect became clearer.

On an interrupt, v0.2.1 sums the previous animation's remaining motion with the new motion, builds that curve as `replace` keyframes, and plays it on the compositor thread. astra fell back to JS summation at that point, and the other four changed the curve. The fork has both an implementation that decides which motion to preserve and tests that check those numbers. It also has SSR input handling and cache bounds. These are worth keeping even if I bring in better methods from other builds.

There are also places where it is not as careful. While I verified the summed curve and the inverse scale, I did not verify the React hook or the release of the fallback. Preserving one property of the engine did not stand in for the completeness of the whole library.

opus's results also gave me grounds to try a different choice. The fork already composites the movement, the outer scale, and the inner inverse scale. The remaining mask correction also ends early, with [a threshold in `bake()` that tolerates a small error](https://github.com/yceffort/number-flow/blob/477893f382cff2562df1c8522c6f1aa6a63e3f87/packages/number-flow/src/engine/compositor.ts#L535-L559). I filed [#33](https://github.com/yceffort/number-flow/issues/33) to see how much the cost and the motion change when this threshold is relaxed, and it led to a follow-up experiment.

## I decided to keep the mask default

On November 3, an agent ran the follow-up experiment that changes the tolerance of the mask correction. The summation engine stayed as it was; only how early the correction ends was changed. At first, raising the existing `1/512` to `1/32` reduced recalculation during solo playback with the same digit count from 27.3 to 8.0 per second. But the error grew with the fade width. With the same constant, the predicted error was about 0.4px for the default mask and about 1.3px for a mask widened to 1.5em.

So in the next two rounds I used 0.5 CSS px directly as the budget. With the fade width at rest as `F` and the scale as `s`, the implementation keeps correcting while `F × |s - 1| > 0.5`. Unlike putting a constant into the existing test `|1 - 1/s|`, it takes the width error to tolerate on screen as the criterion. The experiment source is `fe0704d` on `main` plus a patch, and the first 7 characters of the SHA-256 of the round 3 source patch are `8cfc281`. This is separate from the seven-build comparison above.

Once implemented, the cost of reading the mask width appeared. In round 2, the width was read after the first update's DOM writes finished, causing one extra forced style recalculation. That was about 3ms with 4x CPU throttling. Round 3 used the existing `1/512` test while the width was unknown, and applied the budget after obtaining the width in the read phase at rest. With this approach I could not distinguish an increase in the update task or in the forced recalculation count.

| Round 3 metric                                                    | 1/512 | 1/32 | 0.5px budget |
| ----------------------------------------------------------------- | ----: | ---: | -----------: |
| 9 digits held, recalculation during playback (per s)              |  27.3 |  8.3 |          9.7 |
| Same condition, total main thread tasks (ms/s)                    |  51.2 | 31.7 |         31.8 |
| Alternating 9 and 7 digits, recalculation during playback (per s) |  40.7 | 27.5 |         27.9 |
| Same condition, total main thread tasks (ms/s)                    |  93.3 | 53.1 |         54.1 |
| 9 digits held, update task average (ms)                           |   9.1 |  9.5 |          9.2 |

> Averages of 3 runs per build in headless Chromium 151 with 4x CPU throttling and background updates off. For solo playback, the recalculation count and main thread time had separated run ranges between the baseline and the others, while the update task ranges overlapped. The round 3 data with background updates was excluded from judgment because of measurement interference. In the background-update conditions of the first experiment and round 2, no improvement in the page-wide main time metrics could be distinguished.

With fixed styles, the pixel budget worked as intended. Testing mask widths of 8, 14, 24, and 42px in Chromium and Playwright's WebKit 26.5, the error in the browser's computed value after the correction ended was at most about 0.49px. But that is not the same as a screenshot reading. One step of the reading width was about 0.56 CSS px, and in WebKit there was a residual of up to 1px even during the correction. This measurement cannot say that every error on the actual screen and the change at the moment the correction ends are within 0.5px.

After the code review, I also ran a condition the report had not measured. Changing the mask width from 14px to 42px mid-animation and putting in a new number, the computed fade width error grew to about 1.46px even with the 0.5px budget. The same change at rest gave about 0.47px. The cause was that the code reading the width ran only at rest, so during playback it judged with the stored old width. If interrupts kept coming from the first update, there was no chance to read the width and applying the budget itself was delayed. The explanation "applies from the second update" was also only true when the previous animation finishes.

The defect of judging with a stale width is a problem of the current experimental implementation. I did not take it as grounds for rejecting the approach of setting the error in pixel units. Fixing that defect and accepting a larger visual error as the library's default were judged separately.

I decided to keep `1/512` as the default. The result that cost can be reduced in solo playback is clear. But on screens with many background updates, the original target of the improvement, I have not yet shown an improvement in page-wide cost. With this result, the grounds for the gain were not enough to widen the default's tolerance for visual difference. I am keeping the experimental implementation and data, but not adopting this change.

## Agents were worth trusting with performance work

With only the code and the requirements, they found and fixed the older browser support and some of the cache problems from Part 1 and the layout problem from Part 3. But nobody in the first turn pointed at the Part 2 problem of the rotation path recalculating style throughout playback. opus found it after receiving the service description, and the other four after also receiving the profiler observation. After three turns, all five builds had a shorter update task than my fork. Next time, too, it is worth handing over the service's inputs and observations and leaving cause finding and implementation to them. For measurement, I intend to delegate on the premise that I set the font and update conditions and re-check with a separate harness.

Whether an improved build could simply be swapped in was a separate question. opus removed the recalculation that continued throughout playback under both font conditions measured, but changed the interrupt curve and the mask behavior. astra got the shortest update task and the highest code score from all three reviewers, but its report of eliminating recalculation was true only in the fixed-width condition. Which build is faster and which behavior the service will tolerate had to be judged together.

I also had to change the grading method that treated my code as the answer key. The initial comparison table mixed problems with the solutions I had chosen, and when re-measuring the reports I missed the font condition. From now on, whoever made the fix, I intend to judge adoption by whether cost dropped on the service's inputs, what changed among the existing motions, and which conditions the tests checked.

What I got from the agents in this comparison was code that actually reduced cost and fixes that were missing from my code. v0.2.1 had behaviors and tests worth keeping while taking in those improvements. The follow-up mask experiment could reduce playback cost further without changing the summation engine, but that result alone was not enough to accept a default change that tolerates visual difference. The summed interrupt curve, the numerical tests, and the existing mask criterion stay. The compatibility and lifecycle defects were fixed in v0.2.2, and I intend to reduce update cost by drawing on the other builds' improvements. What this comparison settled was the concrete scope of what to keep and what to change.

## Experiment record

Below is the record of the agent comparison experiment on November 2. The conditions of the November 3 mask tolerance experiment are in the section above.

The agent comparison was run on November 2, 2026. The fork compared is [`v0.2.1`](https://github.com/yceffort/number-flow/tree/477893f382cff2562df1c8522c6f1aa6a63e3f87), and the agent builds are all derivatives of upstream's MIT-licensed code. The prompts and main results are below. The original transcripts and evaluation reports have not been published yet.

### Environment

| Name   | Harness             | Model               | Final build commit |
| ------ | ------------------- | ------------------- | ------------------ |
| opus   | Claude Code 2.1.316 | `claude-opus-5-5`   | `1dc36ed`          |
| sonnet | Claude Code 2.1.316 | `claude-sonnet-5-5` | `a482787`          |
| fable  | Claude Code 2.1.316 | `claude-fable-5-1`  | `377a3dc`          |
| astra  | Codex CLI 0.166.0   | `gpt-6-astra`       | `f5585a9`          |
| terra  | Codex CLI 0.166.0   | `gpt-6.1-terra`     | `55b4976`          |

With two harnesses, the tools, system prompts, and default reasoning settings differ. So this is closer to a comparison of harness and model combinations than of models alone. The harnesses ran with default settings and none of my configuration, once per agent. The prompts are the three paragraphs below in their entirety, fixed before the run without changing a single character. Turns 2 and 3 were given in the same session after the previous turn ended. I never answered or gave direction during the runs, and if an agent ended a turn with a question, the rule was to give the next turn's prompt as is.

### Full prompts

**Turn 1**

> Please extend this library's support so that animations also work in older Android WebView (around Chrome 66) and iOS 13 Safari. Also, find and fix everything needed to improve performance. Existing users must be able to swap it in without changing their code.

**Turn 2**

> This component is used on one screen of a production service like this. A single number of about 9 digits with a prefix and suffix changes about once per second, and transformTiming is 900ms. Elsewhere on the same page, text changes tens to hundreds of times per second. It is mostly viewed on mobile. If there is more to fix under these conditions, please fix it.

**Turn 3**

> I emulated that screen in desktop Chrome with a mobile viewport and 4x CPU throttling and recorded 10 seconds. Two things are visible. First, while the animation plays, style recalculation appears on every frame directly under RunTask outside any JavaScript call, and most of the main thread work is style recalculation. Second, the single task at the moment the value changes is 50-60ms, and inside it style recalculation and layout repeat about ten times during JavaScript execution. Please fix this.

### Isolation and post-run audit

The agents ran in linux/amd64 containers. Only the working directory and auth files were mounted, not the home directory, and the harness config directories were emptied so that my global instructions and memory would not get in. In Claude Code, the `WebSearch` and `WebFetch` tools were blocked. The network was left open. Blocking it would also have blocked the route of downloading and running an old Chromium, making it impossible to compare with Part 1's verification.

Since the fork repository, the blog posts, and the fork's npm package are all public, I inspected the full transcripts after the runs. Traces of access to those three places were 0 in all 5. I also compared against 12 identifiers from the fork. fable had the most overlap with 3 (`supportsNativeAnimations`, `measureAdded`, `measureRemoved`), names that would naturally attach to functions with the same role, so I did not treat it as evidence of contamination. What this audit can confirm is access that appears in the transcripts. It does not confirm whether the code was in the training data.

I excluded the first two runs where the web search setting was applied incorrectly. In Codex 0.166.0, search had to be turned off with the config key `web_search`. The post-run audit caught 5 web search calls (8 queries) in astra's first run. The queries were public documents from WebKit, the Chromium source, W3C specs, MDN, and developer.chrome.com, with no fork or blog among them, but since this violated the pre-set condition I excluded it together with terra's first run under the same setting and re-ran with `-c web_search="disabled"`. The re-runs had 0 web searches.

There was also one route I failed to block. The experiment script committed the working tree each turn under my git identity (`yceffort`) with a `turn N` message, and that name is the same string as the fork owner and the npm scope. opus saw this commit as 1 line of `git log` in turn 2, and fable saw 7 lines of `git status` in turn 1, including the branch name `agent/E`. There were no traces of access to the fork or the blog afterward, so this did not meet the discard condition I had set, but the possibility remains that exposure of the identity and the experiment framing affected their judgment. Also, because the container was started fresh each turn, the Playwright browser installed in turn 1 was gone in turn 2, and all 5 hit a missing-browser error. The elapsed times for turns 2 and 3 include this reinstallation cost.

### Comparison items and hypotheses

The pre-run document called the list below the answer key. But it mixes performance problems, the implementation methods I chose, and verification procedures. Items 7 and 8 in particular include the fork's design, so they are not a neutral criterion for judging whether a different solution meets the requirements. In this post I use them as comparison items against the fork, and keep the item numbers alongside the per-turn records. Item 7 had taken preserving the remaining motion as its criterion, item 8 the choice to leave the mask correction on the main thread, and item 11 the `flush()` pre-read and the removal of `getAnimations()`.

The numbers below are the turn of first discovery. `-` means there is no record of discovery. Behavior change means the existing interrupt curve was replaced with a new curve, and JS summation means an implementation that adds the remaining curve in JavaScript. Neither implies numerical equivalence of the curves.

|   # | Comparison item (source)                       | opus            | sonnet          | fable                        | astra            | terra           |
| --: | ---------------------------------------------- | --------------- | --------------- | ---------------------------- | ---------------- | --------------- |
|   1 | Section comparison O(n²) (Part 1)              | 1               | 1               | 1                            | 1                | 1               |
|   2 | Formatter re-creation (Part 1)                 | -               | 2               | 1                            | -                | -               |
|   3 | React formatter/easing cache bound (Part 1)    | -               | -               | -                            | 1 (easing only)  | -               |
|   4 | Running an old binary (Part 1)                 | 1 (real binary) | 1 (emulation)   | 1 (Chromium 84, Firefox 115) | 1 (real binary)  | 1 (emulation)   |
|   5 | Awareness of fallback cost (Part 1)            | -               | 1               | 2                            | 2                | 2               |
|   6 | Non-composited rotation path (Part 2)          | 2               | 3               | 3                            | 3                | 3               |
|   7 | Interrupt summation (Part 2)                   | behavior change | behavior change | behavior change              | 3 (JS summation) | behavior change |
|   8 | Mask cost (Part 2)                             | 2 (partial)     | 2               | 3                            | -                | -               |
|   9 | Forced synchronous layout in 4 places (Part 3) | 1 (partial), 3  | 1 (partial), 3  | 1                            | 1 (partial), 3   | 1 (partial), 3  |
|  10 | Separating read and write phases (Part 3)      | 3               | 3               | 1                            | 3                | 3               |
|  11 | `flush()` pre-read (Part 3)                    | 3               | 3               | -                            | -                | 1               |
|  12 | Ordering regression test (Part 3)              | -               | -               | -                            | 3                | -               |

The record splits each item into discovery (was it named as a problem), fix (was it actually fixed in the code), and proof (was it measured and shown with numbers). The behavior changes that the original scorecard classified as avoidance are described in the body in terms of what changed. For item 6, the criterion at grading time was whether the custom property path of the digit rotation was identified. fable's turn 2 width-path finding was excluded from this tally, so the tally is not a count of all playback cost discoveries. The 6 hypotheses written before the run and their results are below.

| Hypothesis                                                                             | Result                                                                                                                                                  |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Items 1-3 will be found by reading the code alone                                      | Partly right. Item 1 by all 5, item 2 by fable in turn 1 and sonnet in turn 2, item 3 only for some caches                                              |
| Item 4 will go as far as static checks without running an old binary                   | Wrong. opus and astra ran Chromium 66 in turn 1                                                                                                         |
| Item 6 will be discovered from knowledge but not proven without measurement            | Partly wrong. Nobody identified it in turn 1, but opus found and measured it on its own in turn 2. In the end all five presented their own measurements |
| Item 9 will be partly found, but the fix scope will be narrow without knowing the cost | Wrong. fable completed items 9 and 10 in turn 1                                                                                                         |
| Items 7, 10, 11, and 12 come after other fixes, so they will be rare in turn 1         | Partly right. fable found item 10 and terra item 11 in turn 1                                                                                           |
| Item 5 will be mentioned if a fallback engine was built                                | Mostly right. Only opus did not mention it                                                                                                              |

The agents reached running an old binary and separating reads from writes earlier than expected. No run identified the non-composited rotation path in the first turn. Everyone measured, but there were cases where the measured condition and the range the report could apply to did not match.

> The re-measurement was run by an agent in the following environment. The support range was checked with a selftest that uses only the public API (loads without errors, digits move between intermediate frames after the value changes, the final displayed value equals the `Intl.NumberFormat` result) on Chromium 66.0.3359 (r540276 snapshot, container), WebKit 16.4 (Playwright 1.33.0, macOS), and Chromium 151.
>
> Performance was measured with the reproduction page in [Part 3's experiment materials](/demos/number-flow/forced-layout-experiment-2026-11-01.zip). Headless Chromium 151.0.7922.34, 390x844 (dsf 3), 4x CPU throttling, 10-second traces, with a 9-digit number with prefix and suffix updated 10 times once per second while background text changed about 182 times per second. Recalculation during playback was measured separately on the same page with background updates off, and again with only the font changed to `monospace`.
>
> Composite failures were counted by grouping the trace's `Animation` events by animation id, and the failed target elements were split by the node name in the event. Each build was run 3 times with the execution order rotated, on an Apple M5, and all 7 bundles were built the same way with esbuild 0.28.2 targeting es2019. A difference was declared only when the per-run ranges did not overlap.

### Raw data summary by font condition

| Build    | Recalculation during playback, width unchanged (per s) | compositeFailed | Recalculation during playback, width changing (per s) | compositeFailed |
| -------- | -----------------------------------------------------: | --------------: | ----------------------------------------------------: | --------------: |
| upstream |                                                   48.9 |           92/92 |                                                  49.2 |         219/219 |
| opus     |                                                    5.0 |           0/521 |                                                   5.2 |           0/668 |
| sonnet   |                                                    5.1 |          20/541 |                                                  49.9 |         147/668 |
| astra    |                                                    4.9 |           10/92 |                                                  50.1 |         137/219 |
| terra    |                                                    5.1 |           0/521 |                                                  50.1 |         147/668 |
| fable    |                                                    4.1 |           0/521 |                                                  49.2 |         137/658 |
| v0.2.1   |                                                    4.4 |          20/541 |                                                  26.4 |          10/678 |

Averages of 3 runs per build with background updates off. The recalculation count is `UpdateLayoutTree` outside the update task and JavaScript execution, divided by the total recording time. Since handling around the start and end is included, the counting range differs from the self-tests that cut out only the playback interval and check for 0. The per-run range of the counts stayed within 1 per second for every build.

In the fixed-width condition, the composite failures left in sonnet, astra, and v0.2.1 were all for the reason of no visible change (131072). For the movement in the width-changing condition, a composite mode other than `replace` (16) and an incompatible animation on the same element (64) were recorded, and for the width-correction custom property, an unsupported property (8192).

| Build    | Recalculation time, width changing (ms/s) |
| -------- | ----------------------------------------: |
| upstream |                                     151.7 |
| opus     |                                       7.2 |
| sonnet   |                                      32.1 |
| astra    |                                      51.1 |
| terra    |                                      13.0 |
| fable    |                                      80.1 |
| v0.2.1   |                                      17.7 |

In the width-changing condition, the composite failure ratio was about 21-22% for sonnet, terra, and fable, and about 63% for astra. Because the total animation counts differ, I did not use the ratio as a performance score. In fable's transcript, the measurement page URL with `tabular-nums` on appeared 32 times and the one with it off 6 times. URL occurrences are not measurement counts.

### Compatibility check range

In a real Chromium 66, upstream displayed with animation off, and terra threw an exception right after load. The other five builds passed the basic load, motion, and final value checks. No real iOS 13 device was run.

opus, sonnet, and fable noticed the `??` and `?.` syntax in the upstream distribution and lowered the build target too. The fork also targets es2019, but Part 1 did not mention it. Since all the comparison bundles were rebuilt for es2019, each agent's own distribution settings were not verified. fable also removed the `AbortController` dependency, but did not re-run on Chrome 64 and 65.

The cache check ranges differed too. astra limited the easing cache to 32 entries and sonnet put a bound on the core formatter cache. All five builds left the React wrapper's formatter cache as is.

### Input

| Agent  | Wall clock | Tool calls | Output tokens | Cost estimate | Changed lines |
| ------ | ---------: | ---------: | ------------: | ------------: | ------------: |
| opus   |    107 min |        196 |          294k |       \$18.13 |    +1022/-315 |
| sonnet |     40 min |         95 |          122k |        \$3.08 |     +633/-113 |
| fable  |    101 min |        168 |          344k |       \$36.37 |    +1207/-308 |
| astra  |     93 min |        163 |          125k |             - |     +1407/-95 |
| terra  |     11 min |         57 |           25k |             - |      +339/-73 |

Cost is the estimate reported by Claude Code and, on a subscription account, not the actual bill. Codex does not report cost. The two discarded Codex first runs (astra 91 min, terra 9 min) are not included. Input and results were not proportional. terra reached update performance similar to opus and sonnet in modern Chromium in 11 minutes but failed at older browser support, and fable, with the most tokens, had the widest reach from code reading alone. I did not time my own work, so it is not placed alongside in this table.

### Limitations

Each agent was run once, so running again could produce different results, and the results are tied to the specific harness and model versions of November 2, 2026. The person who made the comparison items did the grading, so the evaluation may have favored my design. I wrote down predictions in advance and kept the results that missed, but the criteria themselves may be biased toward my design.

The asymmetry that the agents had only a sandbox while I had the service is by design, but the results came from a condition where service context was given in stages. They cannot be taken as the upper bound of what agents can do.

The re-measurement was done in headless Chromium and a WebKit build for macOS, with no real devices. The motion during interrupts was examined qualitatively, and position error was not measured numerically. I checked astra's summation implementation and some continuity checks on a fake clock, but did not verify that the whole curve matches the original.

There was one prompt wording, and the condition of adding an instruction to measure in turn 2 was not tested. fable was added as a subject after the other four had run. The prompts and comparison items were unchanged, but it is a change made after pre-registration. The condition of no human intervening at all is stricter than how agents are actually used, so these results should not be generalized to working alongside a person.
