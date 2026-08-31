---
title: 'Tearing Apart a <em>Third-Party SDK</em> and Rebuilding It My Way: Without Touching a Single Line of Logic'
tags:
  - bundler
  - tree-shaking
  - testing
  - sdk
  - frontend
published: true
date: 2026-08-31 14:00:00
description: 'I imported one constant and 97.7% of the bundle came along with it. The vendor had no timeline for a fix, so I pried open the published source maps, recovered over 400 TypeScript files, and rewrote the build, the entry points, and the dependencies however I wanted. Everything except the logic. That got /send to -77.5% raw. The hard part came after. All 1,932 tests passed, and a few of them were watching nothing at all.'
thumbnail: /thumbnails/2026/08/rebuilding-a-vendor-sdk.png
---

## Table of Contents

## 375KB for a Single Constant

We were using the web SDK of an experimentation platform SaaS. The kind of package that handles A/B tests, feature flags, and event collection all at once. One day, while poking around the bundle, I noticed that a file importing a single enum constant was oddly heavy. I built a minimal case and measured it.

```ts
// This is the whole thing. createInstance is never called.
import {EvaluationReason} from '@vendor/js-sdk'
console.log(EvaluationReason.DEFAULT_RULE)
```

| Scenario                             | raw       | gzip     |
| ------------------------------------ | --------- | -------- |
| One constant imported                | 383,698 B | 93,628 B |
| Real usage (`createInstance` called) | 392,745 B | 96,851 B |

Importing a single constant left 97.7% of the real-usage bundle in place. Even after compression it is 96.7%. In absolute terms, 374.7KB raw and 91.4KB gzip. Tree shaking was not partially weak here. It was effectively not working at all.

This is the record of recovering that SDK from its source maps and rebuilding it. Half of it is about making things smaller. The other half is about how I verified the claim that I did not change a single line of logic. The second half took more time, and taught me more.

> Measurements were taken on macOS, bundled with esbuild 0.24, then compressed with `zlib` gzip level 9 and brotli defaults. Every KB figure in this article uses 1KB = 1024 bytes, and raw byte counts are given alongside. While writing this article I re-ran the per-subpath size table on Node 24.20.0 and confirmed a 0.0% match against the baseline, and I re-measured the vendor baseline row with the same esbuild settings and confirmed that 94.9KB gzip and 78.8KB brotli reproduce. The vendor is anonymized. The package name, version, internal class names, feature names, and subpath names have all been generalized down to their roles, so they are not the real names. The numbers are exactly what the entries behind those names measured. Code samples taken from vendor source have been reduced to structure only.

## Why I Decided to Build It Myself

I asked the vendor to fix it first. I sent a cause analysis with measured numbers, and the answer was "acknowledged, but no timeline." I do not think that answer is unreasonable. Changing an SDK's build pipeline affects the runtime of every customer, so it is natural for that work to slip down the priority list.

That said, there was no reason to keep shipping 91KB compressed, 375KB uncompressed, while waiting. Looking at how we actually consumed it made the situation feel more wasteful. Across the eight repositories using this SDK, most of them were **only sending events**. A handful actually called A/B test evaluation, and nobody was using the message UI at all. Unused features made up most of the bundle.

So I decided to build it myself, with one condition attached. **Do not touch the features or the logic.** That is not taste, it is risk management. The events this SDK sends flow into a dashboard and become the basis for experiment decisions. The moment we "improve" the logic, nobody can be confident about what the numbers on that dashboard mean anymore. Even fixing a bug is dangerous. This SDK actually has a bug where the timezone property always goes out as an empty string, and I decided to leave that alone too. It comes back later.

That left three options.

**Rewrite it from scratch.** The public API is the specification, so implementing the same interface would work. It is the cleanest option, but it means reproducing the evaluation engine's bucketing hash and more than twenty target matching operators bit for bit. Get one of them wrong and the experiment assignment for some set of users changes. It changes with no exception and no warning, so the side that shipped it gets no signal at all.

**Fork it.** The source repository is not public, so this was impossible.

**Recover the source from the published artifact.** The published package shipped source maps alongside the code, and the `sourcesContent` field held the original TypeScript in full. That removes the need to reproduce the logic. You just use the logic itself.

I went with the third. The license is ISC, so redistribution and modification are allowed, and internal use meant no distribution concerns. I did put the original-work notice in a separate file. The original package does not include the LICENSE text in its published artifact, so I reconstructed the standard text with the copyright holder it declares, and I noted in that same file that the reconstructed text is not the original.

## Two Causes, Different Sizes

Before starting the recovery I separated the causes precisely. Getting this wrong would have cost weeks in the wrong direction.

**First, reachability.** The moment you call `createInstance`, the UI code that draws things on screen, the bridge that talks to the native app, and the parser that extracts device information all become reachable code. From the bundler's point of view there is no basis for removing them. They really are used. This is not a tree-shaking problem, and it is not the kind of thing you fix by adjusting a `sideEffects` declaration or switching bundlers. Splitting the entry points is the only way out.

**Second, side effects that cannot be proven absent.** The tsconfig target was ES5, so every class was compiled into an IIFE. It looks like this.

```js
var Bucketer = /** @class */ (function () {
  function Bucketer(murmur) {
    this.murmur = murmur
  }
  Bucketer.prototype.bucketing = function (bucket, id) {
    /* ... */
  }
  return Bucketer
})()
```

Because it is an immediately invoked function, the bundler cannot prove it is side-effect free. There is no `/*#__PURE__*/` annotation either. So even unreachable code stays. Counting this pattern in the published artifact came to close to 500 occurrences.

Both are real causes, but they are not the same size. To check, I force-injected PURE annotations into the published artifact and measured again.

| Scenario                              | raw       | gzip     |
| ------------------------------------- | --------- | -------- |
| One constant imported (original)      | 383,698 B | 93,628 B |
| One constant imported + PURE injected | 58,725 B  | 24,736 B |
| Real usage (original)                 | 392,745 B | 96,851 B |
| Real usage + PURE injected            | 381,701 B | 95,684 B |

PURE annotations cut 73.6% in the synthetic case of importing one constant. Dramatic. In real usage, they cut only 1.2%. That is the expected result, really. Once you actually construct a client, most of the code becomes reachable, so proving side-effect freedom is no longer the bottleneck.

What this table told me was that **entry splitting is the main body of the work, and raising the ES target is an improvement layered on top of it**. If I had skipped this measurement and followed the intuition that "the IIFEs are the culprit," I would have bumped the build target, settled for a 1.2% improvement, and called it done. Measuring two causes separately is something you skip more often than you would think, and in this case it decided the direction.

