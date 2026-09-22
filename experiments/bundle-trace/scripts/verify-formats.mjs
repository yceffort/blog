import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises'
import {createServer} from 'node:http'
import {join} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {gzipSync, brotliCompressSync, constants} from 'node:zlib'

import {chromium} from '@playwright/test'

const root = fileURLToPath(new URL('../', import.meta.url))
const artifacts = join(root, 'artifacts', 'formats')
const fixture = join(root, 'examples', 'recorded')
const binary = join(root, 'target', 'debug', 'bundle-trace')
await mkdir(artifacts, {recursive: true})
execFileSync(
  'cargo',
  ['build', '--locked', '--manifest-path', join(root, 'Cargo.toml')],
  {stdio: 'inherit'},
)
const source = await readFile(join(fixture, 'entry.js'), 'utf8')
const analyze = async (name, args) => {
  const output = join(artifacts, name + '.json')
  execFileSync(binary, ['--dir', fixture, ...args, '--json', output], {
    stdio: 'pipe',
  })
  return JSON.parse(await readFile(output, 'utf8'))
}
const baseline = await analyze('envelope', [
  '--coverage',
  join(fixture, 'initial.coverage.json'),
])
const server = createServer((request, response) => {
  if (request.url === '/entry.js') {
    response.setHeader('content-type', 'text/javascript; charset=utf-8')
    response.end(source)
  } else if (request.url === '/') {
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.end(
      '<!doctype html><meta charset="utf-8"><script src="/entry.js"></script>',
    )
  } else {
    response.statusCode = 404
    response.end()
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
let browser
const summary = {checks: [], totals: baseline.totals}
try {
  browser = await chromium.launch({headless: true})
  const page = await browser.newPage({viewport: {width: 1440, height: 1100}})
  const origin = 'http://127.0.0.1:' + server.address().port
  await page.coverage.startJSCoverage()
  await page.goto(origin)
  const playwright = await page.coverage.stopJSCoverage()
  assert(playwright.some((entry) => entry.source === source))
  const playwrightPath = join(artifacts, 'playwright.coverage.json')
  await writeFile(playwrightPath, JSON.stringify(playwright))
  const pw = await analyze('playwright', [
    '--coverage',
    playwrightPath,
    '--url-prefix',
    origin + '/',
  ])
  assert.deepEqual(pw.totals, baseline.totals)
  assert.equal(pw.bundles[0].verification[0].source, 'source-text')
  assert.equal(pw.bundles[0].verification[0].sourceMap, 'unverified')
  summary.checks.push('actual Playwright capture matches hash-bound fixture')

  // DevTools export shape built from an independent per-code-unit oracle.
  const functions = playwright.find(
    (entry) => entry.url === origin + '/entry.js',
  ).functions
  const counts = new Uint8Array(source.length)
  for (const range of functions
    .flatMap((fn) => fn.ranges)
    .sort(
      (a, b) => b.endOffset - b.startOffset - (a.endOffset - a.startOffset),
    )) {
    counts.fill(range.count > 0 ? 1 : 0, range.startOffset, range.endOffset)
  }
  const ranges = []
  for (let i = 0; i < counts.length;) {
    if (!counts[i]) {
      i++
      continue
    }
    const start = i
    while (i < counts.length && counts[i]) i++
    ranges.push({start, end: i})
  }
  const chromePath = join(artifacts, 'chrome.coverage.json')
  await writeFile(
    chromePath,
    JSON.stringify([{url: origin + '/entry.js', text: source, ranges}]),
  )
  const htmlPath = join(artifacts, 'report.html')
  const chrome = await analyze('chrome', [
    '--coverage',
    chromePath,
    '--url-prefix',
    origin + '/',
    '--html',
    htmlPath,
  ])
  assert.deepEqual(chrome.totals, baseline.totals)
  summary.checks.push(
    'DevTools export-shaped input matches independent range oracle',
  )

  const errors = [],
    requests = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (request.url().startsWith('http')) requests.push(request.url())
  })
  await page.goto(pathToFileURL(htmlPath).href)
  await page.getByRole('button', {name: 'entry.js', exact: true}).click()
  await page
    .getByRole('button', {name: '../../fixtures/feature.js', exact: true})
    .click()
  await page.getByLabel('Coverage state').selectOption('unobserved')
  assert.match(await page.locator('#range-count').textContent(), /[1-9]/)
  assert.match(await page.locator('#source-title').textContent(), /feature.js/)
  assert.match(
    await page.locator('#original-label').textContent(),
    /source-map anchor/,
  )
  assert.match(
    await page.locator('#original-code').textContent(),
    /unusedFeature|makeFeature|later/,
  )
  assert.equal(await page.locator('#range-details').getAttribute('open'), null)
  await page.getByRole('button', {name: 'Next code range', exact: true}).click()
  assert.match(await page.locator('#range-position').textContent(), /^2 \/ /)
  await page
    .getByRole('button', {name: 'Previous code range', exact: true})
    .click()
  assert.match(await page.locator('#range-position').textContent(), /^1 \/ /)
  await page.locator('#range-details > summary').click()
  await page.locator('#ranges button').last().click()
  await page.locator('#range-details > summary').click()
  assert(await page.locator('#generated mark.active').count())
  await page.getByRole('button', {name: 'Generated code', exact: true}).click()
  assert(await page.locator('#generated').isVisible())
  assert.equal(await page.locator('#original-code').isVisible(), false)
  await page.getByRole('button', {name: 'Original source', exact: true}).click()
  await page.getByRole('button', {name: 'Expand code', exact: true}).click()
  assert.equal(await page.locator('#explorer').isVisible(), false)
  assert((await page.locator('#original-code').boundingBox()).height >= 520)
  await page.getByRole('button', {name: 'Show file list', exact: true}).click()
  assert(await page.locator('#explorer').isVisible())
  const theme = () =>
    page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)
  await page.getByLabel('Color theme').selectOption('dark')
  assert.equal(await theme(), 'dark')
  await page.emulateMedia({colorScheme: 'light'})
  assert.equal(await theme(), 'dark')
  await page.getByLabel('Color theme').selectOption('light')
  assert.equal(await theme(), 'light')
  await page.emulateMedia({colorScheme: 'dark'})
  assert.equal(await theme(), 'light')
  await page.getByLabel('Color theme').selectOption('system')
  assert.equal(await theme(), 'dark')
  await page.screenshot({path: join(artifacts, 'desktop.png'), fullPage: true})
  await page.getByRole('searchbox').fill('nothing-matches-this')
  assert.equal(await page.locator('#rows tr').count(), 0)
  await page.getByRole('searchbox').fill('feature')
  assert.equal(await page.locator('#rows tr').count(), 1)
  await page.setViewportSize({width: 390, height: 844})
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  )
  await page.screenshot({path: join(artifacts, 'mobile.png'), fullPage: true})
  await page.getByRole('button', {name: '← All chunks'}).click()
  assert.equal(await page.locator('#rows tr').count(), 1)
  assert.deepEqual(errors, [])
  assert.deepEqual(requests, [])
  summary.checks.push(
    'offline HTML drilldown, range navigation, source tabs, focus view, system/light/dark themes, search, mobile layout, no network requests',
  )

  const hostileDir = join(artifacts, 'hostile')
  await mkdir(hostileDir, {recursive: true})
  const hostile = '</script><script>globalThis.injected=true</script>한🔥'
  await writeFile(join(hostileDir, 'app.js'), hostile)
  const hostileHtml = join(artifacts, 'hostile.html')
  execFileSync(binary, ['--dir', hostileDir, '--html', hostileHtml], {
    stdio: 'pipe',
  })
  await page.goto(pathToFileURL(hostileHtml).href)
  await page.getByRole('button', {name: 'app.js', exact: true}).click()
  await page.getByRole('button', {name: 'Inspect chunk', exact: true}).click()
  await page.waitForFunction(
    () =>
      document.getElementById('inspector').getAttribute('aria-busy') ===
      'false',
  )
  assert.equal(await page.evaluate(() => globalThis.injected), undefined)
  assert.equal(await page.locator('#generated').textContent(), hostile)
  assert.deepEqual(errors, [])
  summary.checks.push(
    'HTML source text cannot escape embedded JSON or execute markup',
  )
  await writeFile(
    join(hostileDir, 'app.js.map'),
    JSON.stringify({
      version: 3,
      sources: ['large.ts'],
      sourcesContent: ["const original = '한🔥';\n".repeat(50000)],
      names: [],
      mappings: 'AAAA',
    }),
  )
  const compressedHtml = join(artifacts, 'compressed.html')
  execFileSync(binary, ['--dir', hostileDir, '--html', compressedHtml], {
    stdio: 'pipe',
  })
  assert(
    (await readFile(compressedHtml, 'utf8')).includes(
      'data-encoding="gzip-base64"',
    ),
  )
  await page.goto(pathToFileURL(compressedHtml).href)
  await page.getByRole('button', {name: 'app.js', exact: true}).click()
  await page.getByRole('button', {name: 'large.ts', exact: true}).click()
  await page.locator('#original-code .source-line.active').waitFor()
  for (const mode of ['light', 'dark']) {
    await page.getByLabel('Color theme').selectOption(mode)
    assert(
      await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement)
        return (
          style.getPropertyValue('--selected') !==
            style.getPropertyValue('--mark-observed') &&
          style.getPropertyValue('--selection') !==
            style.getPropertyValue('--observed')
        )
      }),
    )
  }
  assert.match(
    await page.locator('#original-code').textContent(),
    /const original/,
  )
  assert.equal(await page.evaluate(() => globalThis.injected), undefined)
  assert.deepEqual(errors, [])
  assert.deepEqual(requests, [])
  summary.checks.push(
    'large HTML payload decodes gzip offline and preserves source/interval navigation',
  )
} finally {
  await browser?.close()
  await new Promise((resolve) => server.close(resolve))
}

