---
title: 'Why GitHub Actions Cron Jobs Run Late, and What to Use Instead'
tags:
  - devops
  - github
published: true
date: 2021-01-24 21:16:38
description: 'Why GitHub Actions scheduled workflows get delayed by dozens of minutes: the structural causes, and free alternatives that actually run on time.'
---

While running a cron job with the `schedule` trigger of GitHub Actions, I ran into executions being delayed by anywhere from dozens of minutes up to two hours. Digging into the cause, it turned out to be a structural limitation rather than a bug, and I eventually moved the job to Firebase Cloud Functions. Here's why this happens, why it's hard to fix, and what alternatives exist when you need on-time execution.

## The Problem

I was running a cron job with the `schedule` trigger of GitHub Actions.

```yaml
name: cron

on:
  schedule:
    - cron: '0 5 * * 1-5'

jobs:
  cron:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - uses: actions/setup-node@v1
        with:
          node-version: '12'
          check-latest: true

      - name: CI
        run: |
          npm ci
      - name: Run Cron
        run: |
          npm run job
```

It worked fine at first. But at some point, executions started running 40–50 minutes late, and a job scheduled for 00:00 UTC (09:00 KST) would sometimes only run two hours later.

![workflow-cron](./images/workflow-cron.png)

> A job scheduled for 00:00 actually ran at 02:30.

I wasn't the only one experiencing this.

- https://stackoverflow.com/questions/65132563/why-is-github-actions-workflow-scheduled-with-cron-not-triggering-at-the-right-t
- https://github.community/t/github-actions-on-schedule-executed-in-delay/152972

## Why It Doesn't Run on Time

The answer is in GitHub's official documentation.

> Note: The `schedule` event can be delayed during periods of high loads of GitHub Actions workflow runs. High load times include the start of every hour. If the load is sufficiently high enough, some queued jobs may be dropped.
>
> — [GitHub Docs: Events that trigger workflows](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule)

The docs are terse, so let me elaborate: the delay originates not in the runners but in **GitHub's internal job dispatch stage**. Delays occur even with self-hosted runners. [One case analysis](https://dev.to/devactivity/unpacking-github-actions-delays-when-self-hosted-runners-go-idle-but-workflows-stay-queued-547n) confirms this directly; to summarize:

- A workflow sat in the `queued` state for 7–8 minutes.
- Checking via the GitHub API, the runner was `online` and `idle`, with `runner_id=0` — meaning no runner had been assigned.
- The runner host's network was healthy, and connectivity to the GitHub Actions broker was fine.
- Conclusion: the delay wasn't a runner or network problem — it occurred in **GitHub's job dispatch or broker messaging stage**.

No matter how fast your runner is, execution can't start until GitHub sends the job over.

On top of this comes the top-of-the-hour congestion problem. The vast majority of repositories schedule their cron at the top of the hour (`:00`). The docs explicitly state that "high load times include the start of every hour." The dispatch queue floods every hour on the hour, and this delay keeps getting worse as GitHub Actions usage grows. According to [community reports](https://github.com/orgs/community/discussions/156282), average delays have grown from 9 minutes to 25–30 minutes within a span of months.

And this isn't just a free-plan problem. Nowhere in the official documentation is there any mention of an SLA for schedule execution timing on paid plans (Team, Enterprise). The schedule trigger is best-effort on every plan.

## Why It's Hard to Fix at the Root

GitHub Actions is a CI/CD platform. Its core value is reacting to code changes, not executing jobs at a fixed time. When the shared runner pool is under load, the question of whether push/PR events or schedule events get resources first answers itself, given the platform's reason for existence.

The fact that the delay occurs in GitHub's internal dispatch layer rather than the runners also makes the problem harder. That's why attaching a self-hosted runner doesn't help. Fixing it would require expanding the dispatch queue's processing capacity or building a dedicated path for scheduled events — changes to GitHub's infrastructure itself.

As an aside: back when I first wrote this post in 2021, the `schedule` trigger had no timezone support. It only worked in UTC, so you had to convert your cron expressions from Korean time by hand. That problem was solved when [the `timezone` field was added in March 2026](https://github.blog/changelog/2026-03-19-github-actions-late-march-2026-updates/).

```yaml
on:
  schedule:
    - cron: '30 5 * * 1-5'
      timezone: 'Asia/Seoul'
```

The timezone problem is solved, but the execution-timing accuracy problem remains. Ultimately, GitHub Actions' `schedule` is only suitable for jobs where "roughly around this time" is good enough. If you need on-time execution, you have to look elsewhere.

## Alternatives: Free Platforms That Run on Time

At the time, I moved to Firebase Cloud Functions.

```javascript
exports.cronJob = functions.pubsub
  .schedule('0 14 * * 1-5')
  .timeZone('Asia/Seoul')
  .onRun((_) => {
    job()
  })
```

You can set the timezone directly, and execution times were accurate. When you initialize with `firebase init`, the default directory is `./functions`, which you can change in `firebase.json`.

**firebase.json**

```json
{
  "functions": {
    "source": ".",
    "runtime": "nodejs12"
  }
}
```

![functions](./images/functions-cron.png)

Beyond Firebase, there are a few more options for running cron jobs.

| Platform                                                                                                  | Free tier                                               | Timezone  | Notes                                                                                                    |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| **[Firebase Cloud Functions](https://cloud.google.com/functions/pricing-1stgen)**                         | 2M invocations/month                                    | Supported | Backed by Google Cloud Scheduler. Requires the Blaze (pay-as-you-go) plan, but the free tier is generous |
| **[Google Cloud Scheduler](https://cloud.google.com/scheduler/pricing)**                                  | 3 free jobs per billing account                         | Supported | HTTP, Pub/Sub, and App Engine targets. Usable standalone without Firebase                                |
| **[Cloudflare Workers Cron Triggers](https://developers.cloudflare.com/workers/platform/cron-triggers/)** | Within the Workers free plan (shared 100k requests/day) | UTC only  | Runs inside Worker code. Practically no cold starts                                                      |
| **[Vercel Cron Jobs](https://vercel.com/docs/cron-jobs/usage-and-pricing)**                               | 100 per project on Hobby, once per day                  | UTC only  | ±59 minutes precision. Suited to low-frequency jobs where accuracy matters less                          |

Vercel Cron Jobs on the Hobby plan only run once per day with ±59 minutes precision, so in practice they share the same limitations as GitHub Actions' `schedule`. If you need on-time accuracy, Google Cloud Scheduler or Cloudflare Cron Triggers are the right fit.
