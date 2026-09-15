import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {globSync, readFileSync, writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {cpus} from 'node:os'
import {resolve} from 'node:path'

import {renderMarkdown} from '../../index.js'
import {splitFrontMatter} from '../../scripts/js-pipeline.mjs'

const here = import.meta.dirname
const root = resolve(here, '../../../..')
const require = createRequire(import.meta.resolve('rehype-prism-plus'))
const {refractor} = await import(require.resolve('refractor/all'))
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const save = (file, data) =>
  writeFileSync(resolve(here, file), JSON.stringify(data, null, 2) + '\n')
const syntaxes = JSON.parse(
  execFileSync(resolve(here, 'target/fancy-probe'), ['list'], {
    encoding: 'utf8',
  }),
)
const aliases = {
  javascript: 'js',
  python: 'py',
  ruby: 'rb',
  rust: 'rs',
  shell: 'sh',
  shellscript: 'sh',
  csharp: 'cs',
  yml: 'yaml',
  markup: 'html',
  pascal: 'pas',
  ocaml: 'ml',
}
const all = []
const documents = globSync('apps/blog/posts/**/*.md', {cwd: root}).toSorted()
const sourceHashes = {}
for (const file of documents) {
  const source = readFileSync(resolve(root, file), 'utf8')
  sourceHashes[file] = sha256(source)
  let index = 0
  function visit(node, parent) {
    if (node.tagName === 'code' && parent?.tagName === 'pre') {
      const language =
        node.properties.className
          ?.find((c) => c.startsWith('language-'))
          ?.slice(9)
          .toLowerCase() ?? ''
      const code = codeText(node)
      const syntax = syntaxes.find((s) =>
        s.extensions.includes(aliases[language] ?? language),
      )?.name
      all.push({file, index: index++, language, syntax, code})
    }
    for (const child of node.children ?? []) visit(child, node)
  }
  visit(renderMarkdown(splitFrontMatter(source)))
}
function codeText(node) {
  return node.type === 'text'
    ? node.value
    : (node.children ?? []).map(codeText).join('')
}
const blocks = all.filter(
  (b) =>
    b.syntax && b.syntax !== 'Plain Text' && refractor.registered(b.language),
)
const skipped = all
  .filter((b) => !blocks.includes(b))
  .reduce((counts, b) => {
    counts[b.language || '(unlabelled)'] =
      (counts[b.language || '(unlabelled)'] ?? 0) + 1
    return counts
  }, {})
save('target/corpus.json', blocks)
const corpus = {
  posts: documents.length,
  totalBlocks: all.length,
  measuredBlocks: blocks.length,
  utf8Bytes: Buffer.byteLength(blocks.map((b) => b.code).join('')),
  sha256: sha256(JSON.stringify(blocks)),
  skipped,
  sourceHashes,
}
save('target/corpus-meta.json', corpus)
process.stdout.write(
  `Prepared ${blocks.length}/${all.length} code blocks from ${documents.length} posts. Skipped: ${JSON.stringify(skipped)}\n`,
)
if (process.argv.includes('--prepare')) process.exit(0)

const measure = (fn) => {
  const start = performance.now()
  const value = fn()
  return {ms: performance.now() - start, value}
}
const stats = (values) => {
  const sorted = values.toSorted((a, b) => a - b)
  return {
    medianMs:
      (sorted[Math.floor((sorted.length - 1) / 2)] +
        sorted[Math.floor(sorted.length / 2)]) /
      2,
    minMs: sorted[0],
    maxMs: sorted.at(-1),
  }
}
const wasmBytes = readFileSync(
  resolve(here, 'target/wasm32-unknown-unknown/release/syntect_probe.wasm'),
)
const compiled = measure(() => new WebAssembly.Module(wasmBytes))
const instantiated = measure(() => new WebAssembly.Instance(compiled.value, {}))
const wasm = instantiated.value.exports
const initialization = measure(() => wasm.init())
const input = new TextEncoder().encode(JSON.stringify(blocks))
function load(instance, bytes) {
  const ptr = instance.alloc(bytes.length)
  new Uint8Array(instance.memory.buffer, ptr, bytes.length).set(bytes)
  const count = instance.load(ptr, bytes.length)
  instance.dealloc(ptr, bytes.length)
  return count
}
const loaded = measure(() => load(wasm, input))
assert.equal(loaded.value, blocks.length)
const cold = measure(() => wasm.run(0, blocks.length) >>> 0)
process.stdout.write(
  `WASM init ${initialization.ms.toFixed(1)} ms, first parse ${cold.ms.toFixed(1)} ms\n`,
)
function prismRun(indices) {
  let checksum = 0
  for (const i of indices) {
    const block = blocks[i]
    checksum += refractor.tokenize(
      block.code,
      refractor.languages[block.language],
    ).length
  }
  return checksum
}
function text(tokens) {
  return tokens
    .map((token) =>
      typeof token === 'string'
        ? token
        : Array.isArray(token.content)
          ? text(token.content)
          : token.content,
    )
    .join('')
}
for (const block of blocks)
  assert.equal(
    text(refractor.tokenize(block.code, refractor.languages[block.language])),
    block.code,
  )
const indices = blocks.map((_, i) => i)
const prismChecksum = prismRun(indices)
assert.equal(wasm.run(0, blocks.length) >>> 0, cold.value)
const trials = []
for (let round = 0; round < 6; round++) {
  const order = round % 2 ? ['wasm', 'prism'] : ['prism', 'wasm']
  const trial = {order}
  for (const name of order) {
    const measured = measure(() =>
      name === 'wasm' ? wasm.run(0, blocks.length) >>> 0 : prismRun(indices),
    )
    assert.equal(measured.value, name === 'wasm' ? cold.value : prismChecksum)
    trial[`${name}Ms`] = measured.ms
  }
  trials.push(trial)
  process.stdout.write(
    `Round ${round + 1}: Prism ${trial.prismMs.toFixed(1)} ms, WASM ${trial.wasmMs.toFixed(1)} ms\n`,
  )
}
const perLanguage = []
for (const language of new Set(blocks.map((b) => b.language))) {
  const selected = indices.filter((i) => blocks[i].language === language)
  const wasmTimes = [],
    prismTimes = []
  for (let round = 0; round < 3; round++) {
    for (const name of round % 2 ? ['wasm', 'prism'] : ['prism', 'wasm']) {
      const result = measure(() =>
        name === 'prism'
          ? prismRun(selected)
          : selected.reduce((sum, i) => (sum + wasm.run(i, 1)) >>> 0, 0),
      )
      ;(name === 'prism' ? prismTimes : wasmTimes).push(result.ms)
    }
  }
  perLanguage.push({
    language,
    syntax: blocks[selected[0]].syntax,
    blocks: selected.length,
    utf8Bytes: selected.reduce(
      (sum, i) => sum + Buffer.byteLength(blocks[i].code),
      0,
    ),
    prism: stats(prismTimes),
    wasm: stats(wasmTimes),
  })
}
const blockCalls = measure(() =>
  indices.reduce((sum, i) => (sum + wasm.run(i, 1)) >>> 0, 0),
)
assert.equal(blockCalls.value, cold.value)
const reloads = Array.from(
  {length: 6},
  () => measure(() => load(wasm, input)).ms,
)
const sample = indices.slice(0, 32)
const reusedSample = measure(() =>
  sample.reduce((sum, i) => (sum + wasm.run(i, 1)) >>> 0, 0),
)
const freshSample = measure(() =>
  sample.reduce((sum, i) => {
    const fresh = new WebAssembly.Instance(compiled.value, {}).exports
    fresh.init()
    load(fresh, new TextEncoder().encode(JSON.stringify([blocks[i]])))
    return (sum + fresh.run(0, 1)) >>> 0
  }, 0),
)
assert.equal(freshSample.value, reusedSample.value)
const report = {
  measuredAt: new Date().toISOString(),
  ref: execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim(),
  node: process.version,
  cpu: cpus()[0].model,
  scope:
    'Prism.tokenize vs syntect ParseState.parse_line. Different grammar engines, no themes, HTML/HAST, line wrappers, or output JSON. Full preloaded corpus in one WASM call. Not an end-to-end replacement benchmark.',
  corpus,
  checksums: {prism: prismChecksum, syntect: cold.value},
  startup: {
    compileMs: compiled.ms,
    instantiateMs: instantiated.ms,
    syntaxInitMs: initialization.ms,
    inputLoadMs: loaded.ms,
    firstParseMs: cold.ms,
  },
  summary: {
    prism: stats(trials.map((t) => t.prismMs)),
    wasm: stats(trials.map((t) => t.wasmMs)),
  },
  trials,
  perLanguage,
  boundary: {
    perBlockCallsMs: blockCalls.ms,
    reload: stats(reloads),
    reloadTrialsMs: reloads,
  },
  instanceReuse: {
    blocks: sample.length,
    reusedMs: reusedSample.ms,
    freshPerBlockMs: freshSample.ms,
  },
  sourceSha256: Object.fromEntries(
    [
      'Cargo.toml',
      'Cargo.lock',
      'src/lib.rs',
      'src/main.rs',
      'benchmark.mjs',
    ].map((p) => [p, sha256(readFileSync(resolve(here, p)))]),
  ),
  wasmSha256: sha256(wasmBytes),
  wasmBytes: wasmBytes.length,
}
save('results.json', report)
process.stdout.write(
  JSON.stringify(
    {
      summary: report.summary,
      startup: report.startup,
      boundary: report.boundary,
      instanceReuse: report.instanceReuse,
    },
    null,
    2,
  ),
)
