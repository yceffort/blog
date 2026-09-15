import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {globSync, readFileSync, writeFileSync} from 'node:fs'
import {arch, cpus, platform, release} from 'node:os'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {isDeepStrictEqual} from 'node:util'

import {renderMarkdown} from '../index.js'
import {createJsHastPipeline} from './js-hast-pipeline.mjs'
import {
  normalizeHast,
  runJsPipeline,
  splitFrontMatter,
  stripPositions,
} from './js-pipeline.mjs'
import {normalizeRendered} from './normalize-rendered.mjs'

const root = resolve(import.meta.dirname, '../../..')
const {engines} = JSON.parse(
  readFileSync(resolve(root, 'package.json'), 'utf8'),
)
assert.equal(process.versions.node, engines.node, `Use Node ${engines.node}`)
const documents = globSync('apps/blog/posts/**/*.md', {cwd: root})
  .toSorted()
  .map((file) => ({
    file,
    body: splitFrontMatter(readFileSync(resolve(root, file), 'utf8')),
  }))
assert.ok(documents.length > 0, 'No posts found')
const variants = {
  js: createJsHastPipeline(),
  rust: (body) => renderMarkdown(body),
}

// 원본 컴파일러의 HAST와 대조하는 비용은 측정하지 않는다.
for (const {file, body} of documents) {
  const reference = await runJsPipeline(body)
  assert.equal(reference.error, undefined, file)
  assert.ok(
    isDeepStrictEqual(
      stripPositions(await variants.js(body)),
      stripPositions(reference.hast2),
    ),
    `JS HAST differs from the original compiler: ${file}`,
  )
  assert.ok(
    isDeepStrictEqual(
      normalizeRendered(normalizeHast(await variants.rust(body))),
      normalizeRendered(normalizeHast(reference.hast2)),
    ),
    `Rust HAST differs from the parity reference: ${file}`,
  )
}
console.log(`Validated both HAST pipelines against ${documents.length} posts.`)

async function runAll(render) {
  for (const {body} of documents) await render(body)
}
for (const render of Object.values(variants)) await runAll(render)
console.log('Full-corpus warmup complete; starting six AB/BA pairs.')

const startedAt = new Date().toISOString()
const trials = []
for (let round = 1; round <= 6; round++) {
  const order = round % 2 ? ['js', 'rust'] : ['rust', 'js']
  const trial = {round, order}
  for (const name of order) {
    const start = performance.now()
    await runAll(variants[name])
    trial[`${name}Ms`] = performance.now() - start
  }
  trials.push(trial)
  console.log(
    `Round ${round} (${order.join(' -> ')}): JS ${trial.jsMs.toFixed(1)} ms, Rust ${trial.rustMs.toFixed(1)} ms`,
  )
}
const summary = Object.fromEntries(
  Object.keys(variants).map((name) => {
    const values = trials
      .map((trial) => trial[`${name}Ms`])
      .toSorted((a, b) => a - b)
    return [
      name,
      {
        medianMs: (values[2] + values[3]) / 2,
        minMs: values[0],
        maxMs: values[5],
      },
    ]
  }),
)
const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const sourceFiles = [
  'pnpm-lock.yaml',
  'packages/markdown-rs/index.js',
  'packages/markdown-rs/pkg/markdown_rs.wasm',
  ...['bench', 'js-hast-pipeline', 'js-pipeline', 'normalize-rendered'].map(
    (name) => `packages/markdown-rs/scripts/${name}.mjs`,
  ),
]
const report = {
  startedAt,
  finishedAt: new Date().toISOString(),
  node: process.version,
  host: {
    platform: platform(),
    arch: arch(),
    release: release(),
    cpu: cpus()[0].model,
  },
  ref: execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim(),
  sourceSha256: Object.fromEntries(
    sourceFiles.map((file) => [
      file,
      sha256(readFileSync(resolve(root, file))),
    ]),
  ),
  corpus: {posts: documents.length, sha256: sha256(JSON.stringify(documents))},
  scope:
    'Markdown body -> HAST. JS uses KaTeX/Prism; WASM uses math-core/syntect-Oniguruma. Token colors and math markup differ. Validation compares code text/line metadata, TeX/display mode and remaining HAST. Excludes JS code generation, React rendering, image metadata and StyleX token rewriting.',
  conditions:
    'One process, reused processors and WASM instance, full-corpus validation and one warmup pass per variant, six alternating AB/BA pairs. Imports, file reads, frontmatter parsing and validation are outside timing.',
  summary,
  speedup: summary.js.medianMs / summary.rust.medianMs,
  trials,
}
const output = resolve(
  process.argv[2] ??
    fileURLToPath(new URL('../bench-wasi-results.json', import.meta.url)),
)
writeFileSync(output, JSON.stringify(report, null, 2) + '\n')
console.log(
  `HAST pipeline speedup: ${report.speedup.toFixed(2)}x. Results: ${output}`,
)
