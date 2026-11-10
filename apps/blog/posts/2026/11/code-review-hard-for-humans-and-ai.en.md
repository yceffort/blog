---
title: 'Code Review Is Hard. For People, and <em>for AI Too</em>'
tags:
  - code-review
  - software-engineering
  - essay
  - ai
  - career
published: true
date: 2026-11-10 19:38:00
description: 'Code review is still hard'
art:
  undraw: unread-messages
---

## Table of Contents

## Comments that go unread

In a [post](/2026/06/do-you-need-to-read-code) I wrote in June, I said I was building a review agent. I also wrote down a rule: if I could not demonstrate its effect in numbers within eight weeks, I would take it down. Eight weeks passed. I did not compute the numbers, and I did not take the bot down.

The bot kept leaving comments on PRs, and people shrugged and moved on. Once that had happened enough times, they stopped reading the comments. A survey I ran to improve the bot did not produce any meaningful answers either.

I have built or tried five or six tools like this, and most of them did not succeed. Code review is hard, which is why I wanted to hand it to a machine. When I did, what grew was the number of comments nobody read.

## Why code review was hard

At first, code review was hard for reasons beyond the complexity of the code. I felt I would be found out for not knowing enough, and I worried that someone would notice the parts I had only half understood and moved past. Code review meant having my code evaluated, and it also exposed how much I actually knew.

After I became a senior engineer, I encouraged juniors to write code in different ways and to try new libraries. Then I became a lead and had to review that code myself, and a different difficulty appeared. What I already knew was not enough to review it. I had to understand new libraries and APIs and unfamiliar implementation styles, and I also felt pressure to teach the junior something.

As a junior it was hard because I feared being caught not knowing. As a lead it was hard because I had to understand and explain even what I did not know. My position changed, but the difficulty did not.

Later I found that this anxiety was not mine alone. Microsoft's Code Reviews Do Not Find Bugs notes that the social side of code review cannot be ignored[^1]. Roles and hierarchy in a team affect review outcomes, and often the reviewer is being evaluated as much as the author. The person leaving comments is also revealing their own level, which seemed to explain a little of why review did not get more comfortable after I became a lead.

The difficulty of reviewing unfamiliar code shows up in numbers too. According to the same paper, when a reviewer saw a piece of code for the first time, an average of 33% of their comments were judged useful by the author, and that rose to about 67% by the third review of the same code. Once a change touched 20 or more files, the share of useful feedback began to drop noticeably[^1]. Those figures match how it felt to review unfamiliar code. A reviewer's attention is limited, and the limit arrives sooner the less familiar the code is.

## Four ways I allocated attention

I did not give up on code review. Instead I thought about where to spend limited attention, and used roughly four approaches.

**First, I moved repeated checks into guardrails.** In this post, a guardrail means an automated check that ends in pass or fail, like a lint rule. I enforced layer dependency rules with ESLint's [`no-restricted-imports`](https://eslint.org/docs/latest/rules/no-restricted-imports). I wrote elsewhere about [managing environment branches with lint and contract tests](/2026/09/one-web-on-multiple-webviews) and about [surfacing in the PR what adding a library does to the bundle](/2026/05/pr-diff-vs-bundle). This started from the judgment that not all code needs the same amount of human attention.

Some rules are hard to maintain through human comments. A study that analyzed 16,442 Eclipse code review requests looked closely at 1,268 requests in which convention violations disappeared, and only a minority of them disappeared because a review comment pointed them out[^2]. If people keep repeating the same thing in reviews, that thing is a candidate for a rule. Writing custom rules used to be costly enough to make me hesitate, but [now the rule can be written by AI](/2026/02/frontend-engineering-in-ai-era).

**Second, I asked people to tell me directly about the PRs that really mattered.** For an implementation they were unsure about, or a change that needed agreement on design, I asked them to explain it up front and to ask for dedicated review time. Not every PR mattered equally.

**Third, I required review for core areas.** For modules critical to the product, such as payments, a change needed review and agreement from at least one person who knew the area well. The point was not only to check the code for errors. What mattered was that someone who understood the product's risks had seen the change and agreed to it.