## Recovering TypeScript from Source Maps

Source maps are usually thought of as a debugging aid, but they are actually a format capable of carrying the entire original source. The Source Map v3 spec has an optional `sourcesContent` field (the full text of each original file) sitting right next to `sources` (the list of original file paths). If a bundler fills that field on the way out, the source map alone contains the complete original source.

```json
{
  "version": 3,
  "sources": ["../src/core/internal/evaluation/bucket/Bucketer.ts", "..."],
  "sourcesContent": [
    "import { Bucket } from \"../../model/model\"\n\nexport class Bucketer {\n...",
    "..."
  ],
  "mappings": "AAAA,OAAO..."
}
```

This vendor was publishing source maps with `sourcesContent` filled in, right there on npm. That is common. Both rollup and webpack include this field by default once source maps are enabled, and turning it off requires explicit configuration. So the moment you put source maps in your published artifact, your pre-compilation source goes out with it.

Recovery itself is therefore simple. Parse it and write the files back out.

```js
const map = JSON.parse(
  readFileSync('vendor/unpacked/package/lib/index.browser.es.js.map', 'utf8'),
)

let count = 0
map.sources.forEach((source, i) => {
  const content = map.sourcesContent?.[i]
  if (!content) return
  if (source.includes('node_modules')) return // skip third party such as polyfills
  const rel = source.replace(/^(\.\.\/)+/, '').replace(/^src\//, '')
  const target = join(OUT, rel)
  mkdirSync(dirname(target), {recursive: true})
  writeFileSync(target, content)
  count++
})
```

That produced a bit over 320 files. But the published `.d.ts` count was over 400. More than 80 were missing, for two distinct reasons.

**First, type-only modules do not survive in source maps.** A file containing only interfaces and type aliases produces zero lines of runtime code when compiled. The bundler removes that module entirely, and a removed module has no region in the bundle to map to, so it leaves no trace in `sourcesContent` either. About 70 files fell into this bucket, and they included core contracts such as the client interface, the event dispatcher, and the lifecycle listener. I filled these by copying the published `.d.ts` files over as `.ts`. Since the contents are pure type declarations, changing only the extension is valid.

**Second, code that does not go into the browser bundle is not in the browser source map.** At first I only read the browser ESM source map, and nine files belonging to the Node-only entry stayed empty. This package emits separate browser and Node builds and publishes separate source maps for each. Reading the Node bundle's source map once more filled those nine with real implementations.

The order matters here. Initially those nine were filled by the `.d.ts` backfill, and a `.d.ts` backfill is a shell with types and no implementation. Typechecking passes and the build succeeds, so it went unnoticed for a while. When multiple source maps are published, read all of them, and process them in an order that never overwrites what has already been filled.

```js
// After filling from the browser source map, fill only the gaps from the Node one
nodeMap.sources.forEach((source, i) => {
  const content = nodeMap.sourcesContent?.[i]
  if (!content || source.includes('node_modules')) return
  const target = join(
    OUT,
    source.replace(/^(\.\.\/)+/, '').replace(/^src\//, ''),
  )
  if (existsSync(target)) return // leave what the browser source map already filled
  writeFileSync(target, content)
})
```

In the end I got about 320 files from the browser bundle, nine from the Node bundle, and about 70 from the type declaration backfill. Adding the three together matched the published `.d.ts` count exactly, with nothing left over.

### Why the Counts Are Hardcoded in the Script

The recovery script asserts a count at every stage.

```js
if (count !== EXPECTED_RUNTIME_SOURCES) {
  console.error(
    `expected ${EXPECTED_RUNTIME_SOURCES} runtime source files, got ${count}`,
  )
  process.exit(1)
}
```

I thought this was excessive at first, and it turned out to be the only basis for reproducibility. The most fundamental claim this repository makes is "this source is not something we wrote, it is what the vendor published," and the only way to check that claim is to run the script again and see whether you get the same result. If even one count differs, that check falls apart. During code review, a reviewer ran the re-extraction with `--force` and independently reproduced all three counts, and that became the strongest evidence in this repository for the source recovery.

For the same reason I added one more guard. The script wipes and regenerates its output directory, and after the recovery we create and edit files under that same path. Running it again absentmindedly destroys all of that work.

```js
if (existsSync(OUT) && !FORCE) {
  console.error(
    `${OUT} already exists.\n` +
      `The vendor source is committed to git, and extract is a one-time bootstrap tool.\n` +
      `Running it again wipes every local edit under this path.`,
  )
  process.exit(1)
}
```

In the planning stage, the final verification chain was `pnpm install && pnpm extract && pnpm build && pnpm test`. Left as it was, the final verification would have deleted every artifact produced up to that point and failed. That was when it became clear that recovery is not a repeatable build step but a bootstrap that runs once on a fresh clone.

### The Restored Source Is Not Ours to Edit

After the recovery I set one rule. Do not touch anything under `src/`. Simple to say, and I kept bumping into it in practice.

Running the linter produced a flood of correctness-level errors from the original source. One parser file alone had over 160 unnecessary regex escapes. My first move was to run `--fix`, and that was a mistake. That file generates the properties the SDK collects automatically, so it had to stay byte-identical to the vendor's. The moment you "normalize" those regexes, the equivalence claim collapses. I reverted close to 130 changed lines.

In the end I turned five rules off: `no-useless-escape`, `no-document-cookie`, `no-extra-boolean-cast`, `no-wrapper-object-types`, and `no-useless-fallback-in-spread`. All of them fire only in the restored source, and that code is off-limits, so there is structurally no action to take. A rule that fires as an error when no action is possible is a defect in the lint configuration, not in the code. Byte equivalence wins and the lint config bends.

There is a cost, of course. The same violations in code we write ourselves will not be caught either. These five are low-value rules so I accepted that, but I recorded the acceptance itself in the decision log rather than as a comment in the config file. If all the next person knows is that a rule is off, the only thing they can do is turn it back on and see. What it was protecting and what was given up in exchange have to be written down together before anyone can decide whether to re-enable it.

### I Found Some Bugs and Did Not Fix Them

Stare at someone else's code this long and the odd parts start standing out. I found a few, and **left all of them alone.**

**The timezone always goes out as an empty string.** In the code that builds device properties, a screen orientation variable is assigned without ever being declared. The compiled artifact runs in strict mode, so that line throws a `ReferenceError` and the timezone assignment on the very next line is never reached. As a result, the timezone field is permanently empty on the dashboard of every service using this SDK.

