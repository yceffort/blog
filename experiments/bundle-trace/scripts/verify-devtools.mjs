import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {transform} from 'esbuild'

import {
  assertIntervals,
  checkShiftedIntervalRejection,
  measuredDetails,
} from './reference.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
checkShiftedIntervalRejection()
const vendor = await readFile(
  resolve(root, 'scripts/vendor/devtools-coverage.ts'),
  'utf8',
)
const {code} = await transform(vendor, {loader: 'ts', format: 'esm'})
const devtools = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
)
const summary = {
  upstream:
    'https://github.com/ChromeDevTools/devtools-frontend/blob/63555438dd48b3cdecaa6293b01c446d86176d42/front_end/panels/coverage/CoverageModel.ts',
  scope:
    'Exact interval boundaries/statuses from extracted convertToDisjointSegments versus Rust detailed spans; UTF-16 and UTF-8 boundaries checked. Not the entire DevTools UI; source attribution intentionally differs.',
  shiftedIntervalNegativeControl:
    'Rejected a same-size interval shifted to different ASCII positions',
  excerptSha256: createHash('sha256').update(vendor).digest('hex'),
  runs: [],
}
for (const name of [
  'baseline-initial',
  'baseline-no-prefetch',
  'baseline-about',
  'baseline-search',
  'lazy-initial',
  'lazy-search',
]) {
  const coverage = JSON.parse(
    await readFile(
      resolve(root, `artifacts/study/${name}.coverage.json`),
      'utf8',
    ),
  )
  const report = JSON.parse(
    await readFile(
      resolve(root, `artifacts/study/${name}.report.json`),
      'utf8',
    ),
  )
  const variant = name.split('-')[0]
  const detail = await measuredDetails(
    resolve(
      root,
      `../../.cache/bundle-trace-study/app/.next/${variant}/static`,
    ),
    [coverage],
  )
  const detailedBundles = new Map(
    detail.bundles.map((bundle) => [bundle.path, bundle]),
  )
  const byPath = new Map()
  for (const script of coverage.scripts) {
    const source = await readFile(
      resolve(
        root,
        `../../.cache/bundle-trace-study/app/.next/${variant}/static/${script.path}`,
      ),
      'utf8',
    )
    let state = byPath.get(script.path)
    if (!state) {
      state = {source, used: new Uint8Array(source.length)}
      byPath.set(script.path, state)
    }
    assert.equal(
      createHash('sha256').update(source).digest('hex'),
      script.sha256,
    )
    const segments = devtools.convertToDisjointSegments(
      structuredClone(script.functions.flatMap((fn) => fn.ranges)),
      0,
    )
    let start = 0
    for (const segment of segments) {
      if (segment.count > 0) state.used.fill(1, start, segment.end)
      start = segment.end
    }
  }
  let unicodeDifference = 0
  let observedUnits = 0
  for (const [path, {source, used}] of byPath) {
    const units = used.reduce((n, x) => n + x, 0)
    let offset = 0,
      bytes = 0
    for (const char of source) {
      if (used[offset]) bytes += Buffer.byteLength(char)
      offset += char.length
    }
    const bundle = report.bundles.find((b) => b.path === path)
    assert.equal(bundle.observedUtf16Units, units, path)
    assert.equal(bundle.observedBytes, bytes, path)
    assertIntervals(detailedBundles.get(path), source, used)
    observedUnits += units
    unicodeDifference += bytes - units
  }
  summary.runs.push({
    name,
    checkedScripts: byPath.size,
    checkedIntervalPartitions: byPath.size,
    observedUtf16Units: observedUnits,
    observedUtf8Bytes: observedUnits + unicodeDifference,
    unicodeDifference,
  })
}
// One mapping at (0,0), no mapping on the following line. This isolates
// the attribution policy, using a minimal SourceMap/Text adapter.
const dir = resolve(root, 'artifacts/attribution-policy')
await mkdir(dir, {recursive: true})
const source = 'foo();\nbar();'
const article = await readFile(
  resolve(
    root,
    '../../apps/blog/posts/2026/09/tracing-bundle-waste-with-v8-coverage-and-sourcemaps.md',
  ),
  'utf8',
)
assert(
  article.includes('const source = ' + JSON.stringify(source)),
  'article must preserve exact counterexample bytes',
)
await writeFile(resolve(dir, 'entry.js'), source)
await writeFile(
  resolve(dir, 'entry.js.map'),
  JSON.stringify({
    version: 3,
    sources: ['a.ts'],
    names: [],
    mappings: 'AAAA',
    sourcesContent: ['foo()'],
  }),
)
const [sizes] = devtools.calculateSizeForSources(
  {
    mappings: () => [{lineNumber: 0, columnNumber: 0, sourceURL: 'a.ts'}],
    findEntryRanges: () => ({
      sourceURL: 'a.ts',
      range: {startLine: 0, startColumn: 0, endLine: 1, endColumn: 6},
    }),
  },
  {offsetFromPosition: (line, column) => (line === 0 ? 0 : 7) + column},
  source.length,
)
execFileSync(
  resolve(root, 'target/release/bundle-trace'),
  ['--dir', dir, '--json', resolve(dir, 'report.json'), '--limit', '0'],
  {stdio: 'pipe'},
)
const rust = JSON.parse(await readFile(resolve(dir, 'report.json'), 'utf8'))
assert.equal(sizes.get('a.ts'), 13)
assert.equal(rust.sources.find((s) => s.source === 'a.ts').bytes, 6)
assert.equal(rust.sources.find((s) => s.source === '[unmapped]').bytes, 7)
summary.attributionPolicy = {
  source,
  mappings: 'AAAA',
  devtoolsSourceUnits: sizes.get('a.ts'),
  rustSourceBytes: 6,
  rustUnmappedBytes: 7,
}
await writeFile(
  resolve(root, 'results/devtools-parity.json'),
  JSON.stringify(summary, null, 2) + '\n',
)
console.log(
  `DevTools range normalization agrees for ${summary.runs.reduce((n, r) => n + r.checkedScripts, 0)} script observations; sparse-map attribution difference verified.`,
)