**Fourth, I reviewed test code too.** Even when every test passes, the tests themselves may be verifying the wrong requirement. Now that AI writes implementation and tests together, this easily becomes [circular verification](/2026/06/do-you-need-to-read-code), grading yourself with your own answer key, so I think it matters more.

Looking back, all four were decisions about what to hand to machines and what to leave to people. The advantage of a guardrail is that it uses almost none of anyone's attention. Lint passes or fails, and when it passes nobody has to look. Google's SRE book states the standard for paging on-call as "every page should be actionable," and says that a page that merely merits a robotic response should not be a page[^3]. That is a different field from code review, but it shares the habit of asking first whether something deserves a person's attention.

But guardrails have a clear limit. They can only see what can be judged as pass or fail. Lint does not tell you whether a design is right or whether the code matches what the product intended. The part that people had to look at remained, and the code kept growing.

## Eight weeks I did not measure

With AI coding tools like Claude Code and GitHub Copilot, the target of automation widened from writing code to reviewing it. When code gets written faster, there is more code to read. Faros AI reported that PR review time rose 91% on teams with high AI adoption[^4], which matched the feeling of reviews piling up.

I tried building LLM-based review tools several times as well. The first one collected its results on a personal dashboard of mine. I had to read the findings there and post them to the PR again myself, and that was tedious. So I changed the bot to leave comments directly on PRs. At first people were interested. They checked what the bot had found and read its comments.

The review agent I mentioned at the start is one of those. The sentence I wrote in June was this.

> The review agent I'm building has an eight-week evaluation deadline attached: if I can't demonstrate its effect in numbers, it comes down.

In the same post I wrote that agreement rate with human reviewers and false-positive rate should be measured. The reason I did not compute the numbers for eight weeks is that I forgot. What remained was an impression that some of it was useful and some of it was not, and although I had not demonstrated anything, I did not take it down. Instead I decided not to use it as a PR gate (a required check that must pass before merging) and to keep it only as an auxiliary tool.

There is no excuse for forgetting. There is also a slightly embarrassing side to it. In October this year, to compare coding models, I [built 36 tasks from internal PRs](/2026/10/in-house-swe-bench-from-merged-prs) and [ran models 1,164 times](/2026/10/model-swap-experiment-retrospective). In that experiment it was clear what to count. Whether a run was resolved was graded by whether it passed a fixed set of tests. With a review bot that looks for many kinds of problems, I first had to decide what counts as a useful finding.

### Metrics that measure different things

The agreement rate I had written down treats human review as the ground truth. But human review is not the ground truth either. As shown above, the same person's comments differ in quality before and after they become familiar with the code. The false-positive rate has the same problem. The value changes a lot depending on whether only wrong findings count as false positives, or whether findings that are right but that nobody cares about count too.

Put the published numbers side by side and everyone is measuring something different.

| Source                                                       | What was measured                                               | AI comments                              | Human comments |
| ------------------------------------------------------------ | --------------------------------------------------------------- | ---------------------------------------- | -------------- |
| Mozilla and Ubisoft[^5] (2024)                               | Share accepted by reviewers                                     | 8.1%, 7.2%                               | N/A            |
| GitHub Actions tools[^6] (16 surveyed, 4 analyzed in detail) | Share of comments that led to a code change                     | 0.9% to 19.2%                            | 60%            |
| Atlassian[^7] (2026, in-house evaluation)                    | Share of comments that led to code resolution                   | 38.7%                                    | 44.5%          |
| Google[^8] (2024, in-house evaluation)                       | Share of positive ratings among comments that received feedback | 54%, 66% when recomputed after filtering | N/A            |

The numbers in the table cannot be compared with each other. Both the numerators and the denominators differ. A comment was not useless just because the code did not change, and a change is no guarantee that the comment caused it. Even the human-comment values differ, 60% and 44.5%. Google also wrote in the same paper that because the ground-truth data is incomplete, its precision and recall measurements are noisy.

