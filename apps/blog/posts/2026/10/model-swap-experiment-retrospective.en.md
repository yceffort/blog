---
title: 'Wrapping Up the Coding Agent <em>Model Swap</em> Experiment'
tags:
  - ai
published: true
date: 2026-11-01 06:19:00
description: 'Looking back on 1,164 runs and the process of building an internal benchmark. Cost per task, the Claude Code run environment, what I had hoped for from open-weight models, and the conditions I would change next time'
series: 'Swapping the Model Behind a Coding Agent'
seriesOrder: 4
art:
  undraw: idea-to-plan
---

## Table of Contents

## What one decision cost

In this experiment, models were run 1,164 times in total. The combined run time is about 90 hours, the GLM 5.3 invoice was \$147.85, and the cost computed from Sonnet 5.5's token usage is about \$32. The seven other models run alongside are left out here because their cost cannot be computed from public unit prices. Building the tasks took four days and running them took four more. The time spent on patch review and on writing is separate. The decision on swapping the model is in [part 3](/2026/10/claude-code-model-swap-results): "No grounds to switch on this call path and these settings."

Judged only by the outcome, keeping the model as it is, that is a long piece of work. Still, I think it was worth doing for having set up a way to compare models on our own code. [Part 1](/2026/10/swe-bench-before-swapping-models) examined public SWE-bench, [part 2](/2026/10/in-house-swe-bench-from-merged-prs) built the internal tasks, and part 3 compared the results. This post looks back on that process. It contains more personal opinion than the previous three.

## Worth doing at least once

When the cost of a coding agent grows, you start looking for a cheaper model. But a feeling that the current model is better is a weak basis for deciding whether to switch. Public scores were hard to lean on too, because evaluation budgets, reasoning effort, and harnesses all varied. I started this experiment because I wanted to know whether the same results would hold under the conditions I actually use.

Measuring directly gave results that differed from what unit prices suggested. GLM 5.3's public unit prices are 30% lower than Sonnet 5.5's for input and 56% lower for output. Yet solving the same 36 tasks three times cost about \$13 with Sonnet and about \$122 with GLM. Per resolved run, that is \$0.13 versus \$1.22. GLM spent many more turns and tokens on the same work. I knew in principle that low unit prices could still mean a higher total, but how large the gap was on our code only became clear by running it.

It also produced grounds for considering other candidates. GPT-6 Luna, run alongside, resolved about as many tasks as Sonnet, 103 to 105, and cost about a fifth per round of 36 tasks. It was not under consideration by the company, so part 3 recorded it only as a reference result, but it is a model worth a closer look for cutting cost. Even though I decided against switching to GLM this time, the same evaluation can be used to examine other candidates.

Being able to reuse the tasks once built was another plus. With the 36 tasks, the grader, and the run scripts in place, the next model that comes out can be put through the same table within a day by changing only the model ID. The initial preparation took four days, but there is no need to build new tasks every time a model is compared. For a team that keeps using a coding agent and keeps wondering about swapping the model, I think it is work worth doing.

## What I had hoped for from open-weight models

When I started the experiment, I had hopes for open-weight models. In public scores, GLM 5.3 matched or beat Claude Opus 4.8 on many items. If it could be self-hosted in-house, it looked good both for cutting cost and for controlling how far code travels outside.

The results fell short of those hopes. Basic-track resolved counts were similar, but in the spec track GLM resolved 35 of 42 against Sonnet's 42. Median turns were 61 for GLM and 9.5 for Sonnet, and GLM's cost was about 9x. Given a 150-turn budget, the spec tasks were all graded resolved too. Looking at these results, the problem was how many turns and tokens it took to finish the same job. For someone waiting while using the tool, 6x the turns and 9x the cost was a hard gap to accept.

The two self-hosted open-weight models could not even be evaluated for performance. Their servers did not support the max output tokens and the system message position in Claude Code's requests, so not a single task ran to completion. A minimal request via curl went through, but that alone was not enough to conclude it would work from Claude Code. Next time I will start by running one task to completion with the actual harness.

