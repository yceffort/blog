---
title: '<em>AI</em> Only Amplifies Me to the Level I Can See'
tags:
  - essay
  - ai
  - learning
  - career
  - productivity
  - code-quality
published: true
date: 2026-04-20 12:00:00
description: "I'm definitely coding faster, but why are my codebase and skills staying the same? Examining the gap between perceived and proven benefits."
---

## Table of Contents

## TL;DR

- **Productivity is conditional.** Evidence points both ways - some show acceleration, others show deceleration. Task characteristics, skill level, and codebase maturity determine the direction.
- **Quality, security, and technical debt are largely negative.** Defects accumulate, and developers tend to underestimate them.
- **The root of this divergence is simple: AI amplifies a developer's judgment standards.** When you have standards, speed increases. When you don't, unvalidated code piles up. That's why studying remains necessary - more so than ever.

## The Gap Between Perception and Evidence

Since AI coding tools swept through the industry, two statements have circulated among developers: "Code gets written much faster" and "But the codebase seems to be getting worse." Often both come from the same person. This article examines that disconnect.

One sentence runs through this entire piece:

> **AI only amplifies developers to the level they can already judge - the "visible level."**

This isn't an argument against using AI. It's a characteristic that multiple studies repeatedly point to. Use it unknowingly, and debt quietly accumulates. Use it knowingly, and you can selectively capture the tool's benefits. What determines this divide is the developer's own judgment standards - the studying they've built up over time. Below, I'll organize public data across three areas: (1) productivity, (2) quality & security, and (3) technical debt, then add personal observations at the end.

## Evidence 1: Productivity Measurement Results Don't Point One Way

### Positive Results: GitHub, Accenture, Zoominfo

