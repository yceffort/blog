---
title: 'How Bundlers Remember Imports'
tags:
  - bundler
  - debugging
  - compiler
published: true
date: 2026-10-08 23:04:00
updated: 2026-10-08 23:20:06
description: 'Tracing a coldpath misclassification that read every synchronous dependency in the Turbopack analysis file as a static import. This post compares the graph information and build output of webpack, Turbopack, Vite, and esbuild, and looks at which clues reveal the original syntax and which cases cannot be recovered.'
series: 'Building coldpath'
seriesOrder: 4
art:
  undraw: buggy-code
---

## Table of Contents

## A Suggestion That Called `require()` a Static Import

While analyzing a Turbopack build with coldpath 0.6.0, I found a strange suggestion. A module loaded with `require()` came with an explanation saying "a static import chain reaches" it. Below is a page that reproduces the problem. It loads an ESM module with a static import and a CommonJS module with `require()`, and the compute function of each module runs only when its button is pressed.

```jsx
import {useState} from 'react'
import {esmHeavy} from '../../src/heavy-esm.js'
const cjsHeavy = require('../../src/heavy-cjs.js')

export default function Page() {
  const [text, setText] = useState('ready')
  return (
    <main>
      <button id="esm" onClick={() => setText(esmHeavy())}>esm</button>
      <button id="cjs" onClick={() => setText(cjsHeavy.compute())}>cjs</button>
      <p id="out">{text}</p>
    </main>
  )
}
```

I collected execution records for first entry and for a click on the CommonJS button, and analyzing them attached the following suggestion to `heavy-cjs.js`. Only the kind and explanation of the suggestion are copied from the output.

```json
{
  "kind": "split-review",
  "explanation": "A static import chain reaches this source, and part of it executes initially. Consider separating the later-only functionality before introducing import(); deferring the whole module may break initial behavior."
}
```

The code that loads `heavy-cjs.js` on this page is the `require()` on line 3. Yet coldpath recorded this dependency in its graph as a static import and built the explanation on that classification. I first had to find out why the syntax in the source and the analysis result disagreed.

