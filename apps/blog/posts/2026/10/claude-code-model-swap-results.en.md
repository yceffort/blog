---
title: 'What Happens When You Swap the Model in Claude Code for <em>GLM 5.3</em>'
tags:
  - ai
published: true
date: 2026-11-01 06:18:00
description: 'I solved 36 internal tasks three times each with Claude Sonnet 5.5 and GLM 5.3. Comparing resolved rate, limit stops, cost, and patch defects across 216 runs, looking at how the conditions differ from public benchmarks, and deciding whether to swap the model'
series: 'Swapping the Model Behind a Coding Agent'
seriesOrder: 3
art:
  undraw: ai-agent
---

## Table of Contents

## 61 runs stopped at the limit, and 53 of them passed the tests

GLM 5.3 hit the 60-turn limit and stopped in 61 of its 108 runs. Yet in 53 of those, the code at the moment it stopped passed the tests and was graded as resolved. Counting resolved runs alone, Claude Sonnet 5.5 resolved 105 of 108 and GLM 5.3 resolved 100, a difference of 5. The way the two got there was quite different, though. Half of Sonnet's runs finished within 10 turns, and more than half of GLM's were cut off at the limit.

[Part 2](/2026/10/in-house-swe-bench-from-merged-prs) covered building 36 tasks from 20 merged PRs of an internal WebSocket package and preparing the environment to run Claude Code. This time, Claude Sonnet 5.5 and GLM 5.3 each solved the 36 tasks three times in that environment. Based on the resolved rate, how runs stopped, turns and time, cost, and patch review results across these 216 runs, I try to decide whether to swap the model. The scope of the decision is this package and this call path. The conditions of public benchmarks and the results of five other models run alongside were also used as reference.