The reasoning settings still need checking. GLM's `thinking_tokens` was 0 in all 108 runs, and I could not confirm what reasoning effort the gateway applied. A comparison with matched reasoning effort could come out differently.

## What I learned about Claude Code by running it

I had been using Claude Code daily, but running several models under identical conditions surfaced many settings I had never checked. The biggest effect came from the range it searches for instruction files. It walks the parent directories of the working directory up to the file system root, so even with `HOME` and `CLAUDE_CONFIG_DIR` changed, running under my home directory pulled in my personal instructions. This is why the first 488 runs were dropped from the comparison.

Tool permissions and turn counts also behaved differently from what I expected. `--allowedTools` is the list of tools that skip the permission check, and the option that restricts the tools themselves is `--tools`. Denied calls outside the allowed list still consumed turns, and the number of denials differed by more than 2x between models. `num_turns` was sometimes reported above the limit or as 1, so whether the limit was hit was checked via `subtype`. The auxiliary model variables also had to be set to the same model so that tokens from a model not under comparison did not get mixed in.

Claude Code's exit status alone could not tell whether the problem had been solved either. 53 runs were cut off at 60 turns yet passed the tests. Had I looked only at whether Claude Code exited with an error, those runs would have been counted as unresolved. That is why resolution was checked by the grader, and hitting the limit was recorded separately.

The call path should have been checked before running. Part 1 even said to confirm how far internal code may be sent, but in practice I started after looking only at the model IDs registered on the gateway. Only after the runs finished did I learn that some models had been called through an inappropriate path, and those results were excluded from the comparison. For the next experiment I plan to confirm the call path first, fix the tasks and limits, and only then run.

## Benchmarks I want to study next

While collecting the two models' public scores for part 3, SWE-bench Verified scores were hard to find. Vals.ai had attached an archive notice saying performance had saturated and new models would no longer be run, and neither the Sonnet 5.5 system card nor the GLM-5.3 model card had a Verified score. The names that appeared on the model cards were SWE-Bench Pro, SWE-Bench Multilingual, Terminal-Bench, DeepSWE, SWE-Marathon, FrontierSWE, NL2Repo, and so on. There was also SWE-rebench, which evaluates monthly with tasks from new repositories.

Of these, the ones whose evaluation conditions I have actually read are the SWE-bench family covered in part 1 and Terminal-Bench and DeepSWE, whose footnotes I checked in part 3. The model card evaluations seen in part 3 used budgets of hundreds of turns and several hours, at maximum reasoning effort. For the rest, I have seen only names and scores so far. I want to read further into what each one measures with which harness, and how close that is to an environment where Claude Code runs on default settings. As with SWE-bench, I plan to start by following the tasks and the grader.

## What I would change next time

The 60-turn limit was set in the first trial run. After isolating personal instructions, no run hit the 25-minute limit, and what actually stopped runs was the turn limit. Next time I would like to run the 36 tasks once more with only the 25-minute limit, to see how much of the spec-track gap was shaped by the choice of 60 turns. The two models' reasoning effort also needs to be specified explicitly and matched.

I would like to make GPT-6 Luna a formal comparison target and look at it by the same standards, through the spec track and the patch review. The tasks also all come from a single WebSocket package, so it would be worth building tasks the same way from a package of a different character, such as UI components. I am curious whether other kinds of work give similar results. The patch review, too, should be run once more with a reviewer from a different company than the models under comparison, to see whether the scores hold.

## The same tasks for the next model

Before the experiment I mostly looked at public scores and token prices. Now I also want to look at what it costs, in money and time, to finish one task on our code. This time GLM's low unit prices were outweighed by its heavy use of turns and tokens, and raising the limit did not narrow the gap in cost per resolved run. It was a result that directly helped in choosing a model.

The same model also produced different results depending on the harness, the limits, and whether personal instructions were present. In the next comparison I plan to check these conditions first and reuse the 36 tasks and the grader built this time. The 1,164 runs ended in a decision not to switch, but when the next model comes up for review, getting started should be considerably easier than it was this time.
