---
title: 'Next.js Turbopack Turned One Singleton into Two: A Scope Hoisting Bug and a Circular Import'
tags:
  - turbopack
  - nextjs
  - bundler
  - javascript
  - singleton
  - debugging
published: true
date: 2026-08-19 12:00:00
description: 'In a Next.js 16 Turbopack production build, a module-scope singleton became two live instances at runtime. Inside the same synchronous block, one condition contradicted the other, and responses that arrived in 30ms still timed out. This is the record of tracing the cause through the bundle output: a partial scope hoisting merge, a circular import, an upstream bug that had already been fixed, and the single-variable experiment I ran too late.'
thumbnail: /thumbnails/2026/08/turbopack-scope-hoisting-singleton-split.png
---

## Table of Contents

## An Observation That Cannot Happen in Code

Here is a branch. It comes from the send function of an internal shared package that manages a realtime connection, and it queues requests when the connection is not ready. Ordinary code.

```ts
if (!socket.client || !isSocketOpen()) {
  // queue the request if the connection is missing or not open
}
```

Entering this branch means `socket.client` is missing, or the connection is not open. And yet, calling `isSocketOpen()` again inside the branch returned `true`. There is no `await` in between, and nothing mutates state. `isSocketOpen` is a three-line function that returns `socket.client?.readyState === WebSocket.OPEN`. If both reads see the same `socket`, there is no way `socket.client` is falsy while `isSocketOpen()` is true.

That observation made me reread the source over and over, and the source was clean to the very end. The conclusion of an investigation that consumed an entire day is this: **the module-scope singleton object existed twice at runtime.** The code that read `socket.client` and the code inside `isSocketOpen()` were looking at two different `socket` objects. The cause was a dual access path created by Turbopack's scope hoisting when it partially merged a module group that contains a circular import, and a defect targeting exactly this structure had been reported upstream two weeks before my investigation and fixed the very next day.

And there was, in fact, a shortcut through this investigation. The only thing that had changed right before the problem appeared was a Next.js version bump. And still I waved it off: "surely it's not the framework upgrade; if there is a bug, it must be in my code." Most of what made this a full-day investigation traces back to that one call, and it gets its own section below.

> This incident happened in a Next.js `16.2.3` Turbopack production build. Because this is company code, package and service names are generalized, and the quoted bundle output is real build output with module IDs and identifiers substituted while preserving the structure. The vercel/next.js issues, PRs, and commits cited as upstream evidence were checked directly through the GitHub API as of 2026-08-18: existence, merge status, and version-tag inclusion.

## The Module-Scope Singleton Convention

The package in question held its state like this. Nothing special about the shape.

```ts
// socket.ts
const socket = {
  client: null,
  state: {
    requestCallbacks: {},
    // ...
  },
}

export default socket
```

The pattern stands on ESM's evaluation semantics. The same module is evaluated once per module graph, and every subsequent import receives the same cached instance. So no matter where you import it from, `socket` is the same object, and putting one object at module scope is all it takes to get a singleton the app shares. React context objects, ORM connection managers, event buses, request callback registries all stand on this guarantee, and bundlers are built to preserve these semantics.

To be precise, the unit of that guarantee is one module graph. When graphs split, as they do between server and client, or when a version mismatch gets a package installed twice, you can legitimately end up with multiple instances without any defect involved. What made this incident strange is that the split happened through none of those legitimate paths, but inside a single client graph, and, as we will see, inside a single chunk.

Whichever path it arrives by, once the same module exists as two instances, the symptoms depend on what kind of state it was holding.

| Module-scope state        | When it splits in two                                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Connection object         | The duplicate-creation guard cannot see the other instance's connection, so you get two connections                                          |
| Request callback registry | Registration and lookup happen on different instances; responses arrive but the callback is never found, and the request hangs until timeout |
| Event listener references | `removeEventListener` fails with the other instance's reference, and listeners for dead connections linger forever                           |
| React context             | Provider and consumer grab different context objects and `useContext` returns `undefined`                                                    |

In this incident the first two rows were confirmed by direct measurement: responses arrived in 27–35ms and still timed out five seconds later (callback registry split), and two connections appeared (guard split). The third row I did not observe directly, but I assume it progressed alongside them in the same split structure. Then, when we added a guard that stops the send path from auto-opening the connection, a defense aimed at the symptom site, a different symptom appeared instead: immediate failures retrying at 3-second intervals, more than 30 times. Stacking defenses at the symptom site without knowing the root cause just changes the failure mode; I learned that the hard way. A different kind of defense, one that converges the state itself, comes back later in the fix section. The fourth row, React context, is the symptom of the upstream issue we will meet below: the same defect, blowing up in a different spot.