**`close()` does not undo its global patches.** The lifecycle manager wraps `history.pushState` and `replaceState` at install time, and closing the client leaves those wrappers in place. Create and close several instances on one page and the wrappers stack up, with dead instances still reacting to routing events. This defect comes back later. It turned out to be the culprit that quietly broke one of our tests.

**A type declaration contradicts the actual behavior.** The transport layer interface declares the beacon transport as `| null`, while the actual code always constructs it regardless of support. A nullable type is attached to a value that can never be null.

**Device information is parsed twice per event.** The browser property generator and the device property generator each call the parser independently. That string never changes over the lifetime of the page, and the parser is a regex table over 900 lines long. It looked like a very plausible memoization candidate.

I fixed none of the four, for one reason. **The goal of this work is not "behaving correctly" but "behaving exactly like what is currently deployed."**

Fix the timezone and a field that was empty until yesterday suddenly starts filling in. On a dashboard that reads as a discontinuity in the metric, not an improvement. The data splits at the swap date, and later, anyone looking at that stretch has to start by investigating what happened. The type declaration is the same story. Fixing it can produce compile errors in consumer code written against that type, which contradicts the drop-in replacement we promised.

So the improvements I did make were confined to **things that change no behavior at all**: the shape of the build artifact, the entry structure, polyfills, and runtime dependencies. All four change only the size and shape of the files a consumer downloads, never the values that code produces when it runs. That is exactly the point the verification later in this article confirms.

The device information parsing case shows the boundary well. That one is a pure performance improvement that changes no values, the kind you are allowed to make. So I measured before making it, and got **0.0060ms per call, 0.012ms per event.** Collapsing two calls into one buys six microseconds per event. That is far too cheap to justify introducing a cache and then worrying about its invalidation conditions forever. So I left it out.

That is what "only obvious improvements" means. I measured before adding it, and once measured there was no reason to add it.

## Revisiting Polyfills from First Principles

The recovered entry file had these two lines at the top.

```ts
import 'core-js/features/promise'
import 'core-js/features/array'
```

My first thought was "they must have added it for browser support." Checking it, the cost of those two lines turned out to be larger than expected.

Open the published bundle and core-js 3.x is **inlined**. It is not left as an external import for the consumer to resolve, it is inside the package. And core-js is a polyfill, so it patches global built-ins. The `__core-js_shared__` global key sitting inside the bundle is the evidence.

I measured the share using the source map's `sources` list. Of the source that went into the bundle, core-js accounted for about 240 files and roughly 200KB, while the vendor's own source was about 320 files and roughly 790KB. By pre-compression source bytes, 20% of it was polyfill.

> That 20% is measured in source bytes before compilation and compression, so it differs from the share in the final artifact. Polyfill code has a lot of repeated patterns and compresses well, so the gzip share is likely lower than this. I did not measure the exact gzip contribution.

So I went back to first principles on "what is this polyfill for." The order went like this.

**First, I checked what it injects.** `core-js/features/*` is the widest of core-js's three entry families. `core-js/es/*` carries only finalized standards, `core-js/proposals/*` carries only proposal-stage features, and `features/*` is **the union of both**. Which means those two lines install not just finalized standards but proposal-stage methods that are not standards yet, straight onto the globals.

**Next, I counted what is actually used.** I did an exhaustive scan of the recovered runtime source, looking for the ten proposal-stage methods that `features/*` adds on top. The result:

```text
.group  .groupBy  .groupToMap  .toReversed  .toSorted
.toSpliced  .uniqueBy  .filterOut  .filterReject  .lastItem
                                              all zero
```

Not once. Which means using `es/*` instead of `features/*` would have made no difference at all.

**Then I laid out which built-ins are actually used and where each one's native support floor sits.**

| Feature                                  | Uses  | Standard      | Native support floor            |
| ---------------------------------------- | ----- | ------------- | ------------------------------- |
| Promise, async/await                     | 90+   | ES2015        | everything except IE11          |
| Map / Set                                | 21    | ES2015        | everything except IE11          |
| `Array.from`                             | 22    | ES2015        | everything except IE11          |
| `Array.prototype.find` / `includes`      | 42    | ES2015/ES2016 | everything except IE11          |
| `Object.entries` / `values` / `assign`   | 18    | ES2017        | Chrome 54, Safari 10.1          |
| `String.prototype.startsWith`/`endsWith` | 7     | ES2015        | everything except IE11          |
| **`Array.prototype.flat` / `flatMap`**   | **3** | **ES2019**    | **Chrome 69, Safari 12, FF 62** |

The picture was clear once the table existed. Without any polyfill, nearly everything runs as long as you drop IE11. The only thing single-handedly raising the support floor was `flat` and `flatMap`, in three places.

**So I rewrote those three with `reduce`.** Two collection utilities and one storage file, each a two or three line change.

```ts
// before
return groups.flatMap((it) => it.items)

// after
return groups.reduce<Item[]>((acc, it) => acc.concat(it.items), [])
```

That substitution dropped the floor to the ES2017 line that `Object.entries` sets (Chrome 54, Safari 10.1). I then set the build's syntax target to the same ES2017. When the two are out of step, "which browsers does this SDK run on" has two answers, and a band opens up in between where the syntax parses but the method is missing and the code dies.

**The conclusion was to ship no runtime polyfill in the bundle.** I deleted the two core-js imports, and our build artifact has zero core-js references.

I want to write down one more piece of reasoning behind this. **I think polyfills are the application's responsibility, not the library's.** If the application already carries the same polyfill, the library's copy ships redundantly, and code for browsers the application decided not to support comes along too. The more troublesome part is the global patching. You merely import a library and `Array.prototype` changes. How far to support is the application's call, and a library that carries polyfills ships with that call already made for you.

For consumers who do need IE11, I put guidance in the README on importing `core-js/es` from the application entry point. Whoever needs it should add as much as they need, and not removing that option is what a library ought to do.

## Getting to Zero Dependencies

The vendor package had two runtime dependencies. A UUID generation library and a base64 library.

```json
"dependencies": {
  "js-base64": "^3.x",
  "uuid": "^8.x"
}
```

By size alone it is not much. Bundling each as a minimal usage example measures the UUID one at 1,180 B raw and 619 B gzip, and the base64 one at 3,779 B raw and 1,668 B gzip. But for a package like this SDK, one that **many repositories pull in commonly**, I think the cost of a dependency is not measured in bytes alone. If eight repositories use this SDK, those two packages land in eight lock files, their advisories show up in eight security audit results, and they become version conflict resolution targets eight times over. The more shared the package, the more the ripple of a single dependency multiplies.

