# Adversarial review

Reviewed on 2026-09-22. Scope: the unpublished article, Rust attribution, generated HTML, and verification scripts. The findings below describe the implementation at the time of the review.

**Resolution: all six findings addressed.** The original verdict was to revise before publishing. Changes and verification are recorded below; the original findings remain as an audit trail.

| Finding | Correction                                                                                                                 | Verification                                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| R1      | Recursively preserve indexed-map section boundaries; reject unordered and overlapping sections.                            | Rust regressions for empty sections, unmapped prefixes, nested offsets, and invalid boundaries.                         |
| R2      | Blue selection markers; green only for observed coverage in the code view; visible explanation of original-source anchors. | Light/dark tests for observed, unobserved, and unmeasured selections.                                                   |
| R3      | Overview searches include nested source paths and package names.                                                           | Find MiniSearch from its package and source filename without knowing the chunk hash.                                    |
| R4      | Separate summary metadata and independently encoded chunk details; retain only the selected decoded chunk.                 | No detail decoding at overview; one after selection; reopening redecodes; heap snapshots in `results/report-size.json`. |
| R5      | Preserve the exact escaped 13-byte input in the article.                                                                   | The DevTools verifier asserts the literal is present in the article and checks 13/6/7.                                  |
| R6      | Compare every normalized interval boundary/status and UTF-8 coordinate.                                                    | All 77 recorded script partitions agree; a shifted interval with identical total bytes is rejected.                     |

The article now includes the indexed-map counterexample, the loading mistake and correction, and a five-case class-method elimination experiment using esbuild and the installed Next.js/Turbopack version. Routine CI/compression implementation details have been reduced in the article and retained in the README. The class experiment shows retained methods even without dynamic access; it does not claim to prove every retention cause inside MiniSearch.

Verification after fixes: 33 Rust tests, Clippy with warnings denied, actual Playwright/Node coverage import checks, isolated headless light/dark desktop/mobile report checks, and exact interval checks across six recorded scenarios. See the result JSON files and reproduction commands in the README.

## Confirmed findings

### R1 — P1: Flattening an indexed map loses unmapped section prefixes

Location: `src/attribution.rs:58` and `src/attribution.rs:115`.

An indexed map is flattened before attribution. Section starts without a mapping disappear, so the previous source owns bytes belonging to the next section's unmapped prefix.

Reproduction: analyze `app.js` containing exactly `abcdefghij`, with this adjacent map:

```json
{
  "version": 3,
  "sections": [
    {
      "offset": {"line": 0, "column": 0},
      "map": {
        "version": 3,
        "sources": ["a.ts"],
        "names": [],
        "mappings": "AAAA"
      }
    },
    {
      "offset": {"line": 0, "column": 5},
      "map": {
        "version": 3,
        "sources": ["b.ts"],
        "names": [],
        "mappings": "EAAA"
      }
    }
  ]
}
```

Run `bundle-trace --dir <fixture-directory> --json report.json`.

| Ownership    | Section-aware expectation | Actual analyzer output |
| ------------ | ------------------------: | ---------------------: |
| `a.ts`       |                       5 B |                    7 B |
| `[unmapped]` |                       2 B |                    0 B |
| `b.ts`       |                       3 B |                    3 B |

The same installed `sourcemap` crate, queried before flattening, returns `a.ts` at column 4, no source at columns 5 and 6, and `b.ts` at column 7. An empty second section similarly causes its entire remainder to be attributed to the preceding source. The analyzer reports no warning.

