import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {createServer} from 'node:http'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'

import {chromium} from '@playwright/test'
import {build} from 'esbuild'

import {readMap} from './maps.mjs'
import {checkShiftedIntervalRejection, verifyReport} from './reference.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
checkShiftedIntervalRejection()
const artifacts = join(root, 'artifacts')
const output = join(artifacts, 'fixture')
await mkdir(artifacts, {recursive: true})
const built = await build({
  absWorkingDir: root,
  entryPoints: ['fixtures/entry.js'],
  outdir: output,
  bundle: true,
  minify: true,
  charset: 'utf8',
  format: 'iife',
  sourcemap: true,
  metafile: true,
})
const metaPath = join(artifacts, 'fixture-meta.json')
await writeFile(metaPath, JSON.stringify(built.metafile, null, 2) + '\n')
const source = await readFile(join(output, 'entry.js'), 'utf8')
const map = await readMap(join(output, 'entry.js'), source, output)
const hash = (data) => createHash('sha256').update(data).digest('hex')
const server = createServer((request, response) => {
  if (request.url === '/entry.js') {
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8')
    response.end(source)
  } else {
    response.setHeader('Content-Type', 'text/html; charset=utf-8')
    response.end(
      '<!doctype html><meta charset="utf-8"><script src="/entry.js"></script>',
    )
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
let browser
const observations = []
try {
  browser = await chromium.launch({headless: true})
  const page = await browser.newPage()
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Profiler.enable')
  await cdp.send('Profiler.startPreciseCoverage', {
    callCount: true,
    detailed: true,
  })
  const url = `http://127.0.0.1:${server.address().port}`
  await page.goto(url)
  assert.equal(await page.evaluate(() => globalThis.__startupCount), 1)
  for (const scenario of ['initial', 'interaction-delta']) {
    if (scenario === 'interaction-delta') {
      assert.equal(
        await page.evaluate(() => globalThis.__bundleTrace.run(true)),
        '한🔥',
      )
    }
    const {result} = await cdp.send('Profiler.takePreciseCoverage')
    const script = result.find((script) => script.url === `${url}/entry.js`)
    assert(script, 'fixture missing from native V8 coverage')
    observations.push({
      schemaVersion: 1,
      scenario,
      scripts: [
        {
          path: 'entry.js',
          sha256: hash(source),
          sourceMapSha256: hash(map),
          functions: script.functions,
        },
      ],
    })
  }
  await cdp.send('Profiler.stopPreciseCoverage')
} finally {
  await browser?.close()
  await new Promise((resolve) => server.close(resolve))
}
// takePreciseCoverage resets counters; later snapshots can omit unchanged
// functions entirely. Test the delta separately as well as its union with load.
const deltaRanges = observations[1].scripts[0].functions.flatMap(
  (fn) => fn.ranges,
)
assert(
  deltaRanges.some((range) => range.count > 0),
  'interaction did not execute fixture code',
)
assert(
  source.includes('한🔥'),
  'fixture must contain actual multi-byte characters',
)
const coveragePaths = []
for (const observation of observations) {
  const path = join(artifacts, `fixture-${observation.scenario}.coverage.json`)
  await writeFile(path, JSON.stringify(observation, null, 2) + '\n')
  coveragePaths.push(path)
}
execFileSync(
  'cargo',
  ['build', '--locked', '--manifest-path', join(root, 'Cargo.toml')],
  {stdio: 'inherit'},
)
const binary = join(root, 'target/debug/bundle-trace')
let checked = 0
for (const [name, inputs] of [
  ['static', []],
  ['initial', [0]],
  ['delta', [1]],
  ['merged', [0, 1]],
]) {
  const path = join(artifacts, `fixture-${name}.json`)
  execFileSync(
    binary,
    [
      '--dir',
      output,
      '--metafile',
      metaPath,
      '--json',
      path,
      ...inputs.flatMap((index) => ['--coverage', coveragePaths[index]]),
    ],
    {stdio: 'pipe'},
  )
  const report = JSON.parse(await readFile(path, 'utf8'))
  checked += await verifyReport(
    output,
    inputs.map((index) => observations[index]),
    report,
    binary,
  )
  assert.equal(report.warnings.length, 0)
  assert.deepEqual(
    report.importPaths.find((row) => row.source === 'fixtures/feature.js').path,
    ['fixtures/entry.js', 'fixtures/feature.js'],
  )
}
// A real content change must fail even if URL and length are unchanged.
const stale = structuredClone(observations[0])
stale.scripts[0].sha256 = '0'.repeat(64)
const stalePath = join(artifacts, 'fixture-stale.coverage.json')
await writeFile(stalePath, JSON.stringify(stale))
assert.throws(
  () =>
    execFileSync(binary, ['--dir', output, '--coverage', stalePath], {
      stdio: 'pipe',
    }),
  /SHA-256 mismatch/,
)
console.log(
  `Verified ${checked} native V8 reports, static attribution, import path, Unicode and stale-build rejection.`,
)
