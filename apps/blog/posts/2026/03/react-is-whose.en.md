---
title: 'Whose React Is It?'
tags:
  - react
  - governance
  - nextjs
  - vercel
  - meta
published: true
date: 2026-03-19 23:30:00
description: 'The questions React Foundation must answer'
thumbnail: '/thumbnails/2026/03/react-is-whose.png'
series: 'The State of Next.js'
seriesOrder: 3
---

## Table of Contents

## Introduction

The React Core team has 21 members. Five of them work at Vercel, including key architects of RSC (React Server Components). In February 2026, React left Meta and [launched as an independent foundation under the Linux Foundation](https://react.dev/blog/2026/02/24/the-react-foundation). "Vendor neutrality" was the central message. But the structural mechanisms to guarantee that neutrality have not yet been disclosed.

In the [previous post](/2026/03/nextjs-edge-runtime-rise-and-fall), I covered Edge Runtime's expansion and retreat; in the [following post](/2026/03/why-cloudflare-rebuilt-nextjs), I examined Next.js's deployment asymmetry. This post traces the layer above — how React's own technical direction has been decided — and asks whether the React Foundation's new governance can change that structure.

## The React Core Team: Who Makes React

React's technical direction is set by the React Core team. According to the [official team page](https://react.dev/community/team), there are 21 members, with the following affiliations:

| Affiliation | Count | Share |
| ----------- | ----- | ----- |
| Meta        | 14    | 67%   |
| Vercel      | 5     | 24%   |
| Independent | 2     | 9%    |

Meta has 14 members[^1], Vercel has 5 (Andrew Clark, Hendrik Liebau, Josh Story, Sebastian Markbåge, Sebastian Silbermann), and there are 2 independent engineers (Dan Abramov, Sophie Alpert).

By the numbers alone, Meta dominates. But headcount does not necessarily equal influence. Sebastian Markbåge, the principal architect of RSC, is at Vercel. Andrew Clark, co-creator of Redux and a long-standing React Core contributor, is currently on the Next.js team at Vercel while continuing his React Core team work. Of course, affiliation alone does not determine actual influence over technical direction, and the official decision-making rules have not been published. Still, **the fact that the people who designed the core architecture belong to a specific framework company raises structural questions in itself.**

### Timeline of Talent Moves

The movement of React Core team members to Vercel overlaps with the RSC development timeline.

| Date          | Move                                  | Context                                                                |
| ------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| December 2021 | Sebastian Markbåge, Meta → Vercel[^2] | ~1 year after the RSC RFC (Dec 2020). Original architect of RSC        |
| 2023          | Andrew Clark, Meta → Vercel           | Co-creator of React Fiber. Joined the Next.js team                     |
| July 2023     | Dan Abramov, Meta → Independent[^3]   | Later worked at Bluesky, left Feb 2025. Remains on the React Core team |

When announcing Sebastian Markbåge's hire, Vercel [wrote](https://vercel.com/blog/supporting-the-future-of-react):

> Sebastian Markbåge on the React core team at Meta is joining Vercel. As part of his role at Vercel, he'll still provide leadership on the React core team and help maintain the direction of React.

This structure is not inherently problematic. In open source, engineers move between companies all the time, and it is natural for key contributors to keep contributing after switching employers. The question is what impact these moves had on React's technical direction.

## Next.js First, React Later

Laying out React's recent major features chronologically reveals a pattern.

### React Server Components

| Date          | Event                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| December 2020 | React team publishes [RSC RFC (#188)](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md) and demo |
| October 2022  | Next.js 13 ships RSC via [App Router beta](https://nextjs.org/blog/next-13)                                              |
| May 2023      | Next.js 13.4 [declares App Router "stable"](https://nextjs.org/blog/next-13-4)                                           |
| December 2024 | [React 19 stable release](https://react.dev/blog/2024/12/05/react-19) — RSC officially stabilized                        |

Between Next.js declaring RSC "stable" (May 2023) and React itself shipping RSC as a stable release (December 2024), there was a gap of **roughly 19 months**. During that period, Next.js was effectively the only framework where you could use RSC in production.

### Server Actions

| Date          | Event                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| March 2023    | React Labs [introduces Server Actions](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023) |
| October 2023  | Next.js 14 [declares Server Actions "stable"](https://nextjs.org/blog/next-14)                                               |
| December 2024 | React 19 stable release — Server Actions (`"use server"`) officially stabilized                                              |

Same pattern. Next.js declared Server Actions "stable" (October 2023) **about 14 months** before React 19's stable release (December 2024).

### `"use cache"`

| Date         | Event                                                                           |
| ------------ | ------------------------------------------------------------------------------- |
| October 2024 | `"use cache"` introduced experimentally in Next.js canary                       |
| October 2025 | [Next.js 16](https://nextjs.org/blog/next-16) ships Cache Components officially |
| March 2026   | No `"use cache"` RFC exists in React                                            |

`"use cache"` takes the same directive form as `"use client"` and `"use server"`, but it is **a Next.js feature**, not a React feature. It leverages the React compiler infrastructure but is not part of the React specification itself.

### What This Pattern Means

In summary, the flow looks like this:

```
React team designs the concept
    ↓
Next.js implements it first and declares it "stable"
    ↓
Gap of 1+ years
    ↓
Included in React stable release
```

There was a specific mechanism that made this structure possible: **the React Canary channel**.

## Canary: Early Access for Frameworks

In May 2023, the React team [formalized the Canary release channel](https://react.dev/blog/2023/05/03/react-canaries). The post was authored by Dan Abramov, Sophie Alpert, Rick Hanlon, Sebastian Markbåge, and Andrew Clark — core members of the React Core team.

The key message was:

> We'd like to offer the React community an option to adopt individual new features as soon as their design is close to final, before they're released in a stable version.

And Next.js was explicitly mentioned in the post:

> For example, here is how Next.js (App Router) enforces resolution of react and react-dom to a pinned Canary version.

The Canary channel is technically open to all frameworks. But "open to all" and "practically usable by all" are different things.

### Canary's Instability: By the Numbers

According to the npm registry, since the May 2023 formalization, over **542** React Canary versions have been published (202 for 18.x canary, 340 for 19.x canary) — roughly 15 to 29 per month. During the same period, there were only **5** stable React 18.x releases (18.0.0 through 18.3.1). The [official React versioning policy](https://react.dev/community/versioning-policy) states:

> Canary releases... may include breaking changes.

And there is a particularly important warning for RSC implementors in the [React docs](https://react.dev/reference/rsc/server-components):

> The underlying APIs used to implement a React Server Components bundler or framework do not follow semver and may break between minors in React 19.x.

Implementing RSC at the framework level requires depending on React's internal bundler APIs — and those APIs can break between minor versions.

### What Happened to Other Frameworks

This instability was not just a theoretical concern — it demonstrably frustrated other frameworks.

**Shopify Hydrogen**: An early RSC adopter in 2021–2022 that even built a custom `react-server-dom-vite` implementation. But when Shopify acquired Remix in October 2022, [Hydrogen v2 dropped RSC](https://shopify.engineering/remix-joins-shopify):

> Moving to Remix's data loading pattern (instead of server components) will lead to faster performance and a simpler developer experience.

**RedwoodJS**: Tom Preston-Werner [declared](https://tom.preston-werner.com/2023/05/30/redwoods-next-epoch-all-in-on-rsc.html) "all in on RSC" in May 2023, calling it the "Bighorn Epoch" and building on canary. But it never reached a stable release, and the project eventually pivoted to [RedwoodSDK](https://rwsdk.com/), a Cloudflare-based framework.

**Waku**: A minimal RSC framework by Daishi Kato. From the [v1 roadmap](https://github.com/dai-shi/waku/issues/24) (May 2023) onward, the question "should we wait for `react-server-dom-vite` from React canary?" kept coming up. It went through 27+ minor versions (v0.10 to v0.27.5) before reaching a 1.0 alpha in early 2026[^6]. Keeping up with the moving RSC API took time.

**React Router**: [Shipped an RSC preview](https://remix.run/blog/rsc-preview) in May 2025, but because Vite had no RSC support at the time, it had to use **Parcel** as the bundler. Ryan Florence stated, "Vite doesn't have RSC support yet." Vite's [RSC integration discussion](https://github.com/vitejs/vite/discussions/4591) had been open since August 2021, but progress was slow for years due to a structural mismatch between async module loading and React's synchronous module loading assumptions. The situation began to change once [`@vitejs/plugin-rsc`](https://www.npmjs.com/package/@vitejs/plugin-rsc) shipped as an official Vite plugin. However, as of March 2026, the latest version is 0.5.x — still in the 0.x stage and not yet a stable release. React Router moved to Vite-based RSC on top of this plugin, and Cloudflare announced in February 2026 that its own Vite plugin would integrate with `@vitejs/plugin-rsc`. Waku also migrated from its custom RSC implementation to the official plugin. But this all happened **more than 4 years after the initial discussion**. Compared to Next.js shipping RSC in October 2022, the rest of the ecosystem had to wait 3–4 years to access the same capability.

### The Truth Behind "18.2.0"

In January 2024, Tom MacWright pointed out an interesting fact in ["Miffed About React"](https://macwright.com/2024/01/03/miffed-about-react). Next.js bundled a React canary internally while the `package.json` specified React 18.2.0 — so what actually ran was a canary version:

> Next.js vendors a version of the next release of React, using trickery to make it seem like you're using React 18.2.0 when in fact you're using a canary release.

This was confirmed in [Next.js GitHub issue #54553](https://github.com/vercel/next.js/issues/54553). A user specified React 18.2.0 in `package.json`, but `React.version` returned `18.3.0-canary-dd480ef92-20230822`. Next.js team member Balazs Orban acknowledged that Next.js was "importing APIs that aren't available on other React channels yet."

What this means is that while the Canary channel was formally open to every framework, **the entity best positioned to absorb Canary's instability and ship unfinished features to production was Vercel/Next.js**. With React Core team members in-house, they could communicate and fix issues immediately when something broke in Canary.

The [Next.js 14 announcement blog](https://nextjs.org/blog/next-14) reads:

> As of v14, Next.js has upgraded to the latest React canary, which includes stable Server Actions.

"Stable Server Actions included in a React canary" — calling a canary-channel feature "stable" means Next.js was declaring stability independently of React's own release cycle. [DEVCLASS's analysis](https://devclass.com/2023/10/27/next-js-14-released-as-vercel-aims-for-dynamic-at-the-speed-of-static-but-are-new-features-really-stable/) made this very point.

The Canary channel itself is a reasonable mechanism. Meta has long used bleeding-edge versions of React internally, and React Native operates the same way. The problem is that **the result was a structure granting preferential early access to a specific framework**.

## Is "Vercel Controls React" True?

The person who analyzed this question most thoroughly is Redux maintainer Mark Erikson. In June 2025, he addressed the debate head-on in ["The State of React and the Community in 2025"](https://blog.isquaredsoftware.com/2025/06/react-community-2025/).

Erikson's central argument is that **the causality runs in the opposite direction**:

> It was the React team that drove this set of changes.

It was the React team itself, not Vercel, that designed and pushed RSC. Rather than Vercel acquiring React, **the React team chose Vercel/Next.js as the environment to realize their vision** — or so the argument goes.

Behind this was Meta's peculiar situation. Meta uses React at massive scale, but it has its own server infrastructure, GraphQL/Relay-based data fetching, and proprietary routing. These are far removed from the tools most web developers use — Express, Prisma, next-auth. Prototyping RSC inside Meta had limits; the React team needed an external partner. That partner was Vercel.

This analysis is persuasive. But Erikson himself acknowledges that the outcome of this structure has created friction with the community:

> The React community and ecosystem is fractured, with an increasing split between how the React team wants the framework to be used, and how the community uses it in practice.

Regardless of the cause, **a gap has opened between React's technical direction and the community's actual usage**.

Lee Robinson, who led the Next.js community at Vercel for five years, also [acknowledged](https://leerob.substack.com/p/reflections-on-the-react-community) this structural problem after leaving:

> Most of the 'RSC innovation' happening in the ecosystem was from those building on Next.js. It was still very difficult to build non-Next.js RSC things.

And about the timing of App Router:

> The App Router was likely marked stable too soon... Obviously that was a mistake.

The facts covered in this post — talent moves, canary-based early implementation, `"use cache"` — do not, by themselves, prove that "Vercel controls React." The React Foundation has promised independent technical governance, Meta still constitutes the majority of the React Core team, and Erikson's analysis that the React team set its own technical direction is persuasive. **The problem is that the structural mechanisms to prove the opposite have not yet been disclosed.** The burden of proving "we are not being dominated" falls on the side that declared "vendor neutrality."

## Community Temperature

According to the [State of React 2024 survey](https://2024.stateofreact.com/en-US):

- **45%** of new projects adopted RSC
- But Server Components and Server Functions were rated the **3rd and 4th most disliked features**
- Overall satisfaction was **3.6 out of 5**, trending downward
- The top pain points were Context API incompatibility (59 mentions), testing gaps (24 mentions), and debugging difficulty

The survey report noted:

> Server Components and Server Functions are the third and fourth-most-disliked features... troubling for a set of new APIs that was supposed to pave the way towards React's next big evolution.

Adoption is happening, but satisfaction is low. The features meant to lead React's "next evolution" are among the most disliked.

The meta-framework section of the [State of JavaScript 2025 survey](https://2025.stateofjs.com/en-US/libraries/meta-frameworks/) paints a similar picture. Next.js satisfaction (retention) dropped from 89% in 2022 to 75% in 2023, with further declines since. Next.js is the 13th most loved project while simultaneously being the **5th most disliked** — making it one of the most polarizing tools in the ecosystem.

### Specific Causes of Dissatisfaction

Behind the numbers, the pain points fall into three categories.

**A Fractured Mental Model**: For a long time, React operated under a single mental model. Components receive props and state, and render UI. RSC split that model in two. Server components and client components follow different rules. You cannot use `useState`, `useEffect`, or the Context API in server components. You cannot use `async/await` in client components. You must always be aware of where a component executes, and you need to understand how data is serialized when crossing the boundary. Context API incompatibility was the most mentioned issue (59 times) in the survey — a direct result of this split. Patterns that previously relied on Context — theming, auth state, internationalization — no longer work in server components.

**Debugging Difficulty**: Errors that cross the server-client boundary produce split stack traces. Some errors from the server appear in server logs; others show up in the browser console. The RSC payload (Flight protocol) is a binary format that is not human-readable, making it hard to inspect what data flows between server and client. React DevTools v6 added server component badges, but compatibility with third-party libraries remains fragile.

**Testing Gaps**: There is still no official way to unit-test Server Components. React Testing Library's [issue #1209](https://github.com/testing-library/react-testing-library/issues/1209) ("Support for React Server Components," May 2023, **155+ comments**, still OPEN) tracks this problem. Calling `render(<Page />)` fails because async components return `Promise<Element>`. A workaround exists — `const Result = await Page(props); render(Result)` — but it is not officially supported. In Vitest's [issue #8526](https://github.com/vitest-dev/vitest/issues/8526), contributor Hiroshi Ogawa noted that "the React and Next.js teams have no official server component testing strategy beyond E2E tests." 24 survey responses flagged this issue. The [official Next.js docs](https://nextjs.org/docs/app/guides/testing/vitest) also recommend E2E testing for async Server Components — meaning the fast feedback loop of component-level testing is structurally broken.

### How Other Frameworks Responded

Other major frameworks in the React ecosystem have taken varying stances on RSC.

**React Router / Remix**: Remix co-creator Ryan Florence expressed a mixed view of RSC. React Router v7 shipped without RSC support, and Florence stated that ["React Router v7 is not as opinionated as I'd like and bigger scope than I'd like."](https://x.com/ryanflorence/status/1859291013879357828) More dramatically, for Remix 3, Florence and Michael Jackson [announced they would drop React entirely](https://remix.run/blog/wake-up-remix) in May 2025 — moving to a Preact fork and relying directly on web platform standards. Instead of RSC, they chose an approach "closer to HTMX, using HTML as the wire format."

**TanStack Start**: TanStack's Tanner Linsley [argued](https://github.com/TanStack/router/discussions/802) that the very name RSC is the problem — they should be called "Prerendering Components" or "Serializable Components." His critique is that RSC **discards a decade of accumulated SPA knowledge and patterns to redo everything on the server**. TanStack Start espouses a "client-first" philosophy, allowing selective RSC use where needed rather than adopting it wholesale.

The implication is clear. Next.js is the only framework that has fully embraced RSC as React's core direction. The other major frameworks are each keeping their distance in their own way — or leaving React altogether.

## Why Meta Spun React Out

Against this backdrop, Meta decided to transfer React to an independent foundation. It was [announced at React Conf](https://react.dev/blog/2025/10/07/introducing-the-react-foundation) in October 2025, then [officially launched under the Linux Foundation](https://react.dev/blog/2026/02/24/the-react-foundation) in February 2026.

The official message was "React has outgrown the confines of any one company"[^5]. But several layers of motivation overlap behind this decision.

### Meta's Open-Source Spinout Pattern

React is not the first. Meta transferred [GraphQL to the Linux Foundation in 2018](https://graphql.org/blog/2018-11-12-the-graphql-foundation/) and [PyTorch in 2022](https://pytorch.org/blog/PyTorchfoundation/). [The Register](https://www.theregister.com/2025/10/09/meta_react_foundation/) called React's transfer "a similar corporate distancing exercise."

Behind this pattern lies the open-source risk of the Meta brand. The 2017 BSD+Patents license controversy around React led to the Apache Software Foundation banning React and WordPress threatening to move away from it[^12]. Moving a project to a neutral foundation eliminates the enterprise adoption barrier of "what happens if Meta abandons it."

There is also the precedent of Google donating Kubernetes to the CNCF in 2015 — after which Microsoft, Amazon, and other competitors invested heavily, and Kubernetes came to dominate the market. When neutrality is established, competitors invest more. It is a proven strategy.

### The AI Pivot and Cost Distribution

Since 2022, Meta has been conducting major layoffs while concentrating \$72–135B in capital expenditure on AI infrastructure. Meta's commitment to the React Foundation is \$3M+ over five years and a dedicated engineering team[^5] — roughly \$600K per year, which is modest for a project used by 55 million websites and 20 million developers. Having 8 Platinum member companies on the board distributes the financial burden.

### The Foundation's Structure

The [React Foundation](https://react.dev/blog/2026/02/24/the-react-foundation)'s disclosed structure is as follows.

**Board of Directors**: Composed of representatives from 8 Platinum founding member companies.

| Company          | Category                    |
| ---------------- | --------------------------- |
| Amazon           | Cloud/Infrastructure        |
| Callstack        | React Native consulting     |
| Expo             | React Native tooling        |
| Huawei           | Hardware/Telecom            |
| Meta             | Original React creator      |
| Microsoft        | Cloud/Platform              |
| Software Mansion | React Native tooling        |
| Vercel           | Next.js/Deployment platform |

Vercel is among the 8 companies. The company that runs Next.js sits on the React Foundation's board of directors.

**Executive Director**: Seth Webster (Meta). Manages funding and resource allocation.

**Technical Governance**: The Foundation stated it would create an independent technical decision-making structure separate from the board. However, as of the February 2026 official launch, the specific structure of technical governance had not been finalized. A "provisional leadership council" was formed, with details to be shared "in the coming months"[^4].

**Meta's Transitional Control**: According to [The New Stack's analysis](https://thenewstack.io/react-foundation-open-source-governance/), Meta retains a **supermajority on the corporate governance committee for 2.5 years** after launch[^13]. Despite the "vendor neutral" declaration, Meta holds effective control during the transition period.

### What Can and Cannot Be Verified

What we can currently confirm about the React Foundation is limited.

**Confirmed:**

- The board includes 8 companies, and Vercel is among them
- Technical governance is declared separate from the board
- Meta has committed \$3M+ in funding and engineering support over 5 years
- The Executive Director is Seth Webster of Meta
- Meta retains a supermajority on the corporate governance committee for 2.5 years after launch

**Not yet confirmed:**

- The specific structure of technical governance (TSC composition, voting rules, veto rights, etc.)
- The mechanism by which technical decisions and board decisions are actually kept separate
- What role the 5 Vercel-affiliated React Core team members will play under the foundation structure
- How "vendor neutrality" concretely works in technical direction decisions
- The governance transition plan after the supermajority period ends

As of March 2026, the React Foundation has launched, but **the core structure of its technical governance has not been disclosed**.

## The Inversion: Framework Leading the Library

The most notable phenomenon in the React–Next.js relationship is the **inversion of dependency direction**.

Traditionally, the library/framework relationship works like this:

```
Library defines the API → Framework implements/extends
React defines the component model → Next.js adds routing/SSR
```

But the recent React–Next.js relationship has become:

```
Next.js implements first → React retroactively standardizes
Next.js 13.4 declares RSC "stable" → 19 months later, React 19 officially stabilizes it
Next.js 14 declares Server Actions "stable" → 14 months later, React 19 officially stabilizes them
Next.js 16 introduces "use cache" → No corresponding React spec exists
```

What makes React's case unusual is the three-party dynamic. React is a library created by Meta, yet its core features are prototyped and stabilized in **another company's (Vercel) product (Next.js)**. And now a **third entity (the React Foundation)** has declared it will handle governance. When the three parties' interests align, there is no issue. But the mechanism for resolving conflicts has not been defined.

## `"use cache"`: A Sign of Blurring Boundaries

The `"use cache"` directive exemplifies how these boundaries are blurring.

`"use client"` and `"use server"` are official React directives. They are included in React 19 and defined in the [official React docs](https://react.dev/reference/rsc/use-client). They are React specs that any framework can implement.

`"use cache"` takes the same syntactic form, but it exists only in the [Next.js docs](https://nextjs.org/docs/app/api-reference/directives/use-cache). There is no `"use cache"` entry in the official React docs. No RFC has been filed with React. The directive was designed by Sebastian Markbåge. It was first revealed in his October 2024 Next.js blog post ["Our Journey with Caching"](https://nextjs.org/blog/our-journey-with-caching). The same person who designed `"use client"` and `"use server"` created a new directive — this time as a Next.js feature, not a React feature.

```tsx
// Official React directives
'use client' // → documented on react.dev
'use server' // → documented on react.dev

// Next.js-only directive
'use cache' // → documented only on nextjs.org, not a React spec
```

From a developer's perspective, these three directives look identical — same syntax, same placement (top of file or function), seemingly the same behavior. But `"use cache"` is not a React feature; it is a Next.js feature. Code that depends on this directive only runs in Next.js (or, eventually, other frameworks that implement it).

`"use client"` and `"use server"` also started as Next.js implementations before becoming React specs. `"use cache"` may follow the same path. But as of now, it is **a framework feature defined by Next.js that uses the same syntactic form as React directives**. This alone does not prove that "the boundaries have collapsed," but it does reveal a structural trend where React's syntactic conventions are being extended into features owned by a specific framework.

## Precedent: How Node.js Solved the Same Problem

The problem the React Foundation faces is not new. The closest precedent is Node.js.

### The io.js Fork and the Joyent Problem

In 2014, the Node.js community erupted in frustration over Joyent's control. Joyent owned the Node.js trademark, controlled commit access, and appointed the project leader (TJ Fontaine). Releases stalled, and V8 was stuck on an old version. There was no transparent governance process.

In December 2014, Fedor Indutny forked Node.js to create **io.js**. When io.js v1.0.0 shipped in January 2015, Joyent relented and announced the [creation of the Node.js Foundation](https://nodejs.org/en/blog/announcements/foundation-v4-announce) in February 2015. The two projects merged in Node.js v4.0.0 in September 2015.

### Node.js TSC's Structural Safeguards

The community's core demand during the merger was ["autonomy of technical decisions from the board"](https://github.com/nodejs/node/issues/978). The resulting [TSC (Technical Steering Committee) Charter](https://github.com/nodejs/TSC/blob/main/TSC-Charter.md) includes concrete structural safeguards.

**Employer Cap**: **No more than 1/4** of TSC voting members may be affiliated with the same company[^7]. If this limit is exceeded, it must be remedied immediately:

> No more than one-fourth of the TSC voting membership may be affiliated with the same company/entity. The situation must be immediately remedied by the removal of voting member status.

Working Groups have an even stricter **1/3 cap**[^8]. The same 1/4 cap applies to the CPC (Cross Project Council), the parent body of the OpenJS Foundation[^9].

**Secret Ballot**: When consensus fails, decisions are made by vote, but the votes are kept private:

> TSC voting members' choices must not be disclosed, to avoid influencing other voting members.

This structurally prevents a company from pressuring its affiliated members on how to vote.

**Charter Amendment Restrictions**: The TSC cannot amend its own charter — it requires approval from the CPC, the parent body. This prevents a captured TSC from weakening its own rules.

The essence of this structure is that **it does not rely on good faith**. Rather than a declaration of "we will be neutral," it is designed so that breaking neutrality is structurally impossible.

### Rust Foundation: When Structure Exists but Process Fails

If Node.js teaches us that "structural safeguards matter," the Rust Foundation teaches us that "structure alone is not enough."

The Rust Foundation launched in 2021 with strong structural safeguards from the start. The board consists of corporate directors (Platinum members) and project directors (elected by the Leadership Council), and every motion requires **a majority of both corporate directors and project directors** to pass[^10]. Neither the corporate side nor the project side can push through decisions alone — a dual-majority structure. The Leadership Council has a cap on representatives per affiliated company (no more than 2 when the council has 6+ members)[^11].

Yet when the Rust Foundation published a trademark policy draft in April 2023, the community exploded. The draft included provisions barring the use of "Rust" in domain names, restricting crate names, and requiring educational materials to include a disclaimer stating they were "not reviewed by the Rust Foundation." A [counter-movement repository](https://github.com/blyxyas/no-rust-policy-change) was created, and project directors themselves admitted that ["the full project was not sufficiently involved"](https://blog.rust-lang.org/inside-rust/2023/04/12/trademark-policy-draft-feedback/).

The Foundation apologized and withdrew the policy, but it took **over 18 months** for a revised version to appear. A [revised draft](https://blog.rust-lang.org/2024/11/06/trademark-update/) was published in November 2024, and as of March 2026, the final policy is still not settled.

The lesson from Rust is this: **Structural safeguards like dual-majority voting and affiliation caps were in place, but when a policy was developed behind closed doors by a small group over 8 months and then presented with a short feedback window, community trust collapsed.** Structural safeguards and process transparency are separate concerns, and both are necessary.

### What the React Foundation Lacks

Compared to the Node.js TSC structure, what the React Foundation currently lacks becomes clear.

| Safeguard                        | Node.js TSC                     | React Foundation (as of Mar 2026)                   |
| -------------------------------- | ------------------------------- | --------------------------------------------------- |
| Employer cap                     | 1/4 of voting members           | Not disclosed                                       |
| Secret ballot                    | Explicitly specified            | Not disclosed                                       |
| Charter amendment restrictions   | Requires CPC approval           | Not disclosed                                       |
| Technical autonomy               | Explicitly independent of board | "Separate" declared, mechanism not disclosed        |
| Technical governance composition | TSC member list public          | "Provisional council" formed, members not disclosed |

The current composition of the React Core team — 5 out of 21 members affiliated with Vercel (24%) — is almost exactly at the Node.js TSC's 1/4 cap. Under the Node.js TSC rules, this ratio would hit the ceiling and no additional members from the same company could hold voting rights. Whether the React Foundation will adopt a similar cap remains unknown.

The React Foundation said it would disclose the specifics of technical governance "in the coming months"[^4]. When that structure is revealed, whether it includes safeguards on par with the Node.js TSC will be the benchmark for judging the React Foundation's real substance.

## Conclusion

Here is a summary of what this post has covered.

**Confirmed facts:**

- Of the 21 React Core team members, 5 are affiliated with Vercel, including the principal architect of RSC
- RSC and Server Actions were declared "stable" in Next.js more than a year before React's own stable release
- The Canary channel was the official mechanism that enabled this early implementation, and other frameworks struggled to leverage it to the same degree
- `"use cache"` is a Next.js feature, not a React spec, yet it uses the same syntactic form as React directives
- The React Foundation has launched, but the specific structure of its technical governance has not been disclosed as of March 2026

**What these facts do not mean:**

- "Vercel controls React" cannot be concluded from these facts alone. Meta still constitutes the majority of the React Core team, and the analysis that the React team has autonomously set its technical direction is persuasive. The React Foundation has promised independent technical governance

**What these facts do mean:**

- A structure exists in which React's core features are realized through a specific company's product, and the mechanisms to assure us this structure is fair are not yet visible. Despite precedents like the Node.js TSC's employer cap and the Rust Foundation's dual-majority voting, the React Foundation has not yet disclosed comparable structures

In the [previous post](/2026/03/nextjs-edge-runtime-rise-and-fall), I showed how Edge Runtime was created and then retreated at the intersection of Vercel's business incentives and technical ambition. In the [following post](/2026/03/why-cloudflare-rebuilt-nextjs), I showed how Next.js's deployment asymmetry forced competing platforms to bear the cost of reverse-engineering and reimplementation. In this post, I have examined the layer above — how React's own technical direction is determined.

The real test for the React Foundation comes not at the moment of its founding declaration, but **when its technical governance charter is published**. Whether that document includes an employer cap, decision-making procedures, voting rules, and conflict-of-interest safeguards will determine whether "vendor neutrality" is a declaration or a structure.

[^1]: Eli White, Jack Pope, Jason Bonta, Joe Savona, Jordan Brown, Lauren Tan, Matt Carroll, Mike Vitousek, Mofei Zhang, Pieter Vanderwerff, Rick Hanlon, Ruslan Lesiutin, Seth Webster, Yuzhi Zheng. Per the [official React team page](https://react.dev/community/team), confirmed March 2026.

[^2]: [Supporting the Future of React — Vercel Blog](https://vercel.com/blog/supporting-the-future-of-react) (December 14, 2021). Guillermo Rauch announced Sebastian Markbåge's hire.

[^3]: Dan Abramov's [tweet](https://twitter.com/dan_abramov/status/1682029195843739649) (July 20, 2023). Announced departure from Meta. Later worked at Bluesky (2023–February 2025), currently an independent engineer maintaining React Core team membership.

[^4]: [The React Foundation — React Blog](https://react.dev/blog/2026/02/24/the-react-foundation) (February 24, 2026). "We will share more updates on technical governance in the coming months."

[^5]: [Introducing the React Foundation — Engineering at Meta](https://engineering.fb.com/2025/10/07/open-source/introducing-the-react-foundation-the-new-home-for-react-react-native/) (October 7, 2025). 5-year partnership, \$3M+ in funding, dedicated engineering team commitment.

[^6]: [Waku Reaches 1.0 Alpha — InfoQ](https://www.infoq.com/news/2026/02/waku-react-framework/) (February 2026).

[^7]: [Node.js TSC Charter](https://github.com/nodejs/TSC/blob/main/TSC-Charter.md). "no more than one-fourth of the TSC voting membership may be affiliated with the same company/entity."

[^8]: [Node.js Working Groups](https://github.com/nodejs/TSC/blob/main/WORKING_GROUPS.md). "no more than 1/3 of the WG members may be affiliated with the same employer."

[^9]: [OpenJS CPC Charter](https://github.com/openjs-foundation/cross-project-council/blob/main/CPC-CHARTER.md). "No more than one-fourth of the Voting CPC members may be affiliated with the same employer."

[^10]: [Rust Foundation FAQ](https://github.com/rust-lang/foundation-faq-2020/blob/main/FAQ.md). "All motions be approved with both a majority of project directors and a majority of sponsor representatives."

[^11]: [Rust Leadership Council RFC #3392](https://github.com/rust-lang/rfcs/blob/master/text/3392-leadership-council.md). "If the Council has 6 or more representatives, no more than 2 representatives may have any given affiliation."

[^12]: [Facebook Buckles Under Pressure Over Hated React License — InfoWorld](https://www.infoworld.com/article/2257026/facebook-buckles-under-pressure-over-hated-react-license.html) (2017). Apache Software Foundation's ban on the React license and the subsequent switch to MIT.

[^13]: [React Foundation Open Source Governance — The New Stack](https://thenewstack.io/react-foundation-open-source-governance/). Analysis that Meta retains a supermajority on the corporate governance committee for 2.5 years after launch.