This is a conflict with the tool's intended conservative treatment of unmapped prefixes, not a claim that a source-map standard defines byte ownership. Mozilla's [indexed consumer](https://github.com/mozilla/source-map/blob/master/lib/source-map-consumer.js) likewise selects the containing section before looking up a position. Preserve section boundaries and insert unmapped boundaries where necessary; test both an empty section and a delayed first mapping. Whole-file totals still reconcile, so conservation tests do not detect this error.

### R2 — P1: Green means both execution and a selected mapping anchor

Location: `src/report.html:152`, `src/report.html:154`, and `src/report.html:507`.

In the original-source view, the selected line is always green, including when the selected generated interval is unobserved. In generated code, green means observed execution. File selection uses green as well. The default source view makes the ambiguous interpretation especially likely.

An isolated headless test of the existing blog report reproduced:

| Selected interval  | Original-source label | Anchor background    |
| ------------------ | --------------------- | -------------------- |
| `Unobserved · 8 B` | `MiniSearch.ts:694:3` | `rgb(229, 241, 236)` |
| `Observed · 7 B`   | `MiniSearch.ts:611:1` | `rgb(229, 241, 236)` |

Both also use the same green left marker. The approximate-anchor caption does not resolve contradictory visual semantics. Use a separate selection color and explicitly label the original highlight as a location, independently of coverage status. Validate that unobserved and unmeasured selections never acquire the execution color solely because they are selected.

### R3 — P2: Package search returns no results at the report entry point

Location: `src/report.html:233` and `src/report.html:346`.

The search input promises files or packages. At the chunk overview, `rows()` searches only the hashed chunk path and `row.package`; bundle rows have no `package` property. It never searches `bundle.sources`.

In the existing 107-chunk report, entering `minisearch` produces zero rows and `No files match your search.`, although one bundle contains MiniSearch. The isolated headless test confirmed the visible result. Package search works only after the reader already finds the containing chunk.

Search nested source paths and package names at the overview, returning their containing chunks or direct source matches. The current large-report test first reads JSON to discover the chunk path and searches for that path (`scripts/verify-large-report.mjs:11`, `:58`), bypassing the reader's discovery problem.

### R4 — P2: The article describes selective data loading that is not implemented

Location: article line 341; `src/report.html:297`–`302`.

The article says the browser decompresses the data and reads only the selected chunk's intervals. The implementation decompresses the entire payload to a string and calls `JSON.parse` on the entire report before showing the overview. Selection limits subsequent rendering, not initial loading or allocation.

Measured from the existing artifact:

| Quantity                                       |         Value |
| ---------------------------------------------- | ------------: |
| HTML file                                      |  28,928,407 B |
| Decompressed compact JSON                      |  99,779,167 B |
| Total interval tuples                          |     1,864,411 |
| JS heap used after interaction and explicit GC | 146,253,104 B |

The heap value is one local headless Chromium snapshot, not peak process memory or a comparative benchmark. It is enough to show why compressed file size is not a memory bound. Correct the article to describe full loading and selective rendering. If selective loading is an intended property, split metadata and independently encoded chunk payloads and measure startup time and peak memory.

### R5 — P2: The central 13-byte example cannot be reproduced from the displayed code

Location: article lines 251–275; `scripts/verify-devtools.mjs:104`.

The article displays `foo()\nbar()` but calls it 13 bytes and reports 6 bytes attributed to `a.ts`, with 7 unmapped. The test uses `foo();\nbar();`.

Running the displayed code through the actual CLI gives 11 bytes total, 5 attributed to `a.ts`, and 6 unmapped, when copied without a final newline. A final newline does not fix the attributed length. The semicolon-containing test input gives the published 13/6/7 result.

Publish the exact input as an escaped string or protected literal fixture, including line-ending and final-newline policy. A byte-accounting article cannot let code formatting change its central counterexample.

## Verification gap

### R6 — P2: DevTools parity checks totals, not the locations being highlighted

Location: `scripts/verify-devtools.mjs:79`–`88`; `scripts/reference.mjs:40`–`63`.

Both independent calculations construct per-code-unit state but compare only total observed UTF-16 units and UTF-8 bytes with the Rust output. A report that shifts five observed ASCII bytes to five different ASCII positions can pass both comparisons. The source-map ownership error in R1 also leaves every overall coverage total unchanged.

The article explicitly limits the reported comparison to lengths, so the 77-observation statement is not fabricated. The gap is using that evidence to establish confidence in a report whose main job is showing locations. Compare normalized interval boundaries/statuses across implementations, then separately verify attribution and generated-to-original navigation. Include a deliberately shifted interval as a negative control. Existing hand-written Rust range tests remain useful but do not replace this differential check on real recordings.

## Editorial assessment

The strongest material is the distinction between execution ranges and source attribution, the prefetch counterfactual, and the measured difference between attributed package bytes and actual delivery savings. Keep these.

The weakest deep-dive claim is the MiniSearch section. It establishes that unused class methods remain, then stops at a general explanation about dynamic property access. It does not isolate which transformation prevents removal in this build. A minimal reproduction varying named exports, class methods, and property access, followed by inspection of the actual bundler output, would turn this into an investigation of a mechanism. Without that experiment, present retained methods as an observed result and an open question, not the completed explanation.

The article also switches from a causal investigation into a development log around format adapters, HTML payloads, CI budgets, and compression implementations. Keep the failures that change the reader's interpretation of the result; move routine feature descriptions into the README. The previous unused-JavaScript article separates competing explanations through controlled changes. This article would benefit more from one additional decisive experiment than from more feature descriptions.

## Checks performed

- Read the complete article and compared claims with analysis, UI, verification scripts, and recorded results.
- Ran the locked Rust test suite: 30 tests passed.
- Ran the release CLI on the displayed article example and indexed-map counterexamples in temporary directories.
- Compiled a temporary probe against the installed `sourcemap` dependency to compare indexed lookup before flattening.
- Used an isolated headless Playwright test of the existing HTML artifact to reproduce package search and anchor-color ambiguity; this did not control the user's browser.
- Decoded the existing HTML payload and counted its bytes and intervals; captured one post-GC JS heap snapshot.
- Checked upstream source-map and DevTools source material. No full new performance study or production recapture was performed.

The sections above retain the original review evidence. The resolution table records the subsequent implementation and article fixes.