So I removed both. The way I removed them differed, though.

### UUID: Not a Lighter Library, but the Platform

The first proposal was to swap `uuid` for `nanoid`. It is smaller, so that is a natural idea. It just did not fit this case.

This SDK uses UUIDs in three places: the insert identifier attached to every event, the device identifier persisted in localStorage, and the session identifier. The session identifier was the specific problem.

```ts
sessionId = `${timestamp}.${uuidv4().slice(0, 8)}` // 8 lowercase hex chars
```

It slices the first 8 characters of a v4 UUID. Which means the format, 8 lowercase hexadecimal characters, is exposed directly in the output. nanoid's default alphabet is `A-Za-z0-9_-`, producing values like `V1StGXR8`, and that changes the format of the session identifier itself. The device identifier is transmitted to the server as the UUID string verbatim, so it has the same problem.

To preserve the format you would have to assemble the dashes and the version and variant bits by hand on top of `customAlphabet('0123456789abcdef')`, and that is a homemade UUID generator using nanoid purely as a random source. If it comes to that, using what the platform already provides is better.

So I went with `crypto.randomUUID()`. There was a trap here, though.

```ts
export function v4(): string {
  const c = globalThis.crypto
  if (typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }

  // Fallback: take 16 bytes from getRandomValues and assemble the v4 format
  const bytes = new Uint8Array(16)
  c.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant bits

  let hex = ''
  for (let i = 0; i < 16; i++) {
    hex += (bytes[i] + 0x100).toString(16).slice(1)
  }
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
```

The reason the fallback is mandatory rather than optional is in the WebCrypto spec's IDL.

```text
interface Crypto {
  [SecureContext] readonly attribute SubtleCrypto subtle;
  ArrayBufferView getRandomValues(ArrayBufferView array);
  [SecureContext] DOMString randomUUID();
};
```

`randomUUID` carries `[SecureContext]`; `getRandomValues` does not. Which means on a site served over http, `randomUUID` does not exist at all. A third-party SDK does not get to choose where it is embedded, so it has to assume that path.

| Support             | `randomUUID` | `getRandomValues` |
| ------------------- | ------------ | ----------------- |
| Chrome / Edge       | 92           | 11                |
| Firefox             | 95           | 21                |
| Safari / iOS        | **15.4**     | 5                 |
| IE                  | none         | 11                |
| Secure context only | **yes**      | no                |

I learned something here. MDN's browser-compat-data does not have `secure_context_required` set for `randomUUID`. **Looking only at the compatibility table, you miss this constraint.** Only after checking the spec IDL directly did the conclusion that the fallback is mandatory become clear.

### base64: Five Lines and a Library Comparison

The base64 side was simpler. It was used in exactly two places, in the form `Base64.encodeURL(JSON.stringify(identifiers))`. We were shipping 3,779 B raw and 1,668 B gzip for a single base64url encoding.

```ts
export function encodeBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input)

  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
```

The key point is building UTF-8 bytes with `TextEncoder` first rather than handing the string straight to `btoa`. This value carries user identifiers, which can contain non-ASCII, and `btoa` throws once you leave the latin1 range.

The problem was that this function **must not differ from the original library by even one byte**. The result rides in a request header that the server parses. So I wrote the test as a comparison. I removed the library from shipping dependencies but kept it as a devDependency, and keep comparing our implementation against it side by side.

```ts
it('matches at every padding boundary from length 0 to 64', () => {
  for (let n = 0; n <= 64; n++) {
    const s = 'x'.repeat(n)
    expect(encodeBase64Url(s)).toBe(Base64.encodeURL(s))
  }
})

it('matches for 2000 random unicode strings', () => {
  const rand = lcg(20260830) // fixed seed; a corpus that shifts per run cannot reproduce a failure
  for (let i = 0; i < 2000; i++) {
    /* ... build a string from arbitrary code points and compare ... */
  }
})
```

The reason for walking every padding boundary from 0 to 64 is that base64 padding branches on the input byte length modulo 3, and `encodeURL` strips the `=`. All three cases have to be exercised. The reason for fixing the seed on the random corpus is that failures have to be reproducible. If the corpus shifts every run, a case that blew up once in CI can never be recreated.

This test is a different animal from the vendor comparison discussed later. It does not compare against the vendor's published artifact, it **compares directly against the library being replaced**. In terms of evidential strength this one is arguably stronger, since it confirms that outputs are string-identical for the same input across 2,000 cases.

### On Security Audit Numbers

Getting to zero dependencies had a side effect: the shipped artifact's vulnerability count also went to zero.

During the work `pnpm audit` reported 7 findings (1 critical, 1 high, 5 moderate), and opening them showed six were devDependency-only. Test runner, bundler, and dev server issues. Exactly one touched the shipped artifact, and even that one concerned an API path we do not use. It described the UUID library skipping a bounds check when a specific function is given a buffer argument, and this SDK calls it with no arguments in all seven call sites.

**GitHub's warnings do not separate dev from prod.** So the raw number looks more urgent than it is. This repository, too, initially had "8 vulnerabilities, 2 critical" written down. Rather than being pressured by a number into a rushed major upgrade that shakes the verification infrastructure, I think splitting by shipped-or-not comes first. Clearing the six dev findings would take a two-major-version jump on the test runner, and that is exactly the sort of change that could break the vendor comparison harness described later, so it must not be mixed into the same commit as a functional change.

## Only the Assembly Changes

Touching the **assembly** rather than the logic is the whole of the remaining work. The original entry file created every component in order and wired them together in a single file of close to 700 lines. I split that into per-feature factories.

```text
assembly/base.ts          shared (config, user manager, transport)
assembly/send.ts          event sending
assembly/eval.ts          evaluation engine
assembly/messaging.ts     message UI
assembly/integration.ts   external integrations
assembly/redirect.ts      URL branching
```

On top of that I put eight entry points: `.` (everything), `./core`, `./send`, `./eval`, `./config`, `./message`, `./bridge`, and `./redirect`. A consumer that only sends events takes `./send`, and one that only evaluates does not receive the message UI.

Assembly order is meaningful in places. Change the order in which listeners register with the session manager, for instance, and the ordering between the session start event and campaign handling flips. Reading the code alone, it is hard to tell whether an order is meaningful or incidental, so I added a separate test that pins the order itself. The mutation battery described later includes an entry that reverses the listener registration order.