> The runs took place on October 26, 2026. Both models were called from Claude Code `claude -p` through the internal LLM gateway, to models hosted by cloud providers. The 25-minute and 60-turn limits per task, the allowed tool list, the prompt, and the grader are the same as in part 2. Reasoning settings were left unspecified for both models. Claude Code was used in its auto-updating state, and the latest release on the day of the run was 2.1.310 (see part 2). Per-run aggregates are in [swe-bench-inhouse in blog-experiments](https://github.com/yceffort/blog-experiments/tree/main/swe-bench-inhouse), and the tables of resolved counts, turns, time, tokens, tool calls, and automatic metrics in this post can be rebuilt from that CSV. Public benchmark figures are the values I checked in each document and leaderboard on October 30, 2026.

## What was compared, and how

The call path allowed for internal code was already fixed, and the open-weight candidate available on that path was GLM 5.3. Qwen, which part 1 listed as a candidate, had no suitable call path and was excluded from this comparison. The baseline model is Claude Sonnet 5.5, the model currently used in Claude Code.

| Condition | Value                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------------- |
| Tasks     | 22 basic track, 14 spec track                                                                        |
| Repeats   | 3 per task per model, 108 runs each. Each round starts from scratch                                  |
| Limits    | 25 minutes and 60 turns per task                                                                     |
| Tools     | Only Read, Edit, Write, Grep, Glob and pnpm, npx, node, ls, cd, git diff/status/log                  |
| Isolation | Working directory outside home to exclude personal instructions                                      |
| Grading   | Verdict by the real PR's tests. Test files edited by the agent are excluded                          |
| Quality   | tsc, eslint, and format violations beyond the gold state. Blind patch review of the 36 round-1 tasks |
| Cost      | Tokens of the same 108 runs × public unit prices. GLM cross-checked against the invoice              |

In the spec track, the interface spec reveals much of where to make the fix, so resolved counts were tallied separately from the basic track. Turn counts use `num_turns` as reported by Claude Code, and whether the 60-turn limit was hit was decided by whether the result's `subtype` is `error_max_turns`[^1].

## Conditions to keep in mind when reading the results

The same 36 tasks were solved with the same harness and limits, but there are a few conditions to keep in mind when interpreting the results.

The tasks are 36 items from 20 merged PRs of a single package. Tasks split from the same PR share code areas, so they are not independent samples, and with so few tasks a difference of a few percentage points in resolved rate carries little meaning. So I focused on which tasks were solved and where runs stopped. The results from this package are also a weak basis for judging internal TypeScript work as a whole.

Of the two limits, 25 minutes and 60 turns per task, the one that actually stopped runs was 60 turns. In the runs with personal instructions isolated, none hit 25 minutes. The 61 GLM runs cut off at 60 turns had a median of 6.6 seconds per turn and stopped at around 7 minutes. Assuming the same speed, about 230 turns would fit in 25 minutes. In the relaxed-limit experiment described later, given 150 turns, GLM was graded resolved on all 14 spec-track tasks.

What I wanted to see this time was how many tasks get solved, and at what cost, within a fixed number of turns. The model rereads the entire context on every turn, so more turns mean more tokens and more cost. The 60 was set in the first trial run to bound that, and it does not follow any public evaluation standard. Changing this limit also changes GLM's resolved count.

Reasoning settings were left at Claude Code defaults for both models. Sonnet gets Medium, and I could not confirm what reasoning effort the gateway applied to GLM. In the result `usage`, `thinking_tokens` was 0 for all 108 GLM runs and totaled about 74 thousand for Sonnet. Whether the gateway did not report GLM's reasoning tokens or GLM ran without reasoning cannot be told from this value. The two models' reasoning effort was not matched.

Cost was computed by multiplying the tokens the two models used in the same 108 runs by each model's public unit prices. These differ from the unit prices of the actual call path, so for GLM, which was used only in this experiment, I also compared against the invoice to check the estimate was not far off.

Elapsed time is reference only, because the two models ran at different times with different numbers of concurrent runs. The patch review covered only the 72 patches from round 1. Taking into account that the reviewer, Claude, is from the same company as Sonnet, one of the two models under comparison, I focused on defects I verified myself rather than on the scores.

## Public benchmarks were run under different conditions

Before the experiment I looked for public items that compare the two models under the same conditions, and found almost none. Anthropic's Sonnet 5.5 system card reports SWE-Bench Pro, Multilingual, Multimodal, and Terminal-Bench 4.0 as averages of five runs at maximum reasoning effort. Z.ai's GLM-5.3 model card has no SWE-bench family items. The only common item is DeepSWE v1.1, with a different harness and limits, and Terminal-Bench differs in version. The Claude models they compare against also differ.

| Benchmark              | Sonnet 5.5                             | GLM 5.3                        | Comparable?                                  |
| ---------------------- | -------------------------------------- | ------------------------------ | -------------------------------------------- |
| SWE-Bench Pro          | 81.3                                   | None                           | No                                           |
| SWE-Bench Multilingual | 90.3                                   | None                           | No                                           |
| DeepSWE v1.1           | 71.0 (5-run average, harness unstated) | 66.9 (mini-swe-agent, 6 hours) | Same benchmark, different harness and limits |
| Terminal-Bench         | 70.6 on 4.0                            | 88.2 on 2.1, 28.3 on 3.0       | No, versions differ                          |
| Compared against       | Sonnet 5, Opus 5.5                     | Opus 4.8                       | Different Claude models                      |

The execution budgets also differed greatly from real usage conditions. According to the footnotes on the GLM card, Terminal Bench 3.0 was evaluated with 600 agent turns and a 10-hour limit, and DeepSWE with a 6-hour limit. Reasoning effort runs at maximum unless specified, and the Sonnet card's results are also at maximum reasoning effort. These scores show how much gets solved with a generous budget and maximum reasoning. What I wanted to know was how long I would wait and how much it would cost to fix bugs in our code when using Claude Code with default settings. Finding that out meant running it myself. The detailed figures from third-party leaderboards and Artificial Analysis are gathered in "Public benchmark figures and conditions" below.

## Basic-track resolved counts were similar, and the spec track made the difference

| Item                                                |                     Claude Sonnet 5.5 |                         GLM 5.3 |
| --------------------------------------------------- | ------------------------------------: | ------------------------------: |
| Basic track resolved (of 66)                        |                                    63 |                              65 |
| Spec track resolved (of 42)                         |                                **42** |                              35 |
| Per round, basic / spec                             |               22, 20, 21 / 14, 14, 14 |         21, 22, 22 / 11, 12, 12 |
| Tasks resolved in all 3 rounds (basic 22 / spec 14) |                               20 / 14 |                         21 / 11 |
| Tasks never resolved                                |                                  None |                        1 (spec) |
| Tasks whose result changed across rounds            |                                     2 |                               3 |
| Runs stopped at the 60-turn limit                   |                                     0 |                61 (53 resolved) |
| Why runs failed                                     | Worked to the end but failed tests, 3 | Stopped at the 60-turn limit, 8 |

It was hard to attach much meaning to the two-run difference in the basic track. Solving the same task three times, Sonnet's result changed on 2 tasks and GLM's on 3. Looking at round 1 alone, it was Sonnet 22 to GLM 21, but the three-round total flips to 63 to 65. I took the basic track as the two models solving at a similar level.

In the spec track, Sonnet solved all 42 and GLM 35. Of GLM's 8 unresolved runs, 7 were in the spec track. The per-round results for all 36 tasks look like this as a grid. Task identifiers are anonymized symbols grouped by PR, and a numeric suffix marks a task split from one PR by topic. A number in a cell is the turn count of a resolved run, X is a failure, and hatching marks a run stopped at the 60-turn limit.

<LiveDemo src="/demos/swe-bench/results-grid.html" title="Result grid of 36 tasks × 3 rounds × 2 models. GLM 5.3 stopped at the 60-turn limit in 36 of 42 spec-track runs, and Sonnet 5.5's only failures are K4 and L3" height={790} />

The same content as a table follows. A number in a cell is the turn count of a resolved run, X is a failure, and \* marks a run stopped at the 60-turn limit.

| Task | Track | f2p | Sonnet rounds 1 / 2 / 3 | GLM rounds 1 / 2 / 3 |
| ---- | ----- | --: | ----------------------- | -------------------- |
| A1   | basic |   1 | 20 / 17 / 12            | 61\* / 53 / 61\*     |
| A2   | basic |   1 | 7 / 9 / 10              | 77 / 61\* / 61\*     |
| A3   | basic |   1 | 4 / 4 / 4               | 41 / 26 / 31         |
| B1   | basic |   1 | 12 / 17 / 18            | 44 / 46 / 42         |
| B2   | basic |   1 | 4 / 4 / 4               | 36 / 62 / 41         |
| C    | basic |   2 | 11 / 12 / 11            | 61\* / 61\* / 61\*   |
| D1   | basic |   1 | 3 / 3 / 3               | 21 / 57 / 19         |
| D2   | basic |   2 | 3 / 3 / 3               | 18 / 17 / 16         |
| E1   | basic |   2 | 8 / 9 / 8               | 31 / 32 / 25         |
| F    | basic |   1 | 5 / 5 / 6               | 72 / 63 / 70         |
| G    | basic |   4 | 8 / 10 / 10             | 53 / 61\* / 63       |
| H    | basic |   3 | 7 / 5 / 7               | 61\* / 59 / 53       |
| I    | basic |   1 | 11 / 8 / 12             | 61\* / 61\* / 61\*   |
| J    | basic |   2 | 6 / 9 / 7               | 61\* / 71 / 61\*     |
| K1   | basic |   2 | 19 / 15 / 16            | 61\* / 61\* / 61\*   |
| K2   | basic |   2 | 6 / 6 / 5               | 48 / 29 / 57         |
| K3   | basic |   1 | 6 / 5 / 5               | 59 / 48 / 58         |
| K4   | basic |   2 | 16 / X 12 / X 12        | X\* / 61\* / 65      |
| K5   | basic |   4 | 7 / 8 / 6               | 61\* / 61\* / 61\*   |
| L1   | basic |   1 | 7 / 6 / 7               | 35 / 44 / 34         |
| L2   | basic |   1 | 7 / 7 / 7               | 58 / 62 / 57         |
| L3   | basic |   2 | 10 / X 11 / 9           | 61\* / 61\* / 61\*   |
| B3   | spec  |   1 | 9 / 11 / 10             | 61\* / 61\* / 61\*   |
| B4   | spec  |   3 | 11 / 11 / 11            | 61\* / 61\* / 61\*   |
| M    | spec  |  10 | 4 / 4 / 4               | 22 / 51 / 24         |
| E2   | spec  |   2 | 14 / 15 / 18            | 61\* / 61\* / 61\*   |
| E3   | spec  |  13 | 45 / 40 / 45            | 61\* / 61\* / 61\*   |
| N    | spec  |  13 | 31 / 33 / 36            | 61\* / 61\* / 61\*   |
| O    | spec  |   3 | 8 / 6 / 6               | 61\* / 67 / 61\*     |
| P1   | spec  |   5 | 19 / 20 / 20            | X\* / X\* / 61\*     |
| P2   | spec  |  19 | 21 / 25 / 23            | 61\* / 61\* / 61\*   |
| P3   | spec  |   8 | 20 / 20 / 18            | 64 / 61\* / 61\*     |
| Q    | spec  |  17 | 60 / 62 / 55            | X\* / 61\* / X\*     |
| L4   | spec  |  20 | 34 / 29 / 29            | 61\* / 61\* / 61\*   |
| L5   | spec  |   3 | 6 / 6 / 8               | 56 / 61\* / 61\*     |
| R    | spec  |  12 | 46 / 44 / 51            | X\* / X\* / X\*      |

Even tasks that fix a single function showed a turn gap. Sonnet finished D1 and D2, the version string truncation and log masking problems, in 3 turns, while GLM used 16 to 57. The D1 problem statement follows. As with the example in part 2, identifiers are changed, and grading uses the 1 test the PR added plus 216 existing tests.

```text
# Three-digit version components overflow the fixed header slot

## Symptom
If `device.osVersion` or `device.appVersion` passed to the configure function has a version
component with three or more digits (for example `osVersion: '100.2'`, `appVersion: '1.2.100'`),
the corresponding value in the resolved config is left as three characters, such as `'100'`.
The version slots in the fixed header are 2 bytes wide per component, so this value shifts the
header layout.

## Reproduction
Call `configure({ url, auth, device: { osVersion: '100.2', appVersion: '1.2.100' } })` and
look at `getConfig().device`: `os.major` is `'100'` and `app.patch` is `'100'`.

## Expected behavior
- Each version component in the resolved config (`os.major`, `os.minor`, `app.major`,
  `app.minor`, `app.patch`) must always be exactly 2 characters.
- Keep the existing padding rule for short values, and for 3 or more characters keep only
  the first 2. For example, the major of `'100.2'` is `'10'` and the patch of `'1.2.100'`
  is `'10'`.
```

The runs GLM finished on its own within 60 turns were concentrated in the basic track. The only spec-track task it finished on its own in all three rounds was M. M has 10 f2p tests, but as explained in part 2, 9 of them are cascading failures, so in practice only one behavior needs fixing. Both models solved this task with the fewest turns in the spec track. It is a case where test count is a poor guide to difficulty.

All 3 of Sonnet's failures were runs that finished on their own within 60 turns. Twice on K4 it broke one existing test instead of passing the new one, and once on L3 it failed 1 new test and 8 existing tests. All 8 of GLM's failures were stopped at the 60-turn limit. Whether more turns would have solved them is covered by the relaxed-limit experiment in the next section.

R is the only task GLM failed in all three rounds. The meaning of a new option changed from per-connection to per-subscription, and 13 files had to be modified. Sonnet also spent 44 to 51 turns on it. The symptom part of the problem statement follows. The expected behavior has nine items, and one item of the interface spec appeared in part 2.

```text
# Screens subscribing to the same target affect each other's PUSH delivery interval

## Symptom
The PUSH batching window applies once per connection, not per subscription. `subscribe`'s
`options.legacyWindowTime` looks like a per-subscription option, but the value given by the
subscription that first opens the socket applies to every later subscription. Once the socket
is open, a different value given later is ignored.

As a result, a chart watching a target (which needs every event) and a row in a list watching
the same target (which only needs the latest value per window) cannot have different delivery
intervals. Depending on which subscribed first, both receive every event or both receive only
the merged value.
```

## Resolved rate is a value that depends on the limit

61 of GLM's 108 runs were stopped at the 60-turn limit: 36 of 42 in the spec track and 25 of 66 in the basic track. In 53 of the stopped runs, the code at that moment passed the tests. The run was cut off before the model judged itself done, but the grading criterion was met. So by the test-passing criterion it is 100 of 108, and counting only runs the model finished on its own, it is 47. This post counts resolved runs as 100, following the grading result, and marks that 53 of them are stopped code.

Even the stopped patches that passed the tests showed unfinished tidying. Of the 20 GLM patches stopped in round 1, 16 passed the tests, and the overall review score of those 16 was 3.5 out of 5. That is below the 4.31 of the 16 tasks GLM finished on its own. The patches contained scratch test files and one-off check scripts not used by any npm script, and in some cases the lock file hash of an unrelated package had changed. Had I stopped the run in real use thinking "this is probably good enough," I would have had to review such changes regardless of whether the tests passed.

There are also results from raising the limits. During the first run described in part 2, I ran the 14 spec-track tasks once each with the limits raised to 60 minutes and 150 turns, as a reference experiment. Because it was run under the first-run conditions (personal instructions included, a different call path), it is reported separately and not added to the main comparison.

| Item (14 spec tasks, 60 minutes, 150 turns, 1 run) | Sonnet 5.5 |   GLM 5.3 | DeepSeek V4.1 Flash | Qwen3.8-27B              |
| -------------------------------------------------- | ---------: | --------: | ------------------: | ------------------------ |
| Resolved                                           |      14/14 |     14/14 |               14/14 | 11/11 (3 gateway errors) |
| Median turns                                       |         19 |      73.5 |                  82 | 71                       |
| Runs exceeding 60 turns                            |          0 |         8 |                   8 | 7                        |
| Runs stopped at the 150-turn limit (resolved)      |          0 |     1 (1) |               1 (1) | 1 (1)                    |
| Time for 14 tasks                                  |  0.3 hours | 2.4 hours |           2.2 hours | 2.6 hours (11 tasks)     |

Under the 25-minute and 60-turn conditions, all 27 spec-track runs the three open-weight models failed had hit the time or turn limit. After the limits were raised, every task that ran was resolved by the grading criterion. For each of the three models, one of those was code that passed at the point it was stopped by the 150-turn limit. On R, which all three models had failed three times, DeepSeek finished on its own at 159 turns, and GLM was stopped at the 150-turn limit but the code at that point passed the tests.

The conditions under which the GLM card reports scores similar to or higher than Claude Opus 4.8 were budgets like 600 turns and 10 hours, or 6 hours. In this reference experiment too, GLM solved more tasks when given a larger budget. Looking at whether it finishes the work within a fixed number of turns, though, the gap between the two models was large. The difference showed more clearly in turns and time than in resolved counts.

## 6.4x the turns, 15.8x the time, 13.5x the input tokens

<BarCompare title="Turns at which 108 runs ended (3-round total; runs stopped at the 60-turn limit counted separately)" unit="runs" before="Sonnet 5.5" after="GLM 5.3" rows="0-9 turns|54|0;10-19 turns|31|4;20-29 turns|10|6;30-39 turns|4|6;40-49 turns|5|8;50-59 turns|2|12;60+ turns, finished normally|2|11;Stopped at 60-turn limit|0|61" />

54 of Sonnet's 108 runs finished within 10 turns, and GLM had no run finishing within 10 turns. By median, Sonnet took 9.5 turns and GLM 61. Claude Code reports a run that hit the limit as 61 turns, which is why GLM's median comes out above the limit[^1].

| Item                                            | Claude Sonnet 5.5 |           GLM 5.3 | Ratio |
| ----------------------------------------------- | ----------------: | ----------------: | ----: |
| Median turns                                    |               9.5 |                61 |  6.4x |
| Median turns (basic / spec)                     |            7 / 20 |           61 / 61 |       |
| Median time per task                            |              23 s |           363.5 s | 15.8x |
| Median time (basic / spec)                      |     19 s / 43.5 s | 325.5 s / 414.5 s |       |
| Time for one round of 36 tasks                  |         0.4 hours |     3.5-3.8 hours |       |
| Tool calls (3-round total)                      |             1,434 |             6,701 |  4.7x |
| Median input-side tokens per run (incl. cache)  |      140 thousand |       3.6 million | 25.7x |
| Input-side tokens total (3 rounds, incl. cache) |     25.59 million |    346.71 million | 13.5x |
| Output tokens total (3 rounds)                  |      540 thousand |      4.28 million |  7.9x |

Since GLM's 61 runs were cut off at 60 turns, these ratios are lower bounds. Tool calls were numerous too. By median per run, Sonnet used Edit 3 times, Read 2 times, and Bash once, while GLM used Read 22 times, Bash 21 times, and Edit 10 times. Sonnet typically read the file named in the problem statement once or twice, fixed it, and ran the tests once. GLM often read the same file repeatedly and ran the tests again and again.

GLM edited test files in 97 of 108 runs, Sonnet in 9. The prompt said tests could be edited but would not count toward grading, yet GLM spent turns on test file edits in most runs.

Tool calls outside the allowed list were denied 148 times for Sonnet and 382 times for GLM. Denied calls consume turns too. GLM's output also contained 20 calls that sent the string `</arg_value>` as the tool name. The tool call format was broken, and all of those calls failed. None of the five other models run alongside had the same problem.

Cache reads made up 91% of Sonnet's input-side tokens and 97% of GLM's. With each turn, file contents and test output pile up in the context and are reread on the next turn. GLM not only took more turns but also read a larger context per turn. Input-side tokens per turn were about 17 thousand for Sonnet and about 59 thousand for GLM, a 3.5x difference. Total turns across three rounds were 1,542 to 5,898, about 3.8x. Multiplying that by the roughly 3.5x difference in input tokens per turn gives the roughly 13.5x difference in total input tokens.

## Lower unit prices, higher cost

Cost was computed by multiplying the tokens the two models used in the same 108 runs by each model's public unit prices. GLM was used only in this experiment, so its invoice could serve as a cross-check.

| Item (108-run tokens × public unit prices)         | Claude Sonnet 5.5 |      GLM 5.3 |
| -------------------------------------------------- | ----------------: | -----------: |
| Total for 108 runs                                 |      about \$13.3 |  about \$122 |
| Average per round of 36 tasks                      |       about \$4.4 | about \$40.7 |
| Per resolved run                                   |      about \$0.13 | about \$1.22 |
| Actual invoice (incl. some smoke tests and reruns) |               n/a |     \$147.85 |

Sonnet uses [Anthropic's public pricing](https://platform.claude.com/docs/en/about-claude/pricing). As of October 30, 2026, per million tokens it is \$2 input, \$10 output, \$0.10 cache read, and \$2.50 for 5-minute cache writes. For GLM I used the \$1.40 input and \$4.40 output that Artificial Analysis lists for the Z.ai API, and applied the 81% discount from the same page to cache reads.

Since 97% of GLM's input-side tokens are cache reads, the cost depends on how the cache discount is applied. Recomputing with different discount rates, every assumption I tried came out at 5x Sonnet or more[^2]. The \$147.85 invoice includes a little usage beyond the main runs, from smoke tests and reruns after interruptions, and the call path's unit prices differ from the Z.ai API. Still, it is of a similar magnitude to the \$122 computed from tokens, so I took the estimate as not far off.

GLM had a lower spec-track resolved rate and cost more. By public unit prices GLM is 30% cheaper on input and 56% cheaper on output, but using 13.5x the input tokens made the total cost higher instead. The per-task cost from Artificial Analysis, discussed below, shows a similar gap. Unit prices alone were a poor predictor of what real work would cost.

This cost is the value with 61 runs cut off at 60 turns. In the relaxed-limit experiment, the open-weight models' cost for the 14 spec tasks was 1.5 to 3 times that of the 60-turn condition. Even if raising the limit lets GLM solve the whole spec track, the gap in cost per resolved run widens beyond the current \$0.13 versus \$1.22.

## Even patches that passed the tests had bugs

What automatic grading confirms is only that the PR's tests passed. The research quoted in part 1 also pointed out that patches passing tests can still contain defects. To check this, I reviewed the 72 patches from the 36 round-1 tasks. For each task, the two patches were randomly labeled P and Q to hide which model wrote them, and shown to Claude along with the problem statement, the gold patch, and the base code.

The criteria were correctness, scope of change, consistency with existing code, simplicity, code cleanliness (debug leftovers or dead code), and an overall rating, each from 1 to 5. The overall score was to be given not as the average of the criteria but on the basis of "would you approve this PR." 5 is approve as is, 3 is approve after requested changes, and 1 is reject. Any criterion scored 3 or below had to be justified with a quote from the patch, and findings classified as real bugs (high) were rechecked by me with the patch and base code open. I focused on these verified defects rather than the scores.

| Item                                                        |            Claude Sonnet 5.5 |                 GLM 5.3 |
| ----------------------------------------------------------- | ---------------------------: | ----------------------: |
| Correctness                                                 |                         4.44 |                    4.19 |
| Scope of change                                             |                         4.94 |                    4.03 |
| Consistency with existing code                              |                         4.39 |                    4.19 |
| Simplicity                                                  |                         4.42 |                    3.61 |
| Code cleanliness                                            |                         4.50 |                    4.17 |
| **Overall**                                                 |                     **4.28** |                    3.64 |
| Overall (basic / spec)                                      |                  4.23 / 4.36 |             4.00 / 3.07 |
| Overall (16 tasks GLM finished on its own)                  |                         4.56 |                    4.31 |
| Overall (16 tasks GLM stopped at 60 turns but passed tests) |                         4.00 |                    3.50 |
| Overall (4 tasks GLM stopped at 60 turns and failed tests)  |                         4.25 |                    1.50 |
| Tasks where this patch was judged the better of the two     |                           26 |                      10 |
| Findings (high / medium / low)                              |                   2 / 9 / 19 |             3 / 26 / 26 |
| Defects confirmed as real bugs                              | 2 (code finished on its own) | 3 (all in stopped code) |
| Of which in patches that passed the tests                   |                            2 |                       0 |

The 26 to 10 in "judged the better of the two" includes cases where the review rules forced a choice even on a tie. Excluding the 13 tasks whose notes say "cannot separate them," "effectively a tie," or "marginal difference," it is 17 to 6.

Of GLM's 36 round-1 patches, 20 were code stopped at 60 turns. Much of the 0.64 gap in overall score came from these tasks. The 16 stopped but test-passing tasks averaged 3.50, close to "approve after changes," and the 4 that also failed the tests averaged 1.50, close to reject. On the 16 tasks GLM finished on its own, Sonnet still scored higher, but the gap narrowed.

Five defects were confirmed as real bugs. Sonnet's 2 are in code that finished its work and passed the tests.

- Sonnet, while fixing a problem where subscriptions registered before connecting were sent to the server twice after login, removed only the subscribe requests from the queue right after login and left the unsubscribe requests. If you subscribe, unsubscribe, and subscribe again to the same target before connecting, the queue holds subscribe, unsubscribe, subscribe, and after the fix only the unsubscribe remains. After login, the current subscription list is resent and then the leftover unsubscribe goes out, so the app believes it is subscribed while the server has unsubscribed it. The gold patch removes both kinds. The tests do not cover this ordering, so they passed. I confirmed this from the code and did not reproduce it by running it. On the same task, GLM removed both kinds and fixed it safely, but the reviewer noted that its code was verbose and even touched the changelog file.
- Sonnet, while fixing a problem where subscribing to a certain message never invoked the callback, wrote a type expression that references the type of a possibly-undefined value directly. The behavior is correct, but running `tsc` produces a TS18048 error. vitest does not type-check, so the tests passed, and a build or CI with type checking would block it.

GLM's 3 are all in code that was stopped at 60 turns and also failed the tests.

- On a task adding support for a new message kind, GLM added the message format definition file but did not register it in the bundle of definitions read when parsing messages at runtime. Receiving that message could not be parsed, and 2 tests failed.
- On a task cleaning up sockets that missed their close event, GLM created the two functions needed but hit the 60-turn limit without calling them from the cleanup site. A temporary comment, `// TEMP-BUGGY-REVERT`, was left at that spot. As the name suggests, it looks like a state temporarily reverted to check the pre-fix behavior.
- On a task giving each subscriber its own delivery interval, GLM produced code in which unsubscribing another subscriber from within one subscriber's callback still delivered data to the subscriber just removed. The problem statement said to prevent this, and 1 test failed.

GLM's three defects were found in code stopped at the limit. Sonnet's two remained in code the model had finished and that passed the tests. For both models, patches needed review independent of test results.

Among stopped patches that passed the tests, I looked closely at L3. The task fixes resubscribing on a dropped connection so that it restores the connection, and unsubscribing while disconnected so that no frame is sent to the server. Sonnet finished it in 10 turns in round 1 with an overall review score of 5. GLM was stopped at 61 turns but passed the tests.

GLM's patch did implement connection restoration on resubscribe and skipping the unsubscribe frame. However, a scratch test file was left behind, and the call that revived the connection dropped the batched delivery option the existing code had passed. The tests did not check that option. The overall review score was 3, approve after requested changes.

Similar findings appeared on other tasks. The mock socket helper task (B3) acquired a one-off check script not used by any npm script and exception handling that merely logged and ignored errors. On the debug tool task (O), the lock file hash of an unrelated package changed. All of these were found in patches at the point of being stopped.

I also looked at findings worth requesting changes for (medium). For Sonnet, these mostly concerned scope of change and reuse of existing code. For a job that only required excluding one request from cleanup, one patch threaded a request identifier through three modules and built a structure that took items out of and put them back into four stores. Others rewrote the same work as an existing cleanup helper inside a loop, or invented a new key rule instead of using the existing key helper, creating a risk that the two rules diverge. One patch kept state in a module-private variable so tests could not reset it.

For GLM, many findings concerned comments and the size of changes. Of the justifications for scores of 3 or below, 21 said there were too many explanatory comments for the size of the change. Changing the call order in one place came with nearly 20 lines of comments and exception handling, or a function that needed a one-line filter grew to 40 lines including debug logging.

One patch regenerated the message definition bundle file and sorted the existing entries by key, producing nearly 100 lines of unrelated diff. Another added a new file, a test-only init function, and a long doc comment for 10 lines of logic. There was also one missing guard: if the server sent a value not yet defined, a property access would throw. The code assumed the value was impossible by type.

## The automatic metrics point in different directions

| Item (all 3 rounds, counts beyond the gold state) | Claude Sonnet 5.5 |      GLM 5.3 |
| ------------------------------------------------- | ----------------: | -----------: |
| tsc errors                                        |                 3 |            7 |
| eslint errors                                     |                44 |            9 |
| Files violating the formatter                     |                15 |           12 |
| Median files changed (gold is 2)                  |                 1 |            2 |
| Median lines changed (excluding tests)            |                19 |           45 |
| Median change size relative to the gold patch     |              0.5x |         1.0x |
| Added comment lines (total / median per run)      |           407 / 1 | 2,590 / 15.5 |

GLM had more type errors, larger changes, and more comments, and Sonnet had more lint errors. Of Sonnet's 44 lint errors, 27 are violations of the import sorting rule, and 24 of those came from task Q, 8 in each of its 3 runs. This rule is auto-fixable with `eslint --fix`. Excluding it, Sonnet still has more errors at 17 to GLM's 7. Runs with at least one lint error were 19 for Sonnet and 3 for GLM. All of these are code formatting rules, so they were not counted as defects.

The median change size was 0.5x the gold patch for Sonnet and 1.0x for GLM. The middle half of runs fell between 0.25x and 0.88x for Sonnet and between 0.54x and 1.6x for GLM. The gold patches also contain refactoring and comment cleanup, so change volume alone is a weak measure of quality. That said, the review also rated Sonnet better on scope of change, 4.94 to 4.03.

The median number of added comment lines was 1 for Sonnet and 15.5 for GLM. The runs that added the most were 34 and 158 lines respectively. The review's observation that GLM patches carry many explanatory comments showed up in the counts as well.

## How the other models did

Under the same isolation conditions and limits, I also ran five other models on the internal gateway. They were not under consideration by the company, but they solved the same tasks, so the results are included. Gemini 3.7 Flash and 3.8 Flash were interrupted twice and did not complete three rounds.

| Model                 | Runs | Basic resolved | Spec resolved | Median turns | Stopped at 60 turns (resolved) | Time per round of 36 | New tsc errors | Cost per round of 36 |
| --------------------- | ---: | -------------: | ------------: | -----------: | -----------------------------: | -------------------: | -------------: | -------------------: |
| Claude Sonnet 5.5     |  108 |          63/66 |         42/42 |          9.5 |                          0 (0) |            0.4 hours |              3 |          about \$4.4 |
| GPT-6 Luna            |  108 |          65/66 |         38/42 |           32 |                        14 (11) |            1.7 hours |             39 |          about \$0.8 |
| Gemini 3.1 Pro        |  108 |          56/66 |         33/42 |           19 |                          3 (0) |            1.5 hours |             10 |         about \$19.3 |
| Gemini 3.1 Flash Lite |  108 |          50/66 |         27/42 |         19.5 |                         10 (6) |            0.9 hours |             39 |          about \$5.6 |
| Gemini 3.7 Flash      |   66 |          40/44 |         17/22 |         57.5 |                        28 (19) |        3.9-4.0 hours |              3 |         about \$22.2 |
| Gemini 3.8 Flash      |   70 |          30/44 |         15/26 |           61 |                        48 (23) |        3.9-4.1 hours |              2 |         about \$22.2 |
| GLM 5.3               |  108 |          65/66 |         35/42 |           61 |                        61 (53) |        3.5-3.8 hours |              7 |         about \$40.7 |

The cost column mixes bases: Sonnet and GLM use public unit prices, and the other five use the internal gateway's price table. In this table I focused on each model's failure pattern.

GPT-6 Luna's resolved count was similar to Sonnet's (103 to 105) and its cost about a fifth. On these two metrics it is a strong alternative. Its 39 new tsc errors came from 3 of 108 runs, with 30 in a single run. The pattern is errors concentrated in a few runs rather than frequent failures. It hit the 60-turn limit in 14 runs and edited test files in 91, similar to GLM, and it used more than 3x the turns while solving about as many tasks as Sonnet.

Gemini 3.1 Pro failed differently from the others. Of its 19 unresolved runs, 16 were cases where it finished the work on its own but the answer was wrong. Its median of 19 turns was the lowest after Sonnet, but its cost per 36 tasks of about \$19 was the highest of the seven after GLM and the two Gemini Flash models (about \$22). Its cache read ratio was low at 65%, so many input tokens received no discount. Its 134 files violating the formatter and 124 eslint errors were the most of the seven, and it added 19 new `any`s.

Gemini 3.1 Flash Lite likewise produced wrong answers in 27 of its 31 unresolved runs. It added 29 `any`s, the most on that item, and its cache read ratio was the lowest at 26%. Its 522 denied tool calls outside the allowed list were also the most.

Gemini 3.7 Flash and 3.8 Flash were often stopped at the limit, like GLM. Every unresolved run hit the 60-turn limit, and 3.8 Flash was stopped in 15 of 70 runs without changing a single line of code. Even at the same resolved rate, a model that quickly produces a wrong answer and a model that stops before producing one are used differently. A finished but wrong patch needs review and correction, and a run that hit the limit needs a decision on whether it is worth running further.

The first run discarded in part 2 also included Qwen3.8-27B and DeepSeek V4.1 Flash. Being under first-run conditions, they were not included in the main comparison, but their pattern resembled GLM's. In the basic track they resolved 60 and 64 of 66, similar to Sonnet, and in the spec track 32 and 33 of 42, and every unresolved spec-track run had hit the time or turn limit.

## Public benchmark figures and conditions

The figures and conditions from public sources mentioned briefly above are gathered here. All were checked on October 30, 2026.

Anthropic's [Sonnet 5.5 system card](https://www.anthropic.com/claude-sonnet-5-5-system-card) reports SWE-Bench Pro 81.3, SWE-Bench Multilingual 90.3, SWE-Bench Multimodal 54.3, DeepSWE v1.1 71.0, and Terminal-Bench 4.0 70.6. According to the table's footnotes, results without a separate note are five-run averages with adaptive reasoning on at maximum effort. Terminal-Bench 4.0 was measured in Claude Code's `--bare` mode at maximum reasoning effort, with a standard error of ±2.5 points over five trials. The comparison models are Sonnet 5 (SWE-Bench Pro 63.2), Opus 5.5 (89.9), and GPT-6 Sol, and there is no SWE-bench Verified. The [announcement](https://www.anthropic.com/news/claude-sonnet-5-5) has a sentence stating that Claude Code's default reasoning effort is Medium. Since the system card's scores are measured at maximum effort, the conditions differ from the performance someone using Claude Code at its defaults experiences.

Z.ai's [GLM-5.3 model card](https://huggingface.co/zai-org/GLM-5.3) has no SWE-bench family items. Instead it reports Terminal Bench 2.1 88.2, Terminal Bench 3.0 28.3, DeepSWE v1.1 66.9, SWE-Marathon 42.5, FrontierSWE 78.1, and NL2Repo 58.0, with Claude Opus 4.8 as the comparison. GLM leads on four of the six items and Opus 4.8 leads on two (SWE-Marathon 48.8, NL2Repo 69.7). By the footnotes, Terminal Bench 2.1 was measured in Claude Code 2.1.207 with a 6-hour limit, Terminal Bench 3.0 in Claude Code with 600 agent turns and a 10-hour limit, and DeepSWE in mini-swe-agent with a 6-hour limit. It states that reasoning effort runs at maximum unless specified.

I checked third-party leaderboards as well. Neither model was on Scale AI's public SWE-Bench Pro leaderboard. Neither was on SWE-rebench, which evaluates monthly with tasks from new repositories; only the previous generation, Sonnet 5 (56.8% resolved, \$1.43 per task) and GLM-5.2 (62.9%, \$1.40), were there. In the previous generation GLM had the higher resolved rate at a similar cost, but whether that holds for this generation cannot be told from this result alone.

The [Vals.ai SWE-bench Verified](https://www.vals.ai/benchmarks/swebench) page lists GLM 5.3 at 95.40% (\$0.34 per task, 14 min 1 s, 958k tokens, Mini-SWE-agent) in 6th place and Sonnet 5 at 79.60% (\$1.49) in 27th, but Sonnet 5.5 is absent. The page is dated September 1, 2026 and carries an archive notice saying that performance has saturated and new models are no longer run. This was the only SWE-bench Verified score for GLM 5.3 I could find, and it is not on the model card.

The only place where the two models were evaluated together under the same conditions was the Intelligence Index at [Artificial Analysis](https://artificialanalysis.ai/leaderboards/models). It is not a coding-specific metric, but the values are broken down by reasoning effort, so I used it as reference. Every Sonnet 5.5 row is marked "with fallback," a condition in which requests caught by safeguards were answered by a fallback model.

| Model (reasoning effort)           | Intelligence Index | Cost per task | Output speed (tokens/s) |
| ---------------------------------- | -----------------: | ------------: | ----------------------: |
| Sonnet 5.5 (max, with fallback)    |                 54 |       \$10.02 |                     139 |
| Sonnet 5.5 (high, with fallback)   |                 41 |        \$1.64 |                     106 |
| Sonnet 5.5 (medium, with fallback) |                 30 |        \$0.78 |                     100 |
| Sonnet 5.5 (low, with fallback)    |                 25 |        \$0.51 |                      99 |
| GLM 5.3 (max)                      |                 32 |        \$5.01 |                      78 |
| GLM 5.3 (low)                      |                 23 |        \$1.57 |                      74 |

On the same page, Sonnet 5.5's unit prices are \$2 input and \$10 output, and GLM 5.3's are \$1.40 input and \$4.40 output on the Z.ai API. Comparing maximum reasoning efforts, GLM's cost per task is half of Sonnet's. Compared with Sonnet at medium (\$0.78), Claude Code's default, it is more than 6x. Cost per task being high despite low token prices means that many tokens were used. It cannot be applied directly as the cost of coding agent work, but the point that low unit prices can still lead to high real cost matches this experiment.

## No grounds to switch on this call path and these settings

Under these conditions I found no grounds to swap the model in Claude Code for GLM 5.3. Basic-track resolved counts were similar, but Sonnet led on spec-track resolved rate, turns and time, cost, and review scores. Raising the limit lets GLM solve the spec track too, but the cost was already about 9x under the 60-turn condition and widens further as the limit rises. On this package and call path, with Claude Code's default settings and the 25-minute and 60-turn limits, I judged it better to keep the current model.

I do not think this result contradicts the public benchmarks. The GLM card's scores were evaluated with hundreds of turns and several hours at maximum reasoning effort. In this relaxed-limit experiment too, GLM solved hard tasks when given a larger budget. On Artificial Analysis as well, GLM's cost per task was several times that of Sonnet medium at a similar level of score. In an environment where a person is actually waiting, I had to look not only at "can it eventually solve it" but also at "in how many turns, and at what cost." In this experiment that gap was larger than the public scores had suggested.

There are conditions under which the judgment would differ. For work no one waits on, such as batch fixes run overnight, turns and time matter less. Even then, GLM's cost was higher. The GLM card says reasoning effort runs at maximum unless specified, so it would be worth measuring how many fewer turns and tokens GLM uses at a lower effort.

Looking only at the basic track, which fixes one or two files, resolved counts are similar but the median turns are 7 to 61. GPT-6 Luna, which was outside the scope of consideration, had a similar resolved count at a lower cost. Although GLM 5.3 was not chosen in this comparison, the possibility of switching to another model remains.

When writing part 1, I wanted to measure directly on our code because the model card scores alone made the decision hard. Now, when the next model comes out, the same 36 tasks can be rerun with the same limits. Keeping the tasks and changing only the model ID yields the same table within a day, so when the need to switch arises I plan to compare against these results.

[^1]: The `num_turns` Claude Code reports can come out larger than the configured limit. Runs that hit the 60-turn limit were reported as 61, and GLM had 11 runs reported above 60 without hitting the limit. So whether the limit was hit was decided not by `num_turns` but by whether `subtype` is `error_max_turns`.

[^2]: Pricing cache reads at 10% of the input rate gives about \$80, and the full rate with no discount gives about \$504. Even raising Sonnet's cache read price to \$0.20 gives \$15.6.