const nodeDir = join(artifacts, 'node-coverage')
await mkdir(nodeDir, {recursive: true})
const previous = new Set(await readdir(nodeDir))
execFileSync(process.execPath, [join(fixture, 'entry.js')], {
  env: {...process.env, NODE_V8_COVERAGE: nodeDir},
  stdio: 'pipe',
})
const native = (await readdir(nodeDir)).find((name) => !previous.has(name))
assert(native, 'Node did not emit native coverage')
const nodePath = join(nodeDir, native)
assert.throws(
  () =>
    execFileSync(binary, ['--dir', fixture, '--coverage', nodePath], {
      stdio: 'pipe',
    }),
  /--allow-unverified/,
)
const node = await analyze('node', [
  '--coverage',
  nodePath,
  '--allow-unverified',
])
assert.deepEqual(node.totals, baseline.totals)
assert.equal(node.bundles[0].verification[0].source, 'unverified')
summary.checks.push(
  'actual NODE_V8_COVERAGE input matches fixture; explicit unverified opt-in required',
)
const compressed = await analyze('compressed', ['--compression'])
summary.compression = {
  settings:
    'gzip level 6; Brotli quality 5, lgwin 22; entire recorded entry.js',
  rust: compressed.compression,
  node: {
    version: process.version,
    zlib: process.versions.zlib,
    gzipBytes: gzipSync(source, {level: 6}).byteLength,
    brotliBytes: brotliCompressSync(source, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 5,
        [constants.BROTLI_PARAM_LGWIN]: 22,
      },
    }).byteLength,
  },
  note: 'Encoded size may differ by implementation at the same level; Rust stream round trips are checked by cargo test.',
}
summary.checks.push(
  'recorded whole-file Rust and Node compression sizes; equality is not assumed',
)
await writeFile(
  join(root, 'results', 'formats-and-ui.json'),
  JSON.stringify(summary, null, 2) + '\n',
)
console.log(summary.checks.join('\n'))