## The Verdict Flipped Inside a Synchronous Block

Back to the branch from the intro. What caught the observation was a temporary diagnostic log. Inside the branch, it printed three things together.

```text
[core] send:queue-branch {sendSaysOpen: true, openConstSame: true, sameSocketObject: false}
```

- `sendSaysOpen`: the result of calling the same `isSocketOpen()` again right after entering the branch. It being `true` while we are inside the branch means the first condition, `!socket.client`, was `true`
- `openConstSame`: whether the global `WebSocket.OPEN` constant had been tampered with. `true`, which killed the "our instrumentation broke the global" hypothesis
- `sameSocketObject`: identity comparison (`===`) of the `socket` each code path reads. **`false`**

`sameSocketObject: false` was decisive. One lesson from this: a module split is invisible no matter how long you read the source; it is caught **only by runtime object identity comparison**. When you observe a verdict flip that cannot happen in a synchronous block, the fast move is not rereading the code but checking whether the two paths really read the same object.

## The Chunk Hypothesis, Refuted

The fact that there were two copies was now established; what remained was how they became two. My first guess was chunk splitting. This package ships 50 per-file mjs modules via rollup's `preserveModules`. Had it been a single bundle, `socket` would have lived in one file no matter how the chunks split, so the files being separate looked like a necessary condition. The hypothesis: "a small utility module got promoted into a shared chunk, dragged its own dependency `socket.mjs` along, and socket ended up inside two chunks."

Verification came from a local reproduction build. Instead of digging through the deployed chunks, pin the package to the version that reproduced the problem, run the same env's build script under Turbopack, and out comes output whose **file names match the deployed ones**, including the chunk that holds the problematic socket. I grepped all 277 chunks of the build output.

```python
import glob, os

files = glob.glob('.next/static/chunks/**/*.js', recursive=True)
for marker in ['client:null', 'isSocketOpen']:
    hits = [(os.path.basename(f), open(f, encoding='utf-8', errors='ignore').read().count(marker))
            for f in files if marker in open(f, encoding='utf-8', errors='ignore').read()]
    print(marker, hits)
```

The result refuted the hypothesis. The `socket` object literal (`client:null`), the body of `isSocketOpen`, and the send function were **all in the same single chunk, exactly once each**. The chunks had not split. One object literal in the source, one in the output, two objects at runtime: that was the situation.

## Two Access Paths Inside One Factory