Companies that build these products use proxy metrics too. Cursor wrote that only after creating a resolution rate, in which an AI judges whether a flagged bug was resolved in the final code, could it improve by looking at a signal instead of intuition[^9]. Anthropic said that less than 1% of findings are marked incorrect[^10], but that is the share developers marked, which is different from a precision that also checks the comments nobody marked.

Something similar happened in an experiment I published. [When I had six builds of number-flow reviewed anonymously](/2026/11/number-flow-blind-agents), one and the same build received 50, 65, and 76 points from three evaluators. The scores spread that far even with the rubric written out in advance. So at the time I looked less at the scores and more at which code kept producing the same problem.

Asking people directly does not work well either. Atlassian put thumbs-up and thumbs-down buttons on every comment and reported that engineers rarely pressed them. The lack of meaningful answers in my survey probably has a similar cause. There is not much to say when asked how to fix comments you have already stopped reading. Without data and a procedure for evaluation, you end up fixing the tool based on impressions and complaints, and that is what I did.

## Why the comments were ignored

After I made it an auxiliary tool, the comments kept coming, and people shrugged and moved on.

### Right but trivial

At first I thought wrong findings had piled up and cost the bot its trust. And in fact, after the bot left a few comments that did not fit the context, people started to stop looking at them. For review I used an inexpensive open-weight model such as Qwen, and its answers were not very accurate. In [the experiment comparing coding models](/2026/10/claude-code-model-swap-results), models of this kind solved tasks that touch one or two files at a similar rate, but a gap appeared on larger tasks. When a bot keeps raising cases that are already handled, or leaving generalities that could be attached to any code, it is hard to trust. Then nobody may be reading at the moment the bot points at a real bug. It is the same phenomenon as alert fatigue, familiar from lint warnings and monitoring alerts.

But wrong findings were not the only ones ignored. The bot labeled its comments as minor or major, and the minor ones were often skipped for lack of time. A shrug is a slightly odd reaction to something that is wrong. If a comment were wrong, people would get annoyed or push back. A shrug is closer to "this may be right, but I have no reason to act on it." A post by Greptile, which builds an AI review tool, analyzing its own comments captures this well[^11]. About 19% of comments were good, 2% were wrong, and the remaining 79% were nits, technically correct but trivial findings that developers did not care about.

Reducing them was apparently not easy either. Using the prompt to cut nits also cut the important comments, and a filter that had an LLM rate severity failed as well. Only after collecting, per team, embeddings of the comments developers had reacted to and filtering out similar comments did the share of comments addressed before merge rise from 19% to over 55%, they wrote. The bar for what counts as trivial differed by team, so it had to be learned team by team.

This is where my thinking changed. A problem I had assumed would go away with higher accuracy was not only a problem of accuracy. Saying something correct and choosing a problem worth someone's action are different tasks.

### Context outside the diff

Part of the reason for so many trivial findings is probably missing context. What my bot read was the PR's diff and the instruction file kept in the repository (`CLAUDE.md`). A diff alone makes it hard to know the role of the changed code and how the surrounding system behaves, and handing over the whole repository increases token cost and irrelevant information. Gathering exactly the context that is needed is a hard engineering problem in itself.

On the frontend, rendered output, user interaction, accessibility, and performance are hard to verify from code alone. On the backend, execution context matters, as with concurrency, transactions, and data consistency. For example, if a value has already been validated at the call site, a null finding inside the function shown in the diff is both correct and useless. A person lets it pass because they know where the function is called from, but a bot that has only seen the diff has little choice but to raise it.

Harder still are undocumented rules. Every service has past decisions, an incident history, and implicit constraints, and that knowledge is not fully recorded in either code or documents. Code that looks odd may have been put there to prevent an old incident. To tell a bot about it, you have to write down, for the bot, things you never normally write.

### Comments that need no response

There were cases precision alone could not explain even before AI. When Facebook's static analysis tool Infer assigned its overnight analysis results to owners, the fix rate was near zero, but when the same kind of findings, with the same false-positive rate, were posted by a bot at code review time, it exceeded 70%[^12]. My bot also left comments on PRs, though, so the timing was the same.

