import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync, writeFileSync} from 'node:fs'
import {cpus} from 'node:os'
import {WASI} from 'node:wasi'

const here = import.meta.dirname
const input = readFileSync(`${here}/target/corpus.json`)
const blocks = JSON.parse(input)
const bytes = readFileSync(
  `${here}/target/wasm32-wasip1/release/syntect_probe.wasm`,
)
const wasi = new WASI({version: 'preview1'})
const instance = new WebAssembly.Instance(
  new WebAssembly.Module(bytes),
  wasi.getImportObject(),
)
wasi.initialize(instance)
const wasm = instance.exports
const measure = (fn) => {
  const start = performance.now()
  const value = fn()
  return {ms: performance.now() - start, value}
}
const init = measure(() => wasm.init())
const ptr = wasm.alloc(input.length)
new Uint8Array(wasm.memory.buffer, ptr, input.length).set(input)
assert.equal(wasm.load(ptr, input.length), blocks.length)
wasm.dealloc(ptr, input.length)
const cold = measure(() => wasm.run(0, blocks.length) >>> 0)
const trials = Array.from({length: 6}, () => {
  const result = measure(() => wasm.run(0, blocks.length) >>> 0)
  assert.equal(result.value, cold.value)
  return result.ms
})
const sorted = trials.toSorted((a, b) => a - b)
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const report = {
  measuredAt: new Date().toISOString(),
  node: process.version,
  cpu: cpus()[0].model,
  scope:
    'syntect ParseState with Oniguruma, wasm32-wasip1. Preloaded corpus, reused instance, one first pass and six warm passes. No HAST or output JSON. Separate process from the earlier fancy-regex and Prism runs.',
  corpus: {blocks: blocks.length, sha256: sha256(JSON.stringify(blocks))},
  checksum: cold.value,
  syntaxInitMs: init.ms,
  firstParseMs: cold.ms,
  summary: {
    medianMs: (sorted[2] + sorted[3]) / 2,
    minMs: sorted[0],
    maxMs: sorted[5],
  },
  trialsMs: trials,
  wasmBytes: bytes.length,
  wasmSha256: sha256(bytes),
  sourceSha256: sha256(readFileSync(import.meta.filename)),
}
writeFileSync(`${here}/wasm-onig.json`, JSON.stringify(report, null, 2) + '\n')
process.stdout.write(JSON.stringify(report, null, 2) + '\n')