To see where this difference disappears, I had to look at what the bundler exports and at the build output together. In [the post that traced Toss Securities' JavaScript without source maps](/2026/09/tracing-third-party-javascript-without-sourcemaps), I described coldpath's recovered graph like this.

> In webpack's generated code, a static import and a `require()` become the same call, which is why most edges are `unknown`.

Toss Securities' chunks were registered on the `webpackChunk_N_E` global that Next.js uses, and the statement held for the module calls I looked at then. But when I built the same input with several bundlers, the calls themselves sometimes disappeared through optimization, and with Turbopack a distinction missing from the analysis file survived in the runtime calls. The wrong explanation I first found also came from reading every synchronous dependency recorded in Turbopack's analysis file as a static import.

Still, what a lazy-loading suggestion needs is less the name of the syntax than when that syntax runs its target module. A `require()` called directly in the module body runs its target at the same time as an import, while a `require()` called inside a function runs it when that function is called. To find out that timing, I first needed the kind and location of the syntax.

This time I looked at where bundlers leave the difference between `import` and `require()`. I compared webpack's stats, Turbopack's analysis file, the module information from Vite plugins, and esbuild's metafile against the output the browser receives. From there I checked how far the original syntax can be recovered, fixed coldpath's classification based on the results, and followed how the suggestion changed from version to version.

> The base experiments ran on October 4, 2026, on macOS (arm64) with Node.js 24.20.0. Bundler versions were pinned to webpack [`v5.111.1`](https://github.com/webpack/webpack/tree/v5.111.1), Next.js [`v16.3.8`](https://github.com/vercel/next.js/tree/v16.3.8) (Turbopack, with bundled webpack 5.98.0), Vite 8.3.2 with Rolldown [`v1.2.12`](https://github.com/rolldown/rolldown/tree/v1.2.12) doing its builds, and esbuild [`v0.28.2`](https://github.com/evanw/esbuild/tree/v0.28.2).
>
> I used the npm releases of coldpath. On October 8, I reanalyzed the execution records and analysis files collected on October 4 with 0.6.0, 0.6.1, 0.8.0, 0.8.1, and 0.8.2 and compared the results per version. The Vite counterexample with a side-effect import was checked on October 5. The experiment code and measurements are in [`bundler-import-memory`](https://github.com/yceffort/blog-experiments/tree/main/bundler-import-memory) in the `yceffort/blog-experiments` repository.

This post uses the following terms with these meanings.

- **Edge**: one connection in a dependency graph where one module loads another. If `entry.js` loads `esm-dep.js`, then `entry.js -> esm-dep.js` is one edge, and the syntax that created that connection (static import, `require()`, dynamic `import()`) is called the edge kind.
- **Static import chain**: a path from an entry point to a module that is connected only by static import edges.
- **Recovered graph**: a dependency graph rebuilt only from the module calls in the build output, without the bundler's graph information. coldpath's `modules --graph` builds it.
- **Specifier**: the path string passed to an import or `require()`, like `'./cjs-dep.js'`.
- **Top level**: a position that runs directly in the module body rather than inside a function. A top-level `require()` runs when its module runs.
- **Module function**: a function the bundler creates by wrapping the code of one module. webpack and Turbopack output look up this function by id and run it.

## An Input With Seven Cases

The input for the comparison is the single `entry.js` below. It covers loading ESM and CommonJS with both import and `require()`, plus a side-effect import, an unused import, and a dynamic import. Each dependency contains a unique string such as `'M_ESM_DEP'` so it can be found in the output as well.

```js
import {esmDep} from './esm-dep.js'
import cjsDefault from './cjs-default.js'
import './side-effect.js'
import {unusedDep} from './unused-dep.js'
const {cjsDep} = require('./cjs-dep.js')
const {esmRequired} = require('./esm-required.js')

export function run() {
  return [esmDep(), cjsDefault(), cjsDep(), esmRequired(), globalThis.M_SIDE_EFFECT, () => import('./lazy-dep.js').then((m) => m.lazyDep())]
}
```

| Line | Case                    | Format of the loaded module            |
| ---- | ----------------------- | -------------------------------------- |
| 1    | Import from ESM         | ESM                                    |
| 2    | Default import from ESM | CommonJS (`module.exports = function`) |
| 3    | Side-effect-only import | A script that writes a global          |
| 4    | Imported but unused     | ESM                                    |
| 5    | `require()`             | CommonJS                               |
| 6    | `require()`             | ESM                                    |
| 9    | Dynamic `import()`      | ESM                                    |

`package.json` has no `type` field, and `"sideEffects": ["./src/side-effect.js"]` declares just one file as having side effects. The entry point passed to the bundlers, `src/index.js`, only calls `run()` and stores the result in a global. In the Next.js builds, `pages/index.jsx` calls `run()` and renders the result.

I read the graph information as follows. Production output was built both minified and unminified, and only the Next.js bundled webpack was compared using the minified build.

| Bundler                    | Graph information                             | How to get it                                             |
| -------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| webpack 5.111.1            | `modules[].reasons` in the stats JSON         | `stats.toJson({reasons: true, orphanModules: true, ...})` |
| Turbopack (Next.js 16.3.8) | `.next/diagnostics/analyze/data/modules.data` | `next experimental-analyze --output`                      |
| Vite 8.3.2 (Rolldown)      | `this.getModuleInfo(id)` in a plugin hook     | Query every module in the `generateBundle` hook           |
| esbuild 0.28.2             | `inputs[].imports` in the metafile            | `metafile: true`                                          |

## webpack: What Stats and Output Keep

### What Stats Reasons Keep

webpack stats `reasons` record which modules load a module and what kind of dependency it is. Below are only the reasons connected to `entry.js`, taken from a build with module concatenation (an optimization that merges several modules into one function scope) turned off (`optimization.concatenateModules: false`). The difference from the default build, where module concatenation is on, comes later.

```text
./src/esm-dep.js       harmony side effect evaluation  1:0-35    inactive
                       harmony import specifier        9:10-16
./src/cjs-default.js   harmony side effect evaluation  2:0-41    inactive
                       harmony import specifier        9:20-30
./src/side-effect.js   harmony side effect evaluation  3:0-25
./src/unused-dep.js    harmony side effect evaluation  4:0-41    inactive, orphan
./src/cjs-dep.js       cjs require                     5:17-40
./src/esm-required.js  cjs require                     6:22-50
./src/lazy-dep.js      import()                        9:91-114
```

Imports show up as strings starting with `harmony`, `require()` shows up as `cjs require`, and every reason carries a `line:column-column` location. These strings come from the `type` getter defined on each dependency class, and stats copies that value as is.[^1]

```js
// lib/dependencies/HarmonyImportSideEffectDependency.js
get type() {
  return "harmony side effect evaluation";
}

// lib/dependencies/CommonJsRequireDependency.js
get type() {
  return "cjs require";
}
```

The import statement on line 1 has two reasons. `harmony side effect evaluation` points to the location of the import declaration (`1:0-35`), and `harmony import specifier` points to where the imported name is actually used (`9:10-16`). For a module declared side-effect free through `sideEffects`, the reason at the declaration becomes `inactive` and only the usage stays active.

`unused-dep.js`, which was dropped from the bundle because it is unused, still remains in stats as an orphan module (a module not included in any chunk). Stats lets you see even imports that are not included in the output. Still, the orphan flag alone does not mean a module was dropped from the bundle. In the default build with module concatenation on, `entry.js`, `esm-dep.js`, and `esm-required.js`, which were merged into the entry point, were also marked as orphans.

### Module Calls in the Output Can Look the Same

Building the same page with the webpack mode of Next.js 16.3.8 produces this at the start of the page module. The webpack bundled with Next.js is 5.98.0.

```js
var E=n(72),t=n(5138),r=n.n(t);n(2199);let{cjsDep:s}=n(8030),{esmRequired:u}=n(4979);
```

`n` is the minified name of `__webpack_require__`, which arrives as the third argument of the module function. `n(5138)` is the default import on line 2, `n(2199)` is the side-effect import on line 3, and `n(8030)` and `n(4979)` are the `require()` calls on lines 5 and 6. `esm-dep.js` from line 1 was merged into the page module, and its function call was optimized away too, leaving only the string `"M_ESM_DEP"`.

Dependencies that stats distinguished as `harmony` and `cjs require` all became calls of the same shape, `n(id)`, in the output. In this example, the trace of the default import remains in the `n.n(t)` that follows. That is the interop function that pulls out a CommonJS module's `module.exports` as the default.

I confirmed in the source of webpack 5.111.1 how the two kinds of syntax end up as the same call. I did not go as far as checking the source of 5.98.0, the version bundled with Next.js. An import statement is generated from scratch in `RuntimeTemplate.importStatement`.[^2]

```js
importContent = `/* harmony import */ ${optDeclaration}${importVar} = ${RuntimeGlobals.require}(${moduleId});\n`;
```

`require()` partially rewrites the original code. `CommonJsRequireDependency` replaces the argument with the module id, and `RequireHeaderDependency`, registered alongside it, replaces the name `require` with `__webpack_require__`.[^3]

```js
// lib/dependencies/CommonJsRequireDependency.js
const content = runtimeTemplate.moduleId({
  module: importedModule,
  chunkGraph,
  request: dep.request,
  weak: dep.weak
});
source.replace(dep.range[0], dep.range[1] - 1, content);

// lib/dependencies/RequireHeaderDependency.js
runtimeRequirements.add(RuntimeGlobals.require);
source.replace(dep.range[0], dep.range[1] - 1, RuntimeGlobals.require);
```

One writes a new statement and the other edits an existing call, but both produce the string `__webpack_require__(id)`. This is why most edges in coldpath's recovered graph were `unknown` in the previous post.

Dynamic imports looked different too. In the output of the Next.js bundled webpack it was `n.e(990).then(n.bind(n,6990))`, and coldpath 0.6.0 recognized only this `bind` form as a dynamic edge. With standalone webpack 5.111.1, the same spot becomes `r.e(132).then(()=>r(132))`, because webpack uses an arrow function instead of `bind` when the target environment supports arrow functions.[^4] coldpath 0.6.0 treated this `r(132)` as an ordinary call and classified it as `unknown`.

The fixed recovery logic also recognizes an arrow function passed to `.then` after `n.e(chunk)`, or after a `Promise.all([n.e(a), ...])` that holds only chunk load calls, as a dynamic edge. It still leaves `Promise.resolve().then(() => n(id))` as `unknown`, because an `import()` that loads no new chunk and a user-written `Promise.resolve().then(() => require(...))` can take the same shape. [Fix commit `90b7baa`](https://github.com/yceffort/coldpath/commit/90b7baa263b605e03a64969874b9b0dd44415577) has this distinction and its test cases.

### After Module Concatenation Extended to CommonJS

When module concatenation applies, the calls to compare can disappear entirely. Since 5.109.0 (July 23, 2026), CommonJS modules that can be statically analyzed are also eligible for module concatenation, and since 5.110.0 (August 27, 2026), merged modules are wrapped in a lazy accessor called `__webpack_require__.cw` and `require()` is inlined in place.[^5] Building the same input with the default settings of 5.111.1 gives this.

```js
var t=r.cw(function(t,e){function o(){return"M_ESM_REQUIRED"}r.d(e,{esmRequired:()=>o})}),e=r(678),o=r.n(e);r(19);const{cjsDep:n}=r(234),{esmRequired:s}=t();
```

The ESM module loaded with `require()` (`esm-required.js`) was wrapped in `r.cw(...)` and merged into the entry, and it is called as `t()` where the original `require()` was. The three CommonJS files still remain as `r(678)`, `r(19)`, and `r(234)`, and the stats `optimizationBailout` gives the reason: `ModuleConcatenation bailout: Module is not in strict mode`. If I add just `'use strict'` to the top of those three files and rebuild, stats shows, apart from orphans, only `./src/index.js + 6 modules` and the dynamically loaded `lazy-dep.js`. The `cjs-dep.js` part of the unminified output looks like this.

```js
// MODULE: ./src/cjs-dep.js
var cjs_dep_namespaceFn = /*#__PURE__*/__webpack_require__.cw(function(module, exports) {

module.exports = {
  cjsDep() {
    return 'M_CJS_DEP'
  },
}

});

// (omitted)
const {cjsDep: entry_cjsDep} = (cjs_dep_namespaceFn())
```

In this build, the only call left in the `__webpack_require__(id)` form is `r(132)` for the dynamic import. The default import on line 2 remains as `__webpack_require__.n(cjs_default_namespaceFn())`, and the `require()` on line 5 as `cjs_dep_namespaceFn()`. In these two cases the interop function is a clue, but that clue was also present in the `n.n(t)` of 5.98.0 we saw earlier.

With CommonJS now eligible for module concatenation, module boundaries and calls disappear from the output more often. For ESM this optimization existed in earlier versions too, and even in the latest version, modules left out of concatenation remain as `__webpack_require__(id)`. So whether the call shape reveals the original syntax cannot be decided by version alone. You have to look at which calls remain in the output and whether interop handling is attached to them.

### `require()` Inside a `"type": "module"` Package

I put the same input in a package with `"type": "module"`, renamed only the two CommonJS files to `.cjs`, and rebuilt. This time `entry.js` is classified as ESM, so we can see how each bundler handles the `require()` inside it.

webpack 5.111.1 finished the build with 0 errors and 0 warnings. But the output kept `require('./cjs-dep.cjs')` and `require('./esm-required.js')` exactly as in the source, and both modules were missing from the stats graph entirely. Running this output in an environment without `require` (a Node.js `vm` context) throws `ReferenceError: require is not defined`.

The cause is webpack's default rules. A `.js` file inside a `"type": "module"` package is classified as the `javascript/esm` type,[^6] and the parser hooks that interpret CommonJS syntax are registered only for `javascript/auto` and `javascript/dynamic`.[^7] So a `require(...)` inside a `javascript/esm` module is not recognized as a dependency and stays an ordinary function call. Node.js also has no `require` in ESM, but the webpack build leaves this call in place without a warning.

| Bundler                        | Build                             | Output                                                                  |
| ------------------------------ | --------------------------------- | ----------------------------------------------------------------------- |
| webpack 5.111.1                | Succeeds, 0 errors and 0 warnings | `require()` left as is, `ReferenceError` at runtime                     |
| Next.js bundled webpack 5.98.0 | Fails                             | `Cannot find module './cjs-dep.cjs'` while collecting page data         |
| Turbopack                      | Succeeds, no warnings             | `require()` bundled                                                     |
| Rolldown                       | Succeeds, no warnings             | Bundled, with Node.js-compatible default handling via `__toESM(..., 1)` |
| esbuild                        | Succeeds, no warnings             | Bundled, `__toESM(require_cjs_default(), 1)`                            |

The Next.js webpack mode failed because `require()` was also left in the server bundle, and that server bundle ran during the build step that collects page data (`Failed to collect page data for /`).

## Turbopack: The Distinction Missing From the Analysis File Survives in Module Calls

### The Structure of `modules.data`

The Next.js bundle analyzer runs with `next experimental-analyze`, and with `--output` it writes its results as files under `.next/diagnostics/analyze/data/`. Dependencies between modules are in `modules.data`. The `modules` array in its JSON header has an `ident` and a `path` for each module, and the edge lists are stored in a separate binary section.[^8]

Edges are split into six lists: `module_dependencies`, `async_module_dependencies`, `traced_module_dependencies`, and their reverse `*_dependents`. Reading the edges connected to the client `entry.js` from the input above gives this.

```text
module_dependencies        src/entry.js -> src/esm-dep.js
                           src/entry.js -> src/cjs-default.js
                           src/entry.js -> src/side-effect.js
                           src/entry.js -> src/cjs-dep.js
                           src/entry.js -> src/esm-required.js
async_module_dependencies  src/entry.js -> src/lazy-dep.js
```

All five synchronous dependencies are in one list. No edge carries information that separates import from `require()`, and none has a source location or specifier. The unused `unused-dep.js` is missing from the list altogether. The import that webpack stats showed as an orphan is not recorded here.

### The Internal Graph Kept the Distinction

Inside Turbopack, imports and `require()` are handled as different reference types. Each reference's `ChunkingType` defines how it is included in chunks. An ESM import (`EsmAssetReference`) and a CommonJS `require()` (`CjsRequireAssetReference`) are both `Parallel`, but with different field values.[^9]

```rust
// turbopack-ecmascript/src/references/esm/base.rs
fn chunking_type(&self) -> Option<ChunkingType> {
    self.extras
        .as_deref()
        .and_then(|e| e.chunking_type)
        .map_or_else(
            || {
                Some(ChunkingType::Parallel {
                    inherit_async: true,
                    hoisted: true,
                })
            },
            |c| c.as_chunking_type(true, true),
        )
}

// turbopack-ecmascript/src/references/cjs.rs
fn chunking_type(&self) -> Option<ChunkingType> {
    self.chunking_type_attribute.map_or_else(
        || {
            Some(ChunkingType::Parallel {
                inherit_async: false,
                hoisted: false,
            })
        },
        |c| c.as_chunking_type(false, false),
    )
}
```

According to the comments on `ChunkingType`, `inherit_async` indicates whether a module that loads an async dependency becomes async as well. A module that uses top-level `await` is such a case. The comment says this "should be true for ESM imports, but false for CommonJS requires." `hoisted` indicates whether the loaded module always runs first, that is, whether it follows ESM import execution order. The other CommonJS references in the same file (`CjsAssetReference`, and `CjsRequireResolveAssetReference` for `require.resolve()`) use the same values as `require()`. So these values can tell ESM imports apart from CommonJS references, but cannot tell CommonJS references apart from each other.

This difference disappears when the analyzer builds `modules.data`. `analyze_module_graphs` walks the graph and first checks whether a reference is a traced target. A traced target is a file that is not put in the bundle but is kept in the list of deployed files because it is needed at runtime, such as static assets or external packages outside the bundle. The remaining edges go into lists by `chunking_type`.[^10]

```rust
match reference.chunking_type {
    ChunkingType::Async => {
        all_async_edges.insert((parent_node, node));
    }
    _ => {
        all_edges.insert((parent_node, node));
    }
}
```

Every edge that is not `Async` is handled by the `_` branch regardless of the two `Parallel` field values. The only value stored is the `(parent, child)` pair, so the difference in `inherit_async` and `hoisted` does not survive in the analysis file.

### The Output Keeps It as `e.i` and `e.r`

In the output of the same page built with Turbopack, the page module looks like this.

```js
350,e=>{"use strict";var t=e.i(1398),r=e.i(9422);e.i(1323);let{cjsDep:n}=e.r(1934),{esmRequired:o}=e.r(2989);e.s(["default",0,function(){return(0,t.jsx)("p",{children:String(["M_ESM_DEP",(0,r.default)(),n(),o(),globalThis.M_SIDE_EFFECT,()=>e.A(3105).then(e=>e.lazyDep())].slice(0,5))})}],350)}
```

`e` is the `__turbopack_context__` that the module function receives. The default import on line 2 became `e.i(9422)`, the side-effect import on line 3 became `e.i(1323)`, and the `require()` calls on lines 5 and 6 became `e.r(1934)` and `e.r(2989)`. `esm-dep.js` from line 1 was merged into the page module through scope hoisting (an optimization that merges several ESM modules into one module function), leaving only the string, and the dynamic import is `e.A(3105)`. Module 3105 is a loader module that loads the actual module after downloading its chunk.

```js
3105,e=>{e.v(t=>Promise.all(["static/chunks/0214m9_id9iur.js"].map(t=>e.l(t))).then(()=>t(9131)))}
```

Which call is used depends on the syntax that loads the module. Line 2, which imports a CommonJS module, uses `e.i`, and line 6, which `require()`s an ESM module, uses `e.r`. The one-letter names are defined as constants in the code generator.[^11]

```rust
pub const TURBOPACK_REQUIRE: &TurbopackRuntimeFunctionShortcut = make_shortcut!("r");
pub const TURBOPACK_ASYNC_LOADER: &TurbopackRuntimeFunctionShortcut = make_shortcut!("A");
pub const TURBOPACK_MODULE_CONTEXT: &TurbopackRuntimeFunctionShortcut = make_shortcut!("f");
pub const TURBOPACK_IMPORT: &TurbopackRuntimeFunctionShortcut = make_shortcut!("i");
```

The roles of the two calls can be seen in the runtime. `i` provides a namespace object (the object that collects a module's exports, the one you receive with `import * as ns`), and `r` returns `module.exports`. When loading a CommonJS module, the return value can differ even for the same module.[^12]

```ts
function esmImport(
  this: TurbopackBaseContext<Module>,
  id: ModuleId
): Exclude<Module['namespaceObject'], undefined> {
  const module = getOrInstantiateModuleFromParent(id, this.m)

  // any ES module has to have `module.namespaceObject` defined.
  if (module.namespaceObject) return module.namespaceObject

  // only ESM can be an async module, so we don't need to worry about exports being a promise here.
  const raw = module.exports
  return (module.namespaceObject = interopEsm(
    raw,
    createNS(raw),
    raw && (raw as any).__esModule
  ))
}
contextPrototype.i = esmImport

// (omitted)

function commonJsRequire(
  this: TurbopackBaseContext<Module>,
  id: ModuleId
): Exports {
  return getOrInstantiateModuleFromParent(id, this.m).exports
}
contextPrototype.r = commonJsRequire
```

When there is no namespace object yet, `i` wraps `module.exports` with `interopEsm`, stores the result, and reuses it on later calls. When a CommonJS module exports a function directly, as on line 2, `i` creates a `default` for it, so the function can be called as `(0,r.default)()`. `r` returns `module.exports` as is.

For a typical synchronous ESM module, `i` and `r` may return the same object, because `esmExport` sets `module.namespaceObject = exports`.[^13] When interop handling is needed, Turbopack does it inside `i`, while webpack attaches a function such as `n.n(...)` outside the call. In this Turbopack output, that difference made it possible to tell edge kinds apart by the `i` and `r` calls. ESM imports merged into another module, however, leave no call at all and drop out of recovery.

### What the Blog Build Showed

On this blog (Next.js 16.3.5, commit `f1ff09a9`), I also ran `next experimental-analyze --output` and `next build` to compare the analysis file with the output. Counted as distinct path pairs, the client synchronous edges in `modules.data` numbered 3,600. Parsing the source of each importing file and resolving its specifiers with Node.js `require` resolution rules, I could determine which syntax produced 73% (2,639) of them. The 588 confirmed as `require()` were all inside `node_modules`, mostly from the CommonJS output of `next/dist`. The 961 undetermined edges include ones that are hard to match against the source, such as the `process` polyfill, `jsx-runtime` injected by the JSX transform, the alias that turns `react` into `next/dist/compiled/react`, and the `@/` path alias in the blog's own code. So it cannot tell how many `require()` edges there are at most.[^14]

On the output side, I analyzed the 109 JavaScript files in `.next/static`, without source maps, with coldpath's `modules --graph` and recovered 986 edges, more than half of which (496) were `e.r` calls. When scope hoisting merges ESM modules into one module function, the import edges between them disappear, while the `e.r` calls to CommonJS modules that stay in separate module functions remain. However, 527 calls pointing to ids that could not be recovered are missing, and this count covers different things from the analysis file, so its ratio cannot be compared with the result above.

## Vite: Clues Left by Format Interop

### `getModuleInfo` Puts Imports and `require()` in One List

Vite 8 uses Rolldown for builds. In a plugin, you can read the graph with `this.getModuleInfo(id)`, the same API as Rollup. Querying the module information of `entry.js` from the input above gives this.

```json
{
  "importedIds": [
    "src/esm-dep.js",
    "src/cjs-default.js",
    "src/side-effect.js",
    "src/unused-dep.js",
    "\u0000vite/preload-helper.js",
    "src/cjs-dep.js",
    "src/esm-required.js"
  ],
  "dynamicallyImportedIds": [
    "src/lazy-dep.js"
  ],
  "inputFormat": "es"
}
```

The 7 `importedIds` hold 4 imports, 2 `require()` calls, and `\0vite/preload-helper.js`, which Vite injected while handling the dynamic import. The code where Rolldown fills this list puts the `Import`, `Require`, and `NewUrl` (`new URL(..., import.meta.url)`) kinds of dependency records into the same set.[^15]

```rust
for (record, info) in raw_import_records.iter().zip(&resolved_deps) {
  match record.kind {
    ImportKind::Import | ImportKind::Require | ImportKind::NewUrl => {
      ecma_view.imported_ids.insert(info.id.clone());
    }
    ImportKind::DynamicImport => {
      ecma_view.dynamically_imported_ids.insert(info.id.clone());
    }
    ImportKind::HotAccept => {
      ecma_view.hmr_info.deps.insert(info.id.clone());
    }
    // for a none css module, we should not have `at-import` or `url-import`
    ImportKind::AtImport | ImportKind::UrlImport => unreachable!(),
  }
}
```

Rolldown records the dependency kind internally, but like Turbopack, it merges imports and `require()` in the list it exposes to plugins. It does not record source locations either. The unused `unused-dep.js`, unlike in Turbopack, remains in the list. The `es` and `cjs` values of `inputFormat` describe the format of the queried module itself. `side-effect.js`, which has no syntax to decide its format from, comes out as `unknown`. This value does not tell which syntax loaded the module.

coldpath's Vite analysis did not have the misclassification I first saw. The Vite and Rollup plugin parses each module's source in the `transform` hook in advance, then matches the edges read from `getModuleInfo` with the syntax in the source to attach kinds and locations.[^16] Building the graph for the same input with 0.6.0 gives `cjs-dep.js` and `esm-required.js` as `require` at line 5, column 18 and line 6, column 23. The only edge out of `entry.js` without a location was `preload-helper.js`, which does not exist in the source.

### How Far the Helper Functions in the Output Can Tell

In the output for the same input, declarations of synchronously loaded ESM modules are hoisted to the top level, and CommonJS modules are wrapped in lazy-evaluation wrappers. The relevant part of the unminified output is below.

```js
//#region work/auto/src/esm-dep.js
function esmDep() {
  return "M_ESM_DEP";
}
//#endregion
//#region work/auto/src/side-effect.js
var import_cjs_default = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
  module.exports = function cjsDefault() {
    return "M_CJS_DEFAULT";
  };
})))());
globalThis.M_SIDE_EFFECT = "M_SIDE_EFFECT";
//#endregion
//#region work/auto/src/cjs-dep.js
var require_cjs_dep = /* @__PURE__ */ __commonJSMin(((exports, module) => {
  module.exports = { cjsDep() {
    return "M_CJS_DEP";
  } };
}));
//#endregion
//#region work/auto/src/esm-required.js
var esm_required_exports = /* @__PURE__ */ __exportAll({ esmRequired: () => esmRequired$1 });
function esmRequired$1() {
  return "M_ESM_REQUIRED";
}
//#endregion
//#region work/auto/src/entry.js
var { cjsDep } = require_cjs_dep();
var { esmRequired } = __toCommonJS(esm_required_exports);
```

In this example, traces of the original syntax can be found in the helper functions. Line 2, which imports a CommonJS module, is wrapped in `__toESM(...)` to create a `default`. Line 5, a `require()`, calls `require_cjs_dep()` in place. Line 6, which `require()`s an ESM module, gets `__toCommonJS(...)`, which reshapes the namespace into a CommonJS object.

Line 1, an import between ESM modules, has no separate module call, and only its function declaration was hoisted to the top level. `__commonJSMin`, which wraps the CommonJS modules, is a wrapper that runs the module body once on its first call.[^17]

```js
export var __commonJSMin = (cb, mod) => () => (
  mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports
);
```

There are cases where the helper functions alone cannot reveal the original syntax. Below is a CommonJS module that writes to a global.

```js
// dep.cjs
'use strict'
globalThis.CJS_SIDE_EFFECT = Math.random()
module.exports = {value: 1}
```

I compared input A, which loads this module with a side-effect import, and input B, which loads it with `require()`. Both inputs then run `globalThis.finished = true`.

```js
// Input A
import './dep.cjs'
globalThis.finished = true
```

```js
// Input B
require('./dep.cjs')
globalThis.finished = true
```

In production builds with Vite 8.3.2 (Rolldown 1.2.12), the minified output of the two inputs was identical.[^18] Both contained the side effect of `dep.cjs` and the CommonJS wrapper call, and neither had a namespace conversion function. In this case, the output alone cannot tell the original syntax apart.

The `//#region` comments do not match module boundaries exactly either. In the output above, the `import_cjs_default` declaration that came from line 2 of the source sits inside the `side-effect.js` region. Minification also shortens the helper names to one letter, so you have to trace their roles from call shapes such as `v=o(...)` and `u(y)`. There is no per-module function registry either, so coldpath's `modules` could not recover the module boundaries of this output.

Building the `entry.js` with the seven cases with esbuild left similar interop handling. Here are the results for the base input side by side.

| Line | Case                       | Rolldown                               | esbuild                                                     |
| ---- | -------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| 1    | Import from ESM            | Hoisted to the top level               | Hoisted to the top level                                    |
| 2    | Default import of CommonJS | `__toESM(__commonJSMin(...)())`        | `__toESM(require_cjs_default())`                            |
| 3    | Side-effect import         | Statement inlined as is                | Statement inlined as is                                     |
| 5    | `require()` of CommonJS    | `require_cjs_dep()`                    | `require_cjs_dep()`                                         |
| 6    | `require()` of ESM         | `__toCommonJS(esm_required_exports)`   | `(init_esm_required(), __toCommonJS(esm_required_exports))` |
| 9    | Dynamic `import()`         | `__vitePreload(() => import(...), [])` | `import(...)`                                               |

esbuild wraps an ESM module loaded with `require()` in an `__esm` wrapper and initializes it at the time of the `require()`. Its graph information also distinguishes the original syntax. The metafile's `imports` separate `import-statement`, `require-call`, and `dynamic-import`, and include the original specifier (`original`). However, the metafile records only `path`, `kind`, `original`, and import attributes, and for an external module it writes `external: true` instead of `original`. Source locations are not available.[^19]

## What I Fixed in coldpath

### Reading the Source to Fix Edge Kinds and Locations

coldpath 0.6.0's Turbopack adapter (the code that turns a bundler's graph information into a coldpath graph) converted the three lists in `modules.data` like this.[^20]

```ts
for (const [field, kind] of [
  ['module_dependencies', 'static'],
  ['async_module_dependencies', 'dynamic'],
  ['traced_module_dependencies', 'unknown'],
] as const) {
```

With this code, every synchronous edge becomes `static`. The later step that parses the source to attach locations (`enrichLocations`) also connected only syntax of the same kind, so it found the `require()` in the source but could not attach its location. coldpath makes its suggestion on the premise of a "static import chain" when every edge on the analyzed path is `static`. On the `page-loader -> index.jsx -> heavy-cjs.js` path I first saw, both edges were recorded as `static`.

In 0.6.1, I started by reclassifying the synchronous edges that can be confirmed in the source. The importing file is parsed, and if the target of a `require()` call matches the target in the graph, the edge becomes `require`. If the file has a recognized `require()` but no import or `require()` explains the connected target, the edge is left as `unknown` and the count goes into a warning. Everything else keeps the existing `static`. The implementation is in [the classification fix `58b1a6a`](https://github.com/yceffort/coldpath/commit/58b1a6a8395d4a95fdf46b6decc985dafadcbca6) and [the package specifier fix `fec91ef`](https://github.com/yceffort/coldpath/commit/fec91ef351ea732a547051f1682ccc1bbbea2b97).

Package names are resolved from the importing file with Node.js `require` resolution rules, and the target files declared in the package's `exports` are also compared as candidates. For relative paths, candidates are tried one by one, including omitted extensions. Bundler aliases and conditional resolution (picking a different file depending on conditions in `package.json` `exports` such as `import`, `require`, and `browser`) are not fully reproduced. These candidates are used to find which syntax in the source loaded a module that is already connected in the graph.

As we saw earlier, the `e.i` and `e.r` in the output can also tell edge kinds apart. Even so, the fix reads the source instead. The module entries in `modules.data` have only `ident` and `path`, so they do not map directly to numeric ids in the output such as `e.r(1934)`, and the analysis file and the output come from separate runs. As the blog build showed, only some edges can be recovered from the output, and ESM imports merged into another module leave no call at all. Calls in the output have no source location either. To lead a suggestion back to the code, the source had to be read anyway, and reading the source also reveals the kind of syntax.

Here is the graph before and after the fix. The earlier count used only client path pairs, but this one counts every edge in the graph the adapter built, down to edges per location. The right column was re-exported with 0.8.2, and the edge counts, kinds, and locations have been the same since 0.6.1.

| Measurement                                  | coldpath 0.6.0               | 0.8.2                                                      |
| -------------------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| Edges with locations in the repro page graph | 3 of 284                     | 245 of 284                                                 |
| Edge kinds in the blog graph                 | `static` 3,881, `dynamic` 64 | `static` 3,052, `require` 678, `unknown` 172, `dynamic` 64 |
| Edges with locations in the blog graph       | 2,083                        | 2,895                                                      |
| Edges going out of the blog's own code       | `static` 208, `dynamic` 4    | Same                                                       |
| Of those, edges with locations               | 28 of 212                    | 51 of 212                                                  |

The blog graph grew from 3,945 to 3,966 edges because when one file loads the same module several times, an edge is kept for each location. The number of distinct module pairs is 3,941 both before and after the fix. The 172 `unknown` edges include edges that cannot be found in the source, such as `jsx-runtime` injected by the JSX transform into files that use `require()`.

Files with no source to read, or with no recognized `require()`, still carry the existing `static` guess. The edge from the virtual module `[next]/entry/page-loader.ts`, generated by Next.js, to the page is such a case. In the output it is an `e.r` call, but it is still recorded as `static`. So the remaining `static` edges cannot all be taken as static imports confirmed in the source.

Attaching locations to the blog's own code was also hard. Of the 109 edges between the blog's own files, only 31 have locations. Of the 78 without locations, 47 were loaded through the `@/` path alias and 10 through `@yceffort/shared` subpaths. Neither kind of specifier resolves under Node.js rules.

### How the Suggestion Changed After Fixing Edges

Correcting edge kinds and locations did not immediately improve the original suggestion. Reanalyzing the same execution records collected on October 4 with each coldpath version changes the suggestion for `heavy-cjs.js` like this. The graph was also re-exported with each version.[^21]

| coldpath     | `index.jsx -> heavy-cjs.js` edge       | Suggestion for `heavy-cjs.js` |
| ------------ | -------------------------------------- | ----------------------------- |
| 0.6.0        | `static`, no location                  | `split-review`                |
| 0.6.1, 0.8.0 | `require`, line 3, column 18           | `inspect-imports`             |
| 0.8.1        | Top-level `require`, line 3, column 18 | `split-review`                |
| 0.8.2        | Top-level `require`, line 3, column 18 | `defer-review`                |

The `inspect-imports` from 0.6.1 is the last branch, used when the path is neither a static import chain nor passes through `import()`. 0.6.1 treated a path as a static import chain only when all its edges were `static`, so a single `require` edge sent it to this branch.[^22] The explanation is a generic sentence too, saying to inspect the import graph and side effects before choosing a lazy-loading boundary. The edge kind was corrected, but the suggestion actually lost its basis.

A top-level `require()`, like an import, runs the target module right when the importing module runs. When considering lazy loading, there is no reason to treat it differently from a static import chain. So starting with 0.8.1 ([`0e83423`](https://github.com/yceffort/coldpath/commit/0e834233526653d643f26b23d0acfab1dcfa4607)), the adapter records whether a `require` edge is a top-level call as `topLevel`, and the analyzer treats a path connected only by static imports and top-level `require()` calls as a synchronous chain.[^23]

```rust
impl ImportStep {
    /// Static imports and top-level require() calls evaluate the target while the importer evaluates.
    pub fn synchronous(&self) -> bool {
        self.kind == ImportKind::Static
            || (self.kind == ImportKind::Require && self.top_level == Some(true))
    }
}
```

Of the 678 `require` edges in the blog graph, 661 were top-level calls. Of the remaining 17, 8 are calls inside UMD wrappers. Paths that include a `require()` that is not top-level, or an `unknown` edge, do not get suggestions that assume a synchronous chain.

In 0.8.1 the suggestion went back to `split-review`, and the first half of its explanation changed to "A synchronous import chain (static imports or top-level require() calls)". The second half, "part of it executes initially", came from a separate defect in execution counting, unrelated to import classification, which was fixed in 0.8.2.[^24] In 0.8.2, `heavy-cjs.js` got the following suggestion.

```json
{
  "kind": "defer-review",
  "explanation": "A synchronous import chain (static imports or top-level require() calls) reaches this source. Initially only its top-level declarations were evaluated, with no calls, constructions or property writes other than CommonJS exports; its functions execute in this interaction. Review moving the import behind this interaction and rebuild to measure transfer savings."
}
```

In 0.6.1, which fixed only the edge kind, the suggestion fell back to a generic sentence. Only after top-level `require()` was treated as a synchronous edge and execution counting was fixed as well did a suggestion appear that matched the intent of the repro page, a module used only when the button is pressed.

This suggestion means it is worth reviewing whether to move the `require()` behind the button click. This time I confirmed how the suggestion changed, and did not measure how behavior or transfer size changes when the code is actually moved.

## Where the Difference Between Import and `require()` Survives

Even with the same input, where the original syntax can be confirmed differed by bundler. Whether the graph records the kind of syntax, and whether the output keeps clues to it, can be summarized as follows.

| Bundler         | Graph information                                               | Clues and limits in the output                                                                                                      |
| --------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| webpack         | Stats reasons have the kind and the location                    | Module calls can look the same, and some interop handling is a clue. Module concatenation can remove calls and boundaries           |
| Turbopack       | `modules.data` merges import and `require()` into the sync list | Remaining `e.i` and `e.r` calls can be told apart. Merged ESM imports have no separate call                                         |
| Vite (Rolldown) | `importedIds` merges import and `require()`                     | Some format interop functions are clues. A counterexample exists where a side-effect import and `require()` produce the same output |
| esbuild         | Metafile `kind` distinguishes them, but there is no location    | Format interop functions in the base input are clues. Merged ESM imports have no separate call                                      |

In the output, interop handling was the clue for telling import from `require()`. Turbopack handled it inside `i`, and webpack attached a function such as `n.n(...)` after loading the module. But as the side-effect import and `require()` producing the same output in Vite shows, when the behavior needed at runtime is the same, the difference in the original syntax may not survive.

Reading the graph also required checking what each API records. webpack stats `reasons` showed the kind of syntax, its location, and whether it is active, but Next.js `modules.data` only distinguished synchronous, asynchronous, and traced targets. Rolldown's `getModuleInfo` follows the Rollup plugin API and splits dependencies into `importedIds` and `dynamicallyImportedIds`.[^25] Rollup handles CommonJS through a plugin,[^26] while Rolldown handles `require()` itself and also puts it into `importedIds`. Assuming the source syntax is the same just because the entries sit in the same list leads to the same misclassification I ran into with coldpath.

In coldpath, I fixed the classification by checking which syntax in the source loads each module connected in the graph. But correcting the kind of syntax alone did not improve the suggestion. Only after reflecting that a top-level `require()` runs its target at the same time as an import, and fixing the defect in execution counting, did `heavy-cjs.js` get `defer-review`. What the suggestion needed was less the name of the syntax than the timing of execution, and the kind and location of the syntax were the means to find that timing. Now the suggestion leads all the way to the `require()` at line 3, column 18 that loads the module.

To solve this problem, I found the connected module in the graph, checked the actual call in the output, and found the syntax and location in the source. When considering a split, the code found this way should also be read together with the execution records collected on first entry and during interactions. Starting from which modules are connected, you need to be able to confirm where a module is loaded from and when it runs before you can point to the specific code to split.

[^1]: [`HarmonyImportSideEffectDependency.js#L53-L55`](https://github.com/webpack/webpack/blob/v5.111.1/lib/dependencies/HarmonyImportSideEffectDependency.js#L53-L55), [`CommonJsRequireDependency.js#L102-L104`](https://github.com/webpack/webpack/blob/v5.111.1/lib/dependencies/CommonJsRequireDependency.js#L102-L104). The code that copies it into stats is `object.type = dep ? dep.type : null;` in [`DefaultStatsFactoryPlugin.js#L1548`](https://github.com/webpack/webpack/blob/v5.111.1/lib/stats/DefaultStatsFactoryPlugin.js#L1548).

[^2]: [`RuntimeTemplate.js#L2394`](https://github.com/webpack/webpack/blob/v5.111.1/lib/RuntimeTemplate.js#L2394)

[^3]: [`CommonJsRequireDependency.js#L330-L337`](https://github.com/webpack/webpack/blob/v5.111.1/lib/dependencies/CommonJsRequireDependency.js#L330-L337), [`RequireHeaderDependency.js#L106-L107`](https://github.com/webpack/webpack/blob/v5.111.1/lib/dependencies/RequireHeaderDependency.js#L106-L107)

[^4]: `deferredCall` in [`RuntimeTemplate.js#L1593-L1597`](https://github.com/webpack/webpack/blob/v5.111.1/lib/RuntimeTemplate.js#L1593-L1597). It uses an arrow function when `supportsArrowFunction()` is true, and `bind` otherwise.

[^5]: "Concatenate CommonJS modules with statically analyzable exports" in [webpack v5.109.0](https://github.com/webpack/webpack/releases/tag/v5.109.0), and "Wrap concatenated modules in lazy `__webpack_require__.cw` accessors and inline `require()`" in [v5.110.0](https://github.com/webpack/webpack/releases/tag/v5.110.0).

[^6]: [`config/defaults.js#L1275-L1281`](https://github.com/webpack/webpack/blob/v5.111.1/lib/config/defaults.js#L1275-L1281) applies the `esm` rule to `.js` files with `descriptionData: {type: "module"}`, and the type of that rule is `JAVASCRIPT_MODULE_TYPE_ESM` in [`#L1244-L1245`](https://github.com/webpack/webpack/blob/v5.111.1/lib/config/defaults.js#L1244-L1245).

[^7]: [`CommonJsPlugin.js#L260-L265`](https://github.com/webpack/webpack/blob/v5.111.1/lib/dependencies/CommonJsPlugin.js#L260-L265)

[^8]: [`crates/next-api/src/analyze.rs#L368-L375`](https://github.com/vercel/next.js/blob/v16.3.8/crates/next-api/src/analyze.rs#L368-L375). The header struct is at [`#L110-L125`](https://github.com/vercel/next.js/blob/v16.3.8/crates/next-api/src/analyze.rs#L110-L125), and the module entry at [`#L70-L74`](https://github.com/vercel/next.js/blob/v16.3.8/crates/next-api/src/analyze.rs#L70-L74).

[^9]: [`references/esm/base.rs#L672-L686`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript/src/references/esm/base.rs#L672-L686), [`references/cjs.rs#L152-L162`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript/src/references/cjs.rs#L152-L162). In the same file, `CjsAssetReference` at [`#L85-L90`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript/src/references/cjs.rs#L85-L90) and `CjsRequireResolveAssetReference` at [`#L301-L311`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript/src/references/cjs.rs#L301-L311) use the same values. The field comments are in [`turbopack-core/src/chunk/mod.rs#L347-L356`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-core/src/chunk/mod.rs#L347-L356).

[^10]: [`crates/next-api/src/analyze.rs#L534-L541`](https://github.com/vercel/next.js/blob/v16.3.8/crates/next-api/src/analyze.rs#L534-L541). The condition that filters traced targets is right above it at [`#L519-L532`](https://github.com/vercel/next.js/blob/v16.3.8/crates/next-api/src/analyze.rs#L519-L532).

[^11]: [`turbopack-ecmascript/src/runtime_functions.rs#L69-L72`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript/src/runtime_functions.rs#L69-L72)

[^12]: [`runtime-utils.ts#L467-L484`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript-runtime/js/src/shared/runtime/runtime-utils.ts#L467-L484), [`#L509-L515`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript-runtime/js/src/shared/runtime/runtime-utils.ts#L509-L515)

[^13]: `esmExport` in [`runtime-utils.ts#L221-L239`](https://github.com/vercel/next.js/blob/v16.3.8/turbopack/crates/turbopack-ecmascript-runtime/js/src/shared/runtime/runtime-utils.ts#L221-L239). Line 236 sets `module.namespaceObject = exports`.

[^14]: The classification script is [`scripts/blog-edges.mjs`](https://github.com/yceffort/blog-experiments/blob/main/bundler-import-memory/scripts/blog-edges.mjs). Edges between partial modules split from the same file were not counted. The breakdown of the results (2,051 import, 588 `require()`, 961 undetermined) and the results for the 193 edges going out of the blog's own code are in section 7 of [`FINDINGS.md`](https://github.com/yceffort/blog-experiments/blob/main/bundler-import-memory/FINDINGS.md).

[^15]: [`crates/rolldown/src/module_loader/module_task.rs#L157-L171`](https://github.com/rolldown/rolldown/blob/v1.2.12/crates/rolldown/src/module_loader/module_task.rs#L157-L171)

[^16]: [`lib/rollup.ts#L30-L38`](https://github.com/yceffort/coldpath/blob/v0.6.0/lib/rollup.ts#L30-L38), [`#L65-L78`](https://github.com/yceffort/coldpath/blob/v0.6.0/lib/rollup.ts#L65-L78)

[^17]: [`crates/rolldown/src/runtime/runtime-base.js#L31-L33`](https://github.com/rolldown/rolldown/blob/v1.2.12/crates/rolldown/src/runtime/runtime-base.js#L31-L33). `__toESM` is at [`#L61-L70`](https://github.com/rolldown/rolldown/blob/v1.2.12/crates/rolldown/src/runtime/runtime-base.js#L61-L70) and `__toCommonJS` at [`#L71-L74`](https://github.com/rolldown/rolldown/blob/v1.2.12/crates/rolldown/src/runtime/runtime-base.js#L71-L74).

[^18]: This additional experiment ran on October 5, 2026, with Node.js 24.20.0, Vite 8.3.2, and Rolldown 1.2.12. The reproduction script is [`scripts/interop-counterexample.mjs`](https://github.com/yceffort/blog-experiments/blob/main/bundler-import-memory/scripts/interop-counterexample.mjs), and the inputs and full output are in [`results/interop-counterexample.json`](https://github.com/yceffort/blog-experiments/blob/main/bundler-import-memory/results/interop-counterexample.json). Run it with `node scripts/interop-counterexample.mjs` in the experiment directory.

[^19]: The kind strings are in [`internal/ast/ast.go#L43-L64`](https://github.com/evanw/esbuild/blob/v0.28.2/internal/ast/ast.go#L43-L64), the code that writes the metafile is in [`internal/bundler/bundler.go#L2516-L2521`](https://github.com/evanw/esbuild/blob/v0.28.2/internal/bundler/bundler.go#L2516-L2521), and the code that writes external modules is in [`#L2478-L2482`](https://github.com/evanw/esbuild/blob/v0.28.2/internal/bundler/bundler.go#L2478-L2482).

[^20]: [`lib/graph.ts#L295-L299`](https://github.com/yceffort/coldpath/blob/v0.6.0/lib/graph.ts#L295-L299). The condition that accepts only positions of the same kind is at [`#L140`](https://github.com/yceffort/coldpath/blob/v0.6.0/lib/graph.ts#L140).

[^21]: The per-version graphs and analysis results are in [`results/coldpath-versions`](https://github.com/yceffort/blog-experiments/tree/main/bundler-import-memory/results/coldpath-versions), and they can be regenerated with [`scripts/coldpath-versions.sh`](https://github.com/yceffort/blog-experiments/blob/main/bundler-import-memory/scripts/coldpath-versions.sh). It needs the `.next` of the October 4 build that matches the execution records.

[^22]: [`src/recommendations.rs#L45-L47`](https://github.com/yceffort/coldpath/blob/v0.6.1/src/recommendations.rs#L45-L47) treats only paths whose edges are all `static` as a static import chain, and the last branch at [`#L89-L94`](https://github.com/yceffort/coldpath/blob/v0.6.1/src/recommendations.rs#L89-L94) returns `inspect-imports`.

[^23]: [`src/graph.rs#L38-L45`](https://github.com/yceffort/coldpath/blob/v0.8.2/src/graph.rs#L38-L45). The branches that use this check are in [`src/recommendations.rs#L49-L98`](https://github.com/yceffort/coldpath/blob/v0.8.2/src/recommendations.rs#L49-L98).

[^24]: On first entry, the only thing `heavy-cjs.js` ran was the code where its module function assigns an object to `t.exports`. The module function ran once, and the `compute` inside it ran zero times. But in the chunk `0mlnz1g9-icsv.js`, the last mapping of `heavy-cjs.js` (column 1376, `}},`) extends up to just before the next mapping at column 1417 in `index.jsx`, and that range contains the start of the `index.jsx` module function (column 1384, `e=>{`), which ran on first entry, so that execution was counted as a function execution of `heavy-cjs.js`. 0.8.2 cuts mapping ranges at module function boundaries ([`9c89cbc`](https://github.com/yceffort/coldpath/commit/9c89cbc9239a04e29d14e35e591895a0a74733df)) and excludes `module.exports` and `exports.x` assignments from top-level side effects ([`34f908b`](https://github.com/yceffort/coldpath/commit/34f908bbc186503a31f58352f353e84bdc825a30)). The verification steps are in section 8-1 of [`FINDINGS.md`](https://github.com/yceffort/blog-experiments/blob/main/bundler-import-memory/FINDINGS.md).

[^25]: [`src/rollup/types.d.ts#L193-L212`](https://github.com/rollup/rollup/blob/v4.64.0/src/rollup/types.d.ts#L193-L212) (Rollup v4.64.0)

[^26]: [Importing CommonJS](https://rollupjs.org/introduction/#importing-commonjs) in the Rollup docs: "Rollup can import existing CommonJS modules through a plugin."
