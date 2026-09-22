// The browser is needed only here. The Rust analyzer reads the saved artifact offline.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path'
import {parseArgs} from 'node:util'

import {readMap} from './maps.mjs'

const require = createRequire(import.meta.url)
const {chromium} = require('@playwright/test')
const {values} = parseArgs({
  options: {
    url: {type: 'string'},
    dir: {type: 'string'},
    out: {type: 'string'},
    prefix: {type: 'string', default: '/_next/static/'},
    scenario: {type: 'string', default: 'initial'},
    query: {type: 'string', default: 'javascript'},
    'block-prefetch': {type: 'boolean', default: false},
  },
})
assert(
  values.url && values.dir && values.out,
  '--url, --dir and --out are required',
)
assert(
  ['initial', 'search', 'about'].includes(values.scenario),
  '--scenario must be initial, search or about',
)
const target = new URL(values.url)
const root = resolve(values.dir)
const digest = (data) => createHash('sha256').update(data).digest('hex')
const browser = await chromium.launch({headless: true})
try {
  const context = await browser.newContext({
    serviceWorkers: 'block',
    viewport: {width: 1280, height: 900},
  })
  const blocked = new Set()
  const requests = []
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.origin === target.origin) {
      const headers = route.request().headers()
      const prefetch = headers['next-router-prefetch'] === '1'
      requests.push({
        path: url.pathname + url.search,
        type: route.request().resourceType(),
        prefetch,
        segment: headers['next-router-segment-prefetch'] ?? null,
        blocked: prefetch && values['block-prefetch'],
      })
      if (prefetch && values['block-prefetch']) return route.abort()
      return route.continue()
    }
    blocked.add(url.origin)
    return route.abort()
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const cdp = await context.newCDPSession(page)
  await cdp.send('Debugger.enable')
  await cdp.send('Profiler.enable')
  await cdp.send('Profiler.startPreciseCoverage', {
    callCount: true,
    detailed: true,
  })
  const response = await page.goto(target.href, {waitUntil: 'networkidle'})
  assert(response?.ok(), `navigation failed: ${response?.status()}`)
  // Fixed observation window, not a performance measurement.
  await page.waitForTimeout(1000)
  let resultCount = null
  if (values.scenario === 'search') {
    await page.getByRole('button', {name: '검색', exact: true}).click()
    const dialog = page.getByRole('dialog', {name: '글 검색'})
    await dialog.getByRole('searchbox').fill(values.query)
    await dialog.locator('a.search-result').first().waitFor({state: 'visible'})
    resultCount = await dialog.locator('a.search-result').count()
    assert(resultCount > 0, 'search did not produce results')
  }
  if (values.scenario === 'about') {
    await page.locator('a[href="/about"]').first().click()
    await page.waitForURL('**/about')
    await page.locator('.about-hero').waitFor({state: 'visible'})
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  }
  const {result} = await cdp.send('Profiler.takePreciseCoverage')
  await cdp.send('Profiler.stopPreciseCoverage')
  assert.deepEqual(errors, [], 'page threw runtime errors')
  const scripts = []
  const excluded = []
  for (const script of result) {
    let url
    try {
      url = new URL(script.url)
    } catch {
      continue
    }
    if (
      url.origin !== target.origin ||
      !url.pathname.startsWith(values.prefix)
    ) {
      if (script.url) excluded.push(script.url)
      continue
    }
    const path = decodeURIComponent(url.pathname.slice(values.prefix.length))
    const diskPath = resolve(root, path)
    const local = relative(root, diskPath)
    assert(
      local &&
        !local.startsWith(`..${sep}`) &&
        local !== '..' &&
        !isAbsolute(local),
      'script path escapes --dir',
    )
    const source = await readFile(diskPath)
    const {scriptSource} = await cdp.send('Debugger.getScriptSource', {
      scriptId: script.scriptId,
    })
    assert.equal(
      digest(source),
      digest(scriptSource),
      `browser/disk source mismatch: ${path}`,
    )
    const map = await readMap(diskPath, scriptSource, root)
    scripts.push({
      path: local.split(sep).join('/'),
      sha256: digest(source),
      sourceMapSha256: map ? digest(map) : null,
      functions: script.functions,
    })
  }
  assert(scripts.length > 0, 'no scripts matched --prefix')
  scripts.sort((a, b) => a.path.localeCompare(b.path))
  const artifact = {
    schemaVersion: 1,
    scenario: values.scenario,
    capturedAt: new Date().toISOString(),
    environment: {
      browser: browser.version(),
      node: process.version,
      platform: process.platform,
      playwright: require('@playwright/test/package.json').version,
      viewport: {width: 1280, height: 900},
      serviceWorkers: 'blocked',
      externalRequests: 'blocked',
      prefetch: values['block-prefetch'] ? 'blocked' : 'enabled',
      scope: 'page CDP target only; no worker coverage',
      observation:
        'navigation networkidle + 1000ms; search additionally waits for visible results',
    },
    url: target.href,
    resultCount,
    requests,
    blockedOrigins: [...blocked].sort(),
    excludedScripts: [...new Set(excluded)].sort(),
    scripts,
  }
  await mkdir(dirname(resolve(values.out)), {recursive: true})
  await writeFile(values.out, JSON.stringify(artifact, null, 2) + '\n')
  console.log(
    `${values.scenario}: ${scripts.length} scripts, ${resultCount ?? 0} search results -> ${values.out}`,
  )
} finally {
  await browser.close()
}