The most frequently cited numbers come from a [randomized controlled trial (RCT) published by GitHub and MSR/Microsoft in 2022](https://arxiv.org/abs/2302.06590). They had 95 developers implement HTTP servers in JavaScript, comparing groups that used Copilot versus those that didn't.

- Copilot group average completion time: **1 hour 11 minutes**.
- Control group average completion time: **2 hours 41 minutes**.
- Speed improvement: **55.8%**, p=0.0017, 95% confidence interval [21%, 89%].
- Subjective metrics showed "maintained flow state (73%)" and "reduced cognitive load on repetitive tasks (87%)."
- Groups with the biggest gains: **developers with less programming experience and those who code more hours per day**.

This study's limitation lies in its experimental design. The task involved writing an HTTP server from scratch in a new file, with average work times of 1-2 hours. There were no existing codebase constraints. Simply put, these were the most favorable conditions for AI. While this "55%" has been cited most frequently over the past three years, follow-up studies at the same scale are rare. There's been ongoing criticism of using this number as a general metric without specifying it as task-specific results.

A follow-up [enterprise environment RCT by Accenture and GitHub in 2024](https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-in-the-enterprise-with-accenture/) used 450 developers as the experimental group and 200 as controls.

- PR count **+8.69%**.
- PR merge rate **+15%**.
- Successful builds **+84%**.
- Satisfaction: 90% were "more satisfied with work," 91% found "coding more enjoyable."
- **Over 80%** of participants successfully adopted the tool, with **67%** using it 5+ days per week (average 3.4 days per week).

This study also has methodological points to consider. Most metrics measure **how much code gets submitted** - throughput indicators like "PR count" and "merge count" - but don't show how long that merged code survives long-term. Critics pointed out that increased throughput and improved long-term quality are different questions.

[Zoominfo's 400-person enterprise case study published in 2025](https://arxiv.org/abs/2501.13282) compiled numbers from actual development environments rather than controlled labs.

- Suggestion acceptance rate: **33%**.
- Line-level acceptance rate: **20%**.
- Developer-perceived time savings: approximately **20%**.
- Satisfaction score: **72%**.
- During the study period, Copilot contributed hundreds of thousands of lines.
- Adoption wasn't full rollout but gradual across 4 phases.
- Key limitations identified: "struggles with domain-specific logic," "inconsistent code quality."

What stands out in Zoominfo's case is the surprisingly low acceptance rate. **67% of suggestions get rejected** - a number that's closer to real-world usage patterns than lab RCTs.

### Negative or Neutral Results: Uplevel, METR

There are results pointing the other way. [Uplevel Data Labs' 2024 field observation report](https://visualstudiomagazine.com/articles/2024/09/17/another-report-weighs-in-on-github-copilot-dev-productivity.aspx) examined objective metrics (cycle time, PR throughput, bug rates, overtime hours, etc.) for about 800 developers at their client companies.

- Cycle time, PR throughput: **No significant difference** between Copilot and control groups.
- Bug rate: **Significantly increased** in the Copilot group.
- Burnout indicators ("Sustained Always On"): Decreased in both groups.

Uplevel interpreted this as "Copilot may negatively impact code quality." The measurement period was about 3 months, with developers doing their usual daily work. This is closer to a **long-term field observation design** rather than controlled lab tasks. The reason for different direction from GitHub 2022's +55% spans both task characteristics and observation period.

METR's [randomized controlled trial (RCT) published in July 2025](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) gave 246 issues to 16 experienced open-source maintainers, randomly allowing or blocking AI use per issue. Tools were mainly Cursor Pro + Claude 3.5/3.7 Sonnet, working on old repositories the participants normally maintained.

- Developer pre-prediction: AI would make them **24% faster**.
- Developer post-completion self-assessment: **20% faster**.
- Actual measurement: **19% slower** (confidence interval +2%~+39%).

They felt 20% faster but were actually 19% slower. Even after completing tasks, developers still thought they had gotten faster.

METR's [February 2026 update](https://metr.org/blog/2026-02-24-uplift-update/) provided different numbers:

- 10 returning participants from the original experiment: **18% faster** with AI (confidence interval -38% ~ +9%).
- 47 newly recruited participants: **4% faster** (confidence interval -15% ~ +9%).

METR also warns of possible selection bias, explaining that "the same developers likely improved their AI handling skills over the year."

### The Picture from Stack Overflow Surveys

The [2024 Stack Overflow Developer Survey — AI](https://survey.stackoverflow.co/2024/ai), a self-report survey of tens of thousands of developers worldwide, produced these numbers:

- Using/planning to use AI tools: **76%**.
- Trust AI output accuracy: **43%**.
- "AI is bad for complex tasks": **45%**.

A year later, the [2025 Stack Overflow Developer Survey](https://survey.stackoverflow.co/2025/ai) showed these changes:

- Using/planning to use AI: **84%** (+8%p).
- Trust AI output accuracy: **29%** (-14%p).
- "Distrust" AI accuracy: **46%** (+15%p).
- Experienced "AI answers mostly right but critically wrong": **66%**.
- "Debugging AI code takes longer than writing from scratch": **45%**.
- Positive sentiment: 77%(2023) → 72%(2024) → 60%(2025).

In summary, **usage increases while trust decreases** - a trend that continued throughout 2024-2025.

### Why Results Diverge

The studies above don't contradict each other. They simply show different intersections of two axes: the judgment requirements of tasks and users' judgment standards.

**Task axis.** Writing an HTTP server in a new file (GitHub 2022) versus fixing issues in old repositories with context (METR 2025) require different amounts of judgment from AI. The former has short requirements and no surrounding code constraints, so AI can complete it almost alone. The latter requires working within existing structures and edge cases, where users must already know where to intervene.

**Skill axis.** The group that benefited most in GitHub 2022 was "developers with less experience." This seems to contradict this article's thesis that "you need judgment standards for AI to amplify well." But in formalized, narrow tasks, novices' judgment gaps don't get exposed because there's little room for judgment anyway. The task doesn't require much judgment to begin with. In contrast, METR 2025's old repository tasks were conditions where the presence or absence of judgment standards emerged as a key variable, and even skilled developers recorded -19%. The two results are different sides of the same mechanism.

**Measurement metrics axis.** There's a structural difference between self-reports (Zoominfo, Stack Overflow) and objective measurements (METR, Uplevel). Even the GitHub 2022 study showed divergence between subjective and objective metrics.

Ultimately, it's not a single proposition of "AI makes you faster/slower," but a conditional proposition where task judgment requirements intersect with user judgment standards. When high judgment requirements combine with shallow judgment standards, the quality, security, and debt results we'll see next start to emerge in earnest.

## Evidence 2: Patterns That Repeatedly Emerge in Quality and Security

Unlike productivity, quality and security research results consistently lean in one direction.

### Asleep at the Keyboard (Pearce et al., NYU)

[This academic empirical study by Pearce et al. in 2021](https://arxiv.org/abs/2108.09293) was the first representative paper to examine Copilot's security characteristics.

- Design: Based on MITRE "Top 25" CWE (Common Weakness Enumeration), they created 89 scenarios and asked Copilot to generate code.
- Programs generated: **1,689**.
- Results: **About 40% were vulnerable**.

"Vulnerable" here means reproducing defect patterns defined in CWE. This paper was later published in IEEE S&P 2022 and Communications of the ACM. The authors particularly emphasized that Copilot follows the context of users' surrounding code. If surrounding code already has security defect patterns, Copilot inherits and recommends those patterns. In vulnerable codebases, AI amplifies those vulnerabilities.

### Stanford "Do Users Write More Insecure Code with AI Assistants?"

[Perry et al.'s Stanford controlled experiment (2022, arXiv:2211.03622)](https://arxiv.org/abs/2211.03622) shifted focus. Instead of AI itself, they looked at output from "people who used AI."

- 47 participants, three languages, five security-related tasks.
- Half used AI assistance, the rest used only editors.
- Results: The AI group created more security vulnerabilities. Differences were especially pronounced in string encryption and SQL injection.
- Psychology side: The AI group believed their code was more secure.

Actual security levels decreased while subjective confidence increased. The two directions were opposite.

### ACM TOSEM 2024: Copilot Snippets in Public Repositories

[A follow-up academic empirical study published in ACM TOSEM](https://dl.acm.org/doi/10.1145/3716848) collected 733 snippets identified as Copilot-generated from public GitHub projects and ran static analysis.

- Analysis languages: Primarily Python and JavaScript.
- Results: **29.8%** of snippets had security defects corresponding to CWE.
- By language: Python 29.5%, JavaScript 24.2%.

### Apiiro 2025: Enterprise-Scale Field Observations

Security platform vendor [Apiiro's 2025 field observation report](https://apiiro.com/blog/4x-velocity-10x-vulnerabilities-ai-coding-assistants-are-shipping-more-risks/) used their proprietary Deep Code Analysis engine to scan tens of thousands of repositories and thousands of developers at Fortune 50 companies. Keep in mind these numbers are based on the vendor's own standards.

- Commit count for developers using AI: Average **3-4x increase**.
- Commit distribution: Shifted toward **massive PRs** bundled together rather than many small commits.
- Vulnerabilities: privilege escalation paths **+322%**, design flaws **+153%**, cloud credential exposure **roughly 2x** (based on Azure Service Principals and Storage Access Keys).
- Data exposure: repositories containing PII/payment data **3x**, APIs missing permission checks **10x**.
- Timeline: Security issues newly caught in AI-generated code **10x** more in June 2025 vs December 2024.

Apiiro summarized this as "problems shifting from shallow syntax errors to deep architectural flaws." Shallow bugs get caught by linters and tests, but architectural flaws have virtually only humans to catch them. This direction aligns with GitClear and Sonar results we'll see later, but specific magnitudes like 322% and 10x depend on Apiiro's proprietary measurement standards. However, considering that defect rates across four studies fall in the 24-40% range, and Stanford's reported tendency for "AI users to believe their code is more secure," it's hard to support expectations that "better models will naturally solve this."

## Evidence 3: Signals of Technical Debt Accumulation

### GitClear: 5-Year Longitudinal Data

Commit analysis tool vendor [GitClear's 2025 longitudinal analysis report](https://www.gitclear.com/ai_assistant_code_quality_2025_research) tracked 211 million lines of code changes from 2020 to 2024.

- Lines classified as **refactoring**: 25% in 2021 → **under 10%** in 2024.
- Duplicate code classified as **copy/paste**: 8.3% in 2020 → **12.3%** in 2024.
- Absolute number of duplicate blocks: **About 8x surge** in 2024 compared to previous year.
- Churn code **modified again within 2 weeks** after merge: 5.5% in 2020 → **7.9%** in 2024.

GitClear summarized this trend as "incoming code becoming increasingly disposable."

### DORA 2024 → 2025: What Changed and What Stayed

Google's DORA reports measure software delivery performance annually based on surveys of thousands of developers.

Key numbers from the [2024 report](https://cloud.google.com/blog/products/devops-sre/announcing-the-2024-dora-report):

- For every 25% increase in AI adoption: individual productivity **+2.1%**, job satisfaction **+2.6%**.
- Team-level delivery throughput **-1.5%**.
- Delivery stability **-7.2%**.
- "Don't trust" AI-generated code: **39%**.

In the [2025 report](https://dora.dev/research/2025/dora-report/), some metrics flipped while others remained:

- AI adoption rate: **90%**.
- "Heavy reliance" usage: **65%**.
- Feel productivity increased: **80%+**.
- Throughput: Reversed to **positive correlation** with AI adoption (was negative last year).
- Stability: Still **negative correlation** with AI adoption.

DORA summarizes this as:

> "AI doesn't fix a team; it amplifies what's already there."

DORA's "AI amplification conditions" are classic software engineering fundamentals: platform engineering, automated testing, short feedback loops, and value stream management (VSM). Teams that introduce AI without these conditions see results skewing toward worse stability.

### Sonar 2025: Direct Developer Responses

Static analysis tool vendor [Sonar's State of Code Developer Survey 2025](https://www.sonarsource.com/state-of-code-developer-survey-report.pdf) - a developer self-report survey - produced these numbers:

- "AI creates unnecessary or duplicate code, **increasing technical debt**": **40%**.
- "AI had **one or more negative impacts** on project technical debt": **88%**.
- Top three cited side effects: increased duplicate/similar code, harder-to-read code, introducing patterns that don't fit context.

However, the "one or more negative impacts" question is comprehensive, so the 88% figure doesn't directly indicate defect severity. Still, Sonar calls this the "great toil shift." Work weight moves from the coding side to the maintenance side.

### arXiv 2603.28592: Direct Analysis of 300K AI Commits

[Debt Behind the AI Boom: A Large-Scale Empirical Study of AI-Generated Code in the Wild](https://arxiv.org/abs/2603.28592), published on arXiv in 2026, is the largest commit-level study to date.

- Analysis target: **6,275** public GitHub repositories.
- AI-authored commits collected: **304,362**.
- Target tools: GitHub Copilot, Claude, Cursor, Gemini, Devin (10K+ commits each).
- Total issues caught: **484,606**.
- Code smell proportion: **89.1%**.
- Common pattern across all five tools: 15%+ of commits introduce one or more new issues.
- Proportion surviving to latest revision: **24.2%**.

That last number is the most practically significant. About a quarter of issues introduced by AI remain undiscovered or unfixed over time. Recently, this is being discussed as "comprehension debt." When no one originally wrote that code directly, the cost of opening and understanding it doesn't become reason enough to fix it while setting aside other work. Refactoring proportion decreases, duplicate code and churn increase, stability maintains negative correlation, and issues that enter once stay. Deployment volume increases while maintainability decreases.

## The Observation That Only the Visible Level Gets Amplified

When you put results from all three areas together, they seem contradictory on the surface. Productivity goes up or down depending on conditions, quality is consistently bad in one direction, and debt accumulates. But there's the same mechanism behind this divergence.

> AI amplifies the judgment standards developers already have. In areas where standards exist, it multiplies speed. In areas without standards, it pours out unvalidated code as-is.

What DORA said at the team level - "AI doesn't fix, it amplifies" - applies to individuals too. Stanford's AI users believing their code was more secure, METR's skilled developers misjudging their own time, and Stack Overflow's usage rates and trust levels going in opposite directions all meet at the point of not seeing the boundaries of one's own judgment standards.

## Personal Observations

From this point on, this isn't empirical measurement but subjective observation. As I've been using AI coding tools daily and talking with fellow developers, I often find that the direction these data points indicate aligns closely with my own sense of things.

First, there's a feeling that product release speed and product quality move in opposite directions. AI makes development faster, shortening release cycles, but the products that ship this way often seem rough around the edges. In frontend development, customers ultimately pay this price. I've noticeably seen more interfaces with janky interactions, broken consistency, and poor accessibility. Yet the industry-wide demand remains "ship faster." It's unclear who will maintain quality in this gap.

I've repeatedly witnessed junior developers losing opportunities to think deeply. During code reviews, I encounter PRs with clean implementations, but when I ask "why did you write it this way?" no answer comes. It's obvious they read an AI response and submitted it as-is. The pressure to keep up with fast cycles reduces time to directly design problems, get stuck, and rewrite solutions. The insights that come from forming hypotheses and being wrong don't accumulate. [Research from Anthropic in 2026](https://www.anthropic.com/research/AI-assistance-coding-skills) shows this intuition in numbers. In an experiment learning a new library, the group allowed to use AI averaged 50% on comprehension tests, while the group that coded from scratch averaged 67%. Within the AI group, those who completely delegated code generation scored below 40%, while those who used AI only for conceptual questions scored above 65%. The AI group completed tasks about 2 minutes faster, but this wasn't statistically significant. Productivity barely improved while learning decreased. Anthropic calls this difference "cognitive engagement vs. cognitive offloading." The former involves solving problems with your own mind and using AI only for explanations or hints; the latter delegates problem-solving entirely to AI and just takes the results. Even with the same tool, how you hold it determines what remains in your head.

As codebases grow, the areas AI can't properly see also expand. In structures spanning hundreds of files and multiple services, AI only looks around the given files. It focuses on the feature that needs to be added but doesn't touch the debt areas right next door. Sometimes it creates code that avoids that debt, leaving the original debt untouched while building new workaround logic. This pattern shows up frequently in reviews. The modified files are clean, but duplication or strange state management in adjacent files remains untouched. Features get added but the codebase becomes slightly more tangled.

The weaknesses in code I didn't write myself are also less visible. With code I typed, I have a sense of where things are precarious. I run tests more thoroughly on those parts and explain them once more during reviews. But with AI-written code, if it reads fine, I tend to submit it as-is. When linting and tests pass, "looks good" becomes the default. There's another layer to this: delegating PR reviews of AI-written code to the same AI model. When the author and validator are the same model, their blind spots are also the same. The range of missed defects overlaps perfectly, but the PR only shows the signal "AI checked it, so it's fine." The tendency Stanford reported about "believing your own code is more secure" happens simultaneously for both author and reviewer. The sense that undetected debt accumulates only in numbers aligns exactly with the 24.2% persistence rate from arXiv 2603.28592 mentioned earlier.

Looking at these scenarios together, the question we should be asking isn't "how fast can we generate code with AI" but "where should we redirect the time that speed has freed up." Tools getting faster doesn't make my judgment faster too.

## So Learning Is Still Necessary

For the above observation to become an argument rather than just a statement, "so what should we do" must be clear. My answer is learning. There are three reasons.

First, the range where I can name problems is the ceiling of AI utility. If I throw "fix the performance issues" at the same AI, it doesn't know what to touch and just spends time browsing the codebase before giving up. But if I narrow it down to "fix the performance issue caused by bundle bloat from dependency duplication," it quickly arrives at root cause identification and fixes. "Fix the issue showing up in Sentry" produces much less useful results than "fix the concurrency issue on this screen." That specificity comes from my ability to diagnose problems as "dependency duplication" or "concurrency issues." The resolution of instructions determines the resolution of results, and that resolution comes from the range of names I can assign. Problems I can't recognize are hard to ask AI about precisely and hard to properly validate when results come back. When I stop, AI utility's ceiling also stops there.

The final line of defense against debt is also the judgment of the person reading the code. The number that 24.2% of issues introduced by AI survive without being fixed (arXiv 2603.28592) means defects exist in reality that linters, tests, and CI all miss. The only final mechanism that can catch these is the one person reading that code at PR time. The power to break the tendency for AI users to overconfident in their own code, as Stanford found, also comes from knowledge and the habits of suspicion built on top of it.

Finally, learning compounds. When METR re-ran the same experiment with the same 10 developers a year later and saw movement from -19% to +18%, METR itself interprets this as "participants' AI usage proficiency accumulated." This means changes occurred only on the human side during a period when there were no major changes on the model side. The opposite direction can unfold at similar speed. Since it's a difference made by small daily accumulations rather than one big resolution, it's not easy to make up for missed periods in a rush.

This isn't the time to marvel at yourself for rapidly churning out deliverables with AI. The gap between METR's measured subjective +20% versus actual -19% points exactly here. When the feeling of "I produced this much today" is strongest, actual code quality and my growth are likely moving in the opposite direction.

So "where to spend the speed gained from AI" becomes the next question. The common answer these days is parallelization. Open multiple AI sessions to work on multiple tasks simultaneously. Short-term output definitely increases, but none of the three axes above grow. Instructions become rougher, validation becomes shallower, and learning gets postponed. The opposite direction is "less but deeper." Focus on one or two tasks, doubt AI-generated results once more, directly examine structure and edge cases, and when unknown areas emerge, study just those parts separately. Spending the same time, this approach provides input to all three axes. What remains for individuals long-term is also this side.

The three don't move separately. When instruction accuracy rises, validation becomes easier; when validation becomes easier, learning accelerates; when learning compounds, the ceiling opens. If even one axis crumbles, the rest gets pushed along. There are limits to waiting for organizational-level improvements. The most realistic lever individuals can grab right now is learning.

## Conclusion

The materials I've examined so far haven't all leaned one way. Evidence that "AI is fast" and evidence that "AI makes things slower" came out together in the same year. Only quality and security consistently show negative results, while technical debt indicators have only recently started aligning in the same direction. In that sense, it might be too early to draw conclusions.

Still, one thing emerges repeatedly from the middle of this contradiction: AI doesn't replace my level. Tools amplify me only to the extent of my knowledge, and in areas I don't understand, they just pile up unvalidated code. There are only three responses individuals can grab immediately: changing tools, changing processes, or expanding judgment criteria themselves. The first two require organizational movement, which is slow. The last one is the lever I can grab right now.

The remaining question is one line:

> **Where are the boundaries of my judgment criteria, and who is expanding those boundaries right now?**

Only the developer themselves can answer this question. The answer is still learning.

## References

### Productivity Measurement — Positive Results

- [The Impact of AI on Developer Productivity: Evidence from GitHub Copilot — Peng et al., 2023 (arXiv:2302.06590)](https://arxiv.org/abs/2302.06590)
- [Research: quantifying GitHub Copilot's impact on developer productivity and happiness — GitHub, 2022](https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/)
- [Research: Quantifying GitHub Copilot's impact in the enterprise with Accenture — GitHub, 2024](https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-in-the-enterprise-with-accenture/)
- [Experience with GitHub Copilot for Developer Productivity at Zoominfo — 2025 (arXiv:2501.13282)](https://arxiv.org/abs/2501.13282)

### Productivity Measurement — Neutral or Negative Results

- [Can Generative AI Improve Developer Productivity? — Uplevel Data Labs, 2024](https://visualstudiomagazine.com/articles/2024/09/17/another-report-weighs-in-on-github-copilot-dev-productivity.aspx)
- [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity — METR, 2025.07](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
- [We are Changing our Developer Productivity Experiment Design — METR, 2026.02](https://metr.org/blog/2026-02-24-uplift-update/)

### Developer Surveys

- [2024 Stack Overflow Developer Survey — AI section](https://survey.stackoverflow.co/2024/ai)
- [2025 Stack Overflow Developer Survey — AI section](https://survey.stackoverflow.co/2025/ai)
- [Developers remain willing but reluctant to use AI — Stack Overflow Blog, 2025.12](https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/)

### Quality & Security Empirical Research

- [Asleep at the Keyboard? Assessing the Security of GitHub Copilot's Code Contributions — Pearce et al., NYU, 2021 (arXiv:2108.09293)](https://arxiv.org/abs/2108.09293)
- [Do Users Write More Insecure Code with AI Assistants? — Perry et al., Stanford, 2022 (arXiv:2211.03622)](https://arxiv.org/abs/2211.03622)
- [Security Weaknesses of Copilot-Generated Code in GitHub Projects: An Empirical Study — ACM TOSEM, 2024](https://dl.acm.org/doi/10.1145/3716848)
- [4x Velocity, 10x Vulnerabilities: AI Coding Assistants Are Shipping More Risks — Apiiro, 2025.09](https://apiiro.com/blog/4x-velocity-10x-vulnerabilities-ai-coding-assistants-are-shipping-more-risks/)

### Technical Debt Observations

- [AI Copilot Code Quality: 2025 Data Suggests 4x Growth in Code Clones — GitClear, 2025](https://www.gitclear.com/ai_assistant_code_quality_2025_research)
- [Announcing the 2024 DORA Report — Google Cloud, 2024](https://cloud.google.com/blog/products/devops-sre/announcing-the-2024-dora-report)
- [State of AI-assisted Software Development 2025 — DORA, 2025.12](https://dora.dev/research/2025/dora-report/)
- [State of Code Developer Survey 2025 — Sonar, 2025](https://www.sonarsource.com/state-of-code-developer-survey-report.pdf)
- [Debt Behind the AI Boom: A Large-Scale Empirical Study of AI-Generated Code in the Wild — arXiv:2603.28592, 2026](https://arxiv.org/abs/2603.28592)

### Learning and Cognition

- [How AI Assistance Impacts the Formation of Coding Skills — Anthropic Research, 2026](https://www.anthropic.com/research/AI-assistance-coding-skills)