Among the comments labeled major, some were right. Yet even when a finding was right, authors rarely fixed it themselves. What I suspect is the reason to respond to a comment. In code review at Google, an unresolved comment is an item the author must address, and approval comes after comments are addressed[^13]. A comment with a reviewer waiting on it needs a reply. My bot's comments carried no obligation. It was not a gate, so ignoring it had no effect on merging. Keeping it as an auxiliary tool looked like the safe decision, but it may also have lowered the weight of its comments.

The paper on Tricorder, Google's static analysis platform, counts every report the user chose not to act on as an effective false positive[^14]. Under this definition, a correct finding that nobody acts on is a failure of the tool. By that definition, my bot's comments failed even when they were right.

That the reason to respond is the cause is a guess. I could not find a study that directly compares action rates for comments that block merging and comments that do not, and as the table above shows, there are places like Atlassian where bot comments were addressed at a rate close to human ones.

### When I commissioned work with a defined scope and criteria

For work I commissioned directly with a defined scope and criteria for verification, I got usable results. In [the project that ported markdownlint to Rust](/2026/09/porting-markdownlint-cli2-to-rust), I gave Codex the original tool as well and instructed it this way. Reading code and saying it looks risky is not a finding. Only a case where the two tools were actually run and produced different output is a finding. After about 1,600 differential runs there were 11 findings, including one where `--fix` silently changed files differently. In [number-flow](/2026/11/number-flow-blind-agents) too, a defect in my fork was filed as an issue after an agent's review and a reproduction.

Those two cases differed from a bot that comments on PRs automatically in several conditions at once. I commissioned them because I needed them, I defined the scope and the evidence required, and I was the one who received the results. In the Rust port in particular, the original tool's behavior on the same input could serve as the reference. I cannot separate how much each condition contributed, but at least it was clear how to verify and handle the findings that came out. Both were also one-off jobs I handled alone.

### Choosing what not to say

Published products point in a similar direction. GitHub wrote that silence is better than noise and said Copilot says nothing in 29% of reviews[^15]. At launch, Cursor's Bugbot analyzed the diff 8 times in shuffled order, filtered by majority vote, and then ran a validator model once more. That does not mean comments only decrease. Cursor's findings per run rose from 0.4 to 0.7[^9]. This reads as saying that you have to be able to filter well before you can say more. Producing comments is already easy, and the effort is going into deciding what not to say.

So one thing seems clear. Lint ends at pass or fail, but a bot's comment only ends when a person reads it and judges whether it is right. Even when the comment is right, that judgment takes attention. I had been building guardrails to save limited attention, and my bot was spending that attention again on every PR. I had not applied to my own bot the test of asking first whether something is worth paging a person for.

## The cost of earning trust

Trying to solve this makes the bot more and more complex. At first you imagine a general-purpose bot that looks at every repository. Frontend, backend, and data have different critical checkpoints, so you split it by area. Even within frontend, each service has a different architecture and core logic, so you specialize again per service. On top of that come model and prompt changes, maintaining evaluation data, and people to operate it.

Public cases from large companies look similar. When the useful rate of AutoCommenter, which flags coding practice violations, plateaued at 54%, Google gathered 15 developers as raters and re-evaluated its comments. After identifying 17 guideline document URLs linked to comments that were hard to act on and excluding those comments, the useful rate recomputed from past developer feedback became 66%[^8]. Cursor ran 40 major experiments while taking Bugbot to version 11[^9]. More effort seems to go into pruning and evaluating comments than into producing them.

Here a doubt arises. For that much effort, would it not be more economical to build out guardrails well, such as lint, static analysis, tests, and required approvals? It is a doubt I arrived at through building several tools.

Build versus buy is a question of the same cost. For general-purpose review, I think a commercial tool with a dedicated organization behind it is likely to have the advantage. On the other hand, if code cannot leave the company or the verification has to be tailored to a specific service, there is a reason to build. I think rebuilding the general features of a commercial tool and solving a problem that can only be solved internally should be kept apart.

