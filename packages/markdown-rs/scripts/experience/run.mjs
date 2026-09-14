import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {
  constants,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {createRequire} from 'node:module'
import {cpus, platform, arch} from 'node:os'
import {resolve} from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'

import {app, prepare, root, workspace, variants, sha256} from './prepare.mjs'

const require = createRequire(resolve(root, 'apps/blog/package.json'))
const {chromium} = require('@playwright/test')
const next = require.resolve('next/dist/bin/next')
const orders = [
  ['js', 'hybrid', 'wasm'],
  ['wasm', 'hybrid', 'js'],
  ['hybrid', 'wasm', 'js'],
  ['js', 'wasm', 'hybrid'],
  ['wasm', 'js', 'hybrid'],
  ['hybrid', 'js', 'wasm'],
]
const routes = [
  '/2026/08/k8s-for-frontend-1',
  '/2020/07/math-for-programmer-chapter1-2-set',
]
const mode = process.argv[2] ?? 'pilot'
assert.ok(
  ['pilot', 'pilot-browser', 'measure', 'builds', 'browser'].includes(mode),
)
assert.equal(process.version, 'v24.20.0')
assert.equal(
  process.platform,
  'darwin',
  'Build CPU/RSS collection uses macOS /usr/bin/time',
)
const manifest = existsSync(resolve(workspace, 'manifest.json'))
  ? JSON.parse(readFileSync(resolve(workspace, 'manifest.json')))
  : prepare()
console.log(`Using source snapshot from ${manifest.createdAt}: ${workspace}`)
const env = {
  ...process.env,
  NODE_ENV: 'production',
  NEXT_TELEMETRY_DISABLED: '1',
  GA4_PROPERTY_ID: '',
  GOOGLE_APPLICATION_CREDENTIALS_JSON: '',
}
delete env.MARKDOWN_BENCH_LOG
const out = resolve(workspace, mode)
mkdirSync(out, {recursive: true})
const report = {
  startedAt: new Date().toISOString(),
  node: process.version,
  host: {platform: platform(), arch: arch(), cpu: cpus()[0].model},
  manifest: '../manifest.json',
  harnessSha256: Object.fromEntries(
    ['prepare.mjs', 'run.mjs'].map((name) => [
      name,
      sha256(readFileSync(resolve(import.meta.dirname, name))),
    ]),
  ),
  recipes: manifest.recipes,
  conditions: {
    builds:
      'Every build removes .next. Dependency installation and WASM compilation excluded. Same post corpus, getAllPosts memoization, workers/default config, no GA4 credentials. Sequential balanced ordering.',
    browser:
      'Fresh next start process and Chromium process/profile per trial. Pristine build restored each trial. No health-check request or route warmup. Desktop 1280x900, no CPU/network throttling, loopback network. HTTP cache disabled and service workers blocked. Google analytics blocked. OS file cache and external CDN caches are not cleared.',
    renderCall:
      'PostArticle timer around renderPost, including image metadata and JSX construction. JS includes MDX compile/evaluate. Excludes static module imports; navigation metrics include cold route loading. Runtime log must contain exactly one target render.',
    bodyReady:
      'MutationObserver first sees a non-skeleton article.post-article. This is DOM availability, not a paint measurement. FCP and LCP are separate. Fonts are awaited and LCP is observed for one second after load/fonts.',
  },
  routes,
  builds: [],
  visits: [],
}
const save = () =>
  writeFileSync(
    resolve(out, 'results.json'),
    JSON.stringify(report, null, 2) + '\n',
  )
function launch(command, args, cwd, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd,
    env: {...env, ...extraEnv},
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  child.stdout.on('data', (chunk) => {
    log += chunk
  })
  child.stderr.on('data', (chunk) => {
    log += chunk
  })
  const done = new Promise((resolveExit, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => resolveExit({code, signal}))
  })
  return {child, done, log: () => log}
}
async function stop(server) {
  if (server.child.exitCode === null && server.child.signalCode === null) {
    process.kill(-server.child.pid, 'SIGTERM')
    await server.done
  }
}
async function build(variant, round) {
  rmSync(resolve(app(variant), '.next'), {recursive: true, force: true})
  const start = performance.now()
  const command = launch(
    '/usr/bin/time',
    ['-l', '-p', process.execPath, next, 'build'],
    app(variant),
  )
  const {code} = await command.done
  const wallMs = performance.now() - start
  const log = command.log()
  writeFileSync(resolve(out, `build-${variant}-${round}.log`), log)
  assert.equal(code, 0, `Build failed: ${variant}; see ${out}`)
  const prerender = JSON.parse(
    readFileSync(resolve(app(variant), '.next/prerender-manifest.json')),
  )
  for (const route of routes)
    assert.ok(!(route in prerender.routes), `Target is prerendered: ${route}`)
  const value = (pattern) => Number(log.match(pattern)?.[1])
  const row = {
    variant,
    round,
    wallMs,
    userSeconds: value(/^user\s+([\d.]+)/m),
    systemSeconds: value(/^sys\s+([\d.]+)/m),
    maxRssBytes: value(/(\d+)\s+maximum resident set size/),
    staticGeneration: log.match(
      /Generating static pages[^\r\n]* in ([^\r\n]+)/,
    )?.[1],
    buildId: readFileSync(
      resolve(app(variant), '.next/BUILD_ID'),
      'utf8',
    ).trim(),
    prerenderedRoutes: Object.keys(prerender.routes).length,
  }
  report.builds.push(row)
  save()
  console.log(`build ${round} ${variant}: ${(wallMs / 1000).toFixed(2)} s`)
}
function observeBody() {
  const result = {bodyReadyMs: null, lcpMs: null}
  window.__markdownExperience = result
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) result.lcpMs = entry.startTime
  }).observe({type: 'largest-contentful-paint', buffered: true})
  const observer = new MutationObserver(() => {
    const article = document.querySelector(
      'article.post-article:not([aria-hidden="true"])',
    )
    if (article && article.textContent.length > 100) {
      result.bodyReadyMs = performance.now()
      observer.disconnect()
    }
  })
  observer.observe(document, {subtree: true, childList: true})
}
async function visit(variant, route, round) {
  const name = `${variant}-${round}-${route.replaceAll('/', '_')}`
  const nextDir = resolve(app(variant), '.next')
  rmSync(nextDir, {recursive: true, force: true})
  cpSync(resolve(workspace, `pristine-${variant}`), nextDir, {
    recursive: true,
    mode: constants.COPYFILE_FICLONE,
  })
  const renderLog = resolve(out, `${name}.render.jsonl`)
  writeFileSync(renderLog, '')
  const start = performance.now()
  const server = launch(
    process.execPath,
    [next, 'start', '-p', '3210', '-H', '127.0.0.1'],
    app(variant),
    {MARKDOWN_BENCH_LOG: renderLog},
  )
  let browser
  try {
    while (!server.log().includes('Ready in')) {
      assert.ok(
        server.child.exitCode === null && performance.now() - start < 30000,
        server.log(),
      )
      await delay(20)
    }
    const serverStartupMs = performance.now() - start
    browser = await chromium.launch({headless: true})
    report.browserVersion ??= browser.version()
    const context = await browser.newContext({
      viewport: {width: 1280, height: 900},
      userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browser.version()} Safari/537.36`,
      serviceWorkers: 'block',
      colorScheme: 'light',
    })
    await context.addInitScript(() => localStorage.setItem('theme', 'light'))
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', {cacheDisabled: true})
    await cdp.send('Network.setBypassServiceWorker', {bypass: true})
    await cdp.send('Network.setBlockedURLs', {
      urls: ['*://*.google-analytics.com/*', '*://*.googletagmanager.com/*'],
    })
    const errors = [],
      resources = []
    page.on('pageerror', (error) => errors.push(error.message))
    cdp.on('Network.responseReceived', ({response, type}) =>
      resources.push({
        url: response.url,
        status: response.status,
        type,
        fromDiskCache: response.fromDiskCache ?? false,
        fromServiceWorker: response.fromServiceWorker ?? false,
      }),
    )
    await page.addInitScript(observeBody)
    const response = await page.goto(`http://127.0.0.1:3210${route}`, {
      waitUntil: 'load',
      timeout: 60000,
    })
    assert.equal(response.status(), 200)
    await page.waitForFunction(
      () => window.__markdownExperience.bodyReadyMs !== null,
    )
    await page.evaluate(() => document.fonts.ready.then(() => undefined))
    await delay(1000)
    const timing = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0]
      const paints = performance.getEntriesByType('paint')
      const article = document.querySelector(
        'article.post-article:not([aria-hidden="true"])',
      )
      return {
        ...window.__markdownExperience,
        ttfbMs: navigation.responseStart - navigation.startTime,
        responseEndMs: navigation.responseEnd,
        domContentLoadedMs: navigation.domContentLoadedEventEnd,
        loadMs: navigation.loadEventEnd,
        fcpMs: paints.find((entry) => entry.name === 'first-contentful-paint')
          ?.startTime,
        bodyTextLength: article.textContent.length,
        mathNodes: article.querySelectorAll('math').length,
        codeLines: article.querySelectorAll('.code-line').length,
        fonts: [...document.fonts].map((font) => ({
          family: font.family,
          status: font.status,
        })),
        resources: performance.getEntriesByType('resource').map((entry) => ({
          name: entry.name,
          initiatorType: entry.initiatorType,
          transferSize: entry.transferSize,
          duration: entry.duration,
        })),
      }
    })
    const calls = readFileSync(renderLog, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
    const target = calls.filter((call) =>
      call.path.endsWith(`posts${route}.md`),
    )
    assert.equal(
      target.length,
      1,
      `Expected one actual cold render of ${route}: ${JSON.stringify(calls)}`,
    )
    assert.deepEqual(errors, [], 'Browser errors invalidate a trial')
    assert.ok(
      resources.every(
        (entry) =>
          entry.status < 400 &&
          !entry.fromDiskCache &&
          !entry.fromServiceWorker,
      ),
      `Bad/cached resource: ${JSON.stringify(resources.filter((entry) => entry.status >= 400 || entry.fromDiskCache || entry.fromServiceWorker))}`,
    )
    writeFileSync(
      resolve(out, `${name}.visit.json`),
      JSON.stringify({timing, calls, errors, resources}, null, 2),
    )
    assert.ok(timing.fcpMs > 0 && timing.lcpMs > 0)
    if (route.includes('math-for-programmer'))
      assert.equal(timing.mathNodes, 31)
    else assert.ok(timing.codeLines > 0)
    if (round === 1)
      await page.screenshot({
        path: resolve(out, `${name}.png`),
        fullPage: false,
      })
    const row = {
      variant,
      route,
      round,
      serverStartupMs,
      ...target[0],
      ...timing,
      responses: resources,
    }
    report.visits.push(row)
    save()
    console.log(
      `visit ${round} ${variant} ${route}: call ${row.renderCallMs.toFixed(1)} ms, TTFB ${row.ttfbMs.toFixed(1)} ms, body ${row.bodyReadyMs.toFixed(1)} ms, FCP ${row.fcpMs.toFixed(1)} ms`,
    )
  } finally {
    await browser?.close()
    await stop(server)
    writeFileSync(resolve(out, `${name}.server.log`), server.log())
  }
}
if (!mode.endsWith('browser')) {
  for (const [round, order] of (mode.startsWith('pilot')
    ? [variants]
    : orders
  ).entries()) {
    for (const variant of order) await build(variant, round + 1)
  }
  for (const variant of variants) {
    const pristine = resolve(workspace, `pristine-${variant}`)
    rmSync(pristine, {recursive: true, force: true})
    cpSync(resolve(app(variant), '.next'), pristine, {
      recursive: true,
      mode: constants.COPYFILE_FICLONE,
    })
  }
}
if (mode !== 'builds') {
  for (const [round, order] of (mode.startsWith('pilot')
    ? [variants]
    : orders
  ).entries()) {
    for (const route of routes)
      for (const variant of order) await visit(variant, route, round + 1)
  }
}
report.finishedAt = new Date().toISOString()
save()
console.log(`Results: ${out}/results.json`)
