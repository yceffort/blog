---
title: 'Building 36 <em>SWE-bench Tasks</em> from 20 Internal PRs'
tags:
  - ai
  - testing
published: true
date: 2026-11-01 06:17:00
description: 'Turning merged PRs from an internal WebSocket package into coding-agent evaluation tasks, validating the grader, and isolating personal instructions from the Claude Code run environment'
series: 'Swapping the Model Behind a Coding Agent'
seriesOrder: 2
art:
  undraw: data-table
---

## Table of Contents

## My own name showed up in the run logs

While skimming the logs of the first run, I noticed Claude Code addressing me by the name it uses for me. All I had given the agent was a working directory and a problem statement, yet the global instruction file I use with Claude Code every day had been loaded as well. I had pointed `HOME` and `CLAUDE_CONFIG_DIR` at an empty directory for every run, so I assumed no personal settings could get in.

The cause was the range Claude Code searches for instruction files. According to the [documentation](https://code.claude.com/docs/en/memory), project instructions can live in `./CLAUDE.md` or `./.claude/CLAUDE.md`. Instructions found in parent directories are concatenated too, in order from the file system root down to the working directory. If the working directory is `~/works/...`, then `~/.claude/CLAUDE.md` above it falls inside that search range. Because the search follows the actual working path, changing `HOME` alone cannot stop it.

The documentation says the user instruction file, `~/.claude/CLAUDE.md`, is treated separately in this search. But once `HOME` and `CLAUDE_CONFIG_DIR` point at an empty directory, the user instruction path points there too. The file in my original home appears to have been read not as the user instruction file but as a parent directory's `.claude/CLAUDE.md`.

In a working directory under my home, I asked the agent to quote the first line of whatever instructions it had received, and it answered with the first line of my global instruction file verbatim. Under `/Users/Shared/` it answered that no such instructions existed. I did the rerun under `/Users/Shared/` and confirmed zero occurrences of my name in the output. The `claudeMdExcludes` setting in the documentation can also exclude specific instruction files in parent directories.

[Part 1](/2026/10/swe-bench-before-swapping-models) looked at how the TypeScript tasks in public SWE-bench are concentrated in two repositories, MUI and Vue. Those scores alone were not enough to decide whether to swap the model in Claude Code, so I decided to build tasks of the same shape from an internal repository. Building 36 tasks from 20 merged PRs and validating the grader took four days, the first run took three, and rerunning after isolating my personal instructions took one. This post covers how the tasks and the run environment were built. The per-model results and the decision on whether to switch are in part 3.

> The tasks and the grader contain internal code and gold patches, so they are not published. The per-run aggregates (model, round, anonymized task identifier, verdict, turns, tokens, quality metrics) are uploaded as a CSV in [swe-bench-inhouse in blog-experiments](https://github.com/yceffort/blog-experiments/tree/main/swe-bench-inhouse). The runs took place on macOS between October 23 and 26, 2026, and Claude Code was run with `claude -p`. Claude Code was used in its auto-updating state, and since the result data does not record the version, I inferred it from npm publish times. The latest release as of October 26, the day of the isolated rerun, was 2.1.310, and during the three days of the first run it was between 2.1.308 and 2.1.310.

## A package with 20 merged PRs

The target is the WebSocket package in our internal monorepo. It handles server login, data subscription and unsubscription, message serialization, and reconnection and recovery when the connection drops. The endpoint and credentials are injected from outside, so it is not tied to any particular app.

This package had 20 merged PRs that changed tests and implementation together. The SWE-bench approach grades with the tests a PR added, so PRs that only touched the implementation cannot be used. Among the PRs merged from late May to mid-September 2026, 20 included test file changes.

It also mattered that behavior could be verified with vitest alone, with no screen or browser. The package ships a mock WebSocket server and a test helper that imitates the PUSH loop, so connection and reconnection scenarios can be reproduced as unit tests. Because the code deals with the ordering and timing of connect, login, subscribe, and reconnect, few problems could be fixed by changing a single line. I thought it was a reasonable place to look for differences between models.

In the public TypeScript tasks, a third of the gold patches do not touch any `.ts` implementation file. Every internal task chosen here changes real implementation files. Since the 36 tasks come from a single package, though, the results should be read as applying to this package only.

## From 20 PRs to 36 tasks

The tasks were built following the procedure set in part 1. The PR's starting commit becomes `base`, and the changes are split into test file changes (the test patch) and everything else (the gold patch). Tests are run in three states: with no patch applied, with only the test patch applied, and with both patches applied. Tests that fail with only the test patch and pass once the gold patch is added are f2p (fail-to-pass), and tests that pass in all three states are p2p (pass-to-pass). One task contains the base commit, a problem statement, the test patch, and the f2p and p2p lists. The gold patch is not used for grading and is kept only for validation.

Two of the 20 PRs did not become tasks. One was an improvement PR that restructured the package and changed 18 tests, and the other was a vulnerability fix generated automatically by a tool. Neither fit the task format of "read the issue and fix the bug."

Of the remaining 18, 7 fixed several review comments at once or bundled release changes. Turning one of these into a single task would put five or six unrelated bugs into one problem statement, and failing to fix any one of them would count as unresolved. So I split those 7 by topic.

Split tasks share the same base, the same test patch, and the same gold patch, but narrow f2p to the tests for that topic. Topics were separated by strings in the test names, and a script checked that each original f2p test belonged to exactly one topic. p2p stays the same as the original. Tests for other topics were failing at base anyway, so they are not in p2p and do not affect the verdict of that task.

For example, one PR that fixed a batch of review comments became two tasks: "version string components get truncated to two characters" and "the log masking function corrupts class instances rather than plain objects." One release PR became five tasks: teardown that also discards pending requests, log serialization of error objects, attempting login on a dead socket while waiting for a token, handling a missed close event, and state diverging when the module is loaded twice. Each is the kind of thing that would plausibly be reported as its own issue.

<LiveDemo src="/demos/swe-bench/split-items.html?present=1" title="How one bundled PR is split into three tasks by topic. The three tasks share base, the test patch, and the gold patch, narrow only f2p per topic, and the grader is validated with a partial gold patch that keeps only the topic's files" height={640} />

The viewer menu in the diagram is in English, and the labels are generalized for this post.

I also checked that each split task is solved by fixing only its topic. Grading a partial gold patch that collected only that topic's files from the gold patch resolved all 25 tasks, and an empty patch left all of them unresolved. For 4 tasks, however, the code imported names newly created by another topic, so the partial gold patch had to include that other topic's files too. For these 4, what was confirmed is that they can be solved without changing the other topic's tests. Whether they can be solved by changing only the topic's own code was not verified.

One of them had to call a method added by another topic on the successful login path. That dependency is written into the problem statement and the interface spec. One task produced by splitting was dropped: its tests failed only because they imported a new name, while the required behavior already existed at base. It was effectively a rename.

In the end, the main set is 36 tasks: 11 originals that were not split and 25 split tasks. The 7 unsplit originals were kept but left out of the main set so the same tests would not be counted twice. Tasks from the same PR share code areas, so they cannot be treated as independent samples. The 36 tasks have 167 f2p tests in total. 12 tasks have one f2p test, 7 have ten or more, and p2p ranges from 142 to 366 tests per task.

With 36 tasks, small differences in resolved rate cannot be told apart. Part 1 assumed independent tasks and computed the half-width of a 95% confidence interval at a 50% resolved rate as $1.96\sqrt{\frac{p(1-p)}{n}}$. Plugging in 36 gives ±16.3 percentage points, and these tasks do not even satisfy the independence assumption. So instead of decimal differences in resolved rate, I focused on which tasks each model solved and where it failed. Part 3 presents the per-task results as well.

## What the 36 tasks ask you to fix

I grouped the 36 tasks by what they change. Task identifiers are the same anonymized symbols used in part 3, and the same letter means tasks from the same PR. The area breakdown is my own, made for this post.

| Area                                              | Tasks | Identifiers                                   | Example                                                                                                  |
| ------------------------------------------------- | ----: | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Connection, reconnection, recovery, request queue |    12 | A1, A3, E1, E3, K1, K4, K5, L1, L3, L4, P3, Q | After every reconnection attempt fails, the client stays disconnected forever without an external signal |
| Login                                             |     5 | E2, K3, L5, M, P2                             | A background login failure causes repeated reconnects and the socket keeps changing                      |
| Subscription and delivery                         |     6 | A2, C, F, G, I, R                             | Screens subscribing to the same target interfere with each other's delivery interval                     |
| Message parsing and serialization                 |     4 | H, J, N, P1                                   | An integer field is decoded as an object rather than a number                                            |
| Configuration and logging                         |     4 | D1, D2, K2, L2                                | Version string components get truncated to two characters                                                |
| Test helpers and debug tools                      |     5 | B1, B2, B3, B4, O                             | Mounting the debug tool late hides events from right after startup                                       |

Nearly half of the tasks concern connection, login, and recovery. In this package, bugs clustered at the boundaries where connection state changes, and the tasks reflect that. The four test helper tasks come from one PR. They fix the mock socket and PUSH loop helpers the package provides, so they differ in character from bugs in service code. Since every PR that could be graded was included, the makeup of the 36 tasks is close to "what was actually fixed in this package." It is hard to read it as the distribution of frontend work in general.

## Tasks with only a problem statement, and tasks that also get a spec

While building the tasks, the tests fell into two kinds. Some check externally observable behavior such as call counts or return values. Others check the name of a new API or module-internal state directly. The latter are hard to solve from a problem statement alone. If a test attaches a spy to an internal function by name, or checks that a new config field has exactly a certain name, then even a correct behavioral fix fails the test unless it uses that name.

Public benchmarks have handled this in two ways. SWE-bench Verified dropped tasks during its review that required names absent from the issue, and SWE-Bench Pro included an interface giving names and signatures in the task and folded them into a single resolved rate alongside the others. Here I took the same approach as Pro but counted the scores separately. Tasks that give only a problem statement are the basic track (22 tasks), and tasks that also give an interface spec are the spec track (14 tasks). The track names and the split are choices made for this experiment, not a standard tier of any public benchmark.

The interface spec lists, for each item the tests depend on, its module path, signature, and meaning. One item looks roughly like this.

```text
## `SubscribeOptions.windowTime`

- Module: `src/types.ts` (the `SubscribeOptions` type)
- Signature: `options?: { windowTime?: number; legacyWindowTime?: number }`
- Meaning: the batching window (ms) applied only to this subscription. The old option is
  a deprecated alias; if both are given, the new option wins. If neither is given, the app
  default applies. The old option existed at base too, but its meaning changes from
  per-connection to per-subscription.
```

The identifiers are changed for this post, but the structure is intact. Because a spec also reveals much of where to make the fix, I decided to count the resolved rates of the spec track and the basic track separately, and part 3 keeps that split. That does not mean the spec track was always easier. The hardest task was in this track: an option's meaning changed from per-connection to per-subscription, and 13 files had to be modified.

## Problem statements are written by someone who has seen the answer

Each problem statement describes symptoms, reproduction steps, and expected behavior, and does not describe the solution. As in the SWE-Bench+ analysis quoted in part 1, a solution in the issue body means evaluating a model that has been handed the answer. Real PR descriptions usually contain the solution, so I used them only as reference and did not copy them. PR numbers and links, which could be clues to the answer, were also removed.

One basic-track task reads like this. Identifiers and domain terms have been changed.

```text
# Turning on the batched delivery option drops some notifications that must be delivered immediately

## Symptom
When a batching window is given at connect time, not only the latest-value-only messages but
also per-event notifications are merged within the window, and only the last one is delivered.
Per-event notifications are subscribed per user, so every event for one user shares the same
subscription key, and when several arrive in a short time the intermediate ones are lost for good.

## Reproduction
1. Connect with a 100ms window and complete login.
2. Subscribe to the per-event notification code with a user key.
3. Receive three notifications for the same user in a row (seq 1, 2, 3).
4. The callback is not called immediately; after 100ms it is called once, with seq 3.

## Expected behavior
- The three kinds of per-event notifications must never be merged regardless of the window,
  and every one must be passed to the callback in order as soon as it arrives.
- In the reproduction above, the callback must be called three times before the timer fires.
- Other messages keep being merged per window and only the latest value is delivered, as now.
```

Grading requires the 4 tests the PR added to pass and the 253 existing tests to keep passing. The statement does not say where to make the fix, but it does say what is wrong and what the correct behavior is, down to the level the tests check.

Numbers the tests demand also had to stay in the problem statement. Some tasks' tests check that the timing of the batching window and the number of calls match fixed values. Leaving out the "how many times within how many ms" condition would allow solutions that match the description but fail the tests. Design choices the tests do not check were left to the agent. A different approach from the gold patch still counts as resolved if it passes the tests.

Writing a problem statement after seeing the gold patch makes it easy to hint at the structure of the solution. So I added a separate review step. I wrote the basic-track statements myself, and for 4 of them I compared the text against the failure messages produced by applying only the test patch to base. For the spec track, I reviewed every draft the agent wrote and then did the same comparison for 7. I checked whether any requirement of the tests was missing from the statement, and whether the statement demanded anything the tests do not check. A script verified that every new name and new module the tests depend on appears in the interface spec.

After the review I removed sentences that hinted at the solution's structure and added a note that modifying a dependency package's type definitions requires rebuilding that package. Behavior that already existed at base was marked "same as current code, keep." That last note was needed because of the cascading test failures described below. For the split tasks, the statement and spec were carved out of the reviewed original and polished into standalone issues.

## Testing the grader before the models

Before running any model, I tested the grader. There turned out to be more problems to solve while validating the grader than while actually comparing models.

The grader applies the agent's patch to base, lays the PR's test patch on top, and runs the tests. If every f2p test passes and no p2p test breaks, the task is resolved. To stop the agent from passing by editing tests, test files are excluded when the patch is applied. This covers anything under `__tests__/`, files containing `.test.` or `.spec.`, and snapshot and fixture directories, and the excluded paths are recorded in the result.

If any test fails, only that file is rerun, up to three times. If everything passes on the rerun, the result is marked separately as `resolved_after_rerun`. This was added to tell apart unresolved verdicts caused by flaky tests, and in practice this verdict never occurred. There are seven verdicts.

| Verdict                | Meaning                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `resolved`             | All f2p and p2p tests pass                                                                      |
| `resolved_after_rerun` | Failed at first, passed when the failing file was rerun. Kept apart from the main resolved rate |
| `unresolved`           | Still failing after rerun. The failing tests are recorded                                       |
| `patch_apply_failed`   | The model's patch does not apply to base                                                        |
| `test_patch_conflict`  | The test patch does not apply on top of the model's patch                                       |
| `no_report`            | No test report was produced (broken config, etc.)                                               |
| `env_setup_failed`     | A problem in the grading environment. Not the model's fault                                     |

In the model comparison, only `resolved` and `unresolved` actually occurred. Still, having the other four failure kinds separated in advance meant there was no need to reclassify results afterward into model failures versus environment problems. It applies part 1's principle, "timeouts, API errors, and missing result records are recorded separately," to the grader as well.

Validating the grader is simple: the gold patch must come out resolved and the empty patch unresolved. For the 18 unsplit originals, grading the gold patch three times gave resolved every time, and the empty patch gave unresolved every time. For the 25 split tasks, the partial gold patches described above gave the same result. One test was removed from the verdict. It checks that a serialization function was called with specific arguments, and the same behavior implemented with a different argument shape would break it, so it went on the exclusion list.

In a task with 10 f2p tests, only one actually checked a behavioral change. The other nine were cascading failures. The `mockRestore()` that restores the spy sat inside a test body in the same file, so when the first assertion failed, the restore code never ran. Applying only the test patch to base showed tests failing in sequence from the first failure to the end of the file.

In another task, at least 4 of 17 f2p tests failed for the same reason. The behavior those 4 check already existed at base, and the gold patch did not change that logic. So the spec marks them as "keep." It makes no difference to whether the task is resolved, but it is no basis for judging the task a hard one with 10 f2p tests. Part 1's caution that f2p count must not be read as difficulty, because the public dataset contains PASS-FAIL-PASS records, applied to the internal tasks too.

Putting the grading worktree under `/tmp` also required care with paths. On macOS, `/tmp` is a symbolic link to `/private/tmp`, so the file paths vitest reports and the paths the grader computes did not match. In that state every p2p test for the empty patch failed, and had I evaluated the models like that, everything would have scored zero.

Patches that modify a dependency package's type definitions only took effect in tests after that package was rebuilt. I made the grader inspect the patch paths and run the required build. A single grading worktree cannot be shared concurrently, so when running several models I created a separate worktree per model.

## What I measured beyond passing tests

Among the patches that passed the tests, some broke type checking, violated the team's lint rules, or changed several times more code than the gold patch. Resolved or not does not reveal such differences, so I recorded quality metrics for every run as well.

The metrics are the number of tsc errors, eslint errors, files violating the formatter, lines of code changed excluding tests, change size relative to the gold patch, added `any`, lint suppression comments, and added comment lines. The code measured has to be the same code that was graded. Applying only the model's patch to base would inspect a different state from the one graded, so I measured after laying the PR's test patch on top.

The baseline for counting "errors the model newly introduced" is the gold state (gold patch plus test patch). Split tasks include tests from other topics, and those tests produced the same tsc errors for every model. So only errors in non-test files were counted. When comparing change size, the denominator was the partial gold patch for that topic rather than the whole gold patch.

I also had to define "a run that ended without changes." Counting runs with zero changed lines in code files would mix in runs that changed only tests or docs. So the verdict is whether the patch file itself is empty, and the quality of such runs is not measured, only their count. In part 3, 15 of one model's 70 runs fall into this category.

Cost was computed by multiplying the input, cache read, cache write, and output tokens from the `usage` Claude Code reports by unit prices. `total_cost_usd` is an estimate from the client's price table, so it was not used. Runs killed by the time limit have no result event and therefore no token usage recorded, but none of the isolated runs ended that way.

## How Claude Code was run

The agent's working directory is a fresh git repository containing only the files at the base commit. The files were extracted with `git archive`, a single commit was made, and the `base` tag was attached. Later commits and the remote were not included, so the answer could not be found in git history or remote PRs. Dependency installation and dependency package builds were done ahead of time so the agent could run tests right away. The task repository, including the gold patch, was kept somewhere invisible from the working directory. A working copy of all 36 tasks was created once and copied for each run.

The prompt is "The following issue was reported for this package in this repository. Modify the code to resolve the issue. You may add or fix tests, but they will not count toward grading." followed by the problem statement. For the spec track, "You must follow the interface spec below." and the spec were appended. The run command looks like this.

```sh
claude -p "<prompt>" \
  --output-format stream-json --verbose \
  --max-turns 60 \
  --allowedTools Read Edit Write Grep Glob \
    "Bash(pnpm:*)" "Bash(npx:*)" "Bash(node:*)" "Bash(ls:*)" "Bash(cd:*)" \
    "Bash(git diff:*)" "Bash(git status:*)" "Bash(git log:*)"
```

`ANTHROPIC_BASE_URL` was set to the internal gateway and `ANTHROPIC_MODEL` to the ID of the model under comparison. The auxiliary model variables `ANTHROPIC_SMALL_FAST_MODEL` and `ANTHROPIC_DEFAULT_HAIKU_MODEL` were set to the same model ID. Without them, auxiliary work such as title generation calls the default model, and tokens from a model that is not under comparison get mixed in. `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` was also turned on to cut requests unrelated to the evaluation.

The limits were set to 25 minutes and 60 turns per task. The Claude Code [documentation](https://code.claude.com/docs/en/cli-reference) describes `--max-turns` as the option that limits the number of agentic turns. When the limit is reached, the run ends with an error. Once a person hands over a problem, Claude Code keeps calling the model until the work is done. One round trip, in which the model requests a tool call such as reading or editing a file or running tests and Claude Code returns the result, is one turn.

The 60 came from the first trial run. Public benchmarks give far larger budgets. [mini-swe-agent's default SWE-bench settings](https://mini-swe-agent.com/latest/usage/swebench/) are 250 steps and \$3, and the Terminal Bench 3.0 evaluation on the GLM card uses 600 turns. Given that much, many tasks eventually get solved, so this time I wanted to see how much gets solved within a fixed number of turns. Since the model rereads the entire context on every turn, more turns mean more tokens and more cost.

The 25-minute limit is there to stop a run that takes unreasonably long to get through 60 turns. Some runs hit the time limit in the first run, but none did in the rerun with personal instructions isolated. There, what bounded the results was the turn limit. Part 3 also looks at how the choice of 60 turns affected the results.

`--allowedTools` was given the list above. According to the documentation, this option sets which tools run without a permission check. The option that restricts the tools themselves is `--tools`. Calls outside the list are denied in `-p` mode because there is no one to answer the permission request. The count is recorded in the result's `permission_denials`, and it differed by more than 2x between models. Denied calls consume turns too, so the more often a model tries disallowed commands, the fewer turns it has left for solving the problem.

The run output was captured as the full stream of stream-json events to a file and summarized afterward. Tool call kinds and counts were tallied from assistant events, and `subtype`, `is_error`, `num_turns`, and `usage` were taken from the final result event. Part 1 said that `subtype` being `success` alone would not be classified as success, and the opposite case turned up as well. When the 60-turn limit is hit, `subtype` ends as `error_max_turns` and `is_error` as true, yet the code at that moment can pass the tests. So success was decided solely by the grader's verdict, and Claude Code's result was used only to record how the run ended.

In the data used for grading and aggregation, model names were replaced with labels. The mapping from label to model ID lives in a single separate file, and result folders and logs carry only labels. Raw agent output containing model names was kept in a separate hidden folder. This let the scripts compute verdicts and metrics without knowing the model names. However, a session helping with aggregation could tell which model a label was once it read a previous round's table. Hiding model names would also have required managing access to earlier results.

Authorship was hidden in the patch review too. For each task the two patches were randomly labeled P and Q, so the same label could mean a different model on a different task. The reviewer was shown only a folder containing the problem statement, interface spec, gold patch, the two patches, and grading results, plus the base code. It scored correctness, scope of change, consistency with existing code, simplicity, code cleanliness, and an overall rating from 1 to 5.

The reviewer was Claude. To reduce unfounded criticism, any item scored 3 or below had to quote the patch text. Findings classified as real bugs were rechecked by me, with the patch and base code open.

Each model got one execution queue (lane) that processed the 36 tasks in order, and as many queues as models ran concurrently. The task order was the 22 basic-track tasks followed by the 14 spec-track tasks. When a task finished, the patch was collected with `git add -A && git diff --cached --binary base`, graded, and recorded in `meta.json` along with the quality metrics. Because the comparison is against the `base` tag, every change is included in the patch even if the agent committed during the run.

Results that looked like API errors or connection failures were classified as infrastructure failures and retried once. Tasks that already had a result file were skipped, so rerunning an interrupted queue picked up from the remaining tasks. Result folders were also separated by round and condition. Keeping runs with changed limits or the isolated rerun from mixing with existing results turned out useful when discarding the first run and starting over.

## Why the first run was excluded from the comparison

The first run was 488 runs in total: 432 runs of 4 models solving 36 tasks three times each, plus 56 runs of the 14 spec-track tasks with raised limits (3 of which have no result because of gateway errors). The output of 297 of them contained my name, and some followed the instruction "show the plan first and stop," wrote only a plan, and were graded unresolved. One model rerun without the instructions came out the same at 105 of 108 resolved, but results mixed with the instructions could not sit side by side with isolated ones. The 488 runs were dropped from the model comparison and kept in part 3 only as reference material on what changes when limits are raised.

The call path was rechecked at this point as well. Part 1 said that before sending internal code to a hosted API, one should confirm how far the company allows it, but in practice I started the runs after looking only at the model IDs registered on the gateway. Only after the runs finished did I learn that some models were being called through a path not appropriate for internal code. Those results were excluded from the comparison, and from then on the candidates were narrowed to models on the path the company had decided to use internally. That is why the main comparison in part 3 is between two models, Claude Sonnet 5.5 and GLM 5.3.

The run environment also differed from the plan in part 1. I ran on the host instead of in a container and restricted only the allowed tool list. The working directory has no remote and the task repository is not visible, so there is no path to the answer, but sending network requests via Bash was not blocked. The result summary did not record the Claude Code version, so I inferred it from npm publish times.

Two self-hosted open-weight models could not be run because their servers did not accept the max output tokens and the system message position in the requests Claude Code sends. A minimal request via curl went through, so that alone could not tell whether they were compatible. It took running one task to completion with Claude Code.

Turn counts use `num_turns` from the result. This value could be 61 or more in a run with `--max-turns 60`, and a run with 145 tool calls was reported as 1, so whether the limit was hit was decided by `subtype`. Since several models ran concurrently on one machine (4 queues in round 1, 8 in rounds 2 and 3), elapsed time across models is a reference value only.

## The rerun results are in part 3

With the 36 tasks, the validated grader, and the run environment all reusable, the rerun with personal instructions isolated finished within a day. The tasks and limits were kept as fixed before seeing any results. The default limit of 60 turns was not changed after the first trial run, and the raised-limit experiment was kept separate to compare how results change.

Part 3 looks at the 216 runs in which Claude Sonnet 5.5 and GLM 5.3 each solved the same 36 tasks three times. It compares resolved rate, turns, time, and cost, and also covers what a human and a model found when reviewing patches that passed the tests. The main topics are how the conditions differ from public benchmarks, the effect of the 60-turn limit, and defects that passing tests alone could not reveal.
