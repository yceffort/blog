---
title: '<em>Bun rewrite</em> Exposed Something: OSS Could Only Stop External AI'
tags:
  - bun
  - rust
  - oss
  - code-generation
  - ai
  - governance
published: true
date: 2026-05-15 02:00:00
description: 'Bun moved roughly 960,000 lines from Zig to Rust in six days using Claude Code. The meaning here is not code quality but OSS governance and resource asymmetry.'
thumbnail: /thumbnails/2026/05/bun-rust-rewrite-real-story.png
art:
  layout: stripes
  hue: rose
  tone: dark
  hero: '6일'
---

## Table of Contents

## Introduction

Bun founder Jarred Sumner ported roughly 960,000 lines of Zig code to Rust in six days using Anthropic's Claude Code. Tests pass at 99.8% on Linux x64 glibc. The main branch absorbed more than a million lines of Rust across 6,755 commits[^1]. Sumner has said v1.3.14 will be the "last Zig version."

It was noisy, as expected. Hacker News pulled 700+ upvotes and 500+ comments[^16], and The Register covered it critically twice[^2][^1]. Community criticism splits into two strands. One is the unsafe block count. The Rust version reportedly has more than 13,000 unsafe blocks. The comparison target, [uv](https://github.com/astral-sh/uv), has 73 across 350,000 lines. The other is that this is not really a Rust rewrite but closer to a transliteration of Zig into Rust syntax.

Both critiques cannot be resolved before two or three months of production usage. Neither defenders nor critics have enough evidence yet. This post is not an attempt to adjudicate whether the unsafe count is justified. But to explain why this debate is not the real issue, I first want to lay out what the unsafe and FFI problems mean.

The real meaning of this event is not code quality but governance and resources. Those two have a longer and larger impact than code quality.

> **The AI defense mechanism of OSS was designed to block only external contributors. Nobody prepared for the scenario where the maintainer themselves becomes the AI.**

I look at this asymmetry from two angles. The definition of maintainer has shifted. And token access has become a new variable.

## The pattern that tool changes have made so far

To point out what is new, I have to first list what is not new.

This is not the first time a tool change has shifted the definition of the developer profession.

At first, only people writing assembly by hand were "real programmers." When the C compiler arrived, there was a reaction that "machine-written code can never be as efficient as human-written code." When the Garbage Collector was introduced, there was a position that "memory management is the programmer's responsibility," and now languages with manual memory management remain only in systems areas. Every time IDE autocomplete, ORM, and Docker showed up, the reaction was "that is not real X." Now they are all routine.

The pattern is consistent. **When a new tool arrives, some labor is handed over to machines, and the people who did that labor either move up one level, stay in a narrow niche, or get pushed out of the market.** People who still write assembly by hand exist today. In game engine hot paths, in some embedded work, in compiler authoring. Examples of the narrow niche. In the general developer market, they are less than 0.1%.

AI code generation is on the same continuum. But two things separate it decisively from earlier tool changes.

| Change             | Diffusion speed | Resource asymmetry                  |
| ------------------ | --------------- | ----------------------------------- |
| C compiler         | Years           | Almost none (install once)          |
| Garbage Collector  | Years           | None (runtime cost only)            |
| IDE autocomplete   | Years           | None                                |
| Docker / cloud     | Years           | Some (infra cost)                   |
| AI code generation | Months          | Large (usage-proportional, ongoing) |

Speed difference is a matter of degree, but resource asymmetry is a different problem in kind. Once a compiler is installed, it works the same for everyone. AI keeps charging token costs proportional to usage. The Bun rewrite is the first large-scale case showing how this cost structure plays into OSS governance.

## The initial critiques

I'll lay out the three strands of critique first. Knowing where each is valid and where each hits its limit is what makes clear the evidence the central thesis sits on.

### The 13,000 unsafe blocks

#### First, what `unsafe` is

Rust verifies memory safety at compile time using a static analyzer called the borrow checker. Code that violates ownership, borrow, or lifetime rules does not compile. But not every systems programming task can be expressed within those rules. Raw pointer dereferencing, C function calls (FFI), `static mut` access, union field access, forced type conversions like `transmute` — for these the borrow checker simply cannot perform verification. This is the area where the compiler says "I cannot tell whether this code is safe."

To write code like this, you must do it explicitly inside an `unsafe { ... }` block. The `unsafe` block is the programmer's declaration: "I guarantee the invariants inside, the compiler cannot verify them, so trust me." It is **the boundary where the responsibility for safety crosses from the compiler to the programmer.**

```rust
extern "C" {
    fn jsc_alloc() -> *mut JSValue;
}

let value: *mut JSValue = unsafe { jsc_alloc() };
// What the programmer has to guarantee here:
// - the returned pointer points to valid memory
// - it is not concurrently freed somewhere else
// - the memory layout is compatible with JSValue
// - aliasing rules are not violated
```

A single-line mistake inside an unsafe block leads to use-after-free, data race, or memory corruption. And that can contaminate safe code outside the unsafe block. The memory bugs that happen in C/C++ happen the same way in the unsafe areas of Rust.

#### And so why 13,000 is loud

Each of the 13,000 is a declaration of "I guarantee the invariants inside." The party guaranteeing them must be the human who wrote the code. **But the code here was not written by a human, it was written by an AI agent, and the probability that a human reviewed those 13,000 within six days is near zero.** PORTING.md mandated a `// SAFETY:` comment on every unsafe block, but the accuracy of a SAFETY comment authored by AI is itself something a human has to review.

Memory corruption, data races, and bad ownership transfers inside unsafe break the safety guarantees of the entire program. The claim "it was moved to Rust, therefore it is safe" does not apply to unsafe areas. That is the starting point of the central critique.

#### Coming back to Bun's numbers

By community-tracked counts, the Rust version has more than 13,000 unsafe blocks, and the frequently compared [uv](https://github.com/astral-sh/uv) has 73 in 350,000 lines. About a 100x gap. uv's own creator, Charlie Marsh, has remarked of this kind of mechanical rewrite that you are "trading 200 known issues for unknown unknowns"[^17]. Coming from the person directly responsible for those 73 unsafe blocks, the remark carries different weight. Worth noting: the 13,000 figure itself is not stated in any Anthropic or Bun official announcement, but came out of external community analysis of PRs by Theo and others.

The comparison is, in fairness, unfair. uv has no embedded JavaScript engine. Bun embeds a C++ engine called JavaScriptCore. unsafe showing up broadly at the FFI boundary is structurally unavoidable. And looking through the Rust safe/unsafe lens, Zig does not statically enforce ownership and aliasing invariants in the type system the way Rust does. So when porting Zig to Rust, the core question is how much of the invariants previously managed by human discipline gets moved inside the safe Rust type system, and how much remains in unsafe.

But the real critique is not the absolute count. Without separating how many of the 13,000 are unavoidable at the FFI boundary versus how many are Zig idioms carried over wholesale, the number has no meaning. The more of the latter, the more there is to review.

The fundamental problem is elsewhere. **A 99.8% test pass does not verify unsafe invariants.** Tests prove behavioral compatibility, not memory safety. The motivation for the rewrite was memory safety, and "99.8% passing" does not answer that motivation.

### The transliteration critique

The second critique is more structural. PORTING.md is a 576-line migration guide. It explicitly bans tokio/rayon/hyper/futures and prohibits async fn[^6]. Effectively, it rewrites Zig architecture into Rust while avoiding most of the core abstractions of the Rust ecosystem. In a Register interview, Sumner himself said in essence that the architecture and data structures were carried over almost as-is[^2].

This critique is accurate. A careful Rust rewrite can improve safety. A mechanical "Rust-shaped" rewrite preserves the same bugs, adds new aliasing mistakes, and buries them under the confidence of "it was moved to Rust, so it is safe." Theo sums this up in one line: "They aren't really writing Rust. They are writing C++ with Rust syntax."[^7] He then makes two points. First, AI-agent-based fixes prioritize the error paths that are encountered frequently. Second, those paths happen to coincide with the paths Claude Code uses. The result may converge into asymmetric stabilization: the Claude Code paths become solid while the rest stays brittle.

### The FFI boundary: was the real motivation of the rewrite resolved

A heavier critique sits separately. **Whether the motivation of the rewrite itself was resolved is in question.**

To recap, the direct motivation of the rewrite was Bun's chronic memory leaks. Specifically, the issue of memory climbing to 14GB, and in some sessions up to 23GB, under Claude Code. The decision to move to Rust rests on the premise that "Rust's safety model catches these leaks."

But the memory bugs Rust's safety model catches automatically are actually a narrow class. We need to spell out what is in scope and what is not.

#### What safe Rust reduces automatically

**Inside safe Rust only**, the borrow checker and RAII model significantly reduce the following at compile time + runtime.

- **use-after-free**: accessing after losing ownership is a compile error
- **double-free**: `Drop` is called exactly once
- **error path forget-to-free**: even if a function exits early via the `?` operator or panic, RAII cleans up automatically

These three classes account for a large share of memory bugs commonly seen in systems programming. The most painful area in C/C++ manual memory management. Almost the entire justification for choosing Rust comes from here.

There is one critical caveat. **The moment `unsafe`, FFI, raw pointers, external allocators, or the JS boundary enter the picture, these guarantees no longer apply.** Sumner himself acknowledged this explicitly in The Register interview, saying Rust "won't catch all of these"[^2]. Automatic detection is a promise only inside safe Rust.

#### What Rust does not catch automatically

But Rust's safety model does not define "memory leak" as a safety violation. The official standard library documentation explicitly says so, and the fact that `std::mem::forget` is a safe function is the proof. Intentional leaks are classified as safe behavior. The problem is that unintentional leaks are also not caught by the compiler.

- **Logical leak**: put references in a `Vec<T>` or `HashMap` and never clear them and you leak. From the compiler's perspective this is normal code. Ownership and lifetime are not violated.
- **Cycles**: two nodes referring to each other through `Rc<RefCell<T>>` never have their reference count drop to zero, so they never free. Without explicitly breaking the cycle via `Weak`, they stay forever.
- **Memory across the FFI boundary**: calling external functions declared in an extern block is an unsafe operation, and memory allocated by C/C++ is outside the Rust compiler's tracking area. Same goes for GC objects of embedded engines like JavaScriptCore, or handles managed by libuv.
- **Re-entrancy leaks**: along paths where a JavaScript callback re-enters Rust data structures, objects created in between may miss their cleanup timing. Rust cannot statically track single-thread re-entrancy.

In table form:

| Memory bug class               | safe Rust auto-detection           | Core suspect for Bun leaks |
| ------------------------------ | ---------------------------------- | -------------------------- |
| use-after-free                 | safe scope only (borrow checker)   | Low probability            |
| double-free                    | safe scope only (`Drop` runs once) | Low probability            |
| error path forget-to-free      | safe scope only (RAII)             | Some probability           |
| logical leak (held references) | Not detected                       | High probability           |
| cycles                         | Not detected (need Weak)           | Possible                   |
| FFI boundary leak (JSC, libuv) | Cannot detect (unsafe area)        | **Very high probability**  |
| JS boundary re-entrancy        | No static tracking                 | High probability           |

#### Where did Bun's leaks come from

Bun embeds JavaScriptCore and relies heavily on uSockets/uWebSockets at the HTTP/socket layer. libuv is also partially included depending on the platform. JavaScript objects and Rust/Zig data are mutually referenced. **In this structure, the ownership boundaries between the JS engine, the native network layer, and runtime objects are inevitably complex, and the most leak-prone areas are exactly the FFI boundary and JS boundary re-entrancy.** The area Rust does not catch automatically.

The pattern of memory climbing to 23GB under Claude Code rarely comes from single-allocation bugs like use-after-free. It comes from holding references too long, from missed cleanup in a callback chain, or from a botched ownership transfer at the FFI boundary. The lower rows of the table above.

#### And so the core critique is

**The class of bug Rust catches automatically is likely not the leak class Bun struggled with most.** Leaks will still happen in unsafe areas, and unsafe invariants must be guaranteed by humans. The 13,000 unsafe blocks are that guarantee surface. And the probability a human reviewed those 13,000 in six days is near zero.

Bun saying in its announcement that "some memory leaks were resolved" is probably not a lie. A class like error path forget-to-free was likely actually caught. But **whether the real motivating leaks of the rewrite were caught is a different question, and the answer only comes after two or three months in production.**

### The limit of these critiques: time answers

Even if all three critiques are valid, time will eventually answer them. The peripheral critiques as well. That the 99.8% pass is only on Linux x64 glibc — macOS/Windows need separate validation. What tests verify is observable state outcomes, not the absence of data races. There are no concrete performance benchmark numbers in the announcement. How unsafe invariants break in production, whether FFI leaks are actually resolved, whether asymmetric stabilization happens — those reveal themselves between two-to-three months and one year in data. By that point this debate is settled.

What this post is after is not that resolvable debate. There are two separate issues that won't be settled and carry larger implications.

## The definition of maintainer has changed

OSS has been quite defensive against AI. The well-known policies look roughly like this.

- curl's Daniel Stenberg, unable to bear the surge of AI-generated fake CVE reports, ultimately ended his HackerOne bug bounty program. About 20% of total submissions were AI slop[^9].
- Linux kernel maintainer Greg Kroah-Hartman described AI-generated patches as "equivalent to mass spam." Some subsystem maintainers reject PRs immediately on the suspicion of AI alone[^10].
- Zig fully bans AI use in PRs, issues, comments, and translations. Among major OSS projects, the strictest policy[^11].
- GitHub has officially acknowledged the AI slop problem and is considering hardline responses such as a PR kill switch for mass auto-generated PRs. Abuse detection automatically classifies some PRs[^12].

These policies share a common premise.

> **The maintainer is a human, and the maintainer's job is to defend the project from AI noise coming from outside.**

The maintainer's authority only worked under the assumption that they personally take responsibility for the review. What Bun did was flip that premise. When The Register asked whether the Rust version would mainly be maintained with Claude Code, Sumner replied "this is already the status quo. We haven't typed code by hand for months"[^2]. The maintainer themselves has become the AI.

### 960,000 lines in six days. Where was the review

First, "six days" itself deserves a closer look. The PR itself is six days, correct. But those six days are the tip of the iceberg. Looking at Bun's repo commit history, the `bun_collections` directory already appeared in July 2025, five months before the acquisition announcement[^15]. On the Zig side, smart pointer abstractions like `bun.ptr.Owned`, `bun.ptr.Shared`, and `bun.ptr.AtomicShared` had been introduced ahead of time, and PORTING.md §Pointers even explicitly maps these 1:1 to Rust types like `Rc` and `Arc`. Right before the PR (early May 2026) there was also a large-scale `src/` reorganization. In other words, **the rewrite was incrementally prepared from the moment of acquisition negotiations**, and "merged in six days" is just the time of the final stage.

This fact does not weaken the thesis. It strengthens it. The point is exactly that with token access and capital, time compresses into **five months of preparation + six days of AI merge**. The "six days" rhetoric itself is a kind of marketing vocabulary, and it is good for the post's credibility to call that out clearly.

Even at a skim rate of 2,000-5,000 lines per hour, you need 192-480 hours. At eight hours a day without rest that is 24-60 days of material. And for a review that examines the meaning of systems code, unsafe invariants, FFI ownership, and test coverage, the actual cost is far higher. It is hard to argue a human meaningfully reviewed this in six days. It is possible review was distributed across the preparation phase, but the shape of that is not externally verifiable.

When a 100-line AI PR comes from outside, the maintainer can review it. A 960,000-line internal AI merge is, on its own, impossible to review. This asymmetry is the blind spot of policy.

> **You can reject external AI, but there is no mechanism at all to reject internal AI.**

The OSS defense that has been working well so far was only built around the outside. The inside was undefended, but the problem just hadn't surfaced because maintainers were not using AI seriously.

The real reason OSS's AI rejection worked is not moral conviction. Systems code is hard to write, most maintainers are conservative seniors, and reviewer capacity is limited, so an overwhelming flood of external AI PRs paralyzes operations. All of these were time-lag defenses that only worked while AI capability was insufficient or operating cost was high.

What happens when that time-lag disappears? Bun showed the answer. It just collapses.

### Direct evidence of the absent review: issue #30719

That this is not abstract worry showed up within days of the merge. A UB case where the safe API encapsulation breaks: issue #30719[^14].

**UB (Undefined Behavior)** is a code state where the language specification does not guarantee the result. Use-after-free, aliasing violations, reading uninitialized memory — those are the typical cases. When UB occurs, the program may behave normally, crash, or silently corrupt data. Because the compiler optimizes under the assumption that UB does not occur, the behavior of unrelated code becomes unpredictable. The core value of Rust is "in safe Rust, UB is blocked at compile time," which is exactly why **UB arising from a normal safe API call is the most serious class of bug in Rust code.**

Issue #30719 starts from an ordinary safe API called `PathString::init`. Looking only at the signature there is nothing alarming. It takes a `&[u8]` reference and returns `Self`. But the internal implementation erases the lifetime inside an unsafe block. **Meaning it does not track the input reference's lifetime and forces it to `'static`.** The result is a `PathString` instance that still holds a pointer to the original data even after the original is dropped. A state where use-after-free and invalid aliasing become possible.

miri, Rust's UB detection tool, caught this pattern immediately. The following code alone triggers UB detection.

```rust
let test = Box::new(*b"Hello World");
let init = PathString::init(&*test);
drop(test);

println!("{:?}", init.slice());  // UB: dangling reference
```

What makes this decisive is that **UB occurs through normal use of a safe API.** The caller never wrote the `unsafe` keyword. The unsafe block lives inside `PathString`, and from the caller's perspective they only wrote regular safe code. Direct evidence that unsafe encapsulation failed.

The Bun team's official response is PR #30728. It does two things.

1. Mark `PathString::init` and `dir_iterator::next()` as `unsafe fn`. That is, change the call itself to require an unsafe context.
2. **Add SAFETY comments to each of roughly 70 in-tree call sites after the fact.** It also documents the outlives contract.

The second is the key. **It is an admission that at the time of the initial merge, those 70 SAFETY guarantees were not explicitly written before going into main.** It is also an admission that the "SAFETY comments mandatory for AI" rule in PORTING.md was not in force at the actual merge point. **It is the most direct code-level evidence of the thesis: human review was not there.**

The reporter did not stop there. Within minutes of finding the first UB, they discovered another one.

```
error: Undefined Behavior: trying to retag from <wildcard> for Unique
permission at alloc309[0x0], but no exposed tags have suitable
permission in the borrow stack for this location
```

It is hard to call this a one-off mistake confined to PathString, and **a strong signal that similar lifetime erasure patterns may exist elsewhere.** The reporter's comment: "This is a mistake even someone with 20 hours of Rust would not make. I found this much in minutes, and I have no idea how much we don't know about."

Around the same time, Jarred Sumner mentioned **hiring experienced Rust engineers** on X. At minimum, a signal that they additionally needed specialized staff to run a Rust codebase of this scale long-term. That alone is not enough to flatly conclude the team had no Rust expertise inside at the merge point.

Defenders push back with "it is a canary version, not an official release, bugs are natural." There is some truth to that. But two things weaken the rebuttal. First, **the decision itself to merge a 960,000-line PR into the main branch is outside the usual standard of "it's fine because it's canary."** Second, the UB found is not an ad-hoc edge case but a systemic pattern in a basic API like `PathString::init`.

There is now enough reason to suspect that the SAFETY claims of the 13,000 unsafe blocks are not actually verified guarantees but closer to self-reported assertions added after the fact.

### Sumner's vision, and GitHub's contradiction

Sumner went one step further. He wrote on X: "OSS will move in the opposite direction — humans banned from contributing. People still discuss issues and priorities, but actually writing code, submitting PRs, responding to feedback, and the act of implementation will be done by LLMs"[^6]. Not a remark to brush off. It is closer to a declaration that the core model of OSS governance is over.

There was a symbolic incident. A PR removing more than 600,000 lines of Zig source files in Bun was automatically classified as "AI slop" by GitHub's automated system and closed[^2]. And the closed PR was, in fact, correct. Anthropic was trying to merge its own code and the GitHub platform blocked it. Small incident, large signal. A signal that even the platform does not know how to classify this kind of change.

### What Zig showed about the limits of governance

The Zig case is the most direct external evidence for this thesis. Even before moving to Rust, Bun was already using its own fork rather than the Zig mainline[^2]. Zig maintainers, regardless of any AI policy, were not going to accept changes of Bun's scale into Zig proper. In other words, Zig governance worked. But what governance could block was only "Bun contributing more to Zig."

**"Bun leaving Zig" was outside what governance could address.** Bun moving to Rust does not require the consent of Zig governance. When the maintainer themselves is changing the language of their own project, there is no mechanism for external OSS governance to intervene. So even the language community with the strictest AI policy was powerless against the scenario where the language's largest user leaves the language itself via AI tools.

This is the case that most strongly shows the central thesis of this post. **External AI contributions can be blocked by OSS governance. Internal AI cannot. And where the external vs internal boundary lies is the maintainer's own choice.** Zig is the cleanest case study of this asymmetry.

## Token access has become a new variable

There is something bigger than the redefinition of maintainer.

Up to now the central variable of developer evaluation was ability. Anyone could access tools roughly equally. git, IDE, compiler, Stack Overflow — all free. Ability was almost the entire gap. Even the digital divide of the internet era leveled out within a generation, because once installed there was almost no additional cost.

In the AI era, one variable has been added. Token access. Costs keep being charged in proportion to usage, so it does not level out.

### Tiers of token access

| Position                         | Who pays cost   | Real constraints                                   | Resources accessible                                                  |
| -------------------------------- | --------------- | -------------------------------------------------- | --------------------------------------------------------------------- |
| Free user                        | Individual      | Strong rate limit                                  | Public models                                                         |
| Regular subscriber               | Individual      | Monthly subscription cap                           | Public models                                                         |
| Max/Pro subscriber               | Individual      | Higher cap, still personal cost                    | Public models                                                         |
| Regular company employee         | Company         | Security policy, dept budget, usage limits         | Public models + internal tools                                        |
| AI company employee              | Company         | Internal policy, much more favorable than personal | Public models + product development infra                             |
| Core infra team of an AI product | Company/product | External cap unknowable, high strategic priority   | Environment combining models, agents, deployment, test, observability |

You cannot explain Sumner merging 960,000 lines in six days with individual ability alone. He deeply understands Bun's Zig system, of course, and was able to write 576 lines of PORTING.md spelling out the existing architecture and porting rules. That itself is significant ability. But the more decisive change is the resource environment that ability sits in.

After Anthropic acquired Bun, Bun team's production conditions diverged completely from regular individual contributors. Anthropic, when acquiring Bun in December 2025, cited accelerating Claude Code as an explicit goal. Bun is no longer an independent individual-maintainer OSS, it has become the core infrastructure supporting Anthropic's AI coding product.

From outside it is not possible to verify the actual token limits, internal model access scope, or the concrete configuration of agent infrastructure. But this uncertainty does not weaken the central claim. What matters is not the precise cap number but the change in position. Even for the same person with the same skill, a $20/month subscriber environment and the product infrastructure environment inside Anthropic are not the same production conditions. Without the acquisition, the same speed, same scale, and same confidence would have been hard to push through. **The Bun rewrite is less an explosion of individual ability and more an event showing how OSS productivity changes when a capable maintainer combines with capital and AI infrastructure.**

### Mythos: asymmetry of verifiability

Anthropic's "Mythos" model announcement shows the same asymmetry. Mythos was announced as having discovered thousands of zero-day vulnerabilities, but in external verification that number turned out to be extrapolated from 198 manual reviews[^13]. Outsiders have a hard time verifying a model's actual capability, evaluation method, or access conditions. **As more models and tools become accessible only inside AI companies, the verifiability of the public ecosystem drops.** Not directly connected to the Bun rewrite, but a structurally similar case of the same asymmetry.

### Implications

Three consequences follow.

**1. The productivity gap between companies and individuals is likely to widen.** One of OSS's virtues was that a big-company engineer and a nighttime individual contributor could stand on the same stage. Like Linus Torvalds starting Linux as a student in Finland. OSS combined with an AI company's internal infrastructure can move much faster than OSS run by individual maintainers. From the outside, we cannot verify exact token limits or model access conditions, so we cannot quantify the magnitude of the gap. But the direction is clear.

**2. The myth of "talent shines anywhere" weakens.** An environment is forming where having ability without resources means not even getting the chance to be evaluated. Getting into a good company, starting one's own company, or being able to fundraise becomes more decisive than before. The area pure technical skill cannot close keeps growing.

**3. The OSS ecosystem becomes capitalized.** Only OSS acquired by capitalized organizations, like Bun, develops fast, while individual-maintainer OSS relatively stagnates. The question of which OSS to use turns into the question of which capital sits behind it.

The darkest part here is **this is not a variable the individual can improve.** Ability can be grown by effort, but placing oneself in a token-accessible environment cannot be done by effort alone. Luck, timing, networks, and market conditions all play in.

## So how does developer work change

On a two-to-three-year horizon, the work of senior engineers shifts from writing code to supervising AI. That much can be claimed with reasonable confidence. The trouble is that "supervising AI" is too abstract to mean much. We have to spell out concretely what becomes expensive.

The core is **the ability to verbalize tacit knowledge.**

What Sumner actually did was not write Rust code. He explicitly moved every idiom of the Zig system into 576 lines of PORTING.md. Those 576 lines produced 960,000 lines. **This is the era when documents generate code.**

The ability to put a codebase's "why did it become this way" into prose is the skill that becomes most expensive in the AI era. AI can write code, but the context for how it should be written must ultimately come from a human. This context cannot be derived from reading the code alone.

- The cognitive load of a new hire onboarding to the team in six months
- The extensibility of a feature the neighboring team may ask for next quarter
- The constraint that, for political reasons inside the company, this module must never depend on X team
- The path dependence the system carries from a decision made three years ago

These constraints live in context that is not in the documents. They can only be passed to AI by being explicitly verbalized. **That verbalization itself is the heart of design work.** Not the ability to write code, but the ability to put into prose how code should be written. The latter becoming more expensive than the former is the biggest change in the developer profession over the next two to three years.

The OSS contributor pool may also split. A scenario is possible where the majority moves into AI-dependent contribution, and a minority remains as intentionally non-AI contributors. The latter shrinks in volume but rises in cultural standing — a point where "this code was written by a human directly and reviewed by a human" works as a kind of certification.

But there is a trap. There is no clean way to verify that certification from outside. As noted earlier with Mythos, whether AI was used is itself becoming an increasingly unverifiable variable. Organic and fair-trade labels only work because there is a certification infrastructure. Without certification infrastructure, it is self-reporting, and the limit of that as a certification is clear. For a "non-AI" label to actually function as value, a mechanism to objectively guarantee that label has to be in place first. Whether that is possible is another problem.

## Three paths in which this picture could be entirely wrong

The analysis up to here rests on three premises. If even one of the three breaks, the picture changes. I'll note the weak points of my argument.

### 1. AI capability gains slow down

Everything so far assumes AI continues to improve at the current pace. If model capability gains slow down — the probability is not zero — large-scale AI-driven rewrites also become normalized more slowly. The seat of the senior engineer holds longer. Token access gaps widen less. That is the simple version of the plateau scenario. Whether or not model capability gains actually plateau is a much larger topic that belongs to a different conversation than this post, so I will not go deeper here.

### 2. Token cost does not fall

The scenario where cost does not fall is more serious. AI capability keeps improving but operating cost balloons, so only capitalized organizations can use it. The cap controversy after Claude Code's release may be a precursor of this scenario. If compute cost rises further as models improve, the asymmetry only grows.

In this scenario, the value of being in a token-accessible environment yourself explodes. The darkest version of the asymmetry sketched above.

### 3. Legal/regulatory environment changes

The legal environment is also a variable. The EU AI Act is being phased in, and has pulled discussions of AI-output disclosure and training-data transparency into the institutional realm. The Copilot copyright lawsuit (Doe v. GitHub, where "Doe" is the common-law placeholder for an anonymous plaintiff) is a class action filed in 2022 by anonymous GitHub users against GitHub/Microsoft/OpenAI, contesting whether Copilot training on and emitting OSS code without license attribution constitutes infringement. Neither this lawsuit nor the US Copyright Office's stance on AI-generated works is fully settled. Ultimately, **"where do rights and responsibilities lie when distributing AI-generated code under an OSS license"** remains an open question. If this issue takes concrete shape, the Bun-style model could be affected.

All three scenarios are variables to take seriously. The picture drawn above is just the scenario I see as most probable, not a decided future.

## So what happens to Bun

Finally, sketching the next two to three years of Bun as a concrete case makes the analysis more tangible.

Most certain first. **The probability Bun disappears in the short term is low.** Anthropic owns it and it is core infrastructure of Claude Code. As long as resources keep being invested, the probability the Rust version stabilizes in production is high. Close to a matter of time.

The question is **how it survives.** The most likely scenario is asymmetric stabilization. The paths Claude Code uses most often (runtime, JS execution, standard APIs) harden quickly. AI agents prioritize bugs on those paths and regression tests concentrate there. Meanwhile, areas that overlap less with Claude Code's core paths, like some monorepo tooling, edge cases in package management, or Windows support, may stabilize relatively later. There is a possibility Bun converges into the position of "excellent as a Claude Code dependency but ambiguous as a general developer tool."

A second risk is **cognitive debt**. As cycles of AI-written code being maintained by AI accumulate, even inside Anthropic the number of people who hold the codebase's mental model gradually decreases. In a crisis (security vulnerability, data-loss class incident), humans may not be able to trace root cause quickly.

There is a clear counter to this argument. Unlike humans, AI can rebuild context from the code each time. Whether the human cognitive-load model (forgetting curve, context switching cost) applies directly to AI is not clear. If AI can re-read and reason about the entire codebase in a short time, "the number of people maintaining a mental model" may not be such a decisive variable. Cognitive debt may be a human-only problem and asymmetrically light for AI. Either way, the verification method is the same. When the first real critical issue occurs, who traces the root cause and how quickly. If human cognitive debt was really the problem, it shows up at that point.

The third is **post-acquisition risk transfer**. The very fact that Anthropic merged a rewrite claiming production-grade as a six-day PR for the sake of its own operational priority (Claude Code acceleration) is a structure that transfers risk to teams running existing Bun in production. Users bear the cost of an experiment driven by changes in the capital environment. Before the acquisition there would have been an option to maintain a stable version while validating slowly in a separate branch, but when capital changes priorities that option disappears. The political-trust problem (OpenAI/Google camp avoiding adoption) is also possible but speculative. The capital-priority shift itself is a clear risk that follows directly from the acquisition.

The Zig community will be shaken for one to two years, and then other flagship projects (Ghostty, TigerBeetle) will fill that seat. Andrew Kelley does not change the AI policy, and the language keeps developing without Bun.

In the end, what decides Bun's future is not code quality but the capital environment. As long as Anthropic maintains investment priority on Bun, it survives, and the moment that priority drops — through a strategy shift at Anthropic or a change in business environment — it stagnates quickly. In the sense that it is tied to position rather than ability, **the case to which this post's thesis applies most concretely is Bun itself.**

## Closing

Evaluating the Bun rewrite by counting unsafe blocks looks only at the surface. Going deeper, two things show up. The definition of maintainer has changed. Token access has become a new variable.

The two look separate but come from the same root. **Capital.** A maintainer fused with capital and AI infrastructure can bypass the bottleneck of human review, and OSS built by that maintainer develops at a speed that individual contributors without capital have trouble matching. Governance asymmetry and resource asymmetry are two faces of one variable: capital.

OSS has, until now, been somewhat free from capital. More accurately, it looked free because capital was not a large variable in OSS productivity. In the AI era it is not so. **Token cost is productivity, and capital access is market share.** This is not a change you can block with a policy of rejecting external AI.

From the developer's perspective, the rules of the game have changed. **A gap that used to be explained by ability alone has gained position and resources as new variables.** Going forward, developers must look strategically not only at technical capability but also at what kind of resource environment they work in. Ability can be grown by effort, but position cannot. The weight of the latter keeps growing.

What made the compiler trustworthy was not the compiler itself but the verification infrastructure around it. Same with AI-written OSS code. Trust comes from the surrounding infrastructure, not from the code itself. Who builds that infrastructure, on top of what capital? That is the most important question for OSS over the next two to three years.

[^1]: [Anthropic's Bun Rust rewrite merged at speed of AI - The Register](https://www.theregister.com/devops/2026/05/14/anthropics-bun-rust-rewrite-merged-at-speed-of-ai/5240381) — PR merge timing, commit/line statistics, GitHub's auto-close incident.

[^2]: [Anthropic's Bun team trials port from Zig to Rust - The Register](https://www.theregister.com/software/2026/05/05/anthrophics-bun-team-trials-port-from-zig-to-rust/5222094) — Sumner's "haven't typed code by hand for months" remark, the point that Bun runs its own fork rather than Zig proper, GitHub's AI slop auto-close incident.

[^6]: [Anthrophic's Bun team trials port from Zig to Rust - DEVCLASS](https://www.devclass.com/software/2026/05/11/anthrophics-bun-team-trials-port-from-zig-to-rust/5237835) — PORTING.md's ban on tokio/async, Sumner's "humans banned from contributing" vision.

[^7]: [Theo - Bun Rewrites 960,000 Lines From Zig to Rust in Six Days (YouTube)](https://www.youtube.com/watch?v=gILMoijqeGA) — Theo's analysis of the 13,000 unsafe count and the asymmetric stabilization concern.

[^9]: [Curl ending bug bounty program after flood of AI slop reports - BleepingComputer](https://www.bleepingcomputer.com/news/security/curl-ending-bug-bounty-program-after-flood-of-ai-slop-reports/) — curl's decision to end HackerOne and the AI slop ratio.

[^10]: [Linux kernel czar says AI bug reports aren't slop anymore - The Register](https://www.theregister.com/2026/03/26/greg_kroahhartman_ai_kernel/) — Greg Kroah-Hartman's "mass spam" stance on AI patches and the policy shift.

[^11]: [The Zig project's rationale for their firm anti-AI contribution policy - Simon Willison](https://simonwillison.net/2026/Apr/30/zig-anti-ai/) — Background on Zig's blanket AI ban policy.

[^12]: [GitHub ponders kill switch for pull requests to stop AI slop - The Register](https://www.theregister.com/2026/02/03/github_kill_switch_pull_requests_ai/) — GitHub considering a PR kill switch and responses to AI slop.

[^13]: [Anthropic's Claude Mythos isn't a sentient super-hacker - it's a sales pitch - Tom's Hardware](https://www.tomshardware.com/tech-industry/artificial-intelligence/anthropics-claude-mythos-isnt-a-sentient-super-hacker-its-a-sales-pitch-claims-of-thousands-of-severe-zero-days-rely-on-just-198-manual-reviews) — Critique of the Mythos announcement's 198-case extrapolation.

[^14]: [Issue #30719 - oven-sh/bun](https://github.com/oven-sh/bun/issues/30719) — UB report starting from `PathString::init`, miri detection results, Bun team's PR #30728 response (after-the-fact SAFETY comments on 70 call sites), additional UB findings.

[^15]: [PR #21270 "Refactor Zig imports and file structure part 1" - oven-sh/bun](https://github.com/oven-sh/bun/pull/21270) — July 2025 commit `07cd45d`. The `bun_collections` directory was introduced five months before the acquisition announcement. `bun.ptr` smart pointers (`Owned`, `Shared`, `AtomicShared`, `RefCount`) were pre-built on the Zig side at the same time, and on the Rust side `src/ptr/lib.rs` explicitly references the mapping with a "Per PORTING.md §Pointers" comment.

[^16]: [Hacker News: discussion on Bun Rust rewrite](https://news.ycombinator.com/item?id=48132488) — 700+ upvotes, 500+ comments community discussion.

[^17]: Charlie Marsh (founder of Astral, creator of Ruff/uv) on the risk of large-scale transliteration rewrites: "trading 200 known issues for unknown unknowns." The phrasing spread to the English-speaking community via ashunar0's Japanese write-up. The original source is believed to be a tweet or podcast interview; the permanent link still needs verification.