## Here Is Where I Got It Wrong

I built the `./send` entry and the evaluation engine kept coming along with it. Wondering why event sending needed an A/B test evaluator, I looked and found the core class's `create()` registering the evaluators unconditionally.

My first solution went like this. Take boolean flags for which evaluators to register, and pass all false from `./send`.

```ts
// I thought this would work
static create(registrations: { evaluator: boolean; messageUi: boolean }) {
  if (registrations.evaluator) {
    registry.register(new VariantEvaluator(...))
  }
  if (registrations.messageUi) {
    registry.register(new MessageUiEvaluator(...))
  }
}
```

It works. The evaluators are not constructed at runtime. And the bundle did not shrink by a single byte.

Which was obvious in hindsight. Even with the flag false, the **static reference** `new VariantEvaluator(...)` is still sitting in the file. As far as the bundler is concerned, this module still reaches the evaluator modules. What I changed was a runtime condition on "whether to construct," and it severed no edge in the module graph at all.

Conditional branches have no power against tree shaking. What has to be severed is the import, and that only happens when you physically move the code into a different file. In the end I moved evaluator assembly entirely out of the core class into a separate module and inverted `create()` so that it takes already-assembled components as an argument. Only once the evaluator imports inside the core file hit zero did the target matching code actually drop out. That is a 41KB chunk, uncompressed.

The reason I bother writing down this mistake is that I nearly made the same call again later. Estimating which entry pulls in which module by grepping files is wrong more often than not. When removing the base64 library, I predicted from grep results that "`./send` should be unaffected" and saw the exact opposite. The entry that shrank the most when that library was removed was `./send`, at -5.1%. The cohort lookup module really was in the `./send` graph, and a file listing does not show that. So now, when I want to know which module lands in which entry, I bundle that entry once with esbuild and dig through the output. It takes longer than grep, and no estimation goes into it.

## Shipping as ES Modules

Splitting the entry points is pointless if the artifact still has the same shape as the vendor's. The vendor's published artifact comes as UMD, ESM, and a few minified builds, and every one of them is a **single pre-bundle**. All the code is already merged inside one file, so even when the consumer's bundler looks at it, there are no module boundaries. There is no line to cut along.

So I rebuilt the build to preserve modules.

```ts
build: {
  target: 'es2017',
  minify: false,
  sourcemap: true,
  lib: { entry: entries, formats: ['es', 'cjs'] },
  rollupOptions: {
    external: [],
    output: { preserveModules: true, preserveModulesRoot: 'src' },
  },
}
```

`preserveModules` is the key. It emits about 340 files while keeping the shape of the source tree. The consumer's bundler can now judge reachability file by file.

The rest of the settings each have a reason.

**`minify: false`.** A library should not minify. Minification is the consumer's bundler's job, on the consumer's settings. Ship pre-minified and the consumer's optimizations run on top of already-mangled code, and debugging has to route through a source map. The vendor treating a minified build as the default entry point is part of why its artifact became a pre-bundle in the first place.

**`external: []`.** There are no runtime dependencies, so it stays empty. But this is not empty "because there are none," it is empty **because that is what makes mistakes visible**. If someone accidentally imports an external package, an empty external list means the build tries to pull it into the bundle and fails. With something listed, it gets externalized silently, and an artifact goes out demanding a package the consumer never installed.

**`type: "module"` and `sideEffects: false`.** Without the latter, the bundler treats each module as "possibly has side effects" and keeps it. Earlier I said the ES5 IIFEs made side-effect freedom unprovable; this declaration is the mechanism that supplies that proof at the package level instead.

Then the `exports` map opens the eight entry points, each wired with types, ESM, and CJS together.

```json
"exports": {
  "./send": {
    "types": "./dist/index.send.d.ts",
    "import": "./dist/index.send.js",
    "require": "./dist/index.send.cjs"
  }
}
```

### The Trap Where Only Types Break

I got caught here once. The build succeeded, the tests passed, the runtime was fine, and for some consumers the types would not resolve.

The cause was that relative imports in the `.d.ts` files had no extension. The plugin that generates type declarations emits `from './Bucketer'` without an extension, while the `.js` output from the same build emits `from './Bucketer.js'` with one. The two are out of step.

A `moduleResolution: bundler` consumer never notices this mismatch, because it resolves extensionless specifiers on its own. A `node16` or `nodenext` consumer is stricter and raises TS2835 and TS2307. On our side that came to 24 errors.

Fixing the imports in the source was an option, but that side is restored vendor code and off-limits. So I attached a script after the build that fixes only the artifact. It leaves specifiers that already have an extension alone and appends `.js` only to relative ones. It currently corrects 377 files per build.

### Two Typechecks Are Two Different Claims

What this incident left behind is not the extension-fixing script but the gate that grew next to it.

`pnpm typecheck` looks at **our source**. It does not look at whether a consumer can resolve the `.d.ts` files in `dist`. Those are two different claims, and running only one of them makes it easy to mistake them for the same claim. What actually broke here was only the latter, while the former stayed green the whole time.

So I added a separate consumer-perspective check. It stands the package up in a temporary project, imports all eight entry points, and runs `tsc --noEmit`, doing so twice with `moduleResolution` set to `bundler` and to `node16`. And it does not enable `skipLibCheck`. Turning that on skips exactly what this check exists to catch.

"The typecheck passes" means different things depending on which typecheck. The theme of the later part of this article makes an early appearance right here.

## Results

The baseline is the vendor's published artifact. The reason the 93,628 B at the top of this article differs from the 94.9KB in this table is that the scenarios differ. The former is a synthetic case importing one constant; this one is a consumer that installs the package and actually uses it.

| Subpath     | raw      | gzip    | brotli  | vs. vendor (raw / gzip) |
| ----------- | -------- | ------- | ------- | ----------------------- |
| `/send`     | 86.4 KB  | 26.2 KB | 22.9 KB | **-77.5% / -72.4%**     |
| `/bridge`   | 113.7 KB | 31.1 KB | 27.0 KB | -70.4% / -67.2%         |
| `/config`   | 154.3 KB | 42.0 KB | 35.7 KB | -59.8% / -55.8%         |
| `/eval`     | 158.6 KB | 42.8 KB | 36.3 KB | -58.6% / -54.9%         |
| `/redirect` | 161.8 KB | 43.7 KB | 36.9 KB | -57.8% / -54.0%         |
| `/core`     | 170.8 KB | 45.1 KB | 38.2 KB | -55.5% / -52.5%         |
| `/message`  | 202.0 KB | 52.5 KB | 44.3 KB | -47.3% / -44.7%         |
| `.` (all)   | 264.3 KB | 65.3 KB | 54.3 KB | -31.1% / -31.2%         |
| Vendor      | 383.7 KB | 94.9 KB | 78.8 KB | baseline                |