The answer came from opening that one chunk. In production builds Turbopack performs scope hoisting (the counterpart of webpack's `concatenateModules`: merging multiple modules into one function scope so cross-module references become plain variable access), and eight of this package's modules had been merged into a single factory.

One notation note before reading the output: the Turbopack runtime keeps a table keyed by module ID that holds each module's factory and exports (I will call it the module registry in this post). In the quotes below, `e.s(exports, id)` registers exports into that table, and `e.i(id)` looks up another module's export object by ID.

```text
748291, 130476, 862115, 57204, 495833, 620148, 379566, 214905, e => {
  "use strict";
  e.s(["default", () => el /* ... */], 748291)          // registers the socket module's exports
  var i = e.i(503112), r = e.i(291503) /* ... */        // ← 291503 = checkStatus
  e.s(["send", () => ei], 379566)
  e.s(["openSocket", () => Z], 620148)
  // ...
  let el = {client: null, state: {/* ... */}}           // the socket object literal
}
```

But the `checkStatus` module (`291503`), which contains `isSocketOpen`, was left out of this merge and remained a separate module, and inside it, socket is fetched again **through the module registry**.

```text
291503, e => {
  "use strict";
  e.s(["checkSocketConnected", () => n, "isSocketLoggedIn", () => r, "isSocketOpen", () => i])
  var t = e.i(748291)                                   // ← reaches socket via the registry
  let i = () => t.default.client?.readyState === WebSocket.OPEN
  // ...
}
```

So inside the same chunk there are two paths to socket.

| Code                                                    | Path to socket                            |
| ------------------------------------------------------- | ----------------------------------------- |
| send, open, login functions (inside the merged group)   | direct access to the `el` variable        |
| `isSocketOpen` (excluded from the merge, module 291503) | registry lookup via `e.i(748291).default` |

Rewriting the intro's branch in bundle terms: the first condition reads `el` directly, and `isSocketOpen()` reads through the registry.

```js
if (!el.client || !(0, r.isSocketOpen)()) {
```

`(0, fn)()` is the idiom bundlers use to call a function without a `this` binding, and `r` is the checkStatus module the factory above pulled in with `e.i(291503)`. That is, the second call goes through the registry one more time.

There is one more precondition. In the source, `checkStatus.ts` imports `socket.ts`, and on the merged group's side, the send function (`send.ts`) imports `checkStatus`. Module by module the chain is `send → checkStatus → socket`, but since send and socket are merged into one factory, at the factory level this is a **cycle** that loops back into itself. While the merged factory is being evaluated, execution leaves the group for checkStatus, and that module re-enters the group through `e.i(748291)`.

That is everything confirmed directly from the output. The existence of the two access paths, the cyclic structure, and the fact that at runtime the two paths returned different objects: all established. What remains is the final link, "by exactly what runtime behavior does the re-entry produce two live objects." The most plausible conjecture is that the re-entry path evaluated the merged factory one more time, the socket literal ran twice, and the two paths each grabbed the result of a different run. But I could not chase the Turbopack runtime internals to the end, so that link stays a conjecture.

## A Bug That Had Been Fixed Two Weeks Earlier

With the mechanism in hand, the next step was checking whether upstream already knew. At first I found nothing. "module evaluated twice", "duplicate module instance", "circular import singleton": all zero hits, and in hindsight that is obvious. Those are all **the vocabulary of my symptom**. The same bundler defect gets its issue title from the vocabulary of wherever it happened to blow up. Switching the search from symptom words to mechanism words, "turbopack scope hoisting", surfaced it immediately.

- [vercel/next.js#96648](https://github.com/vercel/next.js/issues/96648) "Turbopack scope hoisting breaks React context identity: …" (reported 2026-08-04, closed 08-05). The reporter's symptom: a provider mounted above, yet `useContext` returns `undefined`. Context object identity broken; the same defect wearing a different face. The reporter even wrote down the module-duplication hypothesis themselves, wondering whether the context module ends up duplicated across hoisted groups
- [PR #96691](https://github.com/vercel/next.js/pull/96691) "Don't scope hoist partial strongly connected components". Abandoned, but the title names this structure exactly: partially merging a cyclic group (a strongly connected component) treated as the bug condition itself. Eight modules merged with one member of the cycle left out is precisely our layout
- [PR #96697](https://github.com/vercel/next.js/pull/96697) "Raise registration calls in hoisted modules to the top". The fix that landed

The mechanism description in the adopted PR draws the same picture I read out of the output.

> Line 26 of scope-hoisting group A enters scope-hoisting group B, then on line 95 we re-enter scope-hoisting group A. Because our first execution of group A hadn't reached Line 29 yet to register schemas.js (which B depends on schemas.js). On non-scope hoisted modules with cycles we already raise the module registration call to the start of the factory. But when we scope hoist, we lose that.

Mid-evaluation, the merged group is exited and re-entered, and at that point the group's export registration has not finished yet. For plain modules with cycles they already hoisted registration calls to the top of the factory; the scope hoisting path had lost that. The fix raises registrations to the top of merged factories as well. Between the PR's example outcome (reading a symbol before registration yields `undefined`) and my observation (two live objects) there is one extra link needed, factory re-evaluation, which is the conjecture at the end of the previous section. The issue-side observation, on the other hand (identity split, the duplication hypothesis), is the same family as my symptom.

Then there is the version question. I checked which release contains the fix using commit-tag ancestry instead of release notes: with the `gh api` compare endpoint, `behind_by` of 0 means the tag contains the commit.

```bash
$ gh api "repos/vercel/next.js/compare/40680b95...v16.2.12" --jq '{status, behind_by}'
{"status":"diverged","behind_by":1778}   # not in the latest 16.2 either

$ gh api "repos/vercel/next.js/compare/fc7ae172...v16.3.1" --jq '{status, behind_by}'
{"status":"ahead","behind_by":0}         # contained in 16.3.1
```

| Version                                        | Contains the fix                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 16.2.3 (the version in production at the time) | No                                                                                       |
| 16.2.12 (latest of the 16.2 line)              | No                                                                                       |
| 16.3.1 and later                               | Yes ([#97308](https://github.com/vercel/next.js/pull/97308) backport, commit `fc7ae172`) |

The backport went only to the `next-16-3` branch and never landed on the 16.2 line. As long as you stay on 16.2, you live on top of this defect.

And here is where the foreshadowing pays off. The report was 2026-08-04, the fix merged 08-05, and my investigation came two weeks after that. At the moment the investigation started I already knew "the only thing that changed is the Next.js version." And I still waved it off with "surely not the framework upgrade" and dug into application and package code first. That heuristic ("it's not the compiler/framework") is right nine times out of ten, which is exactly why it is most expensive on the day it is wrong. The #96648 reporter, in fact, pinned the cause on Turbopack with a single-variable experiment contrasting `experimental.turbopackScopeHoisting: false` against a `--webpack` build. During the investigation I never ran that experiment and detoured through output analysis instead. To be fair, at the time even reading the symptoms was shaky (the receive-log misread is covered below), so there is no guarantee one experiment would have split things cleanly. But putting the experiment on the suspect list cost nothing, and not doing even that was the failure. I finally ran it, belatedly, while writing this post.

## Running the Experiment I Had Skipped

Conditions identical to the incident: Next.js 16.2.3 (fix not included), the package pinned to the version that reproduced the problem, and only one toggle flipped, `experimental.turbopackScopeHoisting: false`.

|                                     | hoisting ON (incident condition) | hoisting OFF                  |
| ----------------------------------- | -------------------------------- | ----------------------------- |
| socket module                       | merged 8-module factory          | standalone factory (no merge) |
| direct access to the socket literal | 41 sites                         | 0 sites                       |
| registry-mediated access            | 3 sites                          | 44 sites                      |

With hoisting on, socket access splits into 41 direct and 3 registry sites; with it off, all 44 sites converge onto the single registry path. The structural precondition for `sameSocketObject: false`, the dual access path, is confirmed by a single variable to be a product of scope hoisting.

I also confirmed, in the output, what the upstream fix actually changes. In the problem version's output, socket's own registration sat at the top of the factory, but four other registrations in the same factory (including send and openSocket) sat after the cycle's exit point (the `e.i` call that pulls in checkStatus). Build with 16.3.1 and all four move ahead of the exit point. The "raise registrations to the top" of #96697 happens in this artifact, for real.

So, in summary: that the dual path is a product of hoisting is confirmed, and that the upstream fix actually corrects the registration order is confirmed. But local chunks cannot be evaluated without the browser's Turbopack runtime, so how many times the factory actually gets evaluated on re-entry, the re-evaluation conjecture from earlier, remains unverified. That is where the boundary between confirmed and conjectured sits.

## Three Fixes

There are three fixes of different kinds, and all three are valid.

The first thing we shipped was a `globalThis` singleton. Pin the state to `globalThis` instead of module scope, and the state converges to one whether the module factory runs once or many times.

```ts
// internal/shared.ts
const SHARED_KEY = Symbol.for('@my-scope/realtime-core.shared/v2')

function createShared() {
  return {
    socket: {client: null, state: {requestCallbacks: {}}},
    pendingRequests: new Map(),
  }
}

const g = globalThis as {[SHARED_KEY]?: ReturnType<typeof createShared>}

export const shared = (g[SHARED_KEY] ??= createShared())
```

Making the key with `Symbol.for()` rather than `Symbol()` is the crux. `Symbol()` produces a different symbol per module copy, neutralizing the defense, while `Symbol.for()` always returns the same symbol for the same string from the global symbol registry, so whichever copy runs, it sees the same slot. I would also recommend putting the major version in the key. `globalThis` is scoped wider than the module system, so if a consumer app ever has v2 and v3 of the package coexisting, different implementations touching the same state object is the kind of accident you get.

It has to be said plainly that this defense does not prevent duplicate loading itself; it only prevents state from splitting. Still, this incident proved its worth. We shipped this defense before the mechanism was identified, and the symptom disappeared while the cause was still unknown. Unlike the symptom-site guard that had only changed the failure mode earlier, this one converges the state itself into one slot, so it holds no matter which path the split arrives by.

The root-cause removal is breaking the circular import. Stop `checkStatus` from importing `socket`; take the state as an argument instead, and the cycle is gone.

```ts
// the shape that creates the cycle
import socket from '../socket'
export const isSocketOpen = () => socket.client?.readyState === WebSocket.OPEN

// the shape that breaks it
export const isSocketOpen = (socket: SocketState) =>
  socket.client?.readyState === WebSocket.OPEN
```

That said, in a package like this where nearly every module references the central state, cycles regrow easily. It is not a problem that ends by cutting one, so break the cycles, but keep it separate from the defense.

The last one is moving to Next.js 16.3.1 or later. It carries the registration-order fix, and as shown in the previous section, our own artifact has the four registrations climb above the exit point. There was one incidental cost: in our reproduction environment, merely bumping the version made long-dormant type errors, unrelated to the bundler, surface first. An upgrade comes with that kind of cleanup as a prerequisite.

So, after upgrading, can we remove the `globalThis` defense? We decided not to. A library controls neither its consumers' bundlers nor their framework versions. There is no backport on the 16.2 line, so consumers staying on 16.2 still live on the defect, and a bundler's module merging is an optimization that depends on the shape of the whole module graph, which makes it hard to predict which combination produces the next defect of this family. A defense that converges state into one no matter how many copies of the module get loaded is, as far as I know, the only one of its kind. Output snapshot checks or object-identity smoke tests can detect the defect, but they cannot block the symptom. "If a package owns a singleton, pin it to `globalThis`" being the convention is the practical conclusion of this incident.

One more thing worth adding: when you leave this defense in the code, leave a comment or a document saying "this is a design decision, not a workaround." Otherwise, months later someone opens a PR saying "upstream fixed it, let's remove this ugly global," and a reviewer without the context approves it.

## What Remains

The technical conclusions ended above, but why this investigation took a full day deserves its own record. Not because the cause was hard, but because the observations kept lying.

The biggest one, as already written, was the failure of suspect selection, and at its root sat the instinct that "the bug is obviously in my code." That instinct is right nine times out of ten, so the framework and the bundler never even made the suspect list. Facing an observation that could not happen in code, my suspicion kept pointing inward (my source, my instrumentation, my config), and the most recently changed thing (the framework version) came off the list unverified. The more impossible the observation looked, the more I regressed to "I must be misreading something" and reread the same source, while the answer sat outside the source, in the bundle output. That a heuristic is usually right is no reason to skip verification, especially when putting the experiment on the list costs nothing.

The debug logs lied too. A receive-event log stamped at 27ms after the response arrived read as "response received and handled," but that log sat in a position that prints regardless of whether a callback exists. In reality the callback was never found and the request timed out five seconds later. **A receive log is evidence of receipt, not evidence of handling.** When reading a log, you have to read which branch it prints inside.

I also made a wrong refutation. "The stack trace offsets match, so there is one copy of the module": wrong, because two module records can share the same code. It took the limits of a method as a fact, and that misread threw away the right answer (two instances) once before I got it back.

There were weapons gained, too. Instead of scraping production, **a local build under the same conditions (version, env, bundler) reproduces output matching down to the key chunks' file names**. When hunting for an upstream issue, sweep with the mechanism's vocabulary (scope hoisting) before your own symptom's vocabulary. And "in the same chunk" and "the same instance" are different statements: a bundler's module merging and the runtime's module registry operate at different stages, and access paths can fork even inside one chunk.

Any package that exports mutable state at module scope (a Map, a Set, a registry, a cache) stands on the same trap. This one blew up big because it holds a lot of state whose integrity is the feature itself, not because this package is special.

One aside. I had been away from hands-on work for a while, and the first bug to greet me properly on my return happened to be this one. It brought back, fully intact, the memory of eating bug after bug while bumping versions in the early App Router days. Not a pleasant reunion.

## References

- [vercel/next.js#96648 - Turbopack scope hoisting breaks React context identity](https://github.com/vercel/next.js/issues/96648)
- [vercel/next.js#96697 - \[turbopack\] Raise registration calls in hoisted modules to the top](https://github.com/vercel/next.js/pull/96697)
- [vercel/next.js#96691 - \[turbopack\] Don't scope hoist partial strongly connected components](https://github.com/vercel/next.js/pull/96691)
- [vercel/next.js#97308 - \[backport\] \[turbopack\] Raise registration calls in hoisted modules to the top](https://github.com/vercel/next.js/pull/97308)
- [webpack ModuleConcatenationPlugin (scope hoisting)](https://webpack.js.org/plugins/module-concatenation-plugin/)