Look closely at this cost and a large part of it is the cost of getting other people to trust and read. The evaluation system, false-positive management, and feedback collection are all needed because I want others to read what the bot says. When what it says is wrong, what is lost is not tokens but colleagues' time and their trust in the bot.

## What attention leaves behind

So far this has been about how to use less of people's attention. But attention sometimes leaves nothing behind once spent, and sometimes leaves something. Time spent checking whether a trivial comment is right is gone once that judgment is made. Time spent understanding a colleague's code and asking about the design intent may produce a person who can judge that code next time.

This distinction does not divide people from bots. A person can also spend a colleague's time on trivial findings, and a bot's explanation can help someone understand code. The question is where limited attention is spent and what it leaves behind.

At first I was afraid of my ignorance being exposed, but over time I learned that review is more than evaluation. The person being reviewed learns, and so does the person reviewing. In the process of explaining what the reviewer misunderstood, the reviewer gains knowledge, and in explaining why it was implemented that way, the author revisits their own judgment.

Code review also carried a long-term hope. If the colleague reading my code now understands the implementation, some day that person can change this code too. When there is an incident, the problem can be solved without me. As such experiences accumulate, it becomes more likely that there is one more person who can take charge of that code.

Research also treats knowledge transfer as a value of review. Bacchelli and Bird's study of Microsoft found 12 comments, out of 570, that supported learning by pointing to things like external documentation, and presented them as additional evidence for the importance of knowledge transfer[^16]. That figure is not the share of reviews in which learning happened. What someone learned in the course of reading code and asking questions is hard to know from classifying comments.

Rigby and Bird's study reported that when reviews are included, the number of files a developer is counted as knowing was 66% to 150% higher, depending on the project, than when counting only edit history. Knowing here means having edited or reviewed the file[^17]. The 33% and 67% above are also indirect evidence that useful comments increase as familiarity with the code grows. But such records cannot confirm whether someone became able to change that code alone or resolve an incident in it.

So the claim that review increases the number of people who can take responsibility for code is closer to something I believe from experience than a measured fact. Even so, it is a belief I find hard to put down.

### People who will take responsibility for the code

AI may explain better than a person or find more bugs. But explaining code to an AI does not create one more colleague in the organization who will take responsibility for that code. When a person leaves a wrong review, the two can talk and correct the next judgment, but correcting an AI's wrong review becomes a separate job of adjusting prompts or the evaluation system.

The precision problem described earlier may shrink as models improve. But I think a model getting better at flagging issues and more people knowing this code are different things. Atlassian reported that PRs with RovoDev comments had a median cycle time 30.8% shorter than PRs without, and that human comments per PR fell by 35.6%[^7]. The paper treats these as positive effects. It probably means reviewers got time back, but the explanations that used to pass between people may have decreased as well, so my feelings about it are a little mixed. There is no way to know whether the time saved was spent again on understanding colleagues' code.

It gets harder when AI writes the code. The learning described above assumes both sides are people. If you ask the author why it was implemented that way and [the answer is that the AI made it this way](/2026/02/frontend-engineering-in-ai-era), the step of revisiting one's own judgment while explaining disappears.

The most fundamental question in code review is probably whether it is all right to ship this code to the real service. The fact that an AI reviewed a change does not settle who is responsible for its consequences. Someone still has to decide to deploy, fix it when something goes wrong, and keep looking after the service afterwards. And such a person does not appear overnight. They are formed by reading other people's code, learning the background of designs, and taking part in judgments. I covered this at more length in [another post](/2026/06/learning-what-ai-cant-do).

## A personal compromise

My bot was not read much when I kept it as an auxiliary tool. Yet it was hard to turn comments whose effect I had not confirmed into a required check. So I decided to filter once myself before anything reaches a colleague. I now use a bot narrowed to a specific service only for my own reviews. The bot does not comment on PRs directly. It is a personal compromise in which I check first what I am going to ask a colleague to read. Looking back, I have returned to something close to the dashboard I built first. Back then I removed the step of reading and reposting because it was tedious, and now I go through that step on purpose.

