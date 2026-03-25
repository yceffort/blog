---
title: 'Why We Still Use Next.js'
tags:
  - nextjs
  - react
  - vercel
  - frontend
  - web
published: true
date: 2026-03-23 22:00:00
description: 'Switching costs stronger than technical superiority'
thumbnail: /thumbnails/2026/03/why-still-nextjs.png
series: 'Next.js의 현주소'
seriesOrder: 5
---

## Table of Contents

## Introduction

Here is a summary of what was covered across four posts in [this series](/2026/03/nextjs-edge-runtime-rise-and-fall).

- [Edge Runtime has retreated.](/2026/03/nextjs-edge-runtime-rise-and-fall) Vercel's promise of "running everything at the Edge" reverted to recommending the Node.js Runtime, and Next.js 16's `proxy` was designed as Node.js only.
- [Cloudflare started rebuilding Next.js from scratch.](/2026/03/why-cloudflare-rebuilt-nextjs) Due to undocumented build outputs and the private `minimalMode` flag, other platforms had to rely on reverse engineering to support Next.js. Cloudflare ultimately chose vinext, which reimplements the API surface on top of Vite.
- [React's governance is shaky.](/2026/03/react-is-whose) The core architects of RSC are Vercel employees, and new features are "stabilized" in Next.js first, only to be officially merged into React more than a year later. The React Foundation has launched, but the concrete structure of its technical governance has yet to be disclosed.
- [There is a structural gap in SSR performance.](/2026/03/is-nextjs-fast-enough) In the Platformatic benchmark, TanStack Start achieved 13ms/100% success while Next.js 16 canary showed 431ms/64% success. The dual-data architecture of RSC and the accumulated overhead of the framework layer are the causes.

Despite all these issues, Next.js maintains its dominant position. Even in survey-based metrics like [State of JavaScript 2025](https://2025.stateofjs.com/en-US/libraries/meta-frameworks/), Next.js ranks first in meta-framework usage, and its weekly npm downloads exceed four times that of second-place Nuxt[^1]. Even as satisfaction declines, adoption does not shrink.

Why? **The reason Next.js remains the default today is not because its runtime is fast, but because the cost of switching is too high.** Ecosystem, platform, hiring market, learning assets. What Vercel has built up creates switching costs. And those switching costs sustain Next.js.

What matters is that this structure creates both strengths and weaknesses simultaneously. Light and shadow do not come from different places. They emerge from the same design.

## The Path Dependence Vercel Designed

### The Ecosystem in Numbers

Let us start with the numbers. Next.js's weekly npm downloads sit at roughly 9 million — 4.5 times those of second-place Nuxt (roughly 2 million)[^1]. GitHub stars have surpassed 133k, more than double Nuxt's 56k. Over 60,000 questions carry the `[next.js]` tag on Stack Overflow[^2], which is not merely a popularity indicator but a measure of accumulated learning assets — the kind where "searching yields answers." The official examples directory alone contains over 400 templates[^3].

These metrics do not measure the same thing. What they collectively show, however, is that Next.js is less a framework being newly chosen and more the default with the most accumulated materials and case studies. TanStack Start and React Router v7 have not even entered this numbers game. TanStack Start's weekly npm downloads have yet to surpass 50,000, and while React Router's downloads as a router (14M weekly) are overwhelming, its adoption as a meta-framework in v7 is still in its early stages.

### Hiring Core Contributors

As discussed in [Part 3](/2026/03/react-is-whose), Vercel has hired key members of the React Core team. Sebastian Markbage (RSC architect) and Andrew Clark (React Fiber co-creator) are prime examples. This was not mere talent acquisition but the securing of structural influence over the direction of the technology.

This strategy was effective. RSC, Server Actions, `"use cache"` — the pattern of React's recent major features being first implemented and validated in Next.js before being reflected in React has become established. From a developer's perspective, Next.js is effectively the only framework where you can use the latest React features the fastest.

### Third-Party Ecosystem Alignment

Vercel's [integration marketplace](https://vercel.com/integrations) features major third-party services including CMS (Sanity, Contentful, Storyblok), authentication (Clerk, Auth0), databases (Neon, PlanetScale, Supabase), and analytics (Segment, Amplitude). These services prioritize offering official SDKs and plugins for Next.js.

Take [Sanity](https://www.sanity.io/exchange?framework=nextjs) as an example: the official Next.js integration (next-sanity) fully supports App Router, Server Components, and Visual Editing. Integrations for SvelteKit or Remix are community-level or limited in functionality. The moment you choose a CMS, your framework options narrow.

This is not a strategy unique to Vercel. It is a textbook pattern of platform business. It is structurally identical to AWS building its Lambda ecosystem or Apple building its App Store ecosystem. It is not a conspiracy but a rational business strategy, and that rationality creates path dependence.

### The Mechanism of Path Dependence

In economics, path dependence refers to the phenomenon where initial choices constrain the range of subsequent choices[^4]. The QWERTY keyboard is the classic example. Even if it is not technically optimal, the switching cost exceeds the benefit because typists, education, and software are all aligned to QWERTY.

Next.js's path dependence operates on three layers.

1. **Learning investment**: The mental model of the App Router (server/client component boundaries, `"use client"`, the Flight protocol), Next.js-specific file conventions (`layout.tsx`, `loading.tsx`, `error.tsx`), and Middleware patterns constitute knowledge that does not transfer to other frameworks.
2. **Infrastructure coupling**: If you are deploying on Vercel, there is a high likelihood of coupling with platform services such as Edge Config, KV Store, Image Optimization, and Analytics. Switching frameworks means rebuilding the deployment pipeline.
3. **Ecosystem dependency**: The third-party integrations mentioned above. When CMS, authentication, and analytics tools are optimized for Next.js, a framework switch becomes the task of re-validating all of these integrations.

The sum of these three is the switching cost. And the higher this switching cost, the more rational it becomes to maintain the existing choice — even if a better alternative exists.

What matters is that these three layers do not simply stack in parallel but form a **self-reinforcing loop**. Because there are many users, learning materials are abundant; because learning materials are abundant, onboarding new team members is fast; because onboarding is fast, hiring is easy; because hiring is easy, third parties invest first; and third-party investment drives further user growth. Within this loop, even when weaknesses are exposed in individual technical comparisons, the default choice does not easily change.

Of course, path dependence is not magic that saves an incompetent product. Behind Next.js reaching this point lies genuinely excellent DX, rapid feature experimentation, and rich documentation and examples. The argument of this post is not that Next.js's technology is deficient, but that **its current dominance can no longer be explained solely by runtime performance or structural simplicity**.

## Same Design, Different Outcomes

Every item in the previous section has a flip side. The core observation of this series is that light and shadow do not come from different causes but are **two sides of the same design decision**.

| Vercel's design decision                 | Light                                                                          | Shadow                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Hiring React Core team members           | Accelerated React feature development, fast previews in Next.js                | Governance concerns, dependency inversion between framework and library ([Part 3](/2026/03/react-is-whose))    |
| Implementing in Next.js first            | Developers get fast access to latest React features                            | RSC "stabilized" 19 months ahead, `"use cache"` absent from React spec                                         |
| Vercel platform optimization             | Best-in-class deployment experience (zero config, automatic Edge distribution) | `minimalMode` asymmetry, cost of supporting other platforms ([Part 2](/2026/03/why-cloudflare-rebuilt-nextjs)) |
| Third-party ecosystem investment         | Rich integrations, developer productivity                                      | Vendor lock-in, increased switching costs                                                                      |
| Caching/ISR-centric performance strategy | Excellent response times on cache hits                                         | Neglected baseline SSR performance without caching ([Part 4](/2026/03/is-nextjs-fast-enough))                  |

The pattern running through this table is **"optimal within Vercel, suboptimal outside Vercel."** The problem is not that this design is irrational. From the perspective of Vercel's business and product strategy, it is highly rational. However, the fact that this rationality does not translate into equal benefits for all users — especially those on non-Vercel infrastructure — is the starting point of the tension.

The trajectory of Edge Runtime illustrates this most clearly. As traced in [Part 1](/2026/03/nextjs-edge-runtime-rise-and-fall), Vercel aggressively pushed Edge. V8 Isolate-based fast cold starts, CDN-level latency — the technical vision was compelling. But the constraints of Edge Runtime (no Node.js API support, bundle size limits, no native modules) could be worked around via Serverless fallback on Vercel's infrastructure, while on self-hosted infrastructure they remained hard walls. Vercel eventually retreated to recommending the Node.js Runtime, and the cost of that retreat fell on developers who had written code trusting Edge.

Criticism is easy. But to be fair, **had Vercel not existed, the productionization of RSC would likely have been far slower.** Meta's React team operates more like a research organization, and it took four years from the RSC RFC announcement in December 2020 to the React 19 stable release in December 2024. Without the loop of Vercel implementing RSC in Next.js first and relaying production feedback to the React team, this period would have been longer. There is a structural tension between governance independence and the speed of feature development, and Vercel chose speed.

To understand why this structure was created, you need to look at Vercel's incentives. As of its 2024 Series E, Vercel was valued at over $5.6B cumulatively, and there is corresponding pressure to return that investment. Given that Vercel's revenue structure is tied to platform usage, there is sufficient incentive for Next.js's feature priorities to align toward maximizing the advantages of Vercel's infrastructure. This does not necessarily mean intentional cost-inducing design, but it is also difficult to argue that the framework's optimization direction is entirely decoupled from the platform operator's economic interests.

**Can we keep the light while removing only the shadow?** This is the question the React Foundation must answer. If technical governance is separated from Vercel, independence is secured, but the rapid prototyping and feedback loop through Next.js may be weakened. Conversely, maintaining the current structure preserves development velocity, but the promise of "vendor neutrality" rings hollow.

## So When Does It Fall Out of Favor?

Path dependence is not eternal. QWERTY persists because switching costs exceed the benefits, but **when switching costs decrease or maintenance costs increase**, the equilibrium breaks. The conditions that trigger departure from Next.js differ by user type.

### Vercel SaaS Users

Users deploying on Vercel enjoy the highest synergy with Next.js while also having the highest coupling.

**Departure trigger: cost anomalies.** As discussed in [Part 4](/2026/03/is-nextjs-fast-enough), after the introduction of per-segment prefetching in Next.js 16, one user saw Edge Requests increase by 700%, resulting in over $800/month in additional costs ([GitHub issue #85470](https://github.com/vercel/next.js/issues/85470)). In a structure where framework upgrades directly lead to infrastructure cost increases, cost anomalies are the most direct departure trigger.

Yet these users paradoxically face the **greatest difficulty in leaving.** The more coupled they are with Vercel's platform services (Edge Config, KV, Analytics, Web Analytics), the more a framework switch also means a platform switch. For them, the realistic first option is "cost optimization on Vercel" rather than "a different framework on Vercel" — disabling prefetch, expanding ISR coverage, increasing the static generation ratio, and so on.

### Self-Hosted Infrastructure Users

Many teams run Next.js on Docker, Kubernetes, AWS ECS, and similar platforms. Given the gap between Next.js's 9 million weekly downloads and Vercel's paying customer base, it is reasonable to assume that a significant share runs Next.js outside Vercel.

These users chose Next.js not for the Vercel platform but for the Next.js ecosystem itself. The perception that "if you want full-stack React, it is basically Next.js," the practical reality that Next.js-experienced developers are easy to hire, and the vast troubleshooting assets accumulated on Stack Overflow and blogs. Of the three layers of path dependence, "infrastructure coupling" was never part of their equation. Instead, "learning investment" and "ecosystem dependency" are the entirety of their lock-in — and that alone is powerful enough.

The problem is that parts of Next.js's DX were designed with Vercel deployment as an implicit assumption, and those parts become direct friction on self-hosted infrastructure. `next/image` defaults to Vercel's image optimization, requiring a separate loader configuration for self-hosting. ISR cache invalidation requires implementing a custom `cacheHandler`. In `output: 'standalone'` mode, static file serving and CDN uploads must be configured manually. A "Self-Hosting" page exists in the official docs, but production-level edge cases are mostly scattered across GitHub issues and community blogs.

**The departure trigger is the accumulation of this operational pain.** Without access to `minimalMode`, Middleware runs inside the server process; the build output structure changes with every major version; and in high-load environments without caching, they experience OOMKilled errors and latency spikes. This is not a single catastrophic event but a process of small daily frictions accumulating.

[Northflank](https://northflank.com/blog/why-we-ditched-next-js-and-never-looked-back) is a representative case. Northflank, an infrastructure company, cited "daily pain" as the reason for switching from the Next.js App Router to Remix. It was not a specific benchmark or security incident but the friction of fighting the framework every day that crossed the threshold.

This group is already decoupled from the Vercel platform, so there is no need to rebuild infrastructure. The only remaining barriers are learning investment and third-party ecosystem dependency. That is why they are most likely to evaluate alternatives first.

In summary, the order of departure differs by team profile.

- **High-traffic dynamic SSR apps** (self-hosted): Most likely to evaluate alternatives first. SSR performance issues without caching are directly felt.
- **Platform/infrastructure companies**: Sensitive to non-Vercel operational costs, so departure motivation is strong.
- **Content/marketing sites**: The benefits of ISR and static generation are significant, so they are likely to remain on Next.js.
- **Large organizations with active hiring**: In a world where "Next.js experience" is a standard requirement in job postings, switching frameworks shrinks the hiring pool. This organizational friction overrides technical judgment, making these organizations most likely to maintain the default until the very end.

### Common Departure Factor: Accumulated Distrust

There is a factor that affects both groups: **the gradual erosion of trust**.

- The testing strategy for Server Components has been absent for three years ([Testing Library #1209](https://github.com/testing-library/react-testing-library/issues/1209))
- `"use cache"` was introduced as a Next.js-only feature without a React spec
- Per-segment prefetching was shipped without adequately communicating its cost implications

On top of this, there is also the migration cost within Next.js itself. Many teams are already experiencing significant fatigue just moving from Pages Router to App Router, and this experience feeds into broader distrust about transitions outside the framework as well.

None of these individually justify abandoning a framework. But cumulatively, they lead to a fundamental question: "Does this framework represent my interests?" The benchmark data from [Part 4](/2026/03/is-nextjs-fast-enough) should be read in this context. Rather than the performance gap itself being a direct cause of departure, **it serves to provide objective evidence to distrust that has already been accumulating**. The moment when "I had a vague feeling of discomfort, and now the data confirms it" is the point at which people begin to consider switching.

## What Does It Mean for Alternatives to Mature?

Even if the conditions for departure are met, you cannot leave if there is nowhere to go. But the bar for "somewhere to go" is not technical completeness.

### The Technical Options Are Already Sufficient

As of March 2026, alternatives among React SSR frameworks have moved beyond the level of "uninspectable experimental projects." However, technical feasibility and organizational safety are separate matters.

**TanStack Start** runs on React 19 and provides Vite-based SSR without RSC. It recorded over 30x faster SSR throughput than Next.js in the Platformatic benchmark. **React Router v7** is the successor to Remix, backed by Shopify, and has been production-validated in Shopify's Hydrogen. **Remix 3** is exploring rendering layers outside React[^7], but it is still early in its pivot. **Astro** takes a content-first Islands Architecture approach, has reached a stable 4.x release, and shows particular strength in documentation sites and blogs.

The scenarios where "it has to be Next.js" are shrinking. Thanks to architectures that do not presuppose RSC, TanStack Start and React Router v7 offer simpler execution models in certain SSR scenarios. Of course, no one chooses a framework based on runtime architecture alone. When you factor in documentation, the hiring market, third-party integrations, and troubleshooting resources, Next.js's advantage remains significant.

### But Social Legitimacy Is Not There Yet

A framework switch is simultaneously a technical decision and a social decision. You need to convince team members, rewrite job postings, and answer "Why aren't you using Next.js?"

**The hiring market is the most powerful lock-in mechanism.** "Next.js experience" has become virtually a standard requirement in frontend job postings. Virtually no postings require TanStack Start experience. If a team leaves Next.js, the hiring pool shrinks. This is not a technical judgment but an organizational operations issue.

**Third-party support follows the same pattern.** For services listed in Vercel's integration marketplace to start offering official SDKs for TanStack Start, TanStack Start's market share would need to reach a level that justifies investment by third-party companies. This is a chicken-and-egg problem — no users because there are no integrations, and no integrations because there are no users.

### When Does the Tipping Point Come?

The transition from jQuery to React did not happen because jQuery died, but when React became an organizationally justifiable choice. The migration from Angular 1 to React accelerated not because Angular was terrible, but when React could be written into job postings.

**The maturation of alternatives is not about "better technology has arrived" but about "choosing it is no longer considered unusual."** The signals look like this: "React Router v7 / TanStack Start experience preferred" appearing in job postings at major companies; third parties like Sanity and Clerk releasing alternative framework SDKs at parity with Next.js; and the question "Why aren't you using Next.js?" simply ceasing to be asked when a team picks a different framework.

As of March 2026, none of these have happened. There are virtually no job postings requiring TanStack Start experience, major third-party SDKs remain Next.js-first, and Next.js is still the only framework choice that requires no justification. This is Next.js's most powerful line of defense — not technology, but social inertia.

That said, transitions like this typically unfold over years, not months. The inertia of the hiring market and third-party ecosystem moves far more slowly than technological change.

## The AI-Era Paradox

There is one final layer of path dependence. A new variable that emerged in 2026: AI.

### AI Reproduces the Default

ChatGPT, Claude, GitHub Copilot — today's major coding AIs generate Next.js code most fluently. Among React meta-frameworks, Next.js has generated the most textual data (Stack Overflow questions, GitHub repositories, blog posts), and this data is highly likely included in LLM training corpora. Since the composition of LLM training data is not disclosed, this cannot be stated definitively, but the empirical evidence that asking an AI for code without specifying a framework yields Next.js code with high probability supports this.

In an era where a framework's AI compatibility directly impacts development productivity, **AI is a new increasing returns mechanism that reinforces Next.js's path dependence.**

Seen from the other side, this increasing returns effect is a vicious cycle. When you ask AI to write TanStack Start code, it is likely to produce inaccurate output due to insufficient training data. A poor developer experience slows adoption; slow adoption means fewer blog posts, Stack Overflow answers, and GitHub repositories; and without that data, the next generation of AI cannot learn either. The structure itself makes it progressively harder for new frameworks to enter this loop.

This does not mean permanent lock-in, of course. As TanStack Start gains users and its ecosystem matures, training data will follow. The issue is that the gap is more likely to narrow slower than the Next.js corpus expands. **Not "impossible," but "slower"** — AI affects not the direction of transition but its speed.

### The Opposite Direction Exists — But Only in Limited Ways

The same reasoning can work in the opposite direction. The fact that AI understands Next.js well means it can also lower the cost of translating Next.js code to other frameworks. vinext from [Part 2](/2026/03/why-cloudflare-rebuilt-nextjs) is a case in point. Cloudflare's Igor Minar stated that "Claude wrote most of the code for this project"[^5]. The existing test suite served as a specification, AI wrote the code, and the tests verified correctness.

However, what vinext demonstrated was "reimplementation of a public API surface," which is different from automatically migrating an arbitrary production app. Next.js's complex caching strategies (nested dependencies of `revalidateTag` and `revalidatePath`), the implicit execution order of Middleware, and server state captured via closures in Server Actions — these patterns are not in the domain of mechanical translation. It is too early to generalize from a single case.

**Is AI creating new lock-in faster than it is breaking existing lock-in?** For now, the former prevails. The quality difference in AI code generation is felt daily, while AI-assisted migration still requires human intervention once it goes beyond simple routing transformations.

For this balance to shift, the AI tools themselves need to change. Instead of relying on training corpora, approaches like RAG-based code generation that indexes official documentation in real time, and initiatives like `llms.txt` where framework authors provide standardized AI context, are already emerging. If these approaches become widespread, the "bigger corpus wins" dynamic could weaken. However, as of 2026, this direction is still in its early stages, and the AI tools most developers use still operate on top of training data bias.

## Conclusion

### What Sustains Next.js

Here is a synthesis of the observations running through all five parts of this series.

Next.js is falling behind other frameworks in the same React ecosystem in SSR performance ([Part 4](/2026/03/is-nextjs-fast-enough)), its deployment is asymmetrically optimized for Vercel ([Part 2](/2026/03/why-cloudflare-rebuilt-nextjs)), Vercel's influence over React's technical direction raises structural questions ([Part 3](/2026/03/react-is-whose)), and Edge Runtime — once a key selling point — has retreated ([Part 1](/2026/03/nextjs-edge-runtime-rise-and-fall)).

Yet the reason Next.js remains the default is **not because its runtime is fast, but because the cost of switching is high.** Next.js is not merely a widely used framework. It is the advance entry point for the latest React features, the standard path for Vercel deployment, the primary target of third-party support, and the React meta-framework that AI reproduces most fluently. With these four factors overlapping, Next.js has become not "a candidate for evaluation" but "the starting point." The power of defaults is formidable. When there is no active reason to object, people choose the default.

### When Does the Inertia Break?

What breaks that inertia is not a single benchmark or a single scandal. It is the accumulation of friction that developers experience daily.

- When you have to debug yet another error crossing the server-client boundary
- When there is still no official way to test Server Components
- When you receive an unexpected bill after a framework upgrade
- When you experience load that is unmanageable without caching

Each of these frictions is bearable on its own. But the moment their sum exceeds a threshold — and the moment alternatives become socially legitimate — the transition begins. In path dependence theory, this is called "lock-in break," and it tends to happen not gradually but nonlinearly[^6]. Things remain unchanged for a long time, then shift abruptly.

Factoring in AI's default reproduction effect, however, that "abrupt shift" is likely to arrive later than previous framework transitions. The transition from jQuery to React took five to six years. The transition away from Next.js, compounded by AI lock-in, could take longer still.

The most likely scenario is not one framework replacing Next.js, but **use-case segmentation**. Content-centric sites move to Astro, high-load dynamic SSR to TanStack Start or React Router, enterprise and large-team projects remain on Next.js. The era of "one default" ends, giving way to a structure where choices diverge based on requirements. The fact that TanStack Start, React Router v7, and Remix 3 all sit on Vite is a factor that could accelerate this segmentation — even if each framework's individual market share is small, the category of "Vite-based React SSR" as a whole becomes a meaningful alternative.

Vercel, of course, will not stand still. Next.js 16's `proxy` mode, Turbopack stabilization, and similar efforts are aimed at reducing friction for self-hosted users. If the pace of these improvements outstrips the pace of accumulated dissatisfaction, the point of segmentation could be pushed back considerably.

### Judgment Based on Three Conditions

If a reader of this series asks "So what should I do?" — the answer depends on the circumstances.

**If you are deploying on Vercel and your team has no significant complaints** — there is no reason to switch. Next.js on Vercel still provides the smoothest full-stack development and deployment experience. Path dependence is a cost and an asset simultaneously. If the accumulated knowledge and infrastructure coupling are boosting your productivity, that is not lock-in but a return on investment.

**If you are self-hosting with a high proportion of dynamic SSR** — it is time to evaluate alternatives. As the benchmarks in [Part 4](/2026/03/is-nextjs-fast-enough) show, Next.js's baseline performance in SSR environments without caching is structurally disadvantaged. It is worth piloting TanStack Start or React Router v7. Since they run on the same React 19, a significant portion of your existing component assets can be reused.

**If you are starting a new project** — "Next.js because it's the default" is no longer sufficient justification. Define your project's requirements first — static generation ratio, expected SSR load, deployment environment, team's existing experience — and choose the framework that fits. In 2026, Next.js is not the only option for building a full-stack web app with React.

### In Closing

This series was not written to declare the end of Next.js. Next.js still functions as the default and will remain the most widely used React meta-framework for a considerable time.

However, we should recognize that the honest answer to "Why do you use Next.js?" is increasingly approaching **"because we're already using it."** That in itself is not a bad thing — switching costs are real, and maintaining an existing choice is often rational. But inertia and intentional choice are different. **You should be able to distinguish whether you "chose" Next.js or whether path dependence "chose for you."**

What is more dangerous than continuing to use a framework is not examining why you continue to use it.

## References

- [State of JavaScript 2025 — Meta-frameworks](https://2025.stateofjs.com/en-US/libraries/meta-frameworks/)
- [State of React 2024](https://2024.stateofreact.com/en-US)
- [Northflank — Why we ditched Next.js and never looked back](https://northflank.com/blog/why-we-ditched-next-js-and-never-looked-back)
- [Vercel — Supporting the future of React](https://vercel.com/blog/supporting-the-future-of-react)
- [Cloudflare — vinext](https://github.com/cloudflare/vinext)
- [Platformatic — React SSR Framework Showdown](https://blog.platformatic.dev/react-ssr-framework-benchmark-tanstack-start-react-router-nextjs)
- [TanStack Blog — 5x SSR Throughput](https://tanstack.com/blog/tanstack-start-5x-ssr-throughput)
- [Next.js 16.2 Release Blog](https://nextjs.org/blog/next-16-2)
- [React Foundation](https://react.dev/blog/2026/02/24/the-react-foundation)
- [GitHub Issue #85470 — Server requests and latency increased after upgrading from Next.js 15 to 16](https://github.com/vercel/next.js/issues/85470)
- [Paul David — Path Dependence (Stanford Encyclopedia of Philosophy)](https://plato.stanford.edu/entries/path-dependence/)

[^1]: Based on npm trends as of March 2026. `next` weekly downloads approximately 9M, `nuxt` approximately 2M, `astro` approximately 900K, `@tanstack/react-router` approximately 700K, `@remix-run/react` approximately 500K.

[^2]: Number of questions tagged `[next.js]` on Stack Overflow. Exact figures vary by point in time; presented as directional evidence.

[^3]: Based on the [vercel/next.js/examples](https://github.com/vercel/next.js/tree/canary/examples) directory.

[^4]: Paul David, "Clio and the Economics of QWERTY" (1985). The classic paper on the concept of path dependence.

[^5]: A statement attributed to Igor Minar. Confirmed via [a third-party quote tweet](https://x.com/AustinPlays0/status/1894504792392745365); the original post has not been directly verified.

[^6]: Brian Arthur, "Increasing Returns and Path Dependence in the Economy" (1994). A theoretical framework on the nonlinear release of technological lock-in.

[^7]: The specific rendering layer direction of Remix 3 (such as a Preact fork) has been discussed in the community, but as of March 2026, nothing has been confirmed via official blog posts or release notes.