Even importing `.` as-is without touching the subpaths cuts 31.1% raw and 31.2% gzip. That is because the artifact itself got smaller independently of the entry split, and the polyfill and dependency removals are included in that figure.

There was a trap in the measurement method. At first I measured by pointing directly at built `dist` files by path, which skips the `exports` map and the `sideEffects` declaration and yields numbers 2 to 3% optimistic. Now I build the package, install it into a temporary project's `node_modules`, and bundle by importing the package name. A script automates that procedure, and a baseline file blocks regressions. The table above was re-run while writing this article and confirmed to match the baseline at 0.0% across all eight.

The structural change shows up too.

|                     | Vendor            | This repository        |
| ------------------- | ----------------- | ---------------------- |
| ES5 IIFE classes    | close to 500      | **0**                  |
| Native `class`      | 0                 | close to 460           |
| Module structure    | single pre-bundle | ~340 modules preserved |
| Public entry points | 1                 | 8                      |
| Runtime deps        | 2                 | **0**                  |
| core-js references  | inlined           | **0**                  |

## But Is It the Same Thing?

That is the part worth bragging about, and the hard part really starts here.

Everything so far is the claim "what we built is smaller." For that claim to mean anything, a condition has to be attached in front of it. It only matters **if it is the same thing**. If even one evaluation result differs, experiment assignment changes; if one key drops from the event payload, a dashboard metric quietly goes out of alignment. The quiet part is the problem. An error at least gets noticed, but this kind of drift arrives weeks later as "these experiment results look a bit odd."

The argument "we recovered the source and did not change the logic, therefore it is the same" is weaker than it sounds. I changed the assembly order, split the entry points, stripped the polyfill, replaced two dependencies with native APIs, and rewrote three `flat`/`flatMap` call sites as `reduce`. Each looks trivial, but if the only basis for a trivial-looking change being safe is that it looks trivial, that is not a basis.

So I decided to write tests, and here another distinction was needed. A test where we assert values only proves that **our implementation matches our expectation**. It is not evidence that the vendor produces that value too. Our expectation could itself be the result of misreading the vendor's code, and that did in fact happen.

I also set the scope up front. I decided not to verify every feature of this SDK. **Compare the paths we actually use against the vendor, leave the paths we do not use unverified, and record in the documentation that they are unverified.** Verification is not free, and spending time proving the equivalence of features nobody uses is not the priority. That said, if "we did not do it" and "we did it and it passed" are indistinguishable in the documentation, that becomes an incident later.

## The Differential Testing Harness

The approach I took is differential testing. Feed the same input to two implementations side by side and check only whether the outputs match.

What separates it from an ordinary test is **where the expected value comes from**.

Any test needs some standard telling it "what is the correct output for this input" before it can render a verdict. In software testing that standard is called the **oracle** (test oracle). And the situation where verification is blocked because that standard is hard to obtain is called the oracle problem.