I fixed the order. I read the code and review it first. Then I run the bot and compare it with my review. Where they disagree, I think again and have the bot look again too[^18]. Whichever side a finding came from, I check the evidence and then leave the comment under my own name. Agreement alone is not treated as proof. Both could miss the same thing or be wrong together[^19]. The earlier point that the reviewer is also being evaluated does not change with a bot. When something I sent to a colleague turns out to be wrong, I am the one who has to explain.

Checking the evidence was also necessary in the [number-flow experiment](/2026/11/number-flow-blind-agents) mentioned earlier. An agent flagged a compatibility problem in my fork v0.2.1, which I made to support older browsers. The `useCanAnimate` hook used `MediaQueryList.addEventListener`, which some older browsers lack, with no fallback path. I confirmed the defect from the source and by reproducing it in an environment with that API removed. It was not a run on an actual old device, but it confirmed the call path I had missed. I think one should be able to explain, like this, the conditions under which a finding holds and the scope of what was verified.

Done this way, a wrong finding ends when I discard it, and no feedback survey is needed. What a colleague receives is a person's comment, so the reason to respond stays intact, and the conversation of explaining and learning continues between people.

What is lost is clear too. Reading first, running the bot, comparing, and looking again where they disagree takes more time. It spends more of my attention in exchange for saving my colleagues'. And my reading more carefully does not increase my colleagues' understanding along with it, so understanding of the code may end up concentrated in me alone.

### Why I have not rolled it out to the team

This is also why I have not rolled this bot out to the team. I have never measured how well I filter out wrong findings, and I have not confirmed that the procedure of reading first and then comparing improves judgment. The step where I think again may amount to nothing more than defending my first judgment[^20]. An impression that it helps when I use it alone is not enough to recommend the same procedure to others.

Thanks to AI we can write more code and leave more reviews, and I work that way every day. For now I think the right approach is to move what a machine can judge into guardrails, and for the remaining area, to have a person read and judge first and then compare with the bot. What I still do not know is whether, in the meantime, the number of people who understand the code is growing too.

As a junior it was hard because I feared being caught not knowing, and as a lead because I feared not being able to explain. Now I hesitate because I fear damaging my colleagues' attention. Code review is still hard, and so for now the bot speaks only to me.

[^1]: [Code Reviews Do Not Find Bugs: How the Current Code Review Best Practice Slows Us Down](https://microsoft.com/en-us/research/wp-content/uploads/2015/05/PID3556473.pdf) (ICSE 2015). It is a two-page talk abstract, so the methodology is not available.

[^2]: [Does code review really remove coding convention violations?](https://discovery.ucl.ac.uk/10110634/1/scam20.pdf) (SCAM 2020). Only review requests in which violations disappeared were examined, so the share that was pointed out but not addressed is unknown.

[^3]: [Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/), Site Reliability Engineering. It is a principle for on-call paging, and applying it to code review is my own analogy.

[^4]: [AI coding assistants increase developer output, but not company productivity](https://www.faros.ai/blog/ai-software-engineering) (2025). Data from 1,255 teams and more than 10,000 developers. It comes from a company that sells analytics tools, and it is a correlation.

[^5]: [Impact of LLM-based Review Comment Generation in Practice: A Mixed Open-/Closed-source User Study](https://arxiv.org/abs/2411.07091) (2024). It covered more than 587 patch reviews.

[^6]: [Does AI Code Review Lead to Code Changes? A Case Study of GitHub Actions](https://arxiv.org/abs/2508.18771v2) (published 2025, revised 2026). More than 22,000 comments left by 16 tools were collected from 178 repositories. The rates in the table are the Table IX values for the 4 tools analyzed in detail. The subjects are open source Actions, so it is hard to apply directly to current commercial tools.

[^7]: [RovoDev Code Reviewer: A Large-Scale Online Evaluation of LLM-based Code Review Automation at Atlassian](https://arxiv.org/abs/2601.01129) (2026). The original values are 38.70% and 44.45%, for a one-week window in July 2025. It is an observational study, so causation cannot be claimed, and I could not confirm whether resolving comments was a condition for merging.

[^8]: [AI-Assisted Assessment of Coding Practices in Modern Code Review](https://arxiv.org/abs/2405.13565) (2024). The 54% and 66% are based on developer feedback, the rates before and after excluding past comments linked to specific URLs. The same recomputation based on raters gives 60% and 74%. The target for broad rollout was 80%.

[^9]: [Building a better Bugbot](https://cursor.com/blog/building-bugbot), Cursor (2026). These are the company's own figures, and the judge for the resolution rate is an LLM.

[^10]: [Bringing Code Review to Claude Code](https://claude.com/blog/code-review), Anthropic (March 2026). The company's own figure.

[^11]: [How to Make LLMs Shut Up](https://www.greptile.com/blog/make-llms-shut-up), Greptile (December 2024). The company's own figures.

[^12]: [Scaling Static Analyses at Facebook](https://discovery.ucl.ac.uk/10084236/1/O%27Hearn%20AAM%20scaling-static-analysis-at-facebook.pdf) (CACM 2019, author manuscript). The authors put the false-positive rate of the nightly batch at under 20%. It is a case report, not a controlled experiment, and the reason developers gave was context switching.

[^13]: [Modern Code Review: A Case Study at Google](https://sback.it/publications/icse2018seip.pdf) (ICSE SEIP 2018)

[^14]: [Tricorder: Building a Program Analysis Ecosystem](https://www.cs.umd.edu/class/spring2019/cmsc414/papers/tricorder-building-a-program-analysis-ecosystem.pdf) (ICSE 2015)

[^15]: [60 million Copilot code reviews and counting](https://github.blog/ai-and-ml/github-copilot/60-million-copilot-code-reviews-and-counting/), GitHub (March 2026). The company's own figures.

[^16]: [Expectations, Outcomes, and Challenges of Modern Code Review](https://sback.it/publications/icse2013.pdf) (ICSE 2013). The authors wrote that knowledge transfer is an area that is hard to quantify.

[^17]: [Convergent Contemporary Software Peer Review Practices](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/rigby2013convergent.pdf) (ESEC/FSE 2013). The figures compare per-project medians, and the authors also described it as a preliminary measurement.

[^18]: A practice with a similar structure is double reading in breast cancer screening. Two readers mostly read independently, and when their results differ, a third reader arbitrates or the two reach consensus ([the evidence document on double reading from the European breast cancer screening guidelines](https://cancer-screening-and-care.jrc.ec.europa.eu/sites/default/files/Guidelines/EtDs/ECIBC_GLs_EtD_double_reading.pdf)). In my procedure the arbiter is myself, so independence is weak, and the cost of a miss is not comparable either.

[^19]: I could not find a study that measured, in code review, how much human and LLM errors overlap. In [Correlated Errors in Large Language Models](https://proceedings.mlr.press/v267/kim25e.html) (ICML 2025), which compared more than 350 LLMs, when two models were both wrong on one dataset they gave the same answer 60% of the time. In [Automation Bias in Mammography](https://pubmed.ncbi.nlm.nih.gov/37129490/) (Radiology 2023), with 27 radiologists, even very experienced radiologists had accuracy of 82.3% when the AI suggestion was correct and 45.5% when it was wrong. Both figures are from the abstracts, and neither is a code review experiment.

[^20]: I could not find a study that validated this procedure in code review. A nearby case is [Who Goes First? Influences of Human-AI Workflow on Decision Making in Clinical Imaging](https://arxiv.org/abs/2205.09696) (FAccT 2022), in which 19 veterinary radiologists took part. The final diagnosis agreed with the AI in 89% of cases when a provisional diagnosis was registered first and in 91% when the AI was shown from the start (p=0.04). Participants in the register-first condition rarely revised their provisional diagnosis even when it disagreed with the AI. It cannot be taken as evidence that the same effect exists in code review.