In an ordinary test, the oracle is a person. You write the answer by hand, as in `expect(bucketing(user)).toBe("B")`. The accuracy of the test is then bound to how well the person writing that answer understood the specification. If there is no specification, or there is one and it contradicts the implementation, or the output is the kind a human cannot compute in their head (hash values, accumulated floating point, a parser's AST), this approach stalls.

Differential testing **substitutes another implementation for that oracle.** You do not need to know the answer. You only need to see whether the two implementations produce the same one. Validating a compiler against another compiler, or checking that a new parser produces the same AST as the existing one, is the same method.

It fit this situation well. The goal of this work was never "behaving correctly" but **"behaving exactly like the vendor."** When you have to reproduce even the vendor's bug of sending an empty timezone, a test where we write down the values we think are correct actively gets in the way. Here the oracle is neither the specification nor my understanding of it, but **the file the vendor actually published.**

It is not free, of course. Differential testing passes silently when both implementations are **wrong for the same reason.** A case that fell into exactly this weakness comes up later.

Concretely, the vendor's published UMD bundle is loaded and executed in a separate jsdom, our build is booted under the same conditions, and the same calls with the same inputs are compared.

There was one place I spent a fair amount of time. The original plan was to run the vendor bundle in isolation with `node:vm`, and that does not work. Globals get trapped inside the context created by `vm.createContext(window)`, so the UMD global cannot be read from outside. Here is what actually worked.

```ts
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://example.test/p?q=1',
  runScripts: 'outside-only', // without this, window.eval does not exist
})
const w = dom.window

// Stubs must be installed before eval. The SDK reads globals at load time.
w.navigator.sendBeacon = () => true
Object.defineProperty(w.navigator, 'userAgent', {value: UA, configurable: true})
Object.defineProperty(w.navigator, 'languages', {
  value: ['ko-KR', 'ko'],
  configurable: true,
})
w.fetch = () => Promise.reject(new Error('offline'))
w.XMLHttpRequest = makeFixtureXHRClass(workspaceConfig, options)

w.eval(readFileSync(VENDOR_UMD, 'utf8'))
const vendorSdk = w.VendorGlobal
```

Our build is imported normally in vitest's jsdom environment, with the same stubs installed via `vi.stubGlobal`. I wrapped both clients into a single function that boots them from the same workspace config fixture and waits for `onReady` before handing them back.

```ts
export async function bootDifferential(sdkKey, workspaceConfig, options) {
  restoreHistory()
  resetStorage()
  const {Sdk, window: vendorWindow} = loadVendorSdk(workspaceConfig, options)
  const vendorClient = Sdk.createInstance(sdkKey, options?.clientConfig)
  await new Promise((resolve) => vendorClient.onReady(resolve))

  resetStorage()
  vi.resetModules()
  stubOurGlobals(workspaceConfig, options)
  const ours = await import('../../src/index.browser')
  const ourClient = ours.createInstance(sdkKey, options?.clientConfig)
  await new Promise((resolve) => ourClient.onReady(resolve))

  return {vendorClient, ourClient, vendorWindow, cleanup}
}

// Run the same call on both and return the results side by side
export function compare(clients, fn) {
  return {vendor: fn(clients.vendorClient), ours: fn(clients.ourClient)}
}
```

Since the two SDKs run in different jsdoms, some things have to be excluded from the comparison. URL-derived properties (`url`, `host`, `pagePath`, `referrer`, `protocol`, and so on) differ because the two DOMs have different addresses, so they are stripped during normalization before comparison. The same goes for randomly generated identifiers. Everything else has identical stubs installed, so the values have to match too.

Server responses are pinned by swapping out XHR entirely for a fixture. The config request gets the prepared workspace with a 200, and every other request fails with status 0. Each side instantiates this class separately, so the response queues are independent as well.

With that in place I widened the comparison. Evaluation decisions were compared exhaustively across 40 users by 24 keys, for 480 pairs, and events were compared down to the values by intercepting the `sendBeacon` body. I attached comparisons for each experiment state (running, draft, paused, completed), eight target key types, URL branching, the native bridge, and the message UI's events and storage rules. In the end 1,932 tests passed with zero mismatches.

At that point, honestly, I thought it was done.

## The Harness Was Lying

What does the fact that 1,932 tests pass prove? Strictly speaking, nothing. Passing means "the test did not encounter a condition that would fail it," and a test that cannot create a failing condition in the first place passes just the same.

There is only one way to check this. **Deliberately break something.** Change one line of source to be wrong, run the tests, and see whether the light turns red. If it does not, that behavior is not being verified.

I turned this into a script. One mutation looks like this.

```js
{
  id: 'bucketing-seed',
  file: `${SRC}/core/internal/evaluation/bucket/Bucketer.ts`,
  find: 'murmurhash3_x86_32(value, seed)',
  replace: 'murmurhash3_x86_32(value, seed + 1)',
  detects: 'vendor-parity-decision: bucket distribution'
}
```

Each mutation is injected into the source, the tests run, and the original is restored. If even one goes undetected, exit 1. Three things mattered in the design.

**If the target string does not appear exactly once, error out immediately.** If a refactor changes the source so the mutation applies nowhere, the tests naturally pass and the battery reports "undetected." But that is not a verification failure, it is a stale mutation definition. Fail to distinguish the two and the battery itself starts lying.

**Restoration is guaranteed on every exit path.** The originals are held in memory and restored in a `finally` block and in signal handlers. An interrupted battery leaving mutated source in the repository is the most dangerous failure mode.

**Check the baseline first.** "The mutation was detected" means nothing in a state that was already failing without any mutation.

And this battery found tests that were dead while passing.

### A Test That Was Only Accidentally Right

I changed the URL branching matcher to `return true`, and the vendor comparison test passed. The test's description said it verified "when the URL does not match, neither side attempts a redirect."

Tracing the cause led to the lifecycle manager. At install time, this class wraps `history.pushState` in a wrapper bound to its own instance.

```ts
history.pushState = ((f) =>
  function pushState() {
    var ret = f.apply(history, arguments)
    changeLifecycle('locationChange') // this closure captures a specific instance
    return ret
  })(history.pushState)
```

But `client.close()` does not undo this patch. It closes only the core and the polling synchronizer. As a result a wrapper accumulates with every test, and **the client created by an earlier test keeps reacting to a later test's `history.pushState`.**

The sequence, confirmed by planting temporary logs, went like this.

1. Test 1's client wraps `pushState`. The cleanup in `afterEach` does not undo it.
2. Test 2 boots and changes the URL via `history.pushState`. The still-living client from test 1 reacts to it. In the mutated state the matcher is always true, so it performs a redirect and leaves a guard cookie. This happens after the global stubs have been torn down, so the capture never sees it.
3. Test 2's own client, booted next, hits "already redirected" on its first line and immediately returns null. **It never reaches the matcher at all.**
4. So both "there should be no redirect call" and "there should be no guard cookie" pass.

In the unmutated original, step 2 ends with the matcher returning false and leaves no cookie, so test 2 takes the normal path. It was **a test that only worked correctly by accident on the original.**

The fix was one place in the harness. Capture the native `pushState`/`replaceState` at module load time and restore them on entry to boot, severing the wrapper chain. I did not touch production code. `close()` not undoing the patch is behavior identical to the vendor's, and it is not ours to change.

### The Fixture Used Only One Operator

The second one was a quieter kind. I changed a greater-than matcher to greater-than-or-equal. Zero failures. I changed a contains matcher to starts-with. Zero failures again.

The cause was the fixture. Every target condition in the workspace fixture used `operator: "IN"`. The test that supposedly compared 480 pairs exhaustively was in fact walking the IN operator path 480 times. The other eight operators, the `NOT_MATCH` match type, and NUMBER/BOOLEAN/VERSION value-type routing had **never once been compared against the vendor.**

A coverage tool does not show this. The matcher files were all executing. "It executed" and "someone asserted on the result" are different stories.

I closed it by adding twelve per-operator experiments to the fixture. Each experiment attaches a single condition and points its default rule directly at a specific variant, so that a matching condition splits both the variant and the reason together. With no bucketing involved, the comparison narrows purely to a single matching result. For pairs a single step apart at the boundary, like greater-than and greater-than-or-equal, you need both present to catch a mutation that swaps them.

### Colliding Fixture Keys Erased Experiments

The third was an accident that happened while adding those combination experiments. I assigned keys 41 through 43 to the new experiments, and three mutations suddenly went back to undetected.

The workspace DTO holds experiments in a map keyed by key. When keys collide, the later experiment quietly overwrites the earlier one. The three keys I assigned overwrote the existing container experiment, user override, and segment override, and those three features ended up gone from the workspace. **And every test passed.** Both SDKs return "no such experiment" identically, so the comparison rules them a match.

Something similar happened once more. I put a model name in the experiment status field while the actual wire format uses different codes. Insert the wrong code and that experiment goes quietly missing from the workspace, and again both sides return not-found identically and pass as a match. That pass conceals the fact that the draft and completed status paths are not being verified at all.

This is the weakness of the comparison method itself. When both sides **do nothing for the same reason**, the comparison always passes. If the fixture is wrong, that wrongness applies identically to both sides, so the comparison can never catch it.

Now there is a test that checks the fixture itself. It blocks duplicate keys and ids across experiments, flags, message UI, segments, and buckets. A test that inspects a fixture appeared in this repository for the first time here, and I think it should have existed much earlier.

## Measuring the Reach of Verification

The mutations ended up at 72, all detected. But there is a trap in that number. **Those 72 are points a human chose.** They poke only where I was suspicious, so the areas I failed to suspect never enter this figure at all.

So I measured separately how far into the source the comparison actually reached, by running the comparison tests under coverage instrumentation.

```text
runtime sources     ~350
of those, 0% stmt   10
overall statements  ~72%
overall functions   ~69%
```

The only trustworthy part of this measurement is the 0% side. "It executed" does not mean anyone asserted on the result, but 0% is a definitive signal that the code never participated in the comparison even once.

Opening all ten 0% files showed they belong to entry points that are not shipped: the Node-only entry, the tag manager entry, and the files only those two reference. Our build has eight entry points and the `exports` map has the same eight, so a consumer has no path to reach them. Which gives us "there is no shipped code, at file granularity, that the comparison failed to reach."

The real gain from this measurement was learning not to stop there. **Across the roughly 340 partially executed files remaining after excluding the ten 0% files, 25.8% of statements went unexecuted and 32.0% of functions were never called.** At file granularity that entire region is invisible. Which is why "only ten files at 0%" must not be read as "we compared nearly everything."

On a related note, this aggregate independently pointed at the same places as the hand-written unverified list. In effect a machine confirmed once more that the human-chosen list had no large omissions, which is not the same as saying everything has been seen.

## Recording What Was Not Verified

So I keep a separate verification status document. I think the value of that document lies not in what was confirmed but in recording **what was not**.

I graded evidential strength into three levels.

| Grade          | Meaning                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Compared**   | The vendor's artifact was loaded into the same jsdom, run side by side, and outputs compared. Strongest evidence |
| **Asserted**   | Our test asserts a value. This is not evidence that "the vendor does so too"                                     |
| **Unverified** | It has never been executed                                                                                       |

The UUID replacement sitting at "Asserted" shows why this distinction earns its keep. UUIDs are random, so their values cannot be compared against the vendor's. All you can hold is the format, and three mutations hold it. The fact that 1,540 comparisons still pass after the replacement is circumstantial support, but the identifier fields in question were excluded from comparison to begin with, so it is not evidence for "it produces the same values as the vendor." Without the grades, this item would have read with the same weight as every other. Conversely, the base64 replacement compares directly against the original library, so the table records it separately as "library comparison." Different kinds of evidence deserve different names.

I initially lumped the unclosed items together, then split them apart later. **"There is genuinely no way" and "I have not investigated it" are different things.** Of five items, exactly one genuinely required external information: the response the native app returns over the bridge. The rest were simply uninvestigated. The config delta merge in particular was not a case of having no way in, since the polling interval is already a public setting. The real obstacle was the comparison harness using two jsdoms and how that collides with fake timers.

Lumping the categories together makes the list look more pessimistic than it is, and things that can be done harden into things that cannot. I think that is a problem of judgment, not of documentation tidiness.

Finally, the vendor bugs I decided not to fix have a separate mechanism attached. The timezone is the representative case. One mutation injects the state where "that bug has been fixed," and the comparison test catches it. That is not a regression guard but a **bug preservation guard**.

The reason this is necessary is simple. The fact that "this was left this way on purpose" will inevitably disappear if it lives only in a code comment. A few months from now someone will look at that line and fix it in good faith, and if no light turns red at that moment, nobody catches it. A decision not to fix is still a decision, and without a gate to protect it, it does not hold.

## What I Decided Not to Build

There was one more package planned for the rebuild: this SDK's React bindings. A thin layer wrapping things in a provider and a handful of hooks.

I hit a wall immediately. **This one does not publish source maps.** With no original to recover, rewriting is the only option, and rewriting means giving up the evidence this entire article rests on. Rather than using the vendor's code as-is, I would be reading it and writing it again, so the claim "the logic was not changed" does not even hold.

So before building, I changed the question. Not "how do I make it identical" but **"is this actually being used?"**

I went through the eight consuming repositories and counted. This package exports eleven hooks, and the only ones actually used were the provider, the context, and the event sending hook. The evaluation hooks had **not a single call site.** There was no reason to rewrite, by a method with weak evidence, a package where ten of eleven exports are dead.

So I decided not to build it. The consuming side uses the event sending entry point directly and implements a provider and one hook, about thirty lines each, on its own.

I did record one trap for whoever builds this later. The workspace config **arrives asynchronously after mount.** So unless you subscribe to the event signalling that the client has finished preparing evaluation and use it to trigger a rerender, the evaluation hooks return the default value forever. No error appears on screen; you just keep seeing variant A.

And that subscription has to go through `useSyncExternalStore`. The vendor's implementation is a `useState` plus `useEffect` combination, which is React 17-era code. Under React 18's concurrent rendering, an external value changing mid-render produces tearing, where different parts of the same screen read different values.

Not building something is also a decision, so I thought it was better to write down why it was not built and what you would need to know to build it.

## On the Confidence That a Green Build Gives You

To summarize, the claim this work can currently make is this. **The paths we actually use were run side by side with the vendor's published artifact and confirmed to produce the same values.** That covers event payloads, evaluation decisions, target matching, URL branching, and the native bridge. **And the areas we do not use were not verified.** The message UI renderer's DOM output, parts of the remote evaluation mode, and the Node entry point fall there.

I do not think the second half is a shortfall; it is the intended scope. Rather than spending time proving the equivalence of features nobody uses, making the used paths certain and writing down that the rest is out of scope is the more honest position. The story changes if that list disappears, though. The moment "verified" and "not verified" become indistinguishable in the documentation, someone will turn on a previously unused feature under the impression that it was already verified.

The sentence from this work most likely to stay with me is not in the size table. It is this.

**When a verification gate is watching something other than what it verifies, that gate is worse than no gate at all.**

With no gate you are at least uneasy. With a gate watching the wrong thing, passing hands you false confidence. All three cases described above were exactly that kind. The tests existed, their names were accurate, the light was green, and they were watching nothing.

Today a single verification command runs typecheck, lint, tests, the mutation battery, the size gate, and consumer type resolution in order. It takes four minutes, most of it the battery. I think the value of those four minutes lies not in confirming that the tests pass but in confirming that **the tests are still watching something.**

This approach is not a cure-all either, of course. When both sides do nothing for the same reason the comparison passes, and mutations poke only where a human was suspicious. Whether the metrics land correctly on the dashboard cannot be closed in code at all, so attaching both SDKs to a sandbox workspace and running them for a few days remains on the list. So the honest claim available right now is not "they are identical" but "the comparison reached this far, and the rest is on this list." Carrying that list around without erasing it may, for work like a rewrite, be the more important output than the artifact itself.
